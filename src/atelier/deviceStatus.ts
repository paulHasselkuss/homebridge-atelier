import EventEmitter from "events";

export class DeviceStatus extends EventEmitter {

  private readonly regex = new RegExp('^;([0-9]+);\\s*([A-Za-z0-9\\-\\.\\ ]*)');

  constructor(
    private _isOn: boolean,
    private _volume: number,
    private _isMute: boolean,
    public lastUpdated: number,
  ) { super();}

  set isOn(value: boolean) {
    this._isOn = value;
    this.lastUpdated = Date.now();
    this.emit("isOn", this._isOn);
  }

  set volume(value: number) {
    this._volume = value;
    this.lastUpdated = Date.now();
    this.emit("volume", this._volume);
  }

  set isMute(value: boolean) {
    this._isMute = value;
    this.lastUpdated = Date.now();
    this.emit("isMute", this._isMute);
  }

  get isOn() {
    return this._isOn;
  }

  get volume() {
    return this._volume;
  }

  get isMute() {
    return this._isMute;
  }

  public updateFromInput(input: string): void {
    const matches = input.match(this.regex);

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