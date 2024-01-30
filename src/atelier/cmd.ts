import {Status} from './status';

export class Cmd {

  static readonly ON_OFF = new Cmd('0<2', (s) => s.isOn = !s.isOn);
  static readonly VOLUME_UP = new Cmd('0<3', (s) => s.volume+=1);
  static readonly VOLUME_DOWN = new Cmd('0<4', (s) => s.volume-=1);
  static readonly MUTE = new Cmd('0<5', (s) => s.isMute = !s.isMute);
  static readonly LOUDNESS = new Cmd('0;>', (s) => s.isLoudness = !s.isLoudness);
  static readonly XMIT_STAT = new Cmd('0:7', (s) => {
    const then = Date.now();
    s.lastUpdated = then;
    setTimeout(() => {
      if (then === s.lastUpdated) {
        //set offline if nothing has been received within 2 seconds
        s.isOn = false;
      }
    }, 2000);
  });



  private constructor(
    public readonly controlSequence: string,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public readonly callback: (s: Status) => void = () => {},
  ) {
  }

  toString() {
    return this.controlSequence;
  }

}