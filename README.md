# homebridge-anelPowerControl

## What this plugin does
This plugin allows you to controll the Anel Power Control Panels via HomeKit. This means you can controll all the Power Sockets just by telling Siri to do so.

### Working Anel Power Control Panels
The AnelPowerControl HomeBridge Plugin is created for the following Anel Products
- NET-PwrCtrl ADV
- NET-PwrCtrl HOME
- NET-PwrCtrl PRO `Thanks to` [casprung](https://github.com/casprung "casprung")

>:+1: If Anel would spend me other Power Control Panels, I could expand it to others ;-)

## Installation
1. Install homebridge using `npm install -g homebridge`.
2. Install this plugin using `npm install -g homebridge-anelPowerControl`
3. Update your configuration file. See configuration sample below.

## Configuration
Edit your config.json accordingly. Configuration sample:

    "platforms": [{
        "platform": "anelPowerControl",
        "powerStatusUpdatefromServerIn_s": "10",
        "powerSockets": [{
            "socketName": "PowerSocket_ADV",
            "socketTyp": "NetPwrCtrlADV",
            "socketIP": "192.168.3.10",
            "socketUsername": "user7",
            "socketPassword": "anel"
        }, {
            "socketName": "PowerSocket_Home",
            "socketTyp": "NetPwrCtrlHome",
            "socketIP": "192.168.3.11",
            "socketUsername": "user7",
            "socketPassword": "anel"
        }, {
            "socketName": "PowerSocket_Pro",
            "socketTyp": "NetPwrCtrlPro",
            "socketIP": "192.168.3.11",
            "socketUsername": "user7",
            "socketPassword": "anel"
        }]
    }]

>This is not an official Anel Plugin, it is created by myself !
>ANEL - Website http://anel-elektronik.de
