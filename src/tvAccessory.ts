import { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { BiMap } from 'mnemonist';
import { Device } from './atelier/device';
import { Input } from './atelier/input';
import { AtelierPlatform } from './atelierPlatform';

export class TvAccessory {

  private readonly main: Service;
  private readonly device: Device;
  private readonly name: string;
  private readonly maxVolume: number;
  private readonly statusRegister = new BiMap<Input, CharacteristicValue>();

  constructor(
    platform: AtelierPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly log = platform.log,
    private readonly Characteristic = platform.Characteristic,
    private readonly Service = platform.Service,
  ) {
    this.name = this.accessory.context.name;
    this.maxVolume = this.accessory.context.maxVolume;
    this.device = new Device(accessory.context.path, this.log, accessory.context.state);

    // Accessory Information
    accessory.getService(this.Service.AccessoryInformation)!
      .setCharacteristic(this.Characteristic.Manufacturer, 'Braun AG')
      .setCharacteristic(this.Characteristic.Model, accessory.context.model);

    // TV
    this.main = this.getOrCreateService(this.Service.Television);
    this.main.setCharacteristic(this.Characteristic.ConfiguredName, this.name);
    this.main.setCharacteristic(this.Characteristic.SleepDiscoveryMode, this.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    // TV: on/off
    this.main.getCharacteristic(this.Characteristic.Active)
      .onGet(() => this.device.getState().isOn)
      .onSet(v => this.device.tooglePower(this.toBoolean(v)));

    // TV: inputs
    this.main.setCharacteristic(this.Characteristic.ActiveIdentifier, 1);
    this.main.getCharacteristic(this.Characteristic.ActiveIdentifier)
      .onGet(() => this.statusRegister.get(this.device.getState().inputSource)!)
      .onSet(v => this.device.setInput(this.statusRegister.inverse.get(v)!));

    // TV: remote control input
    this.main.getCharacteristic(this.Characteristic.RemoteKey)
      .onSet(this.setRemoteKey.bind(this));

    // TV: inputs
    this.createInputService(1, 'TV', Input.TV);
    this.createInputService(2, 'AM', Input.AM);
    this.createInputService(3, 'FM', Input.FM);
    this.createInputService(4, 'Tape 1', Input.Tape1);
    this.createInputService(5, 'Tape 2', Input.Tape2);
    this.createInputService(6, 'CD', Input.CD);
    this.createInputService(7, 'PHONO', Input.Phono);

    // Speaker
    const speaker = this.getOrCreateService(this.Service.TelevisionSpeaker);
    speaker.setCharacteristic(this.Characteristic.Name, this.name);
    speaker.setCharacteristic(this.Characteristic.VolumeControlType, this.Characteristic.VolumeControlType.ABSOLUTE);
    speaker.getCharacteristic(this.Characteristic.Active)
      .onGet(() => this.device.getState().isOn)
      .onSet(v => this.device.tooglePower(this.toBoolean(v)));
    speaker.getCharacteristic(this.Characteristic.Mute)
      .onGet(() => this.device.getState().isMute)
      .onSet(v => this.device.toogleMute(this.toBoolean(v)));
    speaker.getCharacteristic(this.Characteristic.Volume)
      .onGet(this.getRelativeVolume.bind(this))
      .onSet(this.setRelativeVolume.bind(this));
    speaker.getCharacteristic(this.Characteristic.VolumeSelector)
      .onSet(v => {
        if (v === this.Characteristic.VolumeSelector.INCREMENT) {
          this.device.increaseVolume();
        } else {
          this.device.decreaseVolume();
        }
      });
    this.main.addLinkedService(speaker);

    // loudness switch
    const loudness = this.getOrCreateService(this.Service.Switch, `${this.name}_loudness`);
    loudness.setCharacteristic(this.Characteristic.Name, `Loudness (${this.name})`);
    loudness.getCharacteristic(this.Characteristic.On)
      .onGet(() => this.device.getState().isLoudness)
      .onSet(v => this.device.toogleLoudness(this.toBoolean(v)));
    this.main.addLinkedService(loudness);

    // volume fan
    const vol = this.getOrCreateService(this.Service.Fan, `${this.name}_volume`);
    vol.setCharacteristic(this.Characteristic.Name, `Volume (${this.name})`);
    vol.getCharacteristic(this.Characteristic.On)
      .onGet(() => !this.device.getState().isMute) //inverted
      .onSet(v => this.device.toogleMute(!v)); //inverted
    vol.addCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(this.getRelativeVolume.bind(this))
      .onSet(this.setRelativeVolume.bind(this));
    this.main.addLinkedService(vol);

    // state updates
    // this also triggers an update of the state from the device
    this.device.getState()
      .on('isOn', (v: boolean) => {
        this.main.updateCharacteristic(this.Characteristic.Active, v);
        speaker.updateCharacteristic(this.Characteristic.Active, v);
      })
      .on('inputSource', (v: Input) => {
        this.main.updateCharacteristic(this.Characteristic.ActiveIdentifier, this.statusRegister.get(v)!);
      })
      .on('isMute', (v: boolean) => {
        speaker.updateCharacteristic(this.Characteristic.Mute, v);
        vol.updateCharacteristic(this.Characteristic.On, !v); //inverted
      })
      .on('isLoudness', (v: boolean) => {
        loudness.updateCharacteristic(this.Characteristic.On, v);
      })
      .on('volume', (v: number) => {
        speaker.updateCharacteristic(this.Characteristic.Volume, this.getRelativeVolume(v));
        vol.updateCharacteristic(this.Characteristic.RotationSpeed, this.getRelativeVolume(v));
      });
    // store the state with the accessory to be restored from cache
    this.accessory.context.state = this.device.getState();

    // shutdown hook
    platform.api.on('shutdown', () => {
      this.device.shutdown();
    });
  }

  private setRemoteKey(value: CharacteristicValue): void {
    switch (value) {
    case this.Characteristic.RemoteKey.ARROW_UP: {
      this.device.increaseVolume();
      break;
    }
    case this.Characteristic.RemoteKey.ARROW_DOWN: {
      this.device.decreaseVolume();
      break;
    }
    case this.Characteristic.RemoteKey.PREVIOUS_TRACK: // not present in remote widget as of iOS17
    case this.Characteristic.RemoteKey.REWIND: // not present in remote widget as of iOS17
    case this.Characteristic.RemoteKey.ARROW_LEFT: {
      this.device.rewind();
      break;
    }
    case this.Characteristic.RemoteKey.NEXT_TRACK: // not present in remote widget as of iOS17
    case this.Characteristic.RemoteKey.FAST_FORWARD: // not present in remote widget as of iOS17
    case this.Characteristic.RemoteKey.ARROW_RIGHT: {
      this.device.fastForward();
      break;
    }
    case this.Characteristic.RemoteKey.PLAY_PAUSE: {
      this.device.start();
      break;
    }
    case this.Characteristic.RemoteKey.EXIT: // not present in remote widget as of iOS17
    case this.Characteristic.RemoteKey.BACK: {
      this.device.stop();
      break;
    }
    case this.Characteristic.RemoteKey.INFORMATION: {
      this.device.pause();
      break;
    }
    case this.Characteristic.RemoteKey.SELECT:
    default:
      this.log.debug('Unsupported remote key pressed:', value.toString());
    }
  }

  private getRelativeVolume(volume = this.device.getState().volume): number {
    return Math.round(volume / this.maxVolume * 100);
  }

  private setRelativeVolume(relative: CharacteristicValue): void {
    this.device.setVolume(Math.round(this.maxVolume / 100 * (relative as number)));
  }

  private getOrCreateService(service: WithUUID<typeof Service>, uniqueId = service.toString()) {
    return this.accessory.getService(uniqueId) || this.accessory.addService(service, uniqueId, uniqueId);
  }

  private createInputService(uniqueId: number, name: string, status: Input) {
    const input = this.getOrCreateService(this.Service.InputSource, name);
    input.setCharacteristic(this.Characteristic.Identifier, uniqueId)
      .setCharacteristic(this.Characteristic.Name, name)
      .setCharacteristic(this.Characteristic.ConfiguredName, name)
      .setCharacteristic(this.Characteristic.IsConfigured, this.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(this.Characteristic.InputSourceType, this.Characteristic.InputSourceType.OTHER);
    this.statusRegister.set(status, uniqueId);
    this.main.addLinkedService(input);
  }

  private toBoolean(v: CharacteristicValue) {
    if (typeof v === 'boolean') {
      return v;
    }
    if (typeof v === 'number') {
      return v !== 0;
    }
    if (typeof v === 'string') {
      return v.toLowerCase() === 'true';
    }
    return false;  // Default to false for unknown types
  }

}
