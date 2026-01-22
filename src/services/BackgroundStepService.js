// Background Step Counting Service
// Uses expo-task-manager and expo-location to keep step counting running in background
import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_STEP_TASK = 'BACKGROUND_STEP_TASK';
const WALKING_STATE_KEY = '@wern_walking_state';
const STEP_COUNT_KEY = '@wern_step_count';
const DAILY_STATS_KEY = '@wern_daily_stats';

// Track background task state
let isBackgroundTaskRunning = false;
let walkingStartTime = null;
let sessionStartSteps = 0;
let currentStepCount = 0; // Track current steps for foreground service notification
let lastNotificationUpdateTime = 0; // Debounce notification updates
const MIN_NOTIFICATION_UPDATE_INTERVAL = 5000; // Minimum 5 seconds between updates

// Get today's date string
const getTodayDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Define the background task
TaskManager.defineTask(BACKGROUND_STEP_TASK, async ({ data, error }) => {
  if (error) {
    console.log('Background step task error:', error);
    return;
  }

  try {
    // Check if still walking
    const savedState = await AsyncStorage.getItem(WALKING_STATE_KEY);
    if (!savedState) return;

    const state = JSON.parse(savedState);
    if (!state.isWalking) return;

    // Get the walking start time
    const startTime = state.startTime ? new Date(state.startTime) : null;
    if (!startTime) return;

    // Get steps from pedometer since walking started
    const now = new Date();
    const pedometerResult = await Pedometer.getStepCountAsync(startTime, now);

    if (pedometerResult && pedometerResult.steps > 0) {
      const sessionSteps = pedometerResult.steps;
      const totalSteps = (state.sessionStartSteps || 0) + sessionSteps;

      console.log('📊 Background step update:', { sessionSteps, totalSteps });

      // Update our tracked step count
      currentStepCount = totalSteps;

      // Save session steps to state
      state.sessionSteps = sessionSteps;
      await AsyncStorage.setItem(WALKING_STATE_KEY, JSON.stringify(state));

      // Update step count in storage
      await AsyncStorage.setItem(STEP_COUNT_KEY, JSON.stringify({
        count: totalSteps,
        date: new Date().toDateString(),
      }));

      // Update daily stats
      const savedDailyStats = await AsyncStorage.getItem(DAILY_STATS_KEY);
      if (savedDailyStats) {
        const dailyStats = JSON.parse(savedDailyStats);
        if (dailyStats.date === getTodayDateString()) {
          dailyStats.stepCount = Math.max(dailyStats.stepCount || 0, totalSteps);
          await AsyncStorage.setItem(DAILY_STATS_KEY, JSON.stringify(dailyStats));
        }
      }
    }
  } catch (error) {
    console.log('Error in background step task:', error);
  }
});

// Request location permissions for background tracking
export const requestBackgroundPermissions = async () => {
  if (Platform.OS === 'web') return false;

  try {
    // Request foreground permission first
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('Foreground location permission denied');
      return false;
    }

    // Request background permission
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('Background location permission denied');
      return false;
    }

    console.log('Background location permissions granted');
    return true;
  } catch (error) {
    console.log('Error requesting background permissions:', error);
    return false;
  }
};

// Start background step tracking with initial step count
export const startBackgroundStepTracking = async (initialSteps = 0) => {
  if (Platform.OS === 'web') return false;

  try {
    // Check if task is already running
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_TASK);
    if (isTaskRegistered) {
      console.log('Background step task already registered');
      return true;
    }

    // Check permissions
    const hasPermissions = await requestBackgroundPermissions();
    if (!hasPermissions) {
      console.log('Cannot start background tracking: permissions not granted');
      return false;
    }

    // Store initial step count
    currentStepCount = initialSteps;

    // Start location updates to keep app running in background
    // The foreground service notification shows step count
    await Location.startLocationUpdatesAsync(BACKGROUND_STEP_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 3000,
      distanceInterval: 0,
      deferredUpdatesInterval: 3000,
      foregroundService: {
        notificationTitle: 'Counting your steps',
        notificationBody: `Steps: ${initialSteps.toLocaleString()}`,
        notificationColor: '#1B8A9E',
      },
      showsBackgroundLocationIndicator: false,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
    });

    isBackgroundTaskRunning = true;
    console.log('✅ Background step tracking started with steps:', initialSteps);
    return true;
  } catch (error) {
    console.log('Error starting background step tracking:', error);
    return false;
  }
};

// Update the foreground service notification with new step count
// Debounced to prevent too frequent restarts of location service
export const updateForegroundNotification = async (steps) => {
  if (Platform.OS === 'web' || !isBackgroundTaskRunning) return;

  // Debounce: don't update more than once every 5 seconds
  const now = Date.now();
  if (now - lastNotificationUpdateTime < MIN_NOTIFICATION_UPDATE_INTERVAL) {
    return;
  }

  try {
    currentStepCount = steps;
    lastNotificationUpdateTime = now;

    // To update the notification, we need to restart location updates
    // This is the only way to change foreground service notification in expo-location
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_TASK);
    if (isTaskRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_STEP_TASK);
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_STEP_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 3000,
      distanceInterval: 0,
      deferredUpdatesInterval: 3000,
      foregroundService: {
        notificationTitle: 'Counting your steps',
        notificationBody: `Steps: ${steps.toLocaleString()}`,
        notificationColor: '#1B8A9E',
      },
      showsBackgroundLocationIndicator: false,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
    });

    console.log('📊 Foreground notification updated with steps:', steps);
  } catch (error) {
    console.log('Error updating foreground notification:', error.message);
  }
};

// Stop background step tracking
export const stopBackgroundStepTracking = async () => {
  if (Platform.OS === 'web') return;

  try {
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_TASK);
    if (isTaskRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_STEP_TASK);
      console.log('✅ Background step tracking stopped');
    }
    isBackgroundTaskRunning = false;
  } catch (error) {
    console.log('Error stopping background step tracking:', error);
  }
};

// Check if background tracking is running
export const isBackgroundTrackingRunning = async () => {
  if (Platform.OS === 'web') return false;

  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_TASK);
  } catch (error) {
    return false;
  }
};

export default {
  requestBackgroundPermissions,
  startBackgroundStepTracking,
  stopBackgroundStepTracking,
  isBackgroundTrackingRunning,
  updateForegroundNotification,
};
