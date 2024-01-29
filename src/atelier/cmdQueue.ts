import {Command} from './command';
import {SerialPort} from 'serialport';
import {Logger} from 'homebridge';
import {DeviceStatus} from './deviceStatus';

export class CmdQueue {

  private static readonly DELAY_MS = 500;

  private queue: (() => void)[] = [];
  private isProcessing = false;

  constructor(
    private readonly port: SerialPort,
    private readonly log: Logger,
  ) {}

  enqueueCmd(cmd: Command, status: DeviceStatus) {
    this.queue.push(() => {
      this.write(cmd, status);
    });
    this.processQueue();
  }

  enqueueVolumeChange(target: number, status: DeviceStatus) {
    this.log.debug('Starting to change volume to %s', target);

    //get the display to change
    this.enqueueCmd(Command.VOLUME_UP, DeviceStatus.createDummy());

    const repeatingTask = () => {
      this.log.debug('Current volume: ', status.volume);

      if (status.volume !== target){
        const current = status.volume;
        const cmd = current < target ? Command.VOLUME_UP : Command.VOLUME_DOWN;
        this.write(cmd, status);

        setTimeout(repeatingTask, CmdQueue.DELAY_MS);
      } else {
        this.log.debug('Volume change to %s finished.', target);
        this.isProcessing = false;
        this.processQueue();
      }
    };

    this.queue.push(repeatingTask);
    this.processQueue();
  }

  private write(cmd: Command, status: DeviceStatus) {
    this.port.write(cmd.toString(), (err) => {
      if (err) {
        return this.log.error('Error while writing command to port: ', err.message);
      }
      this.log.debug('Command written to port', cmd);
      cmd.callback(status);
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
        }, CmdQueue.DELAY_MS);
      }
    }
  }

}