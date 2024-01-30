import {Characteristic, Logger, PlatformAccessory, Service} from 'homebridge';

import {AtelierPlatform} from './atelierPlatform';
import {AtelierDevice} from './atelier/atelierDevice';
import {Cmd} from './atelier/cmd';

export class AtelierAccessory {

  private readonly Characteristic: typeof Characteristic;
  private readonly Service: typeof Service;

  private readonly speaker: Service;
  private readonly onOffSwitch: Service;
  private readonly volumeFan: Service;
  private readonly log: Logger;
  private readonly device: AtelierDevice;
  private readonly maxVolume: number;

  constructor(
    platform: AtelierPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.Characteristic = platform.Characteristic;
    this.Service = platform.Service;
    this.log = platform.log;

    this.maxVolume = accessory.context.maxVolume;

    // accessory information
    this.accessory.getService(this.Service.AccessoryInformation)!
      .setCharacteristic(this.Characteristic.Manufacturer, 'Braun AG')
      .setCharacteristic(this.Characteristic.Model, accessory.context.model);

    // speaker
    this.speaker = this.getOrCreateService(this.Service.SmartSpeaker);
    this.speaker.getCharacteristic(this.Characteristic.Volume)
      .onGet(this.getVolume.bind(this))
      .onSet(this.setVolume.bind(this));
    this.speaker.getCharacteristic(this.Characteristic.Mute)
      .onGet(this.getIsMute.bind(this))
      .onSet(this.setIsMute.bind(this));
    this.speaker.getCharacteristic(this.Characteristic.CurrentMediaState)
      .onGet(this.getIsActive.bind(this));
    this.speaker.getCharacteristic(this.Characteristic.TargetMediaState)
      .onGet(this.getIsActive.bind(this))
      .onSet(this.setIsActive.bind(this));

    // switch
    this.onOffSwitch = this.getOrCreateService(this.Service.Switch);
    this.onOffSwitch.getCharacteristic(this.Characteristic.On)
      .onGet(this.getIsOn.bind(this))
      .onSet(this.setIsOn.bind(this));
    this.speaker.addLinkedService(this.onOffSwitch);

    // fan
    this.volumeFan = this.getOrCreateService(this.Service.Fan);
    this.volumeFan.getCharacteristic(this.Characteristic.On)
      .onGet(() => !this.getIsMute()) //inverted
      .onSet((v) => this.setIsMute(!v)); //inverted
    this.volumeFan.addCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(this.getVolume.bind(this))
      .onSet(this.setVolume.bind(this));
    this.speaker.addLinkedService(this.volumeFan);

    // device
    this.device = new AtelierDevice(accessory.context.path, this.log);
    this.device.status()
      .on('isOn', () => {
        this.speaker.updateCharacteristic(this.Characteristic.CurrentMediaState, this.getIsActive());
        this.onOffSwitch.updateCharacteristic(this.Characteristic.On, this.getIsOn());
      })
      .on('isMute', () => {
        this.speaker.updateCharacteristic(this.Characteristic.Mute, this.getIsMute());
        this.volumeFan.updateCharacteristic(this.Characteristic.On, !this.getIsMute()); //inverted
      })
      .on('volume', () => {
        this.speaker.updateCharacteristic(this.Characteristic.Volume, this.getVolume());
        this.volumeFan.updateCharacteristic(this.Characteristic.RotationSpeed, this.getVolume());
      });

    // shutdown hook
    platform.api.on('shutdown', () => {
      this.device.shutdown();
    });
  }

  getIsOn() {
    return this.device.status().isOn;
  }

  setIsOn(value) {
    if (this.getIsOn() !== value) {
      this.device.enqueue(Cmd.ON_OFF);
    }
  }

  getIsActive() {
    return this.getIsOn() ? this.Characteristic.CurrentMediaState.PLAY : this.Characteristic.CurrentMediaState.STOP;
  }

  setIsActive(value) {
    this.setIsOn(value === this.Characteristic.CurrentMediaState.PLAY);
  }

  getIsMute() {
    return this.device.status().isMute;
  }

  setIsMute(value) {
    if (this.getIsMute() !== value) {
      this.device.enqueue(Cmd.MUTE);
    }
  }

  getVolume() {
    const raw = this.device.status().volume;
    const relative = Math.round(raw / this.maxVolume * 100);
    this.log.debug('Got a raw volume of %s from the device, adapting to a relative volume of %s%', raw, relative);

    return relative;
  }

  setVolume(relative) {
    const raw = Math.round(this.maxVolume / 100 * relative);
    this.log.debug('Got a relative volume of %s, adapting to a raw volume of %s', relative, raw);
    this.device.volumeChange(raw);
  }

  private getOrCreateService(service, name=this.accessory.context.name) {
    const ret = this.accessory.getService(service) || this.accessory.addService(service);
    return ret.setCharacteristic(this.Characteristic.Name, name);
  }

}
