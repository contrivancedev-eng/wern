// Background Step Counting Service
// Uses native Android foreground service for reliable background step counting
import { Platform, NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pedometer } from 'expo-sensors';

// Native module (Android only)
const { StepCounterModule } = NativeModules;

// Storage keys
const STEP_COUNT_KEY = '@wern_step_count';

// Track state
let currentStepCount = 0;
let currentGoalSteps = 10000;
let lastRecordedSteps = 0;
let currentUserId = null;
let isRunning = false;

// Get today's date string
const getTodayDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Update hourly step data
const updateHourlyData = async (stepDelta) => {
  if (stepDelta <= 0 || !currentUserId) return;

  try {
    const todayKey = `hourlySteps_${currentUserId}_${getTodayDateString()}`;
    const currentHour = new Date().getHours();

    let hourlyData = Array(24).fill(0);
    const savedData = await AsyncStorage.getItem(todayKey);
    if (savedData) {
      hourlyData = JSON.parse(savedData);
    }

    hourlyData[currentHour] = (hourlyData[currentHour] || 0) + stepDelta;
    await AsyncStorage.setItem(todayKey, JSON.stringify(hourlyData));
  } catch (error) {
    // Silent fail
  }
};

// Start background tracking
export const startBackgroundStepTracking = async (initialSteps = 0, goalSteps = 10000, userId = null) => {
  if (Platform.OS === 'web') return false;

  try {
    currentStepCount = initialSteps;
    currentGoalSteps = goalSteps;
    lastRecordedSteps = initialSteps;
    currentUserId = userId;
    isRunning = true;

    // Save goal for reference
    await AsyncStorage.setItem('@wern_goal_steps', goalSteps.toString());

    // Start native foreground service (Android)
    if (Platform.OS === 'android' && StepCounterModule) {
      try {
        await StepCounterModule.startService(initialSteps, goalSteps);
        console.log('✅ Native step counter service started');
      } catch (error) {
        console.log('Native service start error:', error?.message);
      }
    }

    console.log('✅ Step tracking started with', initialSteps, 'steps');
    return true;
  } catch (error) {
    console.log('Start error:', error?.message);
    return false;
  }
};

// Update from foreground - syncs step count to native service
export const updateForegroundNotification = async (steps, goalSteps = 10000) => {
  if (Platform.OS === 'web' || !isRunning) return;

  currentStepCount = steps;
  currentGoalSteps = goalSteps;

  // Update hourly data
  const stepDelta = steps - lastRecordedSteps;
  if (stepDelta > 0) {
    await updateHourlyData(stepDelta);
    lastRecordedSteps = steps;
  }

  // Update native service with current steps
  if (Platform.OS === 'android' && StepCounterModule) {
    try {
      await StepCounterModule.updateSteps(steps);
      await StepCounterModule.updateGoal(goalSteps);
    } catch (error) {
      // Silent fail
    }
  }
};

// Sync steps from native service
export const syncStepsFromBackground = async () => {
  if (Platform.OS === 'android' && StepCounterModule) {
    try {
      const nativeSteps = await StepCounterModule.getCurrentSteps();
      if (nativeSteps > currentStepCount) {
        currentStepCount = nativeSteps;
        return { totalSteps: nativeSteps, source: 'native' };
      }
    } catch (error) {
      // Silent fail
    }
  }
  return null;
};

// Get current step count
export const getCurrentStepCount = async () => {
  // Try native service first
  if (Platform.OS === 'android' && StepCounterModule) {
    try {
      const nativeSteps = await StepCounterModule.getCurrentSteps();
      if (nativeSteps > 0) {
        return nativeSteps;
      }
    } catch (error) {
      // Fall through to storage
    }
  }

  // Fallback to storage
  try {
    const saved = await AsyncStorage.getItem(STEP_COUNT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === new Date().toDateString()) {
        return parsed.count;
      }
    }
    return 0;
  } catch {
    return 0;
  }
};

// Stop background tracking
export const stopBackgroundStepTracking = async () => {
  if (Platform.OS === 'web') return;

  isRunning = false;

  // Stop native service (Android)
  if (Platform.OS === 'android' && StepCounterModule) {
    try {
      await StepCounterModule.stopService();
      console.log('✅ Native step counter service stopped');
    } catch (error) {
      console.log('Native service stop error:', error?.message);
    }
  }

  console.log('✅ Step tracking stopped');
};

// Check if running
export const isBackgroundTrackingRunning = async () => {
  if (Platform.OS === 'android' && StepCounterModule) {
    try {
      return await StepCounterModule.isRunning();
    } catch (error) {
      return isRunning;
    }
  }
  return isRunning;
};

// Request permissions
export const requestBackgroundPermissions = async () => {
  if (Platform.OS === 'web') return false;

  try {
    // Request pedometer permission
    const { status } = await Pedometer.requestPermissionsAsync();
    return status === 'granted';
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
  syncStepsFromBackground,
  getCurrentStepCount,
};
