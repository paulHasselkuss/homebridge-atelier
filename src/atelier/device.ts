import { Logger } from 'homebridge';
import { CmdHandler } from './cmdHandler';
import { DeviceState } from './deviceState';
import { Cmd } from './cmd';
import { Input } from './input';
import assert from 'assert';

export class Device {

  private static STATUS_UPDATE_THRESHOLD = 60 * 1000;
  private stateRequested = new Date(0);

  constructor(
    private readonly path: string,
    private readonly log: Logger,
    private readonly state = new DeviceState(),
    private readonly cmdHandler = new CmdHandler(path, state, log),
  ) { }

  shutdown() {
    this.cmdHandler.shutdown();
  }

  tooglePower(on: boolean) {
    // eslint-disable-next-line eqeqeq
    if (this.state.isOn != on) {
      this.cmdHandler.enqueCmd(Cmd.ON_OFF);
      this.state.isOn = on;
    }
  }

  toogleMute(on: boolean) {
    // eslint-disable-next-line eqeqeq
    if (this.state.isMute != on) {
      this.cmdHandler.enqueCmd(Cmd.MUTE);
      this.state.isMute = on;
    }
  }

  toogleLoudness(on: boolean) {
    // eslint-disable-next-line eqeqeq
    if (this.state.isLoudness != on) {
      this.cmdHandler.enqueCmd(Cmd.LOUDNESS);
      this.state.isLoudness = on;
    }
  }

  increaseVolume() {
    this.cmdHandler.enqueCmd(Cmd.VOLUME_UP);
    if (this.cmdHandler.wasStateUpdated() && this.state.volume < 100) {
      this.state.volume++;
    }
  }

  decreaseVolume() {
    this.cmdHandler.enqueCmd(Cmd.VOLUME_DOWN);
    if (this.cmdHandler.wasStateUpdated() && this.state.volume > 0) {
      this.state.volume--;
    }
  }

  setVolume(target: number) {
    assert(target >= 0 && target <= 100, 'Volume target must be between 0 and 100.');
    if (this.state.volume != target) {
      this.cmdHandler.enqueueVolChange(target);
      this.state.volume = target;
    }
  }

  setInput(to: Input) {
    // eslint-disable-next-line eqeqeq
    if (this.state.inputSource != to) {
      this.cmdHandler.enqueCmd(this.toCmd(to));
      this.state.inputSource = to;
    }
  }

  getState() {
    const diff = Date.now() - this.stateRequested.getTime();
    this.log.debug('Status was last updated %s ms ago (treshold is %s).', diff, Device.STATUS_UPDATE_THRESHOLD);
    this.log.debug('Current status is: \n', JSON.stringify(this.state, null, 2));

    if (diff > Device.STATUS_UPDATE_THRESHOLD && !this.cmdHandler.isEnqueued(Cmd.XMIT_STAT)) {
      this.log.debug('Updating status...');
      this.cmdHandler.enqueCmd(Cmd.XMIT_STAT);
      this.stateRequested = new Date();
    }
    return this.state;
  }

  stop() {
    this.cmdHandler.enqueCmd(Cmd.STOP);
  }

  pause() {
    this.cmdHandler.enqueCmd(Cmd.PAUSE);
  }

  start() {
    this.cmdHandler.enqueCmd(Cmd.START);
  }

  fastForward() {
    this.cmdHandler.enqueCmd(Cmd.FAST_FORWARD);
  }

  rewind() {
    this.cmdHandler.enqueCmd(Cmd.REWIND);
  }

  private toCmd(input: Input) {
    switch (input) {
      case Input.AM: return Cmd.INPUT_AM;
      case Input.FM: return Cmd.INPUT_FM;
      case Input.CD: return Cmd.INPUT_CD;
      case Input.Tape1: return Cmd.INPUT_TAPE_1;
      case Input.Tape2: return Cmd.INPUT_TAPE_2;
      case Input.Phono: return Cmd.INPUT_PHONO;
      case Input.TV: return Cmd.INPUT_TV;
      default: throw Error('Unexpected Input.');
    }
  }
}
