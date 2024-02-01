import {Characteristic, Logger, PlatformAccessory, Service} from 'homebridge';

import {AtelierPlatform} from './atelierPlatform';
import {AtelierDevice} from './atelier/atelierDevice';
import {Cmd} from './atelier/cmd';
import {Input} from './atelier/status';

/**
 * Uses a [Television](https://developers.homebridge.io/#/service/Television) and a
 * [TelevisionSpeaker](https://developers.homebridge.io/#/service/TelevisionSpeaker) to interact with the device.
 * Supports selecting input and sending remote keys.
 */
export class TvAccessory {

  private readonly Characteristic: typeof Characteristic;
  private readonly Service: typeof Service;

  private readonly tv: Service;
  private readonly speaker: Service;
  private readonly loudnessSwitch: Service;
  private readonly volumeFan: Service;
  private readonly speaker1Switch: Service;
  private readonly speaker2Switch: Service;

  private readonly log: Logger;
  private readonly device: AtelierDevice;
  private readonly name: string;
  private readonly maxVolume: number;

  private cmdRegister: Map<number, Cmd> = new Map();
  private statusRegister: Map<string, number> = new Map();
  private playPause = false;

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

    // TV
    this.tv = this.getOrCreateService(this.Service.Television);
    this.tv.setCharacteristic(this.Characteristic.ConfiguredName, this.name);
    this.tv.setCharacteristic(this.Characteristic.SleepDiscoveryMode, this.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    // on/off
    this.tv.getCharacteristic(this.Characteristic.Active)
      .onSet(this.setIsActive.bind(this))
      .onGet(this.getIsActive.bind(this));

    // inputs
    this.tv.setCharacteristic(this.Characteristic.ActiveIdentifier, 1);
    this.tv.getCharacteristic(this.Characteristic.ActiveIdentifier)
      .onSet(this.setActiveId.bind(this))
      .onGet(this.getActiveId.bind(this));

    // remote control input
    this.tv.getCharacteristic(this.Characteristic.RemoteKey)
      .onSet(this.setRemoteKey.bind(this));

    // inputs
    this.createInputService(1, 'TV', Cmd.INPUT_TV, Input.TV);
    this.createInputService(2, 'AM', Cmd.INPUT_AM, Input.AM);
    this.createInputService(3, 'FM', Cmd.INPUT_FM, Input.FM);
    this.createInputService(4, 'Tape 1', Cmd.INPUT_TAPE_1, Input.Tape1);
    this.createInputService(5, 'Tape 2', Cmd.INPUT_TAPE_2, Input.Tape2);
    this.createInputService(6, 'CD', Cmd.INPUT_CD, Input.CD);
    this.createInputService(7, 'PHONO', Cmd.INPUT_PHONO, Input.Phono);

    // tv speaker
    this.speaker = this.getOrCreateService(this.Service.TelevisionSpeaker);
    this.speaker.setCharacteristic(this.Characteristic.Name, this.name);
    this.speaker.setCharacteristic(this.Characteristic.VolumeControlType, this.Characteristic.VolumeControlType.ABSOLUTE);
    this.speaker.getCharacteristic(this.Characteristic.Active)
      .onGet(this.getIsActive.bind(this))
      .onSet(this.setIsActive.bind(this));
    this.speaker.getCharacteristic(this.Characteristic.Volume)
      .onSet(this.setVolume.bind(this))
      .onGet(this.getVolume.bind(this));
    this.speaker.getCharacteristic(this.Characteristic.VolumeSelector)
      .onSet((v) => {
        const cmd = v === this.Characteristic.VolumeSelector.INCREMENT ? Cmd.VOLUME_UP : Cmd.VOLUME_DOWN;
        this.device.enqueue(cmd);
      });
    this.speaker.getCharacteristic(this.Characteristic.Mute)
      .onSet(this.setIsMute.bind(this))
      .onGet(this.getIsMute.bind(this));

    // loudness switch
    this.loudnessSwitch = this.getOrCreateService(this.Service.Switch, `${this.name}_loudness`);
    this.loudnessSwitch.setCharacteristic(this.Characteristic.Name, `Loudness (${this.name})`);
    this.loudnessSwitch.getCharacteristic(this.Characteristic.On)
      .onGet(this.getIsLoudness.bind(this))
      .onSet(this.setIsLoudness.bind(this));
    this.tv.addLinkedService(this.loudnessSwitch);

    // volume fan
    this.volumeFan = this.getOrCreateService(this.Service.Fan, `${this.name}_volume`);
    this.volumeFan.setCharacteristic(this.Characteristic.Name, `Volume (${this.name})`);
    this.volumeFan.getCharacteristic(this.Characteristic.On)
      .onGet(() => !this.getIsMute()) //inverted
      .onSet((v) => this.setIsMute(!v)); //inverted
    this.volumeFan.addCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(this.getVolume.bind(this))
      .onSet(this.setVolume.bind(this));
    this.tv.addLinkedService(this.volumeFan);

    // speaker1 switch
    this.speaker1Switch = this.getOrCreateService(this.Service.Switch, `${this.name}_speaker1`);
    this.speaker1Switch.setCharacteristic(this.Characteristic.Name, `Speaker 1 (${this.name})`);
    this.speaker1Switch.getCharacteristic(this.Characteristic.On)
      .onGet(this.getIsSpeaker1.bind(this))
      .onSet(this.setIsSpeaker1.bind(this));
    this.tv.addLinkedService(this.speaker1Switch);

    // speaker2 switch
    this.speaker2Switch = this.getOrCreateService(this.Service.Switch, `${this.name}_speaker2`);
    this.speaker2Switch.setCharacteristic(this.Characteristic.Name, `Speaker 2 (${this.name})`);
    this.speaker2Switch.getCharacteristic(this.Characteristic.On)
      .onGet(this.getIsSpeaker2.bind(this))
      .onSet(this.setIsSpeaker2.bind(this));
    this.tv.addLinkedService(this.speaker2Switch);

    // device
    this.device = new AtelierDevice(accessory.context.path, this.log);
    this.device.status()
      .on('isOn', () => {
        this.tv.updateCharacteristic(this.Characteristic.Active, this.getIsActive());
        this.speaker.updateCharacteristic(this.Characteristic.Active, this.getIsActive());
      })
      .on('inputSource', () => {
        this.tv.updateCharacteristic(this.Characteristic.ActiveIdentifier, this.getActiveId());
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

  getIsActive() {
    return this.device.status().isOn ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
  }

  setIsActive(value) {
    if (this.getIsActive() !== value) {
      this.device.enqueue(Cmd.ON_OFF);
    }
  }

  getActiveId() {
    return this.statusRegister.get(this.device.status().inputSource)!;
  }

  setActiveId(value) {
    this.device.enqueue(this.cmdRegister.get(value)!);
  }

  setRemoteKey(value) {
    switch(value) {
      case this.Characteristic.RemoteKey.ARROW_UP:
      case this.Characteristic.RemoteKey.ARROW_DOWN: {
        this.log.debug('Unsupported remote key pressed:', value.toString());
        break;
      }
      case this.Characteristic.RemoteKey.PREVIOUS_TRACK: // not present in remote widget as of iOS17
      case this.Characteristic.RemoteKey.REWIND: // not present in remote widget as of iOS17
      case this.Characteristic.RemoteKey.ARROW_LEFT: {
        this.device.enqueue(Cmd.REWIND);
        break;
      }
      case this.Characteristic.RemoteKey.NEXT_TRACK: // not present in remote widget as of iOS17
      case this.Characteristic.RemoteKey.FAST_FORWARD: // not present in remote widget as of iOS17
      case this.Characteristic.RemoteKey.ARROW_RIGHT: {
        this.device.enqueue(Cmd.FAST_FORWARD);
        break;
      }
      case this.Characteristic.RemoteKey.SELECT:
      case this.Characteristic.RemoteKey.PLAY_PAUSE: {
        // guess the state
        const cmd = this.playPause ? Cmd.START : Cmd.PAUSE;
        this.device.enqueue(cmd);
        this.playPause = !this.playPause;
        break;
      }
      // both info and back are usable, so one could be mapped to something else
      case this.Characteristic.RemoteKey.BACK:
      case this.Characteristic.RemoteKey.EXIT: // not present in remote widget as of iOS17
      case this.Characteristic.RemoteKey.INFORMATION: {
        this.device.enqueue(Cmd.STOP);
        break;
      }
    }
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
    this.log.debug('Got a raw volume of %s, adapting to a relative volume of %s%', raw, relative);

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

  private getOrCreateService(service, uniqueId=service) {
    return this.accessory.getService(uniqueId) || this.accessory.addService(service, uniqueId, uniqueId);
  }

  private createInputService(id:number, name:string, cmd:Cmd, status:Input) {
    const input = this.getOrCreateService(this.Service.InputSource, status);
    input.setCharacteristic(this.Characteristic.Identifier, id)
      .setCharacteristic(this.Characteristic.Name, name)
      .setCharacteristic(this.Characteristic.ConfiguredName, name)
      .setCharacteristic(this.Characteristic.IsConfigured, this.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(this.Characteristic.InputSourceType, this.Characteristic.InputSourceType.OTHER);
    this.tv.addLinkedService(input);

    this.cmdRegister.set(id, cmd);
    this.statusRegister.set(status, id);
  }

}
