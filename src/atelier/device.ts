import { Logger } from 'homebridge';
import { ReadlineParser, SerialPort } from 'serialport';
import { Command } from './command';
import { DeviceStatus } from './deviceStatus';

export class Device {

  private static BAUD_RATE = 300;
  private static STAT_DELIMITER = '\r\n';
  private static STATUS_TIMEOUT = 3 * 1000;
  private static STATUS_UPDATE_THRESHOLD = 60 * 1000;

  private readonly _port: SerialPort;
  private readonly _status: DeviceStatus;

  private _isVolumeChangeRunning = false;

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

    this._status = new DeviceStatus(false, 0, false, 0);

    const parser = this._port.pipe(new ReadlineParser({delimiter: Device.STAT_DELIMITER}));
    parser.on('data', (input) => {
      input = input.toString();
      this.log.debug('Reading from port: ', input);
      this._status.updateFromInput(input);
    });
  }

  isOn(value: boolean) {
    if (this.status().isOn !== value) {
      this.write(Command.ON_OFF);
    }
  }

  isMute(value: boolean) {
    if (this.status().isMute !== value) {
      this.write(Command.MUTE);
    }
  }

  async volume(value: number) {
    if (this._isVolumeChangeRunning) {
      this.log.warn('Volume change in progress, ignoring new request to change the volume to %s.', value);
      return;
    }
    if (value > 50) {
      this.log.warn('Got request to change volume to %s. Ignoring the request since it is above the allowed maximum.');
      return;
    }

    const start = this.status().volume;
    const diff = Math.abs(value - start);
    const cmd = start < value ? Command.VOLUME_UP : Command.VOLUME_DOWN;

    this.log.debug('Starting to change volume from %s to %s (difference is %s).', start, value, diff);
    this._isVolumeChangeRunning = true;

    //the first command only makes the receiver display the current volume
    this.write(cmd, false);
    await new Promise(resolve => setTimeout(resolve, 500));

    for (let i = 0; i < diff; i++) {
      this.write(cmd);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    this.log.debug('Volume change to %s finished.', value);
    this._isVolumeChangeRunning = false;
  }

  status(): DeviceStatus {
    const diff = Date.now() - this._status.lastUpdated;
    this.log.debug('Status was last updated %s ms ago.', diff);
    if (diff > Device.STATUS_UPDATE_THRESHOLD) {
      this.log.debug('Resetting and updating status...');
      this.updateStatus();
    }
    return this._status;
  }

  sleep(time: number) {
    return new Promise(resolve => {
      setTimeout(resolve, time);
    });
  }


  private write(cmd: Command, runCallback = true): void {
    this._port.write(cmd.toString(), (err) => {
      if (err) {
        return this.log.error('Error while writing command to port: ', err.message);
      }
      this.log.debug('Command written to port', cmd);
      if (runCallback) {
        cmd.callback(this._status);
      }
    });
  }

  private updateStatus() {
    const then = Date.now();
    this.write(Command.XMIT_STAT);
    this._status.lastUpdated = then;
    setTimeout(() => {
      this.log.debug('Status update was requested at %s, last update was at %s.', then, this._status.lastUpdated);
      if (then === this._status.lastUpdated) {
        this.log.debug('Device seems to be offline, setting _status.isOn to false.');
        this._status.isOn = false;
      }
    }, Device.STATUS_TIMEOUT);
  }

}