export class DeviceStatus {

  private readonly regex = new RegExp('^;([0-9]+);\\s*([A-Za-z0-9\\-\\.\\ ]*)');

  constructor(
    public isOn: boolean,
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
    } else {
      return;
    }
  }
}