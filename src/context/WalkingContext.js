import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { Accelerometer, Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StepCounterService from '../services/StepCounterService';
import NotificationService from '../services/NotificationService';
import BackgroundStepService from '../services/BackgroundStepService';
import WearableService from '../services/WearableService';
import PermissionService from '../services/PermissionService';

const WalkingContext = createContext();

const API_URL = 'https://www.videosdownloaders.com/firsttrackapi/api/';

// Local queue for step events that failed to reach the server (e.g. offline
// mid-walk). Flushed opportunistically on the next successful post.
const PENDING_EVENTS_KEY = '@wern_pending_step_events';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { apiFetch } = require('../utils/apiClient');

const readPendingEvents = async () => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writePendingEvents = async (list) => {
  try {
    await AsyncStorage.setItem(PENDING_EVENTS_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    // Silent
  }
};

// Fetch the authoritative daily totals (steps, km, kcal, litres, goal)
// from get-digital-vault-data. Returns range_summary on success, else null.
const fetchDailyStats = async (token) => {
  if (!token) return null;
  try {
    const { json } = await apiFetch(
      `${API_URL}get-digital-vault-data?token=${token}&filter=daily`,
      { headers: { Accept: 'application/json' } }
    );
    if (json?.status === true && json?.data?.range_summary) {
      return json.data.range_summary;
    }
    return null;
  } catch (e) {
    console.log('get-digital-vault-data failed:', e?.message);
    return null;
  }
};

const sendStepEventOnce = async ({ token, categoryId, steps, location, timestamp }) => {
  const fd = new FormData();
  fd.append('token', token);
  fd.append('category_id', String(categoryId));
  fd.append('steps', String(steps));
  fd.append('timestamp', String(timestamp ?? Math.floor(Date.now() / 1000)));
  fd.append('type', 'walk');
  if (location?.lat != null) fd.append('lat', String(location.lat));
  if (location?.lng != null) fd.append('lng', String(location.lng));

  const { json } = await apiFetch(`${API_URL}save-step-event`, {
    method: 'POST',
    body: fd,
    headers: { Accept: 'application/json' },
  });
  if (json?.status === true && json?.data) return json.data;
  return null;
};

// Send a step delta. If it fails, queue it to AsyncStorage so we don't
// lose step credit when the user is offline. On success, also flushes any
// previously queued events.
const postStepEvent = async ({ token, categoryId, steps, location }) => {
  if (!token || !categoryId || !steps || steps <= 0) return null;
  const timestamp = Math.floor(Date.now() / 1000);

  try {
    const data = await sendStepEventOnce({ token, categoryId, steps, location, timestamp });
    if (data) {
      // Success — flush any queued events in the background.
      flushPendingEvents(token).catch(() => {});
      return data;
    }
    // Server returned non-success body but no throw: queue for retry.
    await enqueuePending({ categoryId, steps, location, timestamp });
    return null;
  } catch (e) {
    console.log('save-step-event failed, queuing for retry:', e?.message);
    await enqueuePending({ categoryId, steps, location, timestamp });
    return null;
  }
};

const enqueuePending = async (event) => {
  const list = await readPendingEvents();
  list.push(event);
  await writePendingEvents(list);
};

const flushPendingEvents = async (token) => {
  const list = await readPendingEvents();
  if (!list.length) return;
  const remaining = [];
  for (const ev of list) {
    try {
      const data = await sendStepEventOnce({ token, ...ev });
      if (!data) remaining.push(ev);
    } catch {
      remaining.push(ev);
    }
  }
  await writePendingEvents(remaining);
};

// Storage key functions - include user ID for multi-account support
const getStorageKeys = (userId) => ({
  walkingState: `@wern_walking_state_${userId || 'guest'}`,
  stepCount: `@wern_step_count_${userId || 'guest'}`,
  lastDate: `@wern_last_date_${userId || 'guest'}`,
  dailyStats: `@wern_daily_stats_${userId || 'guest'}`,
});

// Legacy keys (for migration AND background service)
// IMPORTANT: BackgroundStepService uses WALKING_STATE_KEY directly, so we MUST save to it
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

// Daily step log key - stores { "YYYY-MM-DD": { steps, km, kcal, goal } }
const DAILY_STEP_LOG_KEY = '@wern_daily_step_log';

// Save today's steps to the persistent daily log
const saveToDailyStepLog = async (dateString, steps, km, kcal, goal) => {
  try {
    const stored = await AsyncStorage.getItem(DAILY_STEP_LOG_KEY);
    const log = stored ? JSON.parse(stored) : {};
    log[dateString] = { steps: steps || 0, km: parseFloat(km) || 0, kcal: kcal || 0, goal: goal || 8000 };
    await AsyncStorage.setItem(DAILY_STEP_LOG_KEY, JSON.stringify(log));
  } catch (e) {
    console.log('Error saving daily step log:', e.message);
  }
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

  // Stats — server is the source of truth. The save-step-event response
  // returns the authoritative kilometre / kcal / litres for today, so we
  // store them as state and update from each API response. We fall back to
  // a local estimate until the first response arrives.
  const [litres, setLitres] = useState('0.00');
  const [kilometre, setKilometre] = useState('0.00');
  const [kcal, setKcal] = useState(0);
  const hasServerStats = useRef(false);

  // Local estimate used only until the first API response arrives (or if
  // the request fails). Matches the backend formulas.
  const calculateKilometre = (steps) => {
    const STRIDE_LENGTH_METERS = 0.75;
    return ((steps * STRIDE_LENGTH_METERS) / 1000).toFixed(2);
  };
  const calculateKcal = (steps) => Math.round(steps * 0.05);

  // Keep the local fallback in sync with stepCount until the server takes over.
  useEffect(() => {
    if (!hasServerStats.current) {
      setKilometre(calculateKilometre(stepCount));
      setKcal(calculateKcal(stepCount));
    }
  }, [stepCount]);

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
  const stepThreshold = 1.15; // Lower threshold for better sensitivity (gravity is ~1.0)
  const lastStepTime = useRef(0);
  const minStepInterval = 280; // Minimum 280ms between steps (max ~214 steps/min to capture fast walking)

  // Additional filtering for more accurate detection
  const magnitudeHistory = useRef([]);
  const HISTORY_SIZE = 5;
  const isStepPeak = useRef(false); // Track if we're at a peak

  // Auth & API-related refs
  const currentToken = useRef(null);
  const refreshDailyStatsRef = useRef(null);

  // Socket-related refs
  const currentUserId = useRef(null);
  const currentLocation = useRef({ lat: 0, lng: 0 });
  const lastSocketSendTime = useRef(0);
  const socketSendInterval = useRef(null);
  const currentSessionSteps = useRef(0); // Ref to track current session steps for socket
  const currentCauseId = useRef(null); // Ref to track current cause for socket
  const lastSentSteps = useRef(0); // Track last sent steps to avoid duplicate sends
  const currentStepCountRef = useRef(0); // Ref to track total step count for saving
  // Push accumulated step delta every 2 minutes. Between flushes steps live
  // in AsyncStorage + in-memory refs; the offline queue (`enqueuePending`)
  // covers network failures, and stopWalking / AppState background also
  // trigger an immediate flush so we never lose more than ~2min of credit.
  const SOCKET_SEND_INTERVAL = 120000;

  // Session restore tracking
  const isRestoredSession = useRef(false); // Track if current session was restored from storage
  const restoredStepCount = useRef(0); // Step count when session was restored
  const lastPedometerSteps = useRef(0); // Last known pedometer value for incremental counting

  // Milestone tracking - notify every 100 steps
  const lastMilestoneReached = useRef(0);
  const MILESTONE_INTERVAL = 100; // Notify every 100 steps

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
        // Save yesterday's final steps to daily log before resetting
        const savedDailyStats = await AsyncStorage.getItem(keys.dailyStats);
        if (savedDailyStats) {
          const stats = JSON.parse(savedDailyStats);
          if (stats.stepCount > 0) {
            const km = ((stats.stepCount * 0.75) / 1000).toFixed(2);
            const kcalVal = Math.round(stats.stepCount * 0.05);
            await saveToDailyStepLog(lastDate, stats.stepCount, km, kcalVal, goalSteps);
          }
        }

        // It's a new day - reset step count and daily stats
        console.log('New day detected, resetting step count and daily stats');
        setStepCount(0);
        setTodaySteps(0);
        setSessionSteps(0);
        sessionStartSteps.current = 0;
        currentStepCountRef.current = 0;
        lastSentSteps.current = 0;
        lastMilestoneReached.current = 0;

        // CRITICAL: reset walking start time so pedometer queries don't
        // pull yesterday's steps back into today's count.
        walkingStartTime.current = new Date();
        isRestoredSession.current = false;
        restoredStepCount.current = 0;
        lastPedometerSteps.current = 0;

        // Reset litres (km/kcal are calculated from stepCount)
        setLitres('0.00');

        // Save the reset
        await AsyncStorage.setItem(keys.stepCount, JSON.stringify({
          count: 0,
          date: new Date().toDateString(),
        }));

        // Reset daily stats in storage (km/kcal calculated from stepCount)
        await AsyncStorage.setItem(keys.dailyStats, JSON.stringify({
          stepCount: 0,
          litres: '0.00',
          date: today,
        }));

        // Reset the native background service counters so hourly
        // deltas don't stay anchored to yesterday's total.
        try {
          await BackgroundStepService.resetForNewDay();
        } catch (e) {
          console.log('BackgroundStepService reset failed:', e?.message);
        }
      }

      // Update last date in BOTH user-specific and legacy keys so
      // the midnight timer and this check stay in sync.
      await AsyncStorage.setItem(keys.lastDate, today);
      await AsyncStorage.setItem(LAST_DATE_KEY, today);
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
        // Save yesterday's steps to daily log before resetting
        const yesterdayDate = getTodayDateString(); // still yesterday until we reset
        const finalSteps = currentStepCountRef.current || 0;
        if (finalSteps > 0) {
          const km = ((finalSteps * 0.75) / 1000).toFixed(2);
          const kcalVal = Math.round(finalSteps * 0.05);
          await saveToDailyStepLog(yesterdayDate, finalSteps, km, kcalVal, goalSteps);
        }

        console.log('Midnight reached - resetting daily steps and stats');
        setStepCount(0);
        setTodaySteps(0);
        setSessionSteps(0);
        sessionStartSteps.current = 0;
        currentStepCountRef.current = 0;
        lastSentSteps.current = 0;
        lastMilestoneReached.current = 0;

        // CRITICAL: reset walking start time so the pedometer poll
        // doesn't immediately re-add yesterday's steps via
        // Pedometer.getStepCountAsync(yesterdayStart, now).
        walkingStartTime.current = new Date();
        isRestoredSession.current = false;
        restoredStepCount.current = 0;
        lastPedometerSteps.current = 0;

        // Reset litres (km/kcal are calculated from stepCount)
        setLitres('0.00');

        const today = getTodayDateString();

        // Save the reset
        await AsyncStorage.setItem(storageKeys.current.stepCount, JSON.stringify({
          count: 0,
          date: new Date().toDateString(),
        }));
        // Keep user-specific and legacy lastDate keys in sync.
        await AsyncStorage.setItem(storageKeys.current.lastDate, today);
        await AsyncStorage.setItem(LAST_DATE_KEY, today);

        // Reset the native background service counters so hourly
        // deltas don't stay anchored to yesterday's total.
        try {
          await BackgroundStepService.resetForNewDay();
        } catch (e) {
          console.log('BackgroundStepService reset failed:', e?.message);
        }

        // Reset daily stats in storage (km/kcal calculated from stepCount)
        await AsyncStorage.setItem(storageKeys.current.dailyStats, JSON.stringify({
          stepCount: 0,
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
          // Restore if the session is fresh (within the last 18 hours),
          // regardless of which calendar day it started on. A walk that
          // begins at 11pm and continues to 8am is legitimate overnight
          // activity and shouldn't be silently discarded just because
          // the start-day string doesn't match today's.
          const sessionStart = state.startTime ? new Date(state.startTime) : null;
          const MAX_SESSION_MS = 18 * 60 * 60 * 1000; // 18 hours
          const sessionAge = sessionStart ? Date.now() - sessionStart.getTime() : Infinity;
          const isFreshEnough = sessionAge < MAX_SESSION_MS;

          if (isFreshEnough) {
            setIsWalking(true);
            setActiveCause(state.activeCause);
            sessionStartSteps.current = state.sessionStartSteps || 0;

            // CRITICAL: Use NOW as the walking start time for restored sessions
            // The old start time from storage won't work because pedometer can't
            // track from a timestamp when the app wasn't running
            walkingStartTime.current = new Date();

            // Restore session steps
            const savedSessionSteps = state.sessionSteps || 0;
            if (savedSessionSteps > 0) {
              setSessionSteps(savedSessionSteps);
            }

            // Calculate total steps for notification and restore.
            // If the native foreground service kept running while the app
            // was killed/backgrounded, its `currentSteps` is the source of
            // truth — take the max so we never lose steps counted while
            // the JS side was dead.
            let totalStepsRestored = (state.sessionStartSteps || 0) + savedSessionSteps;
            try {
              const nativeSteps = await BackgroundStepService.getCurrentStepCount();
              if (nativeSteps && nativeSteps > totalStepsRestored) {
                console.log('📱 Native service has more steps than AsyncStorage:', nativeSteps, '>', totalStepsRestored);
                totalStepsRestored = nativeSteps;
              }
            } catch (e) {
              console.log('Error reading native step count on restore:', e?.message);
            }

            // Mark this as a restored session so pedometer handler adds to existing count
            isRestoredSession.current = true;
            restoredStepCount.current = totalStepsRestored;
            lastPedometerSteps.current = 0; // Will track incremental steps from NOW

            // Set the step count immediately to the restored value
            setStepCount(totalStepsRestored);
            console.log('📱 Restored walking session with steps:', totalStepsRestored, '- pedometer starting fresh from now');

            // Start background tracking with current step count (shows notification)
            try {
              await BackgroundStepService.startBackgroundStepTracking(totalStepsRestored, DEFAULT_GOAL_STEPS, currentUserId.current);
            } catch (error) {
              console.log('Failed to start background tracking on restore:', error.message);
            }
          } else {
            // Session from a previous day OR a stale same-day session
            // older than 18h — clear it so a fresh walk starts clean.
            console.log('📱 Clearing stale walking session (> 18h old)');
            const clearedState = { isWalking: false, activeCause: null };
            await AsyncStorage.setItem(storageKeys.current.walkingState, JSON.stringify(clearedState));
            await AsyncStorage.setItem(WALKING_STATE_KEY, JSON.stringify(clearedState));
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
          // Only load litres from storage (km/kcal are calculated from stepCount)
          setLitres(stats.litres || '0.00');
        } else {
          // Different day - reset
          console.log('Daily stats from different day, resetting');
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
          // Save to both user-specific key AND legacy key (for BackgroundStepService)
          await AsyncStorage.setItem(storageKeys.current.walkingState, JSON.stringify(state));
          // CRITICAL: Also save to legacy key - BackgroundStepService reads from this key
          await AsyncStorage.setItem(WALKING_STATE_KEY, JSON.stringify(state));
        }
      };
      saveSession();
    }
  }, [isWalking, sessionSteps]);

  // Update notification with step count - updates on every step change
  const lastNotifiedSteps = useRef(0);

  useEffect(() => {
    if (isWalking && Platform.OS !== 'web') {
      // Update notification whenever steps change
      if (stepCount !== lastNotifiedSteps.current) {
        console.log('📱 Updating notification:', lastNotifiedSteps.current, '->', stepCount);
        lastNotifiedSteps.current = stepCount;
        BackgroundStepService.updateForegroundNotification(stepCount, goalSteps);
      }
    }
  }, [isWalking, stepCount, goalSteps]);

  // Listen for watch step data and merge with phone steps
  useEffect(() => {
    if (!WearableService.isAvailable) return;
    const unsubscribe = WearableService.onWatchData((data) => {
      if (data.source === 'watch' && typeof data.stepCount === 'number' && isWalking) {
        // Take the higher of watch vs phone steps (never lose steps)
        const watchSteps = data.stepCount;
        const phoneSteps = currentStepCountRef.current;
        if (watchSteps > phoneSteps) {
          console.log(`⌚ Watch has more steps (${watchSteps} > ${phoneSteps}), merging`);
          setStepCount(watchSteps);
        }
      }
      // If watch started a walk, start on phone too
      if (data.source === 'watch' && data.command === 'start' && !isWalking) {
        console.log('⌚ Watch started walk, syncing to phone');
      }
      if (data.source === 'watch' && data.command === 'stop' && isWalking) {
        console.log('⌚ Watch stopped walk, syncing to phone');
      }
    });
    return unsubscribe;
  }, [isWalking]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // App going to background - save current state
      if (nextAppState.match(/inactive|background/) && isWalking) {
        console.log('📱 App going to background, saving step data...');
        // Save current step count immediately
        const currentCount = currentStepCountRef.current;
        await AsyncStorage.setItem(storageKeys.current.stepCount, JSON.stringify({
          count: currentCount,
          date: new Date().toDateString(),
        }));

        // Also save walking state with current session steps
        const bgWalkingState = {
          isWalking: true,
          activeCause: activeCause,
          sessionStartSteps: sessionStartSteps.current,
          sessionSteps: currentSessionSteps.current,
          startTime: walkingStartTime.current?.toISOString(),
        };
        await AsyncStorage.setItem(storageKeys.current.walkingState, JSON.stringify(bgWalkingState));
        // CRITICAL: Also save to legacy key - BackgroundStepService reads from this key
        await AsyncStorage.setItem(WALKING_STATE_KEY, JSON.stringify(bgWalkingState));
        console.log('📱 Saved step count before background:', currentCount);

        // Flush pending step delta so we don't lose up to 2 minutes of steps
        // while the app sits in the background.
        const deltaSteps = currentCount - lastSentSteps.current;
        if (currentToken.current && currentCauseId.current && deltaSteps > 0) {
          const ackData = await postStepEvent({
            token: currentToken.current,
            categoryId: currentCauseId.current,
            steps: deltaSteps,
            location: currentLocation.current,
          });
          if (ackData) {
            lastSentSteps.current = currentCount;
            hasServerStats.current = true;
          }
        }
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - check for new day
        await checkAndResetForNewDay();

        // Pull fresh daily totals from the server.
        refreshDailyStatsRef.current?.().catch(() => {});

        console.log('📱 App came to foreground, syncing steps...');

        // Always pull from the native foreground service, even if the JS
        // side thinks we're not walking. The service may have kept counting
        // while JS was asleep — we need to pick up that higher count so
        // the app number matches what's in the notification.
        try {
          const bgResult = await BackgroundStepService.syncStepsFromBackground();
          if (bgResult) {
            console.log('📱 Background sync result:', bgResult);
          }
          const storedCount = await BackgroundStepService.getCurrentStepCount();
          if (storedCount > 0) {
            setStepCount(prev => Math.max(prev, storedCount));
            console.log('📱 Updated from native service count:', storedCount);
          }
        } catch (error) {
          console.log('Error syncing background steps:', error);
        }

        // Get steps from pedometer directly
        if (isPedometerAvailable && isWalking && walkingStartTime.current) {
          try {
            const now = new Date();
            const result = await Pedometer.getStepCountAsync(walkingStartTime.current, now);
            console.log('📱 Pedometer foreground result:', result);
            if (result && result.steps > 0) {
              // For restored sessions, handle incremental update
              if (isRestoredSession.current) {
                const newTotal = restoredStepCount.current + result.steps;
                setSessionSteps(prev => Math.max(prev, result.steps));
                setStepCount(prev => Math.max(prev, newTotal));
              } else {
                // Update session steps from pedometer (more accurate for background)
                setSessionSteps(result.steps);
                setStepCount(prev => {
                  const newCount = sessionStartSteps.current + result.steps;
                  return Math.max(prev, newCount);
                });
              }
            }
          } catch (error) {
            console.log('Error getting pedometer steps on foreground:', error);
          }

          // Force the foreground-service notification to repaint with the
          // current total. Without this, the notification can appear
          // "paused" on resume until the next sensor tick arrives.
          try {
            BackgroundStepService.updateForegroundNotification(
              currentStepCountRef.current,
              goalSteps
            );
          } catch (e) {
            // Silent fail
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isWalking, isPedometerAvailable, checkAndResetForNewDay, activeCause]);

  // Step counting when walking
  // Use getStepCountAsync as PRIMARY source (more reliable than watchStepCount)
  // watchStepCount can drop subscription silently, so we poll every second
  const pedometerSyncInterval = useRef(null);
  const lastWatchUpdate = useRef(Date.now());

  useEffect(() => {
    if (isWalking) {
      // PEDOMETER: Primary step counting
      if (isPedometerAvailable) {
        console.log('📊 Starting pedometer for step counting');

        // Method 1: Real-time watch (for immediate feedback, but can drop)
        const startWatchSubscription = () => {
          if (pedometerSubscription.current) {
            pedometerSubscription.current.remove();
          }
          pedometerSubscription.current = Pedometer.watchStepCount(async (result) => {
            lastWatchUpdate.current = Date.now(); // Track last update time

            let newTotalSteps = 0;
            if (isRestoredSession.current) {
              const incrementalSteps = result.steps - lastPedometerSteps.current;
              if (incrementalSteps > 0) {
                newTotalSteps = restoredStepCount.current + result.steps;
                setSessionSteps(prev => prev + incrementalSteps);
                setStepCount(prev => {
                  const finalCount = Math.max(prev, newTotalSteps);
                  currentStepCountRef.current = finalCount;
                  return finalCount;
                });
                lastPedometerSteps.current = result.steps;
              }
            } else {
              newTotalSteps = sessionStartSteps.current + result.steps;
              setSessionSteps(result.steps);
              setStepCount(prev => {
                const finalCount = Math.max(prev, newTotalSteps);
                currentStepCountRef.current = finalCount;
                return finalCount;
              });
            }

            if (newTotalSteps > 0) {
              AsyncStorage.setItem(storageKeys.current.stepCount, JSON.stringify({
                count: newTotalSteps,
                date: new Date().toDateString(),
              })).catch(() => {});
            }
          });
        };

        startWatchSubscription();

        // Method 2: Poll every 1 second - this is the RELIABLE source
        // Also restarts watch subscription if it seems stuck (no updates for 5 seconds)
        pedometerSyncInterval.current = setInterval(async () => {
          if (walkingStartTime.current) {
            try {
              const now = new Date();

              // Safety clamp: if the walking start time is from a
              // different day (e.g. session crossed midnight without a
              // proper reset), roll it forward to start-of-today so the
              // pedometer query doesn't pull yesterday's steps.
              if (walkingStartTime.current.toDateString() !== now.toDateString()) {
                const startOfToday = new Date(now);
                startOfToday.setHours(0, 0, 0, 0);
                walkingStartTime.current = startOfToday;
                sessionStartSteps.current = 0;
                console.log('📊 walkingStartTime crossed day boundary, clamped to start-of-today');
              }

              const result = await Pedometer.getStepCountAsync(walkingStartTime.current, now);

              if (result && result.steps >= 0) {
                let newTotalSteps = 0;

                if (isRestoredSession.current) {
                  newTotalSteps = restoredStepCount.current + result.steps;
                } else {
                  newTotalSteps = sessionStartSteps.current + result.steps;
                }

                // Always update session steps from poll (more reliable)
                setSessionSteps(result.steps);

                // Update step count if this gives us more steps
                setStepCount(prev => {
                  if (newTotalSteps > prev) {
                    console.log('📊 Pedometer poll update:', { sessionSteps: result.steps, total: newTotalSteps });
                    currentStepCountRef.current = newTotalSteps;
                    AsyncStorage.setItem(storageKeys.current.stepCount, JSON.stringify({
                      count: newTotalSteps,
                      date: new Date().toDateString(),
                    })).catch(() => {});
                    return newTotalSteps;
                  }
                  return prev;
                });
              }

              // Health check: restart watch subscription if stuck for over 5 seconds
              const timeSinceLastWatch = Date.now() - lastWatchUpdate.current;
              if (timeSinceLastWatch > 5000) {
                console.log('📊 Watch subscription may be stuck, restarting...');
                startWatchSubscription();
                lastWatchUpdate.current = Date.now();
              }
            } catch (e) {
              console.log('Pedometer poll error:', e.message);
            }
          }
        }, 1000); // Poll every 1 second for reliable counting
      }

      // ACCELEROMETER: Only used as FALLBACK when pedometer is not available
      if (Platform.OS !== 'web' && !isPedometerAvailable) {
        console.log('📊 Using accelerometer as fallback (no pedometer)');
        let lastAccelSaveTime = 0;
        const ACCEL_SAVE_INTERVAL = 2000;

        // More sensitive settings for better detection
        Accelerometer.setUpdateInterval(50); // 50ms = 20 updates/second (more responsive)
        accelerometerSubscription.current = Accelerometer.addListener(({ x, y, z }) => {
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();

          magnitudeHistory.current.push(magnitude);
          if (magnitudeHistory.current.length > HISTORY_SIZE) {
            magnitudeHistory.current.shift();
          }

          const smoothedMagnitude = magnitudeHistory.current.reduce((a, b) => a + b, 0) / magnitudeHistory.current.length;
          const timeSinceLastStep = now - lastStepTime.current;

          // More sensitive step detection
          if (
            lastMagnitude.current > stepThreshold &&
            smoothedMagnitude < lastMagnitude.current &&
            lastMagnitude.current > smoothedMagnitude + 0.02 && // Lower threshold for better sensitivity
            timeSinceLastStep > minStepInterval &&
            !isStepPeak.current
          ) {
            isStepPeak.current = true;
            lastStepTime.current = now;

            setSessionSteps(prev => prev + 1);
            setStepCount(prev => {
              const newCount = prev + 1;
              currentStepCountRef.current = newCount;

              // Save immediately but throttle to avoid too many writes
              if (now - lastAccelSaveTime > ACCEL_SAVE_INTERVAL) {
                lastAccelSaveTime = now;
                AsyncStorage.setItem(storageKeys.current.stepCount, JSON.stringify({
                  count: newCount,
                  date: new Date().toDateString(),
                })).catch(() => {});
              }

              return newCount;
            });
          }

          // Reset peak flag when magnitude drops below threshold
          if (smoothedMagnitude < stepThreshold - 0.08) {
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
        if (pedometerSyncInterval.current) {
          clearInterval(pedometerSyncInterval.current);
          pedometerSyncInterval.current = null;
        }
      };
    }
  }, [isWalking, isPedometerAvailable]);

  // Start walking
  const startWalking = useCallback(async (causeId, userId = null, location = null) => {
    const now = new Date();
    walkingStartTime.current = now;

    // CRITICAL: Ensure we have the correct step count from AsyncStorage
    // This prevents starting from 0 if the state hasn't been restored yet
    // Use the MAXIMUM of: current state, AsyncStorage value, and ref value
    let actualStepCount = Math.max(stepCount, currentStepCountRef.current);
    try {
      const savedStepCount = await AsyncStorage.getItem(storageKeys.current.stepCount);
      if (savedStepCount) {
        const parsed = JSON.parse(savedStepCount);
        const today = new Date().toDateString();
        if (parsed.date === today) {
          // Always use the maximum to ensure we never lose steps
          actualStepCount = Math.max(actualStepCount, parsed.count);
        }
      }
    } catch (e) {
      console.log('Error reading step count before walking:', e);
    }

    // Update state if we found a higher value
    if (actualStepCount > stepCount) {
      setStepCount(actualStepCount);
      setTodaySteps(actualStepCount);
      console.log('📱 Restored step count before walking:', actualStepCount);
    }

    // Set the session start to the actual count - this is the baseline for new steps
    sessionStartSteps.current = actualStepCount;
    currentStepCountRef.current = actualStepCount;
    console.log('📱 Starting walk with sessionStartSteps:', actualStepCount);
    setSessionSteps(0);
    setActiveCause(causeId);
    setIsWalking(true);

    // Reset litres to 0 when starting fresh (km/kcal are calculated from stepCount automatically)
    // Litres will be updated from server response
    setLitres('0.00');

    // Reset restored session flags for fresh sessions
    isRestoredSession.current = false;
    restoredStepCount.current = 0;
    lastPedometerSteps.current = 0;

    // Reset milestone tracking to current step count floor
    // (so first notification is at next 500 boundary after current steps)
    lastMilestoneReached.current = Math.floor(stepCount / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;

    // Store user info for socket
    if (userId) currentUserId.current = userId;
    if (location) currentLocation.current = location;

    // Save state to both user-specific key AND legacy key (for BackgroundStepService)
    const walkingState = {
      isWalking: true,
      activeCause: causeId,
      sessionStartSteps: stepCount,
      sessionSteps: 0,
      startTime: now.toISOString(),
    };
    await AsyncStorage.setItem(storageKeys.current.walkingState, JSON.stringify(walkingState));
    // CRITICAL: Also save to legacy key - BackgroundStepService reads from this key
    await AsyncStorage.setItem(WALKING_STATE_KEY, JSON.stringify(walkingState));

    // Store cause ID for socket
    currentCauseId.current = causeId;

    // Setup notification channels for milestones
    if (Platform.OS !== 'web') {
      await NotificationService.requestNotificationPermissions();
      await NotificationService.setupNotificationChannel();

      // Request battery optimization exemption (first time only)
      const batteryRequested = await PermissionService.hasBatteryOptimizationBeenRequested();
      if (!batteryRequested) {
        console.log('📱 Requesting battery optimization exemption...');
        await PermissionService.requestBatteryOptimization();
      }
    }

    // Start background step tracking - this shows the foreground service notification
    // The foreground service notification is the ONLY reliable way to show steps in background
    try {
      const started = await BackgroundStepService.startBackgroundStepTracking(stepCount, goalSteps, userId);
      console.log('📢 Background tracking started:', started);
    } catch (error) {
      console.log('Failed to start background step tracking:', error.message);
    }

    try {
      // Start periodic step sync — send DELTA steps to save-step-event HTTP endpoint.
      // Server ACCUMULATES received steps, so we send only the difference since last send.
      lastSentSteps.current = currentStepCountRef.current;
      socketSendInterval.current = setInterval(async () => {
        const totalSteps = currentStepCountRef.current;
        const token = currentToken.current;
        if (!token || !currentCauseId.current || totalSteps <= 0) return;

        const deltaSteps = totalSteps - lastSentSteps.current;
        if (deltaSteps <= 0) return;

        const ackData = await postStepEvent({
          token,
          categoryId: currentCauseId.current,
          steps: deltaSteps,
          location: currentLocation.current,
        });

        if (ackData) {
          lastSentSteps.current = totalSteps;
          hasServerStats.current = true;
          console.log('📤 Sent delta steps:', deltaSteps, '(total:', totalSteps, ') ack:', ackData);

          // Apply authoritative server values for today's totals.
          if (ackData.goal && ackData.goal > 0) setGoalSteps(ackData.goal);
          if (ackData.kilometre !== undefined) {
            setKilometre(typeof ackData.kilometre === 'number'
              ? ackData.kilometre.toFixed(2)
              : String(ackData.kilometre));
          }
          if (ackData.kcal !== undefined) {
            setKcal(typeof ackData.kcal === 'number'
              ? Math.round(ackData.kcal)
              : Number(ackData.kcal) || 0);
          }
          const litresValue = ackData.litres ?? ackData.liters ?? ackData.water;
          if (litresValue !== undefined) setLitres(String(litresValue));

          // Persist stats locally.
          const localStepCount = currentStepCountRef.current;
          const todayDate = getTodayDateString();
          try {
            await AsyncStorage.setItem(storageKeys.current.dailyStats, JSON.stringify({
              stepCount: localStepCount,
              litres: litresValue !== undefined ? String(litresValue) : litres,
              date: todayDate,
            }));
            const logKm = ((localStepCount * 0.75) / 1000).toFixed(2);
            const logKcal = Math.round(localStepCount * 0.05);
            await saveToDailyStepLog(todayDate, localStepCount, logKm, logKcal, goalSteps);
          } catch (e) {
            // Silent
          }

          // Sync state to watch
          WearableService.syncToWatch({
            stepCount: totalSteps,
            dailyGoal: goalSteps,
            activeCause: activeCause || 1,
            isWalking: true,
            litties: Math.floor(totalSteps / 100),
          });
        }
      }, SOCKET_SEND_INTERVAL);

    } catch (error) {
      console.log('Step sync setup failed:', error.message);
    }
  }, [stepCount, goalSteps]);

  // Stop walking
  const stopWalking = useCallback(async () => {
    // Send final step delta before cleaning up.
    const totalSteps = currentStepCountRef.current;
    const deltaSteps = totalSteps - lastSentSteps.current;

    if (currentToken.current && deltaSteps > 0 && currentCauseId.current) {
      await postStepEvent({
        token: currentToken.current,
        categoryId: currentCauseId.current,
        steps: deltaSteps,
        location: currentLocation.current,
      });
      console.log('📤 Final delta steps sent to server:', deltaSteps, '(total:', totalSteps, ')');
    }

    // Tell watch we stopped
    WearableService.syncToWatch({ stepCount: totalSteps, dailyGoal: goalSteps, activeCause: activeCause || 1, isWalking: false, litties: Math.floor(totalSteps / 100) });

    setIsWalking(false);

    // Save final session data to both keys
    const stoppedState = {
      isWalking: false,
      activeCause: null,
      lastSessionSteps: sessionSteps,
      endTime: new Date().toISOString(),
    };
    await AsyncStorage.setItem(storageKeys.current.walkingState, JSON.stringify(stoppedState));
    // CRITICAL: Also save to legacy key - BackgroundStepService reads from this key
    await AsyncStorage.setItem(WALKING_STATE_KEY, JSON.stringify(stoppedState));

    // Save daily stats to local storage (persist steps and litres for today)
    // km/kcal are calculated from stepCount, so no need to save them
    const finalStepCount = currentStepCountRef.current || stepCount;
    const stopDate = getTodayDateString();
    await AsyncStorage.setItem(storageKeys.current.dailyStats, JSON.stringify({
      stepCount: finalStepCount,
      litres,
      date: stopDate,
    }));
    console.log('Daily stats saved:', { stepCount: finalStepCount, litres });

    // Save to persistent daily step log
    const stopKm = ((finalStepCount * 0.75) / 1000).toFixed(2);
    const stopKcal = Math.round(finalStepCount * 0.05);
    await saveToDailyStepLog(stopDate, finalStepCount, stopKm, stopKcal, goalSteps);

    // Stop socket send interval
    if (socketSendInterval.current) {
      clearInterval(socketSendInterval.current);
      socketSendInterval.current = null;
    }

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
    if (pedometerSyncInterval.current) {
      clearInterval(pedometerSyncInterval.current);
      pedometerSyncInterval.current = null;
    }

    walkingStartTime.current = null;
    currentUserId.current = null;
    currentCauseId.current = null;
    currentSessionSteps.current = 0;
    lastSentSteps.current = 0;

    // Reset restored session tracking
    isRestoredSession.current = false;
    restoredStepCount.current = 0;
    lastPedometerSteps.current = 0;
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

  // Pull today's authoritative totals from the server and apply them.
  const refreshDailyStatsFromServer = useCallback(async (tokenOverride) => {
    const token = tokenOverride ?? currentToken.current;
    if (!token) return;
    const summary = await fetchDailyStats(token);
    if (!summary) return;
    hasServerStats.current = true;
    if (summary.goal && summary.goal > 0) setGoalSteps(summary.goal);
    if (summary.kilometre !== undefined) {
      setKilometre(typeof summary.kilometre === 'number'
        ? summary.kilometre.toFixed(2)
        : String(summary.kilometre));
    }
    if (summary.kcal !== undefined) {
      setKcal(Number(summary.kcal) || 0);
    }
    const litresValue = summary.litres ?? summary.liters ?? summary.water;
    if (litresValue !== undefined) setLitres(String(litresValue));
    if (typeof summary.steps === 'number' && summary.steps > 0) {
      setStepCount((prev) => Math.max(prev, summary.steps));
      setTodaySteps((prev) => Math.max(prev, summary.steps));
    }
  }, []);

  // Update auth token used by save-step-event (called from WalkScreen).
  // Whenever the token changes, refresh daily stats from the server.
  const updateToken = useCallback((token) => {
    currentToken.current = token;
    if (token) refreshDailyStatsFromServer(token);
  }, [refreshDailyStatsFromServer]);

  // Expose the refresh callback via ref so earlier-declared effects
  // (e.g. the AppState foreground handler) can invoke it without TDZ issues.
  useEffect(() => {
    refreshDailyStatsRef.current = refreshDailyStatsFromServer;
  }, [refreshDailyStatsFromServer]);

  // Set current user and reload their data
  const setCurrentUser = useCallback(async (userId) => {
    if (userId === currentUserIdState) return; // Same user, no need to reload

    // Check if this is a user SWITCH (from one user to another) vs initial load
    const isUserSwitch = currentUserIdState !== null && currentUserIdState !== userId;

    console.log('📱 Setting user:', userId, isUserSwitch ? '(switching users)' : '(initial load)');
    setCurrentUserIdState(userId);
    storageKeys.current = getStorageKeys(userId);
    currentUserId.current = userId;

    // Only reset state when SWITCHING between different users
    // Don't reset on initial load - let the data loading populate the values
    if (isUserSwitch) {
      console.log('📱 User switch detected, resetting state');
      setStepCount(0);
      setSessionSteps(0);
      setTodaySteps(0);
      setLitres('0.00');
      setIsWalking(false);
      setActiveCause(null);
      lastMilestoneReached.current = 0;
    }

    // Load data for this user
    try {
      const keys = storageKeys.current;

      // Check and reset for new day
      const today = getTodayDateString();
      const lastDate = await AsyncStorage.getItem(keys.lastDate);

      if (lastDate && lastDate !== today) {
        // New day - reset stats and don't load old data
        console.log('📱 New day for user, resetting for new day');
        setStepCount(0);
        setSessionSteps(0);
        setTodaySteps(0);
        setLitres('0.00');
        await AsyncStorage.setItem(keys.lastDate, today);
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
          // Only load litres (km/kcal are calculated from stepCount)
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

            // Use NOW for pedometer to work correctly after app restart
            walkingStartTime.current = new Date();

            if (state.sessionSteps) {
              setSessionSteps(state.sessionSteps);
            }

            const totalSteps = (state.sessionStartSteps || 0) + (state.sessionSteps || 0);

            // Mark as restored session so pedometer adds to existing count
            isRestoredSession.current = true;
            restoredStepCount.current = totalSteps;
            lastPedometerSteps.current = 0;

            try {
              await BackgroundStepService.startBackgroundStepTracking(totalSteps, goalSteps, userId);
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
        updateToken,
        refreshDailyStatsFromServer,
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
