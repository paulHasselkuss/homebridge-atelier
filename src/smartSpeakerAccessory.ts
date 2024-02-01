import {Characteristic, Logger, PlatformAccessory, Service} from 'homebridge';

import {AtelierPlatform} from './atelierPlatform';
import {AtelierDevice} from './atelier/atelierDevice';
import {Cmd} from './atelier/cmd';

/**
 * Uses a [SmartSpeaker](https://developers.homebridge.io/#/service/SmartSpeaker) to interact with the device.
 * Input selection and remote keys are not supported.
 */
export class SmartSpeakerAccessory {

  private readonly Characteristic: typeof Characteristic;
  private readonly Service: typeof Service;

  private readonly speaker: Service;
  private readonly onOffSwitch: Service;
  private readonly loudnessSwitch: Service;
  private readonly volumeFan: Service;
  private readonly speaker1Switch: Service;
  private readonly speaker2Switch: Service;

  private readonly log: Logger;
  private readonly device: AtelierDevice;
  private readonly name: string;
  private readonly maxVolume: number;

  constructor(
    platform: AtelierPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.Characteristic = platform.Characteristic;
    this.Service = platform.Service;
    this.log = platform.log;

    this.name = accessory.context.name;
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

    // on/off switch
    this.onOffSwitch = this.getOrCreateService(this.Service.Switch, `${this.name}_power`, `Power (${this.name})`);
    this.onOffSwitch.getCharacteristic(this.Characteristic.On)
      .onGet(this.getIsOn.bind(this))
      .onSet(this.setIsOn.bind(this));
    this.speaker.addLinkedService(this.onOffSwitch);

    // loudness switch
    this.loudnessSwitch = this.getOrCreateService(this.Service.Switch, `${this.name}_loudness`, `Loudness (${this.name})`);
    this.loudnessSwitch.getCharacteristic(this.Characteristic.On)
      .onGet(this.getIsLoudness.bind(this))
      .onSet(this.setIsLoudness.bind(this));
    this.speaker.addLinkedService(this.loudnessSwitch);

    // fan
    this.volumeFan = this.getOrCreateService(this.Service.Fan, `${this.name}_volume`, `Volume (${this.name})`);
    this.volumeFan.getCharacteristic(this.Characteristic.On)
      .onGet(() => !this.getIsMute()) //inverted
      .onSet((v) => this.setIsMute(!v)); //inverted
    this.volumeFan.addCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(this.getVolume.bind(this))
      .onSet(this.setVolume.bind(this));
    this.speaker.addLinkedService(this.volumeFan);

    // speaker1 switch
    this.speaker1Switch = this.getOrCreateService(this.Service.Switch, `${this.name}_speaker1`, `Speaker 1 (${this.name})`);
    this.speaker1Switch.getCharacteristic(this.Characteristic.On)
      .onGet(this.getIsSpeaker1.bind(this))
      .onSet(this.setIsSpeaker1.bind(this));
    this.speaker.addLinkedService(this.speaker1Switch);

    // speaker2 switch
    this.speaker2Switch = this.getOrCreateService(this.Service.Switch, `${this.name}_speaker2`, `Speaker 2 (${this.name})`);
    this.speaker2Switch.getCharacteristic(this.Characteristic.On)
      .onGet(this.getIsSpeaker2.bind(this))
      .onSet(this.setIsSpeaker2.bind(this));
    this.speaker.addLinkedService(this.speaker2Switch);

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
      .on('isLoudness', () => {
        this.loudnessSwitch.updateCharacteristic(this.Characteristic.On, this.getIsLoudness());
      })
      .on('volume', () => {
        this.speaker.updateCharacteristic(this.Characteristic.Volume, this.getVolume());
        this.volumeFan.updateCharacteristic(this.Characteristic.RotationSpeed, this.getVolume());
      })
      .on('isSpeaker1', () => {
        this.speaker1Switch.updateCharacteristic(this.Characteristic.On, this.getIsSpeaker1());
      })
      .on('isSpeaker2', () => {
        this.speaker2Switch.updateCharacteristic(this.Characteristic.On, this.getIsSpeaker2());
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

  getIsLoudness() {
    return this.device.status().isLoudness;
  }

  setIsLoudness(value) {
    if (this.getIsLoudness() !== value) {
      this.device.enqueue(Cmd.LOUDNESS);
    }
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

  getIsSpeaker1() {
    return this.device.status().isSpeaker1;
  }

  setIsSpeaker1(value) {
    if (this.getIsSpeaker1() !== value) {
      this.device.enqueue(Cmd.SPEAKER_1);
    }
  }

  getIsSpeaker2() {
    return this.device.status().isSpeaker2;
  }

  setIsSpeaker2(value) {
    if (this.getIsSpeaker2() !== value) {
      this.device.enqueue(Cmd.SPEAKER_2);
    }
  }

  private getOrCreateService(service, uniqueId=service, name=this.name) {
    const ret = this.accessory.getService(uniqueId) || this.accessory.addService(service, uniqueId, uniqueId);
    return ret.setCharacteristic(this.Characteristic.Name, name);
  }

}
