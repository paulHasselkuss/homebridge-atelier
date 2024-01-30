import {Logger, PlatformAccessory, Service} from 'homebridge';

import {AtelierPlatform} from './platform';
import {Device} from './atelier/device';

export class AtelierAccessory {
  private readonly speakerService: Service;
  private readonly switchService: Service;
  private readonly fanService: Service;
  private readonly log: Logger;
  private readonly device: Device;
  private readonly maxVolume: number;

  constructor(
    private readonly platform: AtelierPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.log = this.platform.log;
    this.maxVolume = accessory.context.maxVolume;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Braun')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.name);

    // speaker
    this.speakerService = this.getOrCreateService(this.platform.Service.SmartSpeaker);
    this.speakerService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.name);

    this.speakerService.getCharacteristic(this.platform.Characteristic.Volume)
      .onGet(this.handleVolumeGet.bind(this))
      .onSet(this.handleVolumeSet.bind(this));
    this.speakerService.getCharacteristic(this.platform.Characteristic.Mute)
      .onGet(this.handleMuteGet.bind(this))
      .onSet(this.handleMuteSet.bind(this));
    this.speakerService.getCharacteristic(this.platform.Characteristic.CurrentMediaState)
      .onGet(this.handleCurrentMediaStateGet.bind(this));
    this.speakerService.getCharacteristic(this.platform.Characteristic.TargetMediaState)
      .onGet(this.handleCurrentMediaStateGet.bind(this))
      .onSet(this.handleTargetMediaStateSet.bind(this));

    // switch
    this.switchService = this.getOrCreateService(this.platform.Service.Switch);
    this.switchService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.name);
    this.switchService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));
    this.speakerService.addLinkedService(this.switchService);

    this.fanService = this.getOrCreateService(this.platform.Service.Fan);
    this.fanService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.name);
    this.fanService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(async () => {
        return !await this.handleOnGet();
      })
      .onSet(async (value) => {
        await this.handleOnSet(!value);
      });
    this.fanService.addCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onGet(this.handleVolumeGet.bind(this))
      .onSet(this.handleVolumeSet.bind(this));
    this.speakerService.addLinkedService(this.fanService);

    //device
    this.device = new Device(accessory.context.path, this.log);
    const status = this.device.status();
    status.on('isOn', this.handleOnUpdate.bind(this))
      .on('isMute', this.handleMuteUpdate.bind(this))
      .on('volume', this.handleVolumeUpdate.bind(this));

    this.platform.api.on('shutdown', () => {
      this.log.debug('Executed shutdown callback');
      this.device.shutdown();
    });
  }

  async handleCurrentMediaStateGet(){
    if (await this.handleOnGet()) {
      return this.platform.Characteristic.CurrentMediaState.PLAY;
    } else {
      return this.platform.Characteristic.CurrentMediaState.STOP;
    }
  }

  async handleTargetMediaStateSet(value) {
    await this.handleOnSet(value === this.platform.Characteristic.CurrentMediaState.PLAY);
  }

  async handleOnGet() {
    this.log.debug('Triggered GET On');
    return this.device.status().isOn;
  }

  async handleOnSet(value) {
    this.log.debug('Triggered SET On:', value);
    this.device.isOn(value);
  }

  handleOnUpdate(value) {
    this.log.debug('Triggered UPDATE On');
    this.switchService.updateCharacteristic(this.platform.Characteristic.On, value);
    this.speakerService.updateCharacteristic(this.platform.Characteristic.CurrentMediaState,
      value ? this.platform.Characteristic.CurrentMediaState.PLAY : this.platform.Characteristic.CurrentMediaState.STOP);
  }

  async handleMuteGet() {
    this.log.debug('Triggered GET Mute');
    return this.device.status().isMute;
  }

  async handleMuteSet(value) {
    this.log.debug('Triggered SET Mute:', value);
    this.device.isMute(value);
  }

  handleMuteUpdate(value) {
    this.log.debug('Triggered UPDATE Mute');
    this.speakerService.updateCharacteristic(this.platform.Characteristic.Mute, value);
    this.fanService.updateCharacteristic(this.platform.Characteristic.On, !value);
  }

  async handleVolumeGet() {
    this.log.debug('Triggered GET Volume');
    const volume = this.device.status().volume;
    return this.toPercent(volume);
  }

  async handleVolumeSet(value) {
    this.log.debug('Triggered SET Volume:', value);
    this.device.volume(this.toAbsolute(value));
  }

  handleVolumeUpdate(value) {
    this.log.debug('Triggered UPDATE Volume');
    const percent = this.toPercent(value);
    this.speakerService.updateCharacteristic(this.platform.Characteristic.Volume, percent);
    this.fanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, percent);
  }

  private getOrCreateService(service) {
    return this.accessory.getService(service) || this.accessory.addService(service);
  }

  private toPercent(input: number) {
    return Math.round(input / this.maxVolume * 100);
  }

  private toAbsolute(percent) {
    return Math.round(this.maxVolume / 100 * percent);
  }

}
