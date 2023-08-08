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

  volume(value: number) {
    // Note: this does not work reliably. Homekit may initiats changes while the process is still running. As result, values are off.
    // Additionally, the double sending below causes further trouble if send twice (for two seperated runs).
    const start = this.status().volume;
    let diff = value - start;
    const cmd = diff < 0 ? Command.VOLUME_DOWN : Command.VOLUME_UP;
    this.log.debug('Setting volume from %s to %s, difference is %s.', start, value, diff);

    //the first command only makes the receiver display the current volume
    this.write(cmd, false);
    diff = Math.abs(diff);
    for (let i = 1; i <= diff; i++) {
      setTimeout(() => {
        this.write(cmd);
      }, 100 * i);
    }
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
      if (then === this._status.lastUpdated) {
        this._status.isOn = false;
      }
    }, Device.STATUS_TIMEOUT);
  }

}