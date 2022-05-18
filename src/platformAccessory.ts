import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { augustGetLockStatus, AugustLock, AugustLockStatus, augustSetStatus } from './august';

import { AugustSmartLockPlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AugustSmartLockAccessory {
  private service: Service;
  private batteryService: Service;
  private locked = AugustLockStatus.CLOSED;

  constructor(
    private readonly platform: AugustSmartLockPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    const lock: AugustLock = accessory.context.device;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'August')
      .setCharacteristic(this.platform.Characteristic.Model, 'Wifi Lock')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, lock.id);

    this.service = this.addLockService();
    this.batteryService = this.addBatteryService();

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, lock.name);

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the lock state trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    setInterval(this.updateStatus.bind(this), (this.platform.config['refreshInterval'] || 10) * 1000);
  }

  addLockService(): Service {
    // get the GarageDoorOpener service if it exists, otherwise create a new GarageDoorOpener service
    // you can create multiple services for each accessory
    const service = this.accessory.getService(this.platform.Service.GarageDoorOpener)
      || this.accessory.addService(this.platform.Service.GarageDoorOpener);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/GarageDoorOpener

    // register handlers for the On/Off Characteristic
    service.getCharacteristic(this.platform.Characteristic.CurrentDoorState)
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    service.getCharacteristic(this.platform.Characteristic.TargetDoorState)
      .onGet(this.getOn.bind(this))
      .onSet(this.setOn.bind(this));

    return service;
  }

  addBatteryService() {
    // get the Battery service if it exists, otherwise create a new Battery service
    // you can create multiple services for each accessory
    const service = this.accessory.getService(this.platform.Service.Battery)
      || this.accessory.addService(this.platform.Service.Battery);

    return service;
  }

  /**
   * Mock handlers for testing
   **/

  async setMock(value: CharacteristicValue) {
    this.platform.log.debug(`Set State (${this.accessory.context.device['name']}) ->`, value.valueOf());
    this.locked = value === this.platform.Characteristic.TargetDoorState.CLOSED ? AugustLockStatus.CLOSED : AugustLockStatus.OPEN;
  }

  async getMock(): Promise<CharacteristicValue>{
    const results = this.locked === AugustLockStatus.CLOSED
      ? this.platform.Characteristic.CurrentDoorState.CLOSED
      : this.platform.Characteristic.CurrentDoorState.OPEN;

    this.platform.log.debug(`Get State (${this.accessory.context.device['name']}) ->`, results);
    return results;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    const id = this.accessory.context.device['id'];
    if (this.platform.Session) {
      const status = value === this.platform.Characteristic.TargetDoorState.CLOSED ? AugustLockStatus.CLOSED : AugustLockStatus.OPEN;
      try {
        this.platform.log.debug('Set Lock State ->', status);
        augustSetStatus(this.platform.Session, id, status, this.platform.log);
      } catch (error) {
        this.platform.log.error('Set Lock State ->', error);
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
    }
  }

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
  async getOn(): Promise<CharacteristicValue> {
    // run status update in the background to avoid blocking the main thread
    setImmediate(this.updateStatus.bind(this));
    return this.service.getCharacteristic(this.platform.Characteristic.CurrentDoorState).value
      || this.platform.Characteristic.CurrentDoorState.OPEN;
  }

  async updateStatus() {
    const id = this.accessory.context.device['id'];

    augustGetLockStatus(this.platform.Session!, id, this.platform.log).then((status) => {

      this.platform.log.debug('Get Lock Status ->', status);

      // if you need to return an error to show the device as "Not Responding" in the Home app:
      // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

      const currentState = status === AugustLockStatus.OPEN
        ? this.platform.Characteristic.CurrentDoorState.CLOSED
        : status === AugustLockStatus.CLOSED
          ? this.platform.Characteristic.CurrentDoorState.OPEN
          : this.platform.Characteristic.CurrentDoorState.OPENING;

      this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, currentState);
    }).catch((error) => {
      this.platform.log.error('Get Lock Status ->', error);
    });
  }
}
