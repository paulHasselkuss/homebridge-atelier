import {Logger, PlatformAccessory, Service} from 'homebridge';

import {AtelierPlatform} from './platform';
import {Device} from './atelier/device';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AtelierAccessory {
  private readonly switchService: Service;
  private readonly speakerService: Service;
  private readonly log: Logger;
  private readonly device: Device;

  constructor(
    private readonly platform: AtelierPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.log = this.platform.log;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Braun')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.name)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'n/a');

    // switch
    this.switchService = this.getOrCreateService(this.platform.Service.Switch);
    this.switchService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.name);
    this.switchService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));

    // speaker
    this.speakerService = this.getOrCreateService(this.platform.Service.Speaker);
    this.speakerService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.name);
    this.speakerService.getCharacteristic(this.platform.Characteristic.Mute)
      .onGet(this.handleMuteGet.bind(this))
      .onSet(this.handleMuteSet.bind(this));
    this.speakerService.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));
    this.speakerService.getCharacteristic(this.platform.Characteristic.Volume)
      .onGet(this.handleVolumeGet.bind(this))
      .onSet(this.handleVolumeSet.bind(this)); // use with care!

    //device
    this.device = new Device(accessory.context.path, this.log);
    const status = this.device.status();
    status.on('isOn', this.handleOnUpdate.bind(this))
      .on('isMute', this.handleMuteUpdate.bind(this))
      .on('volume', this.handleVolumeUpdate.bind(this));
  }

  async handleOnGet() {
    this.log.debug('Triggered GET On');
    return this.device.status().isOn;
  }

  handleOnUpdate(value) {
    this.log.debug('Triggered UPDATE On');
    this.switchService.updateCharacteristic(this.platform.Characteristic.On, value);
    this.speakerService.updateCharacteristic(this.platform.Characteristic.Active, value);
  }

  async handleOnSet(value) {
    this.log.debug('Triggered SET On:', value);
    this.device.isOn(value);
  }

  async handleMuteGet() {
    this.log.debug('Triggered GET Mute');
    return this.device.status().isMute;
  }

  handleMuteUpdate(value) {
    this.log.debug('Triggered UPDATE Mute');
    this.speakerService.updateCharacteristic(this.platform.Characteristic.Mute, value);
  }

  async handleMuteSet(value) {
    this.log.debug('Triggered SET Mute:', value);
    this.device.isMute(value);
  }

  async handleVolumeGet() {
    this.log.debug('Triggered GET Volume');
    return this.device.status().volume;
  }

  handleVolumeUpdate(value) {
    this.log.debug('Triggered UPDATE Volume');
    this.speakerService.updateCharacteristic(this.platform.Characteristic.Volume, value);
  }

  async handleVolumeSet(value) {
    this.log.debug('Triggered SET Volume:', value);
    this.device.volume(value);
  }

  private getOrCreateService(service) {
    return this.accessory.getService(service) || this.accessory.addService(service);
  }

}
