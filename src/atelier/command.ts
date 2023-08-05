import { DeviceStatus } from './deviceStatus';

type CommandCallback = (oldStatus: DeviceStatus) => void;

export class Command {

  static readonly ON_OFF = new Command('0<2', (s)=>{
    s.isOn = !s.isOn;
  });

  static readonly XMIT_STAT = new Command('0:7');

  private constructor(controlSequence: string);
  private constructor(controlSequence: string, callback: CommandCallback);

  private constructor(
    private readonly controlSequence: string,
    private readonly _callback?: CommandCallback,
  ) { }

  toString() {
    return this.controlSequence;
  }

  callback(oldStatus: DeviceStatus) {
    if (this._callback) {
      this._callback(oldStatus);
    }
  }

}