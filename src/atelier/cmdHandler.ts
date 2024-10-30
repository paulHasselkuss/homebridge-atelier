import { Logger } from 'homebridge';
import { CircularBuffer, Queue } from 'mnemonist';
import { ReadlineParser, SerialPort, SerialPortMock } from 'serialport';
import { Cmd } from './cmd';
import { DeviceState } from './deviceState';

export class CmdHandler {

  private static BAUD_RATE = 300;
  private static STAT_DELIMITER = '\r\n';
  private static DELAY_CMD = .5 * 1000;
  private static DELAY_XSTAT = 3 * 1000;
  private static DISPLAY_REFRESH_WINDOW = 3 * 1000;

  private readonly port: SerialPort | SerialPortMock;
  private readonly queue = new Queue<{ cmd: Cmd; func: () => void }>();
  private readonly history = new CircularBuffer<{ cmd: Cmd; timestamp: Date }>(Array, 2);

  private isProcessing = false;
  private targetVolume = -1;

  constructor(
    private readonly path: string,
    private readonly state: DeviceState,
    private readonly log: Logger,
  ) {
    this.port = new SerialPort({
      path: path,
      baudRate: CmdHandler.BAUD_RATE,
    });

    /*SerialPortMock.binding.createPort(path);
    this.port = new SerialPortMock({ path: path, baudRate: CmdHandler.BAUD_RATE });*/

    this.port.pipe(new ReadlineParser({ delimiter: CmdHandler.STAT_DELIMITER }))
      .on('data', input => {
        this.log.debug('Reading from port:', input);
        this.state.updateFromInput(input);
      });

    this.port.on('open', (err) => {
      if (err) {
        return this.log.error('Error opening port:', err.message);
      }
      this.log.debug('Port opened successfully.');
    });
  }

  enqueCmd(cmd: Cmd, callback = () => { }): void {
    this.log.debug('Cmd enqueued ', cmd);
    this.queue.enqueue({
      cmd: cmd,
      func: () => this.write(cmd, callback),
    });
    this.processQueue();
  }

  shutdown(): void {
    this.port.close(err => {
      if (err) {
        return this.log.error('Error closing port: ', err.message);
      }
      this.log.debug('Port closed successfully.');
    });
  }

  isEnqueued(cmd: Cmd): boolean {
    for (const e of this.queue) {
      if (e.cmd === cmd) {
        return true;
      }
    }
    return false;
  }

  wasDeviceUpdated(): boolean {
    const first = this.history.peekFirst();
    const second = this.history.peekLast();
    const cmds = [Cmd.VOLUME_DOWN, Cmd.VOLUME_UP];

    //either no cmd was send, or it is not among those we need to check for
    if (first == null || !cmds.includes(first.cmd)) {
      return false;
    }
    //either no second cmd was send, or it is not among those we need to check for
    if (second == null || !cmds.includes(second.cmd)) {
      return false;
    }
    //state was updated only if first and second where send within 3s
    return first.timestamp.getTime() - second.timestamp.getTime() < CmdHandler.DISPLAY_REFRESH_WINDOW;
  }

  enqueueVolChange(target: number, current: number = this.state.volume, up: Cmd = Cmd.VOLUME_UP, down: Cmd = Cmd.VOLUME_DOWN): void {
    const inProgress = this.targetVolume !== -1;
    this.targetVolume = target;

    if (inProgress) {
      this.log.debug('Volume change already in progress, updating target to %s', target);
      return;
    }
    this.log.debug('Starting to change volume to %s', this.targetVolume);

    const repeatingTask = () => {
      this.log.debug('Current volume: ', current);

      if (current !== this.targetVolume) {
        const cmd = current < this.targetVolume ? up : down;
        this.write(cmd, () => cmd === up ? current++ : current--);
        setTimeout(repeatingTask, CmdHandler.DELAY_CMD);
      } else {
        this.log.debug('Volume change to %s finished.', this.targetVolume);
        this.targetVolume = -1;
        this.isProcessing = false;
        this.processQueue();
      }
    };
    this.queue.enqueue({ cmd: up, func: repeatingTask });
    this.processQueue();
  }

  private processQueue(): void {
    if (!this.isProcessing && this.queue.size > 0) {
      this.isProcessing = true;
      this.queue.dequeue()?.func();
    }
  }

  private write(cmd: Cmd, callback: () => void): void {
    this.port.write(cmd, err => {
      if (err) {
        return this.log.error('Error while writing command to port: ', err.message);
      }

      this.log.debug('Command written to port', cmd.toString());
      this.history.push({
        cmd: cmd,
        timestamp: new Date(),
      });

      // Set to offline if we do not receive a reponse
      if (cmd === Cmd.XMIT_STAT) {
        const then = this.state.timestamp;
        setTimeout(() => {
          if (then === this.state.timestamp) {
            this.state.isOn = false;
          }
          callback();
        }, 500);
      } else {
        callback();
      }

      // Continue processing the queue after the delay
      setTimeout(() => {
        this.isProcessing = false;
        this.processQueue();
      }, cmd === Cmd.XMIT_STAT ? CmdHandler.DELAY_XSTAT : CmdHandler.DELAY_CMD);
    });
  }
}
