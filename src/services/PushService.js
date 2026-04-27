// Push notification registration.
//
// On every login / app resume we:
//   1. Ask the OS for permission (no-op if already granted).
//   2. Ask Expo for this device's ExponentPushToken (cached across
//      app launches, but can rotate if the OS revokes it).
//   3. POST it to the backend at /api/register-push-token so the
//      server has an address to deliver pushes to.
//
// Expo's push service (https://exp.host/--/api/v2/push/send) takes
// these tokens and forwards to APNs (iOS) / FCM (Android) for us.
// Works for both foreground, background, and fully-killed apps.

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://www.wernapp.com/api/';
// Cache key: `${authToken}:${pushToken}` — skip the backend POST if
// the same pair has already been registered, so we don't hit the API
// on every app open.
const LAST_REGISTRATION_KEY = '@wern_push_last_registration';

// Global handler for notifications received while the app is in the
// foreground. Without this, foreground pushes are silently swallowed.
// Runs once at module load; safe even if the app re-mounts.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Best-effort: register the device's Expo push token with the
// backend. Silently skips if permission is denied or we're on an
// iOS simulator (which can't receive pushes).
export async function registerForPushNotifications(authToken) {
  if (!authToken) return null;
  if (!Device.isDevice) {
    console.log('📱 Push: skipping registration on simulator/emulator');
    return null;
  }

  try {
    // Ensure the Android channel exists — required for Android 8+ to
    // show any notification at all. The foreground-service channel
    // NotificationService already sets up is separate; this one is
    // specifically for remote pushes.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'WERN notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1B8A9E',
      });
    }

    // 1. Permission
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      console.log('📱 Push: permission denied');
      return null;
    }

    // 2. Token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      ?? Constants.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const pushToken = tokenResponse?.data;
    if (!pushToken) return null;

    // 3. Skip backend POST if we've already registered this exact
    //    (authToken, pushToken) pair.
    const cached = await AsyncStorage.getItem(LAST_REGISTRATION_KEY);
    const cacheKey = `${authToken}:${pushToken}`;
    if (cached === cacheKey) {
      console.log('📱 Push: token already registered');
      return pushToken;
    }

    // 4. Register with backend.
    const body = new FormData();
    body.append('token', authToken);
    body.append('push_token', pushToken);
    body.append('platform', Device.osName || Platform.OS);

    const res = await fetch(`${API_URL}register-push-token`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
    });
    const json = await res.json().catch(() => null);

    if (json?.status === true) {
      await AsyncStorage.setItem(LAST_REGISTRATION_KEY, cacheKey);
      console.log('📱 Push: registered with backend');
    } else {
      console.log('📱 Push: backend registration failed:', json?.message);
    }

    return pushToken;
  } catch (e) {
    console.log('📱 Push: registration error —', e?.message);
    return null;
  }
}

// Return the Expo push token for this device without touching the
// backend. Useful when the token has to be passed as part of another
// request (e.g. device_id on login). Returns null on failure.
export async function getPushTokenOnly() {
  const diag = await getPushTokenOnlyWithDiagnostics();
  return diag.token;
}

// Same as getPushTokenOnly but surfaces the full state so callers
// (e.g. debug UI) can tell whether we failed because of permission,
// simulator, missing Firebase, network, etc. Returns
// `{ token, reason, error }` where `reason` is a short tag.
export async function getPushTokenOnlyWithDiagnostics() {
  if (!Device.isDevice) {
    return { token: null, reason: 'not_real_device', error: null };
  }
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      return { token: null, reason: `permission_${status}`, error: null };
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      ?? Constants.easConfig?.projectId;
    if (!projectId) {
      return { token: null, reason: 'missing_project_id', error: null };
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!tokenResponse?.data) {
      return { token: null, reason: 'empty_token_response', error: null };
    }
    return { token: tokenResponse.data, reason: 'ok', error: null };
  } catch (e) {
    return {
      token: null,
      reason: 'exception',
      error: e?.message || String(e),
    };
  }
}

// Clear the cached registration so the next login re-posts (used on
// logout so a different user on the same device gets their own token
// bound server-side).
export async function clearPushRegistration() {
  try {
    await AsyncStorage.removeItem(LAST_REGISTRATION_KEY);
  } catch {
    // Silent.
  }
}

// Default export bundles the common helpers for convenience.
export default {
  registerForPushNotifications,
  clearPushRegistration,
};
