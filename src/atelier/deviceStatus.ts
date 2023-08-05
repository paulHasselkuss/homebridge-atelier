export class DeviceStatus {

  private readonly regex = new RegExp('^;([0-9]+);\\s*([A-Za-z0-9\\-\\.\\ ]*)');

  constructor(
    public isOn: boolean,
    public volume: number,
    public isMute: boolean,
    public lastUpdated: number,
  ) { }

  public reset(): void {
    this.lastUpdated = Date.now();
    this.isOn = false;
  }

  public updateFromInput(input: string): void {
    this.lastUpdated = Date.now();
    const matches = input.match(this.regex);

    if (matches === null || !matches[1]) {
      return;
    }
    if (matches[1] === '0') {
      this.isOn = true;
    } else if (matches[1] === '1'){
      this.volume = +matches[2];
    } else if (matches[1] === '6'){
      this.isMute = this.parseBoolean(matches[2]);
    } else {
      return;
    }
  }

  private parseBoolean(str: string): boolean {
    return str.charAt(1) === 'Y';
  }
}