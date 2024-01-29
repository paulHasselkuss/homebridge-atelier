import { Logger } from 'homebridge';
import { ReadlineParser, SerialPort } from 'serialport';
import { Command } from './command';
import { DeviceStatus } from './deviceStatus';
import { CmdQueue } from './cmdQueue';

export class Device {

  private static BAUD_RATE = 300;
  private static STAT_DELIMITER = '\r\n';
  private static STATUS_UPDATE_THRESHOLD = 60 * 1000;

  private readonly _port: SerialPort;
  private readonly _queue: CmdQueue;
  private readonly _status: DeviceStatus;

  constructor(
    pathToDevice: string,
    private readonly log: Logger,
  ) {

    this.log.debug('Opening port to: ', pathToDevice);
    this._port = new SerialPort({
      path: pathToDevice,
      baudRate: Device.BAUD_RATE,
    });

    this._port.on('open', (err) => {
      if (err) {
        return this.log.error('Error opening port: ', err.message);
      }
      this.log.debug('Port opened successfully.');
    });

    this._queue = new CmdQueue(this._port, this.log);
    this._status = DeviceStatus.createDummy();

    const parser = this._port.pipe(new ReadlineParser({delimiter: Device.STAT_DELIMITER}));
    parser.on('data', (input) => {
      input = input.toString();
      this.log.debug('Reading from port: ', input);
      this._status.updateFromInput(input);
    });
  }

  isOn(value: boolean) {
    if (this.status().isOn !== value) {
      this._queue.enqueueCmd(Command.ON_OFF, this._status);
    }
  }

  isMute(value: boolean) {
    if (this.status().isMute !== value) {
      this._queue.enqueueCmd(Command.MUTE, this._status);
    }
  }

  volume(value: number) {
    if (value < 0) {
      this.log.warn('Cannot set the volume >0!');
      value = 0;
    } else if (value > 100) {
      this.log.warn('Cannot set the volume <100!');
      value = 100;
    }
    this._queue.enqueueVolumeChange(value, this._status);
  }

  status(): DeviceStatus {
    const diff = Date.now() - this._status.lastUpdated;
    this.log.debug('Status was last updated %s ms ago.', diff);
    if (diff > Device.STATUS_UPDATE_THRESHOLD) {
      this.log.debug('Resetting and updating status...');
      this._queue.enqueueCmd(Command.XMIT_STAT, this._status);
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

}