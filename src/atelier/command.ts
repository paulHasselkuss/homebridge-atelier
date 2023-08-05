import {DeviceStatus} from './deviceStatus';

type CommandCallback = (oldStatus: DeviceStatus) => void;

export class Command {

  static readonly ON_OFF = new Command('0<2', (s) => {s.isOn = !s.isOn;});
  static readonly VOLUME_UP = new Command('0<3', (s) => {s.volume+=1;});
  static readonly VOLUME_DOWN = new Command('0<4', (s) => {s.volume-=1;});
  static readonly MUTE = new Command('0<5', (s) => {s.isMute = !s.isMute;});
  static readonly XMIT_STAT = new Command('0:7');

  private constructor(controlSequence: string);
  private constructor(controlSequence: string, callback: CommandCallback);

  private constructor(
    private readonly controlSequence: string,
    private readonly _callback?: CommandCallback,
  ) {
  }

  toString() {
    return this.controlSequence;
  }

  callback(oldStatus: DeviceStatus) {
    if (this._callback) {
      this._callback(oldStatus);
    }
  }

}