import {SerialPort, ReadlineParser} from 'serialport';
import {Logger} from 'homebridge';
import {DeviceStatus} from './deviceStatus';
import {Command} from './command';

export class Device {

  private static BAUD_RATE = 300;
  private static STAT_DELIMITER = '\r\n';
  private static STATUS_THRESHOLD = 60 * 1000;

  private readonly port: SerialPort;
  private readonly status: DeviceStatus;

  constructor(
    pathToDevice: string,
    private readonly log: Logger,
  ) {
    this.log.debug('Opening port to: ', pathToDevice);
    this.port = new SerialPort({
      path: pathToDevice,
      baudRate: Device.BAUD_RATE,
    });

    this.port.on('open', (err) => {
      if (err) {
        return this.log.error('Error opening port: ', err.message);
      }
      this.log.debug('Port opened succesfully.');
    });

    this.status = new DeviceStatus(false, 0, false, 0);

    const parser = this.port.pipe(new ReadlineParser({delimiter: Device.STAT_DELIMITER}));
    parser.on('data', (input) => {
      input = input.toString();
      this.log.debug('Reading from port: ', input);
      this.status.updateFromInput(input);
    });
  }

  toogleOnOff(state: boolean) {
    if (this.isOn() !== state) {
      this.write(Command.ON_OFF);
    }
  }

  isOn(): boolean {
    return this.getStatus().isOn;
  }

  toogleMute(state: boolean) {
    if (this.isMute() !== state) {
      this.write(Command.MUTE);
    }
  }

  isMute(): boolean {
    return this.getStatus().isMute;
  }

  setVolume(value: number) {
    if (value > 50 ) {
      return;
    }
    let diff = value - this.getVolume();
    const cmd = diff < 0 ? Command.VOLUME_DOWN : Command.VOLUME_UP;
    this.log.debug('Setting volume to %s, difference is %s.', value, diff);

    //the first command only makes the receiver display the current volume
    this.write(cmd, false);
    diff = Math.abs(diff);
    for (let i = 0; i < diff; i++) {
      this.write(cmd);
    }
  }

  getVolume(): number {
    return this.getStatus().volume;
  }

  private getStatus(): DeviceStatus {
    const diff = Date.now() - this.status.lastUpdated;
    this.log.debug('Status was last updated %s ms ago.', diff);
    if (diff > Device.STATUS_THRESHOLD) {
      this.log.debug('Resetting and updating status...');
      this.status.reset();
      this.write(Command.XMIT_STAT);
    }
    return this.status;
  }

  private write(cmd: Command, runCallback = true): void {
    this.port.write(cmd.toString(), (err) => {
      if (err) {
        return this.log.error('Error while writing commad to port: ', err.message);
      }
      this.log.debug('Command written to port', cmd);
      if (runCallback) {
        cmd.callback(this.status);
      }
    });
  }

}