import {Logger} from 'homebridge';
import {ReadlineParser, SerialPort} from 'serialport';
import {Cmd} from './cmd';
import {Status} from './status';
import assert from 'node:assert';

export class AtelierDevice {

  private static BAUD_RATE = 300;
  private static STAT_DELIMITER = '\r\n';
  private static STATUS_UPDATE_THRESHOLD = 60 * 1000;
  private static CMD_DELAY = 0.5 * 1000;

  private readonly _port: SerialPort;
  private readonly _status: Status;

  private isProcessing = false;
  private queue: (() => void)[] = [];

  constructor(
    pathToDevice: string,
    private readonly log: Logger,
  ) {

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

  enqueue(cmd: Cmd, status: Status = this._status) {
    this.queue.push(() => {
      this.write(cmd, status);
    });
    this.processQueue();
  }

  volumeChange(target: number, status: Status = this._status) {
    assert(target >= 0 && target <= 100, 'Volume target must be between 0 and 100.');
    this.log.debug('Starting to change volume to %s', target);

    //get the display to change
    this.enqueue(Cmd.VOLUME_UP, Status.createDummy());

    const repeatingTask = () => {
      this.log.debug('Current volume: ', status.volume);

      if (status.volume !== target){
        const current = status.volume;
        const cmd = current < target ? Cmd.VOLUME_UP : Cmd.VOLUME_DOWN;
        this.write(cmd, status);

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
    this._port.write(cmd.toString(), (err) => {
      if (err) {
        return this.log.error('Error while writing command to port: ', err.message);
      }
      this.log.debug('Command written to port', cmd);
      cmd.callback(status);
    });
  }

}