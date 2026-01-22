// Permission Service - Request all permissions upfront
import { Platform, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Pedometer } from 'expo-sensors';

// Request all permissions needed for the app
export const requestAllPermissions = async () => {
  if (Platform.OS === 'web') return true;

  const results = {
    notifications: false,
    activity: false,
    locationForeground: false,
    locationBackground: false,
  };

  try {
    // 1. Request Notification Permission
    console.log('📱 Requesting notification permission...');
    const { status: notifStatus } = await Notifications.requestPermissionsAsync();
    results.notifications = notifStatus === 'granted';
    console.log('Notification permission:', results.notifications ? 'granted' : 'denied');

    // 2. Request Activity/Pedometer Permission (for step counting)
    console.log('📱 Requesting activity permission...');
    try {
      const { status: pedometerStatus } = await Pedometer.requestPermissionsAsync();
      results.activity = pedometerStatus === 'granted';
    } catch (e) {
      // Some devices don't have pedometer
      console.log('Pedometer permission error:', e.message);
      results.activity = await Pedometer.isAvailableAsync();
    }
    console.log('Activity permission:', results.activity ? 'granted' : 'denied');

    // 3. Request Foreground Location Permission
    console.log('📱 Requesting foreground location permission...');
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    results.locationForeground = foregroundStatus === 'granted';
    console.log('Foreground location permission:', results.locationForeground ? 'granted' : 'denied');

    // 4. Request Background Location Permission (needed for counting when app is in background)
    if (results.locationForeground) {
      console.log('📱 Requesting background location permission...');
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      results.locationBackground = backgroundStatus === 'granted';
      console.log('Background location permission:', results.locationBackground ? 'granted' : 'denied');
    }

    // Log overall status
    console.log('📱 Permission status:', results);

    // Check if critical permissions are missing
    const missingPermissions = [];
    if (!results.notifications) missingPermissions.push('Notifications');
    if (!results.activity) missingPermissions.push('Physical Activity');
    if (!results.locationBackground) missingPermissions.push('Background Location');

    if (missingPermissions.length > 0) {
      console.log('⚠️ Missing permissions:', missingPermissions.join(', '));
    }

    return results;
  } catch (error) {
    console.log('Error requesting permissions:', error);
    return results;
  }
};

// Check if all required permissions are granted
export const checkAllPermissions = async () => {
  if (Platform.OS === 'web') return true;

  try {
    const [notifPerm, locationPerm, pedometerAvailable] = await Promise.all([
      Notifications.getPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
      Pedometer.isAvailableAsync(),
    ]);

    return {
      notifications: notifPerm.status === 'granted',
      locationBackground: locationPerm.status === 'granted',
      activity: pedometerAvailable,
      allGranted: notifPerm.status === 'granted' && locationPerm.status === 'granted' && pedometerAvailable,
    };
  } catch (error) {
    console.log('Error checking permissions:', error);
    return { notifications: false, locationBackground: false, activity: false, allGranted: false };
  }
};

// Show alert to open settings if permissions are denied
export const showPermissionAlert = (missingPermission) => {
  Alert.alert(
    'Permission Required',
    `WERN needs ${missingPermission} permission to count your steps accurately. Please enable it in Settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
};

export default {
  requestAllPermissions,
  checkAllPermissions,
  showPermissionAlert,
};
