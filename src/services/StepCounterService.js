import { Pedometer } from 'expo-sensors';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';

const BACKGROUND_STEP_TASK = 'BACKGROUND_STEP_TASK';
const STEP_DATA_KEY = '@wern_step_data';
const SESSION_KEY = '@wern_walking_session';

// Background task definition
TaskManager.defineTask(BACKGROUND_STEP_TASK, async () => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get steps from device pedometer
    const result = await Pedometer.getStepCountAsync(startOfDay, now);

    if (result) {
      await saveStepData({
        date: startOfDay.toISOString().split('T')[0],
        steps: result.steps,
        lastUpdated: now.toISOString(),
      });
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.log('Background step fetch error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Save step data to storage
const saveStepData = async (data) => {
  try {
    const existingData = await AsyncStorage.getItem(STEP_DATA_KEY);
    const stepHistory = existingData ? JSON.parse(existingData) : {};
    stepHistory[data.date] = data;
    await AsyncStorage.setItem(STEP_DATA_KEY, JSON.stringify(stepHistory));
  } catch (error) {
    console.log('Error saving step data:', error);
  }
};

// Get today's step data
export const getTodaySteps = async () => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const today = startOfDay.toISOString().split('T')[0];

    // First try to get from device pedometer
    const isAvailable = await Pedometer.isAvailableAsync();
    if (isAvailable) {
      const result = await Pedometer.getStepCountAsync(startOfDay, now);
      if (result) {
        return result.steps;
      }
    }

    // Fallback to stored data
    const existingData = await AsyncStorage.getItem(STEP_DATA_KEY);
    if (existingData) {
      const stepHistory = JSON.parse(existingData);
      if (stepHistory[today]) {
        return stepHistory[today].steps;
      }
    }

    return 0;
  } catch (error) {
    console.log('Error getting today steps:', error);
    return 0;
  }
};

// Get session steps (steps counted during active walking session)
export const getSessionSteps = async () => {
  try {
    const sessionData = await AsyncStorage.getItem(SESSION_KEY);
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    return { startSteps: 0, sessionSteps: 0, isActive: false, startTime: null };
  } catch (error) {
    console.log('Error getting session steps:', error);
    return { startSteps: 0, sessionSteps: 0, isActive: false, startTime: null };
  }
};

// Start a walking session
export const startWalkingSession = async () => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startSteps = 0;
    const isAvailable = await Pedometer.isAvailableAsync();
    if (isAvailable) {
      const result = await Pedometer.getStepCountAsync(startOfDay, now);
      if (result) {
        startSteps = result.steps;
      }
    }

    const sessionData = {
      startSteps,
      sessionSteps: 0,
      isActive: true,
      startTime: now.toISOString(),
      causeId: null,
    };

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    return sessionData;
  } catch (error) {
    console.log('Error starting walking session:', error);
    return null;
  }
};

// Stop walking session
export const stopWalkingSession = async () => {
  try {
    const sessionData = await getSessionSteps();
    if (sessionData.isActive) {
      sessionData.isActive = false;
      sessionData.endTime = new Date().toISOString();
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
    return sessionData;
  } catch (error) {
    console.log('Error stopping walking session:', error);
    return null;
  }
};

// Update session steps
export const updateSessionSteps = async (currentTotalSteps) => {
  try {
    const sessionData = await getSessionSteps();
    if (sessionData.isActive) {
      sessionData.sessionSteps = Math.max(0, currentTotalSteps - sessionData.startSteps);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
    return sessionData.sessionSteps;
  } catch (error) {
    console.log('Error updating session steps:', error);
    return 0;
  }
};

// Check if pedometer is available
export const isPedometerAvailable = async () => {
  try {
    return await Pedometer.isAvailableAsync();
  } catch (error) {
    console.log('Error checking pedometer:', error);
    return false;
  }
};

// Subscribe to live step updates
export const subscribeToSteps = (callback) => {
  return Pedometer.watchStepCount((result) => {
    callback(result.steps);
  });
};

// Register background fetch task
export const registerBackgroundStepTask = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_TASK);

    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_STEP_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('Background step task registered');
    }
  } catch (error) {
    console.log('Error registering background task:', error);
  }
};

// Unregister background fetch task
export const unregisterBackgroundStepTask = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_STEP_TASK);
    }
  } catch (error) {
    console.log('Error unregistering background task:', error);
  }
};

// Request permissions for step counting
export const requestStepPermissions = async () => {
  try {
    if (Platform.OS === 'ios') {
      // iOS automatically handles permissions through HealthKit
      const isAvailable = await Pedometer.isAvailableAsync();
      return isAvailable;
    } else if (Platform.OS === 'android') {
      // Android needs ACTIVITY_RECOGNITION permission for API 29+
      const { status } = await Pedometer.requestPermissionsAsync();
      return status === 'granted';
    }
    return false;
  } catch (error) {
    console.log('Error requesting step permissions:', error);
    return false;
  }
};

export default {
  getTodaySteps,
  getSessionSteps,
  startWalkingSession,
  stopWalkingSession,
  updateSessionSteps,
  isPedometerAvailable,
  subscribeToSteps,
  registerBackgroundStepTask,
  unregisterBackgroundStepTask,
  requestStepPermissions,
};
