/**
 * WearableService - Bridge between WERN phone app and smartwatch companions
 *
 * Handles:
 * - Apple Watch via WatchConnectivity (iOS)
 * - WearOS via Wearable Data Layer API (Android)
 *
 * Data sync strategy:
 * - Phone sends: dailyGoal, activeCause, litties, walkingState
 * - Watch sends: stepCount, heartRate, walkingState
 * - Sync interval: immediate on state change, periodic every 5s during walks
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

const { WERNWearableModule } = NativeModules || {};

class WearableService {
  constructor() {
    this.listeners = [];
    this.isAvailable = false;
    this._setupNativeBridge();
  }

  _setupNativeBridge() {
    if (!WERNWearableModule) {
      console.log('[WearableService] Native module not available - wearable features disabled');
      return;
    }

    this.isAvailable = true;

    try {
      const emitter = new NativeEventEmitter(WERNWearableModule);
      emitter.addListener('onWatchData', (data) => {
        this.listeners.forEach((cb) => cb(data));
      });
      emitter.addListener('onWatchConnected', () => {
        console.log('[WearableService] Watch connected');
      });
      emitter.addListener('onWatchDisconnected', () => {
        console.log('[WearableService] Watch disconnected');
      });
    } catch (e) {
      console.log('[WearableService] Event emitter setup failed:', e.message);
    }
  }

  /**
   * Scan for nearby wearable devices.
   * Returns array of { name, type, id, battery } or empty array.
   */
  async scanForDevices() {
    if (!this.isAvailable || !WERNWearableModule) return [];
    try {
      const devices = await WERNWearableModule.scanForDevices();
      return devices || [];
    } catch (e) {
      console.log('[WearableService] Scan failed:', e.message);
      return [];
    }
  }

  /**
   * Connect to a specific device by ID.
   */
  async connectDevice(deviceId) {
    if (!this.isAvailable || !WERNWearableModule) return false;
    try {
      return await WERNWearableModule.connectDevice(deviceId);
    } catch (e) {
      console.log('[WearableService] Connect failed:', e.message);
      return false;
    }
  }

  /**
   * Disconnect from the current watch.
   */
  async disconnectDevice() {
    if (!this.isAvailable || !WERNWearableModule) return;
    try {
      await WERNWearableModule.disconnectDevice();
    } catch (e) {
      // Silent
    }
  }

  /**
   * Send current state to the connected watch.
   */
  syncToWatch(data) {
    if (!this.isAvailable || !WERNWearableModule) return;
    try {
      WERNWearableModule.syncToWatch({
        stepCount: data.stepCount || 0,
        dailyGoal: data.dailyGoal || 10000,
        activeCause: data.activeCause || 1,
        isWalking: data.isWalking || false,
        litties: data.litties || 0,
        disconnect: data.disconnect || false,
        timestamp: Date.now(),
      });
    } catch (e) {
      // Silent fail - watch may not be connected
    }
  }

  /**
   * Listen for data from the watch.
   * Returns unsubscribe function.
   */
  onWatchData(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Check if a watch is paired and reachable.
   */
  async isWatchConnected() {
    if (!this.isAvailable || !WERNWearableModule) return false;
    try {
      return await WERNWearableModule.isWatchConnected();
    } catch {
      return false;
    }
  }

  /**
   * Get current step data from the watch.
   */
  async getWatchSteps() {
    if (!this.isAvailable || !WERNWearableModule) return null;
    try {
      return await WERNWearableModule.getWatchSteps();
    } catch {
      return null;
    }
  }

  /**
   * Validate a manual pairing code with the watch.
   */
  async validatePairingCode(code) {
    if (!this.isAvailable || !WERNWearableModule) return false;
    try {
      return await WERNWearableModule.validatePairingCode(code);
    } catch {
      return false;
    }
  }
}

export default new WearableService();
