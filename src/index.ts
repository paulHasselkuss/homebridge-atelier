import { API } from 'homebridge';

import { AtelierPlatform } from './atelierPlatform';
import { PLATFORM_NAME } from './settings';

/**
 * Registers the platform with Homebridge.
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, AtelierPlatform);
};
