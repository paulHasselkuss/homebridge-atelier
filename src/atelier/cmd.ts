import {Input, Status} from './status';

export class Cmd {

  static readonly ON_OFF = new Cmd('0<2', (s) => s.isOn = !s.isOn);
  static readonly VOLUME_UP = new Cmd('0<3', (s) => s.volume+=1);
  static readonly VOLUME_DOWN = new Cmd('0<4', (s) => s.volume-=1);
  static readonly MUTE = new Cmd('0<5', (s) => s.isMute = !s.isMute);
  static readonly LOUDNESS = new Cmd('0;>', (s) => s.isLoudness = !s.isLoudness);
  static readonly INPUT_AM = new Cmd('0<9', (s) => s.inputSource = Input.AM);
  static readonly INPUT_FM = new Cmd('0<<', (s) => s.inputSource = Input.FM);
  static readonly INPUT_CD = new Cmd('0<>', (s) => s.inputSource = Input.CD);
  static readonly INPUT_PHONO = new Cmd('0<=', (s) => s.inputSource = Input.Phono);
  static readonly INPUT_TV = new Cmd('0<;', (s) => s.inputSource = Input.TV);
  static readonly INPUT_TAPE_1 = new Cmd('09?', (s) => s.inputSource = Input.Tape1);
  static readonly INPUT_TAPE_2 = new Cmd('09@', (s) => s.inputSource = Input.Tape2);
  static readonly SPEAKER_1 = new Cmd('0<?', (s) => s.isSpeaker1 = !s.isSpeaker1);
  static readonly SPEAKER_2 = new Cmd('0<@', (s) => s.isSpeaker2 = !s.isSpeaker2);
  static readonly STOP = new Cmd('0:4');
  static readonly PAUSE = new Cmd('0:5');
  static readonly START = new Cmd('0:6');
  static readonly FAST_FORWARD = new Cmd('0:2');
  static readonly REWIND = new Cmd('0:3');
  static readonly XMIT_STAT = new Cmd('0:7', (s) => {
    const then = Date.now();
    s.lastUpdated = then;

    //set offline if nothing has been received within 2 seconds
    setTimeout(() => {
      if (then === s.lastUpdated) {
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