import EventEmitter from 'events';

export const enum Input {
  AM = 'AM',
  FM = 'FM',
  CD = 'CD',
  Tape1 = 'T1',
  Tape2 = 'T2',
  Phono = 'PH',
  TV = 'TV'
}

export class Status extends EventEmitter {

  private static REGEX = new RegExp('^;([0-9]+);\\s*([A-Za-z0-9\\-\\.\\ ]*)');

  private constructor(
    private _isOn: boolean,
    private _volume: number,
    private _isMute: boolean,
    private _isLoudness: boolean,
    private _inputSource: Input,
    private _isSpeaker1: boolean,
    private _isSpeaker2: boolean,
    private _lastUpdated: number,
  ) {
    super();
  }

  static createDummy() {
    return new Status(false, 40, false, false, Input.TV, true, false, 0);
  }

  set isOn(value: boolean) {
    this._isOn = value;
    this._lastUpdated = Date.now();
    this.emit('isOn', this._isOn);
  }

  get isOn() {
    return this._isOn;
  }

  set volume(value: number) {
    this._volume = value;
    this._lastUpdated = Date.now();
    this.emit('volume', this._volume);
  }

  get volume() {
    return this._volume;
  }

  set isMute(value: boolean) {
    this._isMute = value;
    this._lastUpdated = Date.now();
    this.emit('isMute', this._isMute);
  }

  get isMute() {
    return this._isMute;
  }

  set isLoudness(value: boolean) {
    this._isLoudness = value;
    this._lastUpdated = Date.now();
    this.emit('isLoudness', value);
  }

  get isLoudness() {
    return this._isLoudness;
  }

  set inputSource(value: Input) {
    this._inputSource = value;
    this._lastUpdated = Date.now();
    this.emit('inputSource', value);
  }

  get inputSource() {
    return this._inputSource;
  }

  get isSpeaker1(): boolean {
    return this._isSpeaker1;
  }

  set isSpeaker1(value: boolean) {
    this._isSpeaker1 = value;
    this._lastUpdated = Date.now();
    this.emit('isSpeaker1', value);
  }

  get isSpeaker2(): boolean {
    return this._isSpeaker2;
  }

  set isSpeaker2(value: boolean) {
    this._isSpeaker2 = value;
    this._lastUpdated = Date.now();
    this.emit('isSpeaker2', value);
  }

  set lastUpdated(value: number) {
    //this is useful if the update cmd is executed and one waits for a reply
    this._lastUpdated = value;
  }

  get lastUpdated() {
    return this._lastUpdated;
  }

  updateFromInput(input: string): void {
    const matches = input.match(Status.REGEX);

    if (!matches || !matches[1]) {
      return;
    }

    if (matches[1] === '0') {
      this.isOn = true;
    } else if (matches[1] === '1'){
      this.volume = +matches[2] ;
    } else if (matches[1] === '5'){
      this.isLoudness = this.toBoolean(matches[2]);
    } else if (matches[1] === '6'){
      this.isMute = this.toBoolean(matches[2]);
    } else if (matches[1] === '7'){
      this.inputSource = <Input>matches[2];
    } else if (matches[1] === '8') {
      this.isSpeaker1 = this.toBoolean(matches[2]);
    } else if (matches[1] === '9') {
      this.isSpeaker2 = this.toBoolean(matches[2]);
    }else {
      return;
    }
  }

  private toBoolean(input:string) {
    return input.charAt(0) === 'Y';
  }
}