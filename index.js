var request = require('request');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform("homebridge-anelPowerControl", "anelPowerControl", AnelPowerControl, true);
}

function AnelPowerControl(log, config, api) {
    this.log = log;
    this.switchNames = [];
    this.config = config || {
        "platform": "anelPowerControl"
    };
    this.powerSockets = this.config.powerSockets || [];
    this.accessories = {};

    if (api) {
        this.api = api;

        this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
    }
}

// Method to restore accessories from cache
AnelPowerControl.prototype.configureAccessory = function(accessory) {
    accessory = this.setService(accessory);
    var accessoryName = accessory.context.name;
    this.accessories[accessoryName] = accessory;
}

// Method to setup accesories from config.json
AnelPowerControl.prototype.didFinishLaunching = function() {
    // reomve all accessories in cache
    for (var name in this.accessories) {
        this.removeAccessory(this.accessories[name]);
    }

    // Add or update accessories defined in config.json
    for (var i in this.powerSockets) {
        var powerSocket = this.powerSockets[i];
        this.addAccessory(powerSocket);
    }

    // wait 5 second and then start to update Status
    setTimeout(AnelPowerControl.prototype.updateSocketStatus.bind(this), 10000);
}

// Method to add and update HomeKit accessories
AnelPowerControl.prototype.addAccessory = function(powerSocket) {
    this.getCurrentSocketStatus(powerSocket, function(powerSwitch) {
        if (!this.accessories[powerSwitch.switchName]) {
            var uuid = UUIDGen.generate(powerSwitch.switchName);

            // Setup accessory as SWITCH (8) category.
            var newAccessory = new Accessory(powerSwitch.switchName, uuid, 8);

            // New accessory is always reachable
            newAccessory.reachable = true;

            // Store and initialize variables into context
            newAccessory.context.name = powerSwitch.switchName;
            newAccessory.context.socketTyp = powerSwitch.socketTyp;
            newAccessory.context.socketIP = powerSwitch.socketIP;
            newAccessory.context.socketUsername = powerSwitch.socketUsername;
            newAccessory.context.socketPassword = powerSwitch.socketPassword;
            newAccessory.context.switchName = powerSwitch.switchName;
            newAccessory.context.switchNumber = powerSwitch.switchNumber;
            newAccessory.context.status = powerSwitch.switchStatus;

            // Setup HomeKit switch service
            newAccessory.addService(Service.Switch, powerSwitch.switchName);

            // Setup listeners for different switch events
            newAccessory = this.setService(newAccessory);

            // Retrieve initial status
            newAccessory = this.getInitState(newAccessory, powerSwitch);

            // Register accessory in HomeKit
            this.api.registerPlatformAccessories("homebridge-anelPowerControl", "anelPowerControl", [newAccessory]);
        } else {
            var newAccessory = this.accessories[powerSwitch.switchName];

            // Accessory is reachable if it's found in config.json
            newAccessory.updateReachability(true);

            // Update variables in context
            newAccessory.context.socketTyp = powerSwitch.socketTyp;
            newAccessory.context.socketIP = powerSwitch.socketIP;
            newAccessory.context.socketUsername = powerSwitch.socketUsername;
            newAccessory.context.socketPassword = powerSwitch.socketPassword;
            newAccessory.context.switchName = powerSwitch.switchName;
            newAccessory.context.switchNumber = powerSwitch.switchNumber;
            newAccessory.context.status = powerSwitch.switchStatus;

            // Update initial status
            newAccessory = this.getInitState(newAccessory, powerSwitch);
        }

        // Store accessory in cache
        this.accessories[powerSwitch.switchName] = newAccessory;
        this.switchNames.push(powerSwitch.switchName);
    }.bind(this));
}

// Method to remove accessories from HomeKit
AnelPowerControl.prototype.removeAccessory = function(accessory) {
    if (accessory) {
        var name = accessory.context.name;
        this.log("[" + name + "] Removed from HomeBridge.");
        this.api.unregisterPlatformAccessories("homebridge-anelPowerControl", "anelPowerControl", [accessory]);
        delete this.accessories[name];
    }
}

// Method to setup listeners for different events
AnelPowerControl.prototype.setService = function(accessory) {
    accessory
        .getService(Service.Switch)
        .getCharacteristic(Characteristic.On)
        .on('get', this.getPowerState.bind(this, accessory.context))
        .on('set', this.setPowerState.bind(this, accessory.context));

    accessory.on('identify', this.identify.bind(this, accessory.context));

    return accessory;
}

// Method to retrieve initial status
AnelPowerControl.prototype.getInitState = function(accessory, powerSwitch) {
    var info = accessory.getService(Service.AccessoryInformation);

    accessory.context.manufacturer = 'Swissglider';
    info.setCharacteristic(Characteristic.Manufacturer, accessory.context.manufacturer.toString());

    accessory.context.model = powerSwitch.socketTyp;
    info.setCharacteristic(Characteristic.Model, accessory.context.model.toString());

    accessory.context.serial = 'Anel-HomeBridge V1';
    info.setCharacteristic(Characteristic.SerialNumber, accessory.context.serial.toString());

    accessory
        .getService(Service.Switch)
        .getCharacteristic(Characteristic.On)
        .getValue();

    return accessory;
}

// Method to determine current status
AnelPowerControl.prototype.getPowerState = function(context, callback) {
    var name = "[" + context.name + "]";

    this.log(name + "Current status: " + (context.status ? "On." : "Off."));
    callback(null, context.status);
}

// Method to set status
AnelPowerControl.prototype.setPowerState = function(context, status, callback) {
    var name = "[" + context.name + "]";
    this.changeSocketSwitch(context, status, function(current_status, error) {
        context.status = current_status;
        this.log(name + "Turned " + (current_status ? "on." : "off."));
        callback();
    }.bind(this));

}

// Method to handle identify request
AnelPowerControl.prototype.identify = function(context, paired, callback) {
    var name = "[" + context.name + "] ";

    this.log(name + "Identify requested!");
    callback();
}

// Method to request the current PowerSocketStatus from the Anel Webserver
AnelPowerControl.prototype.getCurrentSocketStatus = function(powerSocketConfig, toCallAfterRequest) {
    var url = 'http://' + powerSocketConfig.socketIP + '/strg.cfg';
    var auth = "Basic " + new Buffer(powerSocketConfig.socketUsername + ":" + powerSocketConfig.socketPassword).toString("base64");
    var name = "[" + powerSocketConfig.socketName + "] ";
    request.get({ url: url,
                  headers : {
                        "Authorization" : auth
                  }
                }, function(err, res, body) {
        var name = "[" + powerSocketConfig.socketName + "] ";
        if (err) {
            this.log(name + "Failed to call " + powerSocketConfig.socketIP + " - with Error - " + err);
        } else {
            if (powerSocketConfig.socketTyp == "NetPwrCtrlADV") {
                var resultList = body.split(';');
                for (i = 0; i < 8; i++) {
                    var switchS = {
                        'socketName': powerSocketConfig.socketName,
                        'socketTyp': powerSocketConfig.socketTyp,
                        'socketIP': powerSocketConfig.socketIP,
                        'socketUsername': powerSocketConfig.socketUsername,
                        'socketPassword': powerSocketConfig.socketPassword,
                        'socketListTemp': resultList[3],
                        'switchName': resultList[(i * 5)],
                        'switchStatus': resultList[(i * 5) + 1] == '1' ? true : false,
                        'switchNumber': i
                    };
                    toCallAfterRequest(switchS);
                };
            } else if (powerSocketConfig.socketTyp == "NetPwrCtrlHome") {
                var resultList = body.split(';');
                var nameIndex = 10
                if (!resultList[0].includes('NET-PWRCTRL_0')) {
                    this.log(name + "Failed to call read the configuration from Socket = " + powerSocketConfig.socketName);
                    this.log(name + "Returned Body = " + body);
                }
                for (i = 0; i < 3; i++) {
                    var switchS = {
                        'socketName': powerSocketConfig.socketName,
                        'socketTyp': powerSocketConfig.socketTyp,
                        'socketIP': powerSocketConfig.socketIP,
                        'socketUsername': powerSocketConfig.socketUsername,
                        'socketPassword': powerSocketConfig.socketPassword,
                        'switchName': resultList[(i + nameIndex)],
                        'switchStatus': resultList[(i + nameIndex + 10)] == '1' ? true : false,
                        'switchNumber': i
                    };
                    toCallAfterRequest(switchS);
                }
               
            } else if (powerSocketConfig.socketTyp == "NetPwrCtrlPro") {
                    var resultList = body.split(';');
                    var nameIndex = 10
                    if (!resultList[0].includes('NET-PWRCTRL_0')) {
                        this.log(name + "Failed to call read the configuration from Socket = " + powerSocketConfig.socketName);
                        this.log(name + "Returned Body = " + body);
                    }
                    for (i = 0; i < 8; i++) {
                        var switchS = {
                            'socketName': powerSocketConfig.socketName,
                            'socketTyp': powerSocketConfig.socketTyp,
                            'socketIP': powerSocketConfig.socketIP,
                            'socketUsername': powerSocketConfig.socketUsername,
                            'socketPassword': powerSocketConfig.socketPassword,
                            'switchName': resultList[(i + nameIndex)],
                            'switchStatus': resultList[(i + nameIndex + 10)] == '1' ? true : false,
                            'switchNumber': i
                        };
                        toCallAfterRequest(switchS);
                    }  
            } else {
                var name = "[" + powerSocketConfig.socketName + "] ";
                this.log(name + "socketListTyp unknown !");
                return;
            }
        }
    }.bind(this));
}

// Method to request a status change on the Anel Webserver
AnelPowerControl.prototype.changeSocketSwitch = function(powerSwitchContext, status, toCallAfterRequest) {
    var actualstatus = powerSwitchContext.status ? '1' : '0';
    if (actualstatus != status) {
        var param = status ? '1' : '0';
        var setSocket = function() {
            var url = 'http://' + powerSwitchContext.socketIP + '/ctrl.htm?Auth:' + powerSwitchContext.socketUsername + powerSwitchContext.socketPassword;
            var sentText = 'F' + powerSwitchContext.switchNumber + '=' + param;
            var xhttp = new XMLHttpRequest();
            var OPEN = url;
            xhttp.open('POST', OPEN, false);
            xhttp.setRequestHeader("Content-type", "text/plain");
            xhttp.send(sentText);
            toCallAfterRequest(status, null);
        };
        setSocket();
    } else {
        toCallAfterRequest(status, null);
    }
}

// Method to request the current SocketStatus on a regular base
AnelPowerControl.prototype.updateSocketStatus = function() {

    for (var i in this.powerSockets) {
        var powerSocket = this.powerSockets[i];

        // Update all Socket Switch Status from the Anel WebServer
        this.getCurrentSocketStatus(powerSocket, function(powerSwitch, socketListTemperatur) {

            // Update the Accessory context status
            if (this.accessories[powerSwitch.switchName]) {
                this.accessories[powerSwitch.switchName].context.status = powerSwitch.switchStatus;
            }
        }.bind(this));
    }
    setTimeout(AnelPowerControl.prototype.updateSocketStatus.bind(this),
        (parseFloat(this.config.powerStatusUpdatefromServerIn_s) * 1000));
}
