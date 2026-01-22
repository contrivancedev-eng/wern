import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { Accelerometer, Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StepCounterService from '../services/StepCounterService';
import NotificationService from '../services/NotificationService';
import SocketService from '../services/SocketService';
import BackgroundStepService from '../services/BackgroundStepService';
import PermissionService from '../services/PermissionService';

const WalkingContext = createContext();

// Storage key functions - include user ID for multi-account support
const getStorageKeys = (userId) => ({
  walkingState: `@wern_walking_state_${userId || 'guest'}`,
  stepCount: `@wern_step_count_${userId || 'guest'}`,
  lastDate: `@wern_last_date_${userId || 'guest'}`,
  dailyStats: `@wern_daily_stats_${userId || 'guest'}`,
});

// Legacy keys (for migration)
const WALKING_STATE_KEY = '@wern_walking_state';
const STEP_COUNT_KEY = '@wern_step_count';
const LAST_DATE_KEY = '@wern_last_date';
const DAILY_STATS_KEY = '@wern_daily_stats';

// Cause names for notification (category_id mapping)
const CAUSE_NAMES = {
  1: 'Forest Restoration',
  2: 'Clean Water',
  3: 'Food Security',
  4: 'Women Empowerment',
  5: 'Labubu',
};

// Default daily step goal
const DEFAULT_GOAL_STEPS = 10000;

export const WalkingProvider = ({ children }) => {
  const [isWalking, setIsWalking] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [sessionSteps, setSessionSteps] = useState(0);
  const [todaySteps, setTodaySteps] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [activeCause, setActiveCause] = useState(null);
  const [goalSteps, setGoalSteps] = useState(DEFAULT_GOAL_STEPS);
  const [currentUserIdState, setCurrentUserIdState] = useState(null);

  // Stats from socket response (not calculated locally)
  const [kilometre, setKilometre] = useState('0.00');
  const [kcal, setKcal] = useState(0);
  const [litres, setLitres] = useState('0.00');

  // Get storage keys for current user
  const storageKeys = useRef(getStorageKeys(null));

  const accelerometerSubscription = useRef(null);
  const pedometerSubscription = useRef(null);
  const appState = useRef(AppState.currentState);
  const sessionStartSteps = useRef(0);
  const walkingStartTime = useRef(null);
  const midnightCheckInterval = useRef(null);

  // Step detection variables for accelerometer - improved algorithm
  const lastMagnitude = useRef(0);
  const stepThreshold = 1.3; // Higher threshold to avoid false positives (gravity is ~1.0)
  const lastStepTime = useRef(0);
  const minStepInterval = 400; // Minimum 400ms between steps (max ~150 steps/min which is fast walking)

  // Additional filtering for more accurate detection
  const magnitudeHistory = useRef([]);
  const HISTORY_SIZE = 5;
  const isStepPeak = useRef(false); // Track if we're at a peak

  // Socket-related refs
  const currentUserId = useRef(null);
  const currentLocation = useRef({ lat: 0, lng: 0 });
  const lastSocketSendTime = useRef(0);
  const socketSendInterval = useRef(null);
  const currentSessionSteps = useRef(0); // Ref to track current session steps for socket
  const currentCauseId = useRef(null); // Ref to track current cause for socket
  const lastSentSteps = useRef(0); // Track last sent steps to avoid duplicate sends
  const currentStepCountRef = useRef(0); // Ref to track total step count for saving
  const SOCKET_SEND_INTERVAL = 5000; // Send step data every 5 seconds

  // Milestone tracking - notify every 500 steps
  const lastMilestoneReached = useRef(0);
  const MILESTONE_INTERVAL = 500; // Notify every 500 steps

  // Get today's date string (YYYY-MM-DD format)
  const getTodayDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Check if it's a new day and reset step count and daily stats
  const checkAndResetForNewDay = useCallback(async () => {
    try {
      const keys = storageKeys.current;
      const today = getTodayDateString();
      const lastDate = await AsyncStorage.getItem(keys.lastDate);

      if (lastDate && lastDate !== today) {
        // It's a new day - reset step count and daily stats
        console.log('New day detected, resetting step count and daily stats');
        setStepCount(0);
        setTodaySteps(0);
        setSessionSteps(0);
        sessionStartSteps.current = 0;

        // Reset daily stats
        setKilometre('0.00');
        setKcal(0);
        setLitres('0.00');

        // Save the reset
        await AsyncStorage.setItem(keys.stepCount, JSON.stringify({
          count: 0,
          date: new Date().toDateString(),
        }));

        // Reset daily stats in storage
        await AsyncStorage.setItem(keys.dailyStats, JSON.stringify({
          stepCount: 0,
          kilometre: '0.00',
          kcal: 0,
          litres: '0.00',
          date: today,
        }));
      }

      // Update last date
      await AsyncStorage.setItem(keys.lastDate, today);
    } catch (error) {
      console.log('Error checking for new day:', error);
    }
  }, []);

  // Calculate time until midnight
  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  };

  // Set up midnight reset timer
  useEffect(() => {
    const setupMidnightReset = () => {
      // Clear any existing interval
      if (midnightCheckInterval.current) {
        clearTimeout(midnightCheckInterval.current);
      }

      // Calculate time until midnight
      const timeUntilMidnight = getTimeUntilMidnight();

      // Set timeout to reset at midnight
      midnightCheckInterval.current = setTimeout(async () => {
        console.log('Midnight reached - resetting daily steps and stats');
        setStepCount(0);
        setTodaySteps(0);
        sessionStartSteps.current = 0;

        // Reset daily stats
        setKilometre('0.00');
        setKcal(0);
        setLitres('0.00');

        const today = getTodayDateString();

        // Save the reset
        await AsyncStorage.setItem(storageKeys.current.stepCount, JSON.stringify({
          count: 0,
          date: new Date().toDateString(),
        }));
        await AsyncStorage.setItem(LAST_DATE_KEY, today);

        // Reset daily stats in storage
        await AsyncStorage.setItem(storageKeys.current.dailyStats, JSON.stringify({
          stepCount: 0,
          kilometre: '0.00',
          kcal: 0,
          litres: '0.00',
          date: today,
        }));

        // Set up next midnight reset
        setupMidnightReset();
      }, timeUntilMidnight);
    };

    setupMidnightReset();

    return () => {
      if (midnightCheckInterval.current) {
        clearTimeout(midnightCheckInterval.current);
      }
    };
  }, []);

  // Initialize
  useEffect(() => {
    const init = async () => {
      // Setup notification channel
      await NotificationService.setupNotificationChannel();

      // Request ALL permissions upfront on app start
      if (Platform.OS !== 'web') {
        console.log('🚀 Requesting all permissions on app start...');
        const permissionResults = await PermissionService.requestAllPermissions();
        console.log('🚀 Permission results:', permissionResults);
      }

      // Check pedometer availability
      const available = await StepCounterService.isPedometerAvailable();
      setIsPedometerAvailable(available);
      console.log('📊 Pedometer available:', available);

      // Check and reset for new day
      await checkAndResetForNewDay();

      // Load saved walking state
      const savedState = await AsyncStorage.getItem(storageKeys.current.walkingState);
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.isWalking) {
          // Check if the walking session started today
          const sessionDate = state.startTime ? new Date(state.startTime).toDateString() : null;
          const today = new Date().toDateString();

          if (sessionDate === today) {
            setIsWalking(true);
            setActiveCause(state.activeCause);
            sessionStartSteps.current = state.sessionStartSteps || 0;
            walkingStartTime.current = state.startTime ? new Date(state.startTime) : new Date();

            // Restore session steps
            if (state.sessionSteps) {
              setSessionSteps(state.sessionSteps);
            }

            // Calculate total steps for notification (sessionStartSteps + sessionSteps)
            const totalStepsForNotification = (state.sessionStartSteps || 0) + (state.sessionSteps || 0);

            // Start background tracking with current step count (shows notification)
            try {
              await BackgroundStepService.startBackgroundStepTracking(totalStepsForNotification);
            } catch (error) {
              console.log('Failed to start background tracking on restore:', error.message);
            }
          } else {
            // Session from previous day - clear it
            await AsyncStorage.setItem(storageKeys.current.walkingState, JSON.stringify({
              isWalking: false,
              activeCause: null,
            }));
          }
        }
      }

      // Load saved step count (only if from today)
      const savedStepCount = await AsyncStorage.getItem(storageKeys.current.stepCount);
      if (savedStepCount) {
        const parsed = JSON.parse(savedStepCount);
        const today = new Date().toDateString();
        if (parsed.date === today) {
          setStepCount(parsed.count);
          setTodaySteps(parsed.count);
        } else {
          // Different day - reset
          setStepCount(0);
          setTodaySteps(0);
          await AsyncStorage.setItem(storageKeys.current.stepCount, JSON.stringify({
            count: 0,
            date: today,
          }));
        }
      }

      // Try to get steps from pedometer (for today only)
      if (available) {
        try {
          const steps = await StepCounterService.getTodaySteps();
          if (steps > 0) {
            setTodaySteps(steps);
            setStepCount(prev => Math.max(prev, steps));
          }
        } catch (e) {
          console.log('Error getting pedometer steps:', e);
        }
      }

      // Load saved daily stats (steps, km, kcal, litres) - only if from today
      const savedDailyStats = await AsyncStorage.getItem(storageKeys.current.dailyStats);
      if (savedDailyStats) {
        const stats = JSON.parse(savedDailyStats);
        const today = getTodayDateString();
        if (stats.date === today) {
          console.log('Loading saved daily stats:', stats);
          // Load step count from daily stats (takes priority over STEP_COUNT_KEY)
          if (stats.stepCount !== undefined && stats.stepCount > 0) {
            setStepCount(prev => Math.max(prev, stats.stepCount));
            setTodaySteps(prev => Math.max(prev, stats.stepCount));
          }
          setKilometre(stats.kilometre || '0.00');
          setKcal(stats.kcal || 0);
          setLitres(stats.litres || '0.00');
        } else {
          // Different day - reset
          console.log('Daily stats from different day, resetting');
          setKilometre('0.00');
          setKcal(0);
          setLitres('0.00');
        }
      }
    };

    init();

    return () => {
      if (accelerometerSubscription.current) {
        accelerometerSubscription.current.remove();
      }
      if (pedometerSubscription.current) {
        pedometerSubscription.current.remove();
      }
    };
  }, [checkAndResetForNewDay]);

  // Save step count whenever it changes, update ref, and check for milestones
  useEffect(() => {
    // Update ref for reliable access in callbacks
    currentStepCountRef.current = stepCount;

    const saveStepCount = async () => {
      await AsyncStorage.setItem(storageKeys.current.stepCount, JSON.stringify({
        count: stepCount,
        date: new Date().toDateString(),
      }));
    };
    if (stepCount > 0) {
      saveStepCount();
    }

    // Check for step milestones (every 500 steps) - only when walking
    if (isWalking && stepCount > 0 && Platform.OS !== 'web') {
      // Calculate current milestone (500, 1000, 1500, etc.)
      const currentMilestone = Math.floor(stepCount / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;

      // Check if we've crossed a new milestone
      if (currentMilestone > 0 && currentMilestone > lastMilestoneReached.current) {
        console.log('🏆 Milestone reached:', currentMilestone);
        lastMilestoneReached.current = currentMilestone;

        // Show heads-up notification
        NotificationService.showMilestoneNotification(currentMilestone);
      }
    }
  }, [stepCount, isWalking]);

  // Save session steps periodically when walking and update ref for socket
  useEffect(() => {
    // Update ref for socket to use
    currentSessionSteps.current = sessionSteps;

    if (isWalking && sessionSteps > 0) {
      const saveSession = async () => {
        const savedState = await AsyncStorage.getItem(storageKeys.current.walkingState);
        if (savedState) {
          const state = JSON.parse(savedState);
          state.sessionSteps = sessionSteps;
          await AsyncStorage.setItem(WALKING_STATE_KEY, JSON.stringify(state));
        }
      };
      saveSession();
    }
  }, [isWalking, sessionSteps]);

  // Update foreground notification when step count changes (debounced - every 5 steps to avoid performance issues)
  const lastNotifiedSteps = useRef(0);
  const notificationUpdateTimeout = useRef(null);

  useEffect(() => {
    if (isWalking && Platform.OS !== 'web') {
      // Update foreground notification every 5 steps or after 3 seconds of no updates
      const stepDiff = Math.abs(stepCount - lastNotifiedSteps.current);

      if (stepDiff >= 5) {
        // Clear any pending timeout
        if (notificationUpdateTimeout.current) {
          clearTimeout(notificationUpdateTimeout.current);
        }
        lastNotifiedSteps.current = stepCount;
        // Update the foreground service notification with current step count
        BackgroundStepService.updateForegroundNotification(stepCount);
      } else if (stepDiff > 0) {
        // Schedule an update for smaller changes (after 3 seconds)
        if (notificationUpdateTimeout.current) {
          clearTimeout(notificationUpdateTimeout.current);
        }
        notificationUpdateTimeout.current = setTimeout(() => {
          lastNotifiedSteps.current = stepCount;
          BackgroundStepService.updateForegroundNotification(stepCount);
        }, 3000);
      }
    }

    return () => {
      if (notificationUpdateTimeout.current) {
        clearTimeout(notificationUpdateTimeout.current);
      }
    };
  }, [isWalking, stepCount]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - check for new day
        await checkAndResetForNewDay();

        // Get steps from pedometer
        if (isPedometerAvailable && isWalking && walkingStartTime.current) {
          try {
            const now = new Date();
            const result = await Pedometer.getStepCountAsync(walkingStartTime.current, now);
            if (result && result.steps > 0) {
              // Update session steps from pedometer (more accurate for background)
              setSessionSteps(result.steps);
              setStepCount(prev => {
                const newCount = sessionStartSteps.current + result.steps;
                return Math.max(prev, newCount);
              });
            }
          } catch (error) {
            console.log('Error getting pedometer steps on foreground:', error);
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isWalking, isPedometerAvailable, checkAndResetForNewDay]);

  // Step counting when walking
  // PEDOMETER is the PRIMARY source (accurate, works in background/locked)
  // Accelerometer is secondary for responsive UI feedback only
  useEffect(() => {
    if (isWalking) {
      // PEDOMETER: Primary step counting - accurate and works when phone is locked
      if (isPedometerAvailable) {
        console.log('📊 Starting pedometer for step counting');
        pedometerSubscription.current = Pedometer.watchStepCount((result) => {
          // Pedometer is the authoritative source for step count
          const pedometerTotal = sessionStartSteps.current + result.steps;
          console.log('📊 Pedometer update:', { sessionSteps: result.steps, total: pedometerTotal });

          // Always use pedometer values (more accurate than accelerometer)
          setSessionSteps(result.steps);
          setStepCount(pedometerTotal);
        });
      }

      // ACCELEROMETER: Only used as FALLBACK when pedometer is not available
      // When pedometer IS available, accelerometer is disabled to prevent double counting
      if (Platform.OS !== 'web' && !isPedometerAvailable) {
        console.log('📊 Using accelerometer as fallback (no pedometer)');
        Accelerometer.setUpdateInterval(100); // 100ms = 10 updates/second
        accelerometerSubscription.current = Accelerometer.addListener(({ x, y, z }) => {
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();

          // Add to history for smoothing
          magnitudeHistory.current.push(magnitude);
          if (magnitudeHistory.current.length > HISTORY_SIZE) {
            magnitudeHistory.current.shift();
          }

          // Calculate smoothed magnitude (moving average)
          const smoothedMagnitude = magnitudeHistory.current.reduce((a, b) => a + b, 0) / magnitudeHistory.current.length;

          // Improved step detection with peak detection
          const timeSinceLastStep = now - lastStepTime.current;

          // Detect peak: previous smoothed was higher than current AND above threshold
          if (
            lastMagnitude.current > stepThreshold &&
            smoothedMagnitude < lastMagnitude.current &&
            lastMagnitude.current > smoothedMagnitude + 0.05 &&
            timeSinceLastStep > minStepInterval &&
            !isStepPeak.current
          ) {
            isStepPeak.current = true;
            lastStepTime.current = now;

            // Only increment if pedometer is NOT available
            setSessionSteps(prev => prev + 1);
            setStepCount(prev => prev + 1);
          }

          // Reset peak flag when magnitude drops below threshold
          if (smoothedMagnitude < stepThreshold - 0.1) {
            isStepPeak.current = false;
          }

          lastMagnitude.current = smoothedMagnitude;
        });
      }

      // Simulate steps on web for testing
      if (Platform.OS === 'web') {
        const simulateInterval = setInterval(() => {
          setSessionSteps(prev => prev + 1);
          setStepCount(prev => prev + 1);
        }, 1000);
        accelerometerSubscription.current = { remove: () => clearInterval(simulateInterval) };
      }

      return () => {
        if (accelerometerSubscription.current) {
          accelerometerSubscription.current.remove();
          accelerometerSubscription.current = null;
        }
        if (pedometerSubscription.current) {
          pedometerSubscription.current.remove();
          pedometerSubscription.current = null;
        }
      };
    }
  }, [isWalking, isPedometerAvailable]);

  // Start walking
  const startWalking = useCallback(async (causeId, userId = null, location = null) => {
    const now = new Date();
    walkingStartTime.current = now;
    sessionStartSteps.current = stepCount;
    setSessionSteps(0);
    setActiveCause(causeId);
    setIsWalking(true);

    // Reset milestone tracking to current step count floor
    // (so first notification is at next 500 boundary after current steps)
    lastMilestoneReached.current = Math.floor(stepCount / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;

    // Store user info for socket
    if (userId) currentUserId.current = userId;
    if (location) currentLocation.current = location;

    // Save state
    await AsyncStorage.setItem(storageKeys.current.walkingState, JSON.stringify({
      isWalking: true,
      activeCause: causeId,
      sessionStartSteps: stepCount,
      sessionSteps: 0,
      startTime: now.toISOString(),
    }));

    // Store cause ID for socket
    currentCauseId.current = causeId;

    // Start background step tracking with current step count
    // The foreground service notification will show the step count
    try {
      await BackgroundStepService.startBackgroundStepTracking(stepCount);
    } catch (error) {
      console.log('Failed to start background step tracking:', error.message);
    }

    // Connect to WebSocket for real-time step tracking
    try {
      await SocketService.connect();

      // Set up step acknowledgment handler
      // Socket response is ONLY used to save to local DB for persistence
      // It does NOT update the displayed step count (local counting is the source of truth)
      SocketService.onStepAck(async (data) => {
        console.log('✅ Step acknowledged - saving to local DB:', JSON.stringify(data));

        // Save server's step count to local DB for persistence (so app knows where to start next time)
        const serverSteps = data.steps ?? data.total_steps ?? data.step_count ?? data.totalSteps;
        if (serverSteps !== undefined && serverSteps > 0) {
          // Save to local storage only - don't update UI state
          await AsyncStorage.setItem(storageKeys.current.stepCount, JSON.stringify({
            count: serverSteps,
            date: new Date().toDateString(),
          }));
          // Also update todaySteps ref for next session start
          setTodaySteps(prev => Math.max(prev, serverSteps));
        }

        // Update goal from server if provided
        if (data.goal && data.goal > 0) {
          setGoalSteps(data.goal);
        }

        // Update other stats (km, kcal, litres) - these come from server
        const kmValue = data.kilometre ?? data.km ?? data.kilometers ?? data.distance;
        if (kmValue !== undefined) {
          setKilometre(kmValue);
        }
        const kcalValue = data.kcal ?? data.calories ?? data.cal;
        if (kcalValue !== undefined) {
          setKcal(kcalValue);
        }
        const litresValue = data.litres ?? data.liters ?? data.water;
        if (litresValue !== undefined) {
          setLitres(litresValue);
        }

        // Save all stats to local DB
        await AsyncStorage.setItem(storageKeys.current.dailyStats, JSON.stringify({
          stepCount: serverSteps || currentStepCountRef.current,
          kilometre: kmValue || kilometre,
          kcal: kcalValue || kcal,
          litres: litresValue || litres,
          date: getTodayDateString(),
        }));
      });

      // Start periodic socket updates - use refs to get current values
      // Only send if steps have changed since last send to avoid duplicate accumulation
      lastSentSteps.current = 0; // Reset on start
      socketSendInterval.current = setInterval(() => {
        if (currentUserId.current && currentSessionSteps.current > 0) {
          // Only send if steps have changed since last send
          if (currentSessionSteps.current !== lastSentSteps.current) {
            const stepData = {
              user_id: currentUserId.current,
              category_id: currentCauseId.current,
              steps: currentSessionSteps.current,
              timestamp: Math.floor(Date.now() / 1000),
              type: 'walk',
              lat: currentLocation.current?.lat || 0,
              lng: currentLocation.current?.lng || 0,
            };
            SocketService.sendStepEvent(stepData);
            lastSentSteps.current = currentSessionSteps.current;
          }
        }
      }, SOCKET_SEND_INTERVAL);

    } catch (error) {
      console.log('Socket connection failed:', error.message);
    }
  }, [stepCount, goalSteps]);

  // Stop walking
  const stopWalking = useCallback(async () => {
    // Send final step data before disconnecting - use refs to get current values
    if (currentUserId.current && currentSessionSteps.current > 0 && currentCauseId.current) {
      const finalStepData = {
        user_id: currentUserId.current,
        category_id: currentCauseId.current,
        steps: currentSessionSteps.current,
        timestamp: Math.floor(Date.now() / 1000),
        type: 'walk',
        lat: currentLocation.current?.lat || 0,
        lng: currentLocation.current?.lng || 0,
      };
      SocketService.sendStepEvent(finalStepData);
    }

    setIsWalking(false);

    // Save final session data
    await AsyncStorage.setItem(storageKeys.current.walkingState, JSON.stringify({
      isWalking: false,
      activeCause: null,
      lastSessionSteps: sessionSteps,
      endTime: new Date().toISOString(),
    }));

    // Save daily stats to local storage (persist steps, km, kcal, litres for today)
    // Use ref for stepCount to get the most current value
    const finalStepCount = currentStepCountRef.current || stepCount;
    await AsyncStorage.setItem(storageKeys.current.dailyStats, JSON.stringify({
      stepCount: finalStepCount,
      kilometre,
      kcal,
      litres,
      date: getTodayDateString(),
    }));
    console.log('Daily stats saved:', { stepCount: finalStepCount, kilometre, kcal, litres });

    // Stop socket send interval
    if (socketSendInterval.current) {
      clearInterval(socketSendInterval.current);
      socketSendInterval.current = null;
    }

    // Disconnect socket
    SocketService.disconnect();

    // Stop background step tracking
    try {
      await BackgroundStepService.stopBackgroundStepTracking();
    } catch (error) {
      console.log('Error stopping background tracking:', error.message);
    }

    // Cleanup subscriptions
    if (accelerometerSubscription.current) {
      accelerometerSubscription.current.remove();
      accelerometerSubscription.current = null;
    }
    if (pedometerSubscription.current) {
      pedometerSubscription.current.remove();
      pedometerSubscription.current = null;
    }

    walkingStartTime.current = null;
    currentUserId.current = null;
    currentCauseId.current = null;
    currentSessionSteps.current = 0;
    lastSentSteps.current = 0;
  }, [stepCount, kilometre, kcal, litres, sessionSteps]);

  // Refresh steps manually
  const refreshSteps = useCallback(async () => {
    if (isPedometerAvailable && isWalking && walkingStartTime.current) {
      try {
        const now = new Date();
        const result = await Pedometer.getStepCountAsync(walkingStartTime.current, now);
        if (result && result.steps > 0) {
          setSessionSteps(result.steps);
          setStepCount(prev => Math.max(prev, sessionStartSteps.current + result.steps));
        }
      } catch (error) {
        console.log('Error refreshing steps:', error);
      }
    }
  }, [isWalking, isPedometerAvailable]);

  // Update goal steps (called when user's goal is fetched from API)
  const updateGoalSteps = useCallback((newGoal) => {
    if (newGoal && newGoal > 0) {
      setGoalSteps(newGoal);
    }
  }, []);

  // Update location for socket (called from WalkScreen when location changes)
  const updateLocation = useCallback((lat, lng) => {
    currentLocation.current = { lat, lng };
  }, []);

  // Update user ID (called from WalkScreen)
  const updateUserId = useCallback((userId) => {
    currentUserId.current = userId;
  }, []);

  // Set current user and reload their data
  const setCurrentUser = useCallback(async (userId) => {
    if (userId === currentUserIdState) return; // Same user, no need to reload

    console.log('📱 Switching to user:', userId);
    setCurrentUserIdState(userId);
    storageKeys.current = getStorageKeys(userId);
    currentUserId.current = userId;

    // Reset state for new user
    setStepCount(0);
    setSessionSteps(0);
    setTodaySteps(0);
    setKilometre('0.00');
    setKcal(0);
    setLitres('0.00');
    setIsWalking(false);
    setActiveCause(null);

    // Reset milestone tracking for new user
    lastMilestoneReached.current = 0;

    // Load data for this user
    try {
      const keys = storageKeys.current;

      // Check and reset for new day
      const today = getTodayDateString();
      const lastDate = await AsyncStorage.getItem(keys.lastDate);

      if (lastDate && lastDate !== today) {
        // New day - don't load old data
        await AsyncStorage.setItem(keys.lastDate, today);
        console.log('📱 New day for user, starting fresh');
        return;
      }

      await AsyncStorage.setItem(keys.lastDate, today);

      // Load saved step count for this user
      const savedStepCount = await AsyncStorage.getItem(keys.stepCount);
      if (savedStepCount) {
        const parsed = JSON.parse(savedStepCount);
        const todayStr = new Date().toDateString();
        if (parsed.date === todayStr) {
          setStepCount(parsed.count);
          setTodaySteps(parsed.count);
          console.log('📱 Loaded step count for user:', parsed.count);
        }
      }

      // Load saved daily stats for this user
      const savedDailyStats = await AsyncStorage.getItem(keys.dailyStats);
      if (savedDailyStats) {
        const stats = JSON.parse(savedDailyStats);
        if (stats.date === today) {
          if (stats.stepCount > 0) {
            setStepCount(prev => Math.max(prev, stats.stepCount));
            setTodaySteps(prev => Math.max(prev, stats.stepCount));
          }
          setKilometre(stats.kilometre || '0.00');
          setKcal(stats.kcal || 0);
          setLitres(stats.litres || '0.00');
          console.log('📱 Loaded daily stats for user:', stats);
        }
      }

      // Load walking state for this user
      const savedState = await AsyncStorage.getItem(keys.walkingState);
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.isWalking) {
          const sessionDate = state.startTime ? new Date(state.startTime).toDateString() : null;
          const todayStr = new Date().toDateString();

          if (sessionDate === todayStr) {
            setIsWalking(true);
            setActiveCause(state.activeCause);
            sessionStartSteps.current = state.sessionStartSteps || 0;
            walkingStartTime.current = state.startTime ? new Date(state.startTime) : new Date();
            if (state.sessionSteps) {
              setSessionSteps(state.sessionSteps);
            }

            const totalSteps = (state.sessionStartSteps || 0) + (state.sessionSteps || 0);
            try {
              await BackgroundStepService.startBackgroundStepTracking(totalSteps);
            } catch (error) {
              console.log('Failed to start background tracking:', error.message);
            }
          }
        }
      }
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  }, [currentUserIdState]);

  return (
    <WalkingContext.Provider
      value={{
        isWalking,
        setIsWalking,
        stepCount,
        sessionSteps,
        todaySteps,
        goalSteps,
        activeCause,
        isPedometerAvailable,
        startWalking,
        stopWalking,
        refreshSteps,
        updateGoalSteps,
        updateLocation,
        updateUserId,
        setCurrentUser,
        // Stats from socket response
        kilometre,
        kcal,
        litres,
      }}
    >
      {children}
    </WalkingContext.Provider>
  );
};

export const useWalking = () => {
  const context = useContext(WalkingContext);
  if (!context) {
    throw new Error('useWalking must be used within a WalkingProvider');
  }
  return context;
};

export default WalkingContext;
