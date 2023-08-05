import {Logger, PlatformAccessory, Service, WithUUID} from 'homebridge';

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
    this.device = new Device(accessory.context.path, this.log);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Braun')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.name)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '000000');

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
      .onGet(this.handleVolumeGet.bind(this));
      //.onSet(this.handleVolumeSet.bind(this));
  }

  /**
   * Handle requests to get the current value of the "On" characteristic
   */
  async handleOnGet() {
    this.log.debug('Triggered GET On');
    return this.device.isOn();
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  async handleOnSet(value) {
    this.log.debug('Triggered SET On:', value);
    this.device.toogleOnOff(value);
  }

  /**
   * Handle requests to get the current value of the "On" characteristic
   */
  async handleMuteGet() {
    this.log.debug('Triggered GET Mute');
    return this.device.isMute();
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  async handleMuteSet(value) {
    this.log.debug('Triggered SET Mute:', value);
    this.device.toogleMute(value);
  }

  async handleVolumeGet() {
    this.log.debug('Triggered GET Volume');
    return this.device.getVolume();
  }

  async handleVolumeSet(value) {
    this.log.debug('Triggered SET Volume:', value);
    this.device.setVolume(value);
  }

  private getOrCreateService(name: string | WithUUID<any>) {
    return this.accessory.getService(name) || this.accessory.addService(name);
  }

}
