import EventEmitter from 'events';
import { Input } from './input';

export class DeviceState extends EventEmitter {
  private static REGEX = new RegExp('^;([0-9]+);\\s*([A-Za-z0-9\\-\\.\\ ]*)');

  private _isOn = false;
  private _volume = 40;
  private _isMute = false;
  private _isLoudness = false;
  private _inputSource = Input.TV;
  private _timestamp = new Date();

  set isOn(value: boolean) {
    this._isOn = value;
    this.emit('isOn', value);
  }

  get isOn() {
    return this._isOn;
  }

  set volume(value: number) {
    this._volume = value;
    this.emit('volume', value);
  }

  get volume() {
    return this._volume;
  }

  set isMute(value: boolean) {
    this._isMute = value;
    this.emit('isMute', value);
  }

  get isMute() {
    return this._isMute;
  }

  set isLoudness(value: boolean) {
    this._isLoudness = value;
    this.emit('isLoudness', value);
  }

  get isLoudness() {
    return this._isLoudness;
  }

  set inputSource(value: Input) {
    this._inputSource = value;
    this.emit('inputSource', value);
  }

  get inputSource() {
    return this._inputSource;
  }

  get timestamp() {
    return this._timestamp;
  }

  updateFromInput(input: string): void {
    const matches = input.match(DeviceState.REGEX);

    if (!matches || !matches[1]) {
      //invalid format
      return;
    }

    this._timestamp = new Date();

    if (matches[1] === '0') {
      this.isOn = true;
    } else if (matches[1] === '1') {
      this.volume = +matches[2];
    } else if (matches[1] === '5') {
      this.isLoudness = this.toBoolean(matches[2]);
    } else if (matches[1] === '6') {
      this.isMute = this.toBoolean(matches[2]);
    } else if (matches[1] === '7') {
      this.inputSource = <Input>matches[2];
    }
  }

  private toBoolean(input: string) {
    return input.charAt(0) === 'Y';
  }
}
