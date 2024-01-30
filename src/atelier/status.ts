import EventEmitter from 'events';

export class Status extends EventEmitter {

  private static REGEX = new RegExp('^;([0-9]+);\\s*([A-Za-z0-9\\-\\.\\ ]*)');

  private constructor(
    private _isOn: boolean,
    private _volume: number,
    private _isMute: boolean,
    private _lastUpdated: number,
  ) {
    super();
  }

  static createDummy() {
    return new Status(false, 40, false, 0);
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
    } else if (matches[1] === '6'){
      this.isMute = matches[2].charAt(1) === 'Y';
    } else {
      return;
    }
  }
}