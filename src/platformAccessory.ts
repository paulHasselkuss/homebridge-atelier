import {Logger, PlatformAccessory, Service} from 'homebridge';

import {AtelierPlatform} from './platform';
import { Device } from './atelier/device';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AtelierAccessory {
  private readonly switchService: Service;
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

    // get the Switch service if it exists, otherwise create a new Switch service
    // you can create multiple services for each accessory
    this.switchService = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `name` method.
    this.switchService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Switch

    // register handlers for the On/Off Characteristic
    this.switchService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));
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

}
