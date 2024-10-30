import assert from 'assert';
import { Logger } from 'homebridge';
import { Cmd } from './cmd';
import { CmdHandler } from './cmdHandler';
import { DeviceState } from './deviceState';
import { Input } from './input';

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
    this.refreshState(() => {
      if (this.state.isOn !== on) {
        this.cmdHandler.enqueCmd(Cmd.ON_OFF, () => this.state.isOn = on);
      }
    });
  }

  toogleMute(on: boolean) {
    if (this.state.isMute !== on) {
      this.cmdHandler.enqueCmd(Cmd.MUTE, () => this.state.isMute = on);
    }
  }

  toogleLoudness(on: boolean) {
    if (this.state.isLoudness !== on) {
      this.cmdHandler.enqueCmd(Cmd.LOUDNESS, () => this.state.isLoudness = on);
    }
  }

  increaseVolume() {
    this.cmdHandler.enqueCmd(Cmd.VOLUME_UP, () => {
      if (this.cmdHandler.wasDeviceUpdated() && this.state.volume < 100) {
        this.state.volume++;
      }
    });
  }

  decreaseVolume() {
    this.cmdHandler.enqueCmd(Cmd.VOLUME_DOWN, () => {
      if (this.cmdHandler.wasDeviceUpdated() && this.state.volume > 0) {
        this.state.volume--;
      }
    });
  }

  setVolume(target: number) {
    assert(target >= 0 && target <= 100, 'Volume target must be between 0 and 100.');
    if (this.state.volume !== target) {
      this.cmdHandler.enqueueVolChange(target);
      this.state.volume = target;
    }
  }

  setInput(to: Input) {
    if (this.state.inputSource !== to) {
      this.cmdHandler.enqueCmd(this.toCmd(to), () => this.state.inputSource = to);
    }
  }

  getState() {
    this.refreshState();
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

  // when callback is run, we know if the device is online or offline
  // either, the status is still recent or XMIT_STAT is enqueued
  // callback is called about 500ms after XMIT_STAT was written
  private refreshState(callback = () => { }) {
    const diff = Date.now() - this.stateRequested.getTime();
    this.log.debug('Status was last updated %s ms ago (treshold is %s).', diff, Device.STATUS_UPDATE_THRESHOLD);
    this.log.debug('Current status is: \n', JSON.stringify(this.state, null, 2));

    if (diff > Device.STATUS_UPDATE_THRESHOLD) {
      this.log.debug('Updating status...');
      this.cmdHandler.enqueCmd(Cmd.XMIT_STAT, callback);
      this.stateRequested = new Date();
    } else {
      callback();
    }
  }
}
