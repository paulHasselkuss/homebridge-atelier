import {API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic} from 'homebridge';

import {PLUGIN_NAME} from './settings';
import {TvAccessory} from './tvAccessory';

/**
 * The main constructor for the plugin. Parses the user config and registers accessories with Homebridge.
 */
export class AtelierPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // used to track restored cached accessories
  private readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    // Fired when all cached accessories have been restored. Dynamic Platform plugins should only
    // register new accessories after this event was fired, to ensure they weren't added already.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.registerDevices();
    });

    this.log.debug('Finished initializing platform:', this.config.name);
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update any respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the cache
    this.accessories.push(accessory);
  }

  private registerDevices() {

    for (const device of this.config.devices) {
      const name = device.name;
      const model = device.model || name;
      const path = device.path;
      const maxVolume = device.maxVolume;

      const uuid = this.api.hap.uuid.generate(path);

      // see if an accessory with the same uuid has already been registered and restored from the cache
      let accessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (!accessory) {
        this.log.info('Adding new accessory:', name);

        // create a new accessory
        accessory = new this.api.platformAccessory(name, uuid);
        accessory.category = this.api.hap.Categories.AUDIO_RECEIVER;
        accessory.context = {
          name,
          model,
          path,
          maxVolume,
        };

        // link the accessory to your platform
        this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);
      } else {
        this.log.info('Restoring existing accessory from cache:', name);
      }

      // create the accessory handler for the accessory
      new TvAccessory(this, accessory);
    }
  }
}
