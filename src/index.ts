import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { AtelierPlatform } from './platform';

/**
 * Registers the platform with Homebridge.
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, AtelierPlatform);
};
