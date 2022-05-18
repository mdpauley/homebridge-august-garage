import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { AugustSmartLockPlatform } from './platform';
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export declare class AugustSmartLockAccessory {
    private readonly platform;
    private readonly accessory;
    private service;
    private batteryService;
    private locked;
    constructor(platform: AugustSmartLockPlatform, accessory: PlatformAccessory);
    addLockService(): Service;
    addBatteryService(): Service;
    /**
     * Mock handlers for testing
     **/
    setMock(value: CharacteristicValue): Promise<void>;
    getMock(): Promise<CharacteristicValue>;
    /**
     * Handle "SET" requests from HomeKit
     * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
     */
    setOn(value: CharacteristicValue): Promise<void>;
    /**
     * Handle the "GET" requests from HomeKit
     * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
     *
     * GET requests should return as fast as possible. A long delay here will result in
     * HomeKit being unresponsive and a bad user experience in general.
     *
     * If your device takes time to respond you should update the status of your device
     * asynchronously instead using the `updateCharacteristic` method instead.
  
     * @example
     * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
     */
    getOn(): Promise<CharacteristicValue>;
    updateStatus(): Promise<void>;
}
//# sourceMappingURL=platformAccessory.d.ts.map