# Homebridge Atelier
[![Build and Lint](https://github.com/paulHasselkuss/homebridge-atelier/actions/workflows/build.yml/badge.svg)](https://github.com/paulHasselkuss/homebridge-atelier/actions/workflows/build.yml)
[![License](https://img.shields.io/github/license/paulHasselkuss/homebridge-airplay-watcher)](LICENSE.md)

This [Homebridge](http://homebridge.io) plugin allows you to control your [Braun Atelier](https://de.wikipedia.org/wiki/Braun_Atelier) R4 or CC4 receiver. It adds a switch (to toggle the receiver on and off), and a speaker accessory (on/off, mute, volume).

Only devices from the first generation are supported (R4/1 and CC4/1), devices from the second generation do not support getting the device's status.

## Usage
The device running Homebridge needs to be connected directly to the Atelier device using an appropriate serial cable. The plugin communicates with the receiver using control sequences, see [docs.md](docs.md) for more information.

Two accessories are exposed, a switch and a speaker. The switch allows to toggle the receiver on and off, and the speaker includes controls to toggle on/off, mute, and read the current volume.

Devices need to be manually added to HomeKit, even if HomeBridge has already been added. Check the log after activating and configuring this plugin.

## Configuration
The easiest way to use this plugin is to use [homebridge-config-ui-x](https://github.com/homebridge/homebridge-config-ui-x). To configure manually, add the `AtelierRs232HomebridgePlugin` platform in your `config.json` file. Then, add the name and path for the devices to monitor:

```JSON
{
"platform": "AtelierRs232HomebridgePlugin",
  "devices": [
    {
      "name": "The name of the device, e.g. 'Atelier R4'",
      "path": "The path to the serial port connected to the device, e.g. '/dev/ttyUSB0' when using an USB converter on Linux"
    }
  ]
}
```

## License
[MIT](LICENSE.md)