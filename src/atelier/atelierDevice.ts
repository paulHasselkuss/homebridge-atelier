import {Logger} from 'homebridge';
import {ReadlineParser, SerialPort, SerialPortMock} from 'serialport';
import {Cmd} from './cmd';
import {Status} from './status';
import assert from 'node:assert';

export class AtelierDevice {

  private static BAUD_RATE = 300;
  private static STAT_DELIMITER = '\r\n';
  private static STATUS_UPDATE_THRESHOLD = 60 * 1000;
  private static CMD_DELAY = 0.5 * 1000;

  private readonly _port: SerialPort | SerialPortMock;
  private readonly _status: Status;

  private isProcessing = false;
  private queue: (() => void)[] = [];

  private lastCmd: Cmd | undefined = undefined;
  private lastExec = -1;

  constructor(
    pathToDevice: string,
    private readonly log: Logger,
  ) {

    //// for testing
    //SerialPortMock.binding.createPort(pathToDevice);
    //this._port = new SerialPortMock({
    //  path: pathToDevice,
    //  baudRate: AtelierDevice.BAUD_RATE,
    //});

    this._port = new SerialPort({
      path: pathToDevice,
      baudRate: AtelierDevice.BAUD_RATE,
    });
    this._status = Status.createDummy();

    this._port.pipe(new ReadlineParser({delimiter: AtelierDevice.STAT_DELIMITER}))
      .on('data', (input) => {
        input = input.toString();
        this.log.debug('Reading from port:', input);
        this._status.updateFromInput(input);
      });

    this.log.debug('Opening port to:', pathToDevice);
    this._port.on('open', (err) => {
      if (err) {
        return this.log.error('Error opening port:', err.message);
      }
      this.log.debug('Port opened successfully.');
    });
  }

  enqueue(cmd: Cmd) {
    this.queue.push(() => {
      this.write(cmd, this._status);
    });
    this.processQueue();
  }

  volumeChange(target: number) {
    assert(target >= 0 && target <= 100, 'Volume target must be between 0 and 100.');
    this.log.debug('Starting to change volume to %s', target);

    const repeatingTask = () => {
      this.log.debug('Current volume: ', this._status.volume);

      if (this._status.volume !== target){
        const current = this._status.volume;
        const cmd = current < target ? Cmd.VOLUME_UP : Cmd.VOLUME_DOWN;
        this.write(cmd, this._status);

        setTimeout(repeatingTask, AtelierDevice.CMD_DELAY);
      } else {
        this.log.debug('Volume change to %s finished.', target);
        this.isProcessing = false;
        this.processQueue();
      }
    };

    this.queue.push(repeatingTask);
    this.processQueue();
  }

  status(): Status {
    const diff = Date.now() - this._status.lastUpdated;
    this.log.debug('Status was last updated %s ms ago.', diff);

    if (diff > AtelierDevice.STATUS_UPDATE_THRESHOLD) {
      this.log.debug('Resetting and updating status...');
      this.enqueue(Cmd.XMIT_STAT);
      this._status.lastUpdated = Date.now();
    }
    return this._status;
  }

  shutdown() {
    this._port.close((err) => {
      if (err) {
        return this.log.error('Error closing port: ', err.message);
      }
      this.log.debug('Port closed successfully.');
    });
  }

  private processQueue(): void {
    if (!this.isProcessing && this.queue.length > 0) {
      this.isProcessing = true;
      const task = this.queue.shift();

      if (task) {
        task();
        setTimeout(() => {
          this.isProcessing = false;
          this.processQueue();
        }, AtelierDevice.CMD_DELAY);
      }
    }
  }

  private write(cmd: Cmd, status: Status) {
    this._port.write(cmd.controlSequence, (err) => {
      if (err) {
        return this.log.error('Error while writing command to port: ', err.message);
      }
      this.log.debug('Command written to port', cmd.toString());

      if (this.isVolCmd(cmd) && (!this.isVolCmd(this.lastCmd) || (Date.now() - this.lastExec > 3000))) {
        // if we run a volume cmd,
        // AND EITHER
        //  did not run a volume cmd before,
        //  OR we did run a volume cmd, but that was longer than 3s before,
        // SKIP the callback:
        // the device just switched its display but did not update any values yet
        this.log.debug('Command callback skipped.');
      } else {
        cmd.callback(status);
      }

      this.lastExec = Date.now();
      this.lastCmd = cmd;
    });
  }

  private isVolCmd (cmd:Cmd | undefined) {
    return cmd === Cmd.VOLUME_DOWN || cmd === Cmd.VOLUME_UP;
  }

}