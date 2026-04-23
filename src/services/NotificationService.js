import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const WALKING_NOTIFICATION_ID = 'walking-step-counter';
const MILESTONE_NOTIFICATION_ID = 'milestone-notification';
const STEP_COUNTER_CHANNEL = 'step-counter';

// Track notification state
let isNotificationActive = false;
let channelCreated = false;

// Configure notification handler
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data;
      const isMilestone = data?.type === 'milestone';

      // Step counter: show but no sound/vibration (channel controls this)
      // Milestone: show with sound and alert
      return {
        shouldShowAlert: true, // Must be true to show notification
        shouldPlaySound: isMilestone,
        shouldSetBadge: false,
      };
    },
  });
}

// Request notification permissions
export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    console.log('🔔 Notification permission status:', finalStatus);
    return finalStatus === 'granted';
  } catch (error) {
    console.log('❌ Error requesting notification permissions:', error);
    return false;
  }
};

// Ensure channel is created before showing notifications
const ensureChannelExists = async () => {
  if (Platform.OS !== 'android' || channelCreated) return;

  try {
    // Create step counter channel with DEFAULT importance
    // DEFAULT = shows in status bar and drawer, no heads-up, can make sound (but we disable it)
    await Notifications.setNotificationChannelAsync(STEP_COUNTER_CHANNEL, {
      name: 'Step Counter',
      description: 'Shows your step count while walking',
      importance: Notifications.AndroidImportance.DEFAULT, // DEFAULT shows in drawer
      sound: null, // No sound
      enableVibrate: false,
      vibrationPattern: null,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: false,
    });
    console.log('✅ Step counter channel ensured');
    channelCreated = true;
  } catch (error) {
    console.log('❌ Error ensuring channel:', error);
  }
};

// Show persistent step counter notification in drawer
export const showStepCounterNotification = async (totalSteps, goalSteps = 10000) => {
  if (Platform.OS === 'web') return;

  try {
    // Ensure channel exists first
    await ensureChannelExists();

    const stepsFormatted = totalSteps.toLocaleString();
    const progress = Math.min(Math.round((totalSteps / goalSteps) * 100), 100);

    const content = {
      title: `🚶 ${stepsFormatted} steps`,
      body: `${progress}% of daily goal`,
      data: { type: 'step-counter' },
      sound: false,
    };

    // Android-specific settings
    if (Platform.OS === 'android') {
      content.channelId = STEP_COUNTER_CHANNEL;
      content.sticky = true;
    }

    console.log('📢 Scheduling step counter notification...');

    await Notifications.scheduleNotificationAsync({
      identifier: WALKING_NOTIFICATION_ID,
      content,
      trigger: null, // Show immediately
    });

    isNotificationActive = true;
    console.log('✅ Step counter notification shown:', stepsFormatted);
  } catch (error) {
    console.log('❌ Step counter notification failed:', error.message || error);
  }
};

// Legacy function for compatibility
export const showWalkingNotification = async (totalSteps, goalSteps = 10000) => {
  return showStepCounterNotification(totalSteps, goalSteps);
};

// Update walking notification (alias for show)
export const updateWalkingNotification = async (totalSteps, goalSteps = 10000) => {
  if (Platform.OS === 'web') return;
  return showStepCounterNotification(totalSteps, goalSteps);
};

// Dismiss walking notification
export const dismissWalkingNotification = async () => {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.dismissNotificationAsync(WALKING_NOTIFICATION_ID);
    isNotificationActive = false;
    console.log('✅ Walking notification dismissed');
  } catch (error) {
    console.log('Error dismissing notification:', error.message);
  }
};

// Set up notification channels for Android
export const setupNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;

  try {
    // Delete old/renamed channels only (not the active step-counter channel)
    await Notifications.deleteNotificationChannelAsync('walking').catch(() => {});
    // Note: We don't delete 'step-counter' channel to avoid race conditions
    // with BackgroundStepService which also manages this channel

    // Create/update step counter channel with DEFAULT importance
    // DEFAULT = shows in notification drawer and status bar, no heads-up popup
    // setNotificationChannelAsync will create or update existing channel
    await Notifications.setNotificationChannelAsync(STEP_COUNTER_CHANNEL, {
      name: 'Step Counter',
      description: 'Shows your step count while walking',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
      vibrationPattern: null,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: false,
    });
    console.log('✅ Step counter channel ready (DEFAULT importance)');
    channelCreated = true;

    // Delete old milestone channel to apply any new settings (this one is OK to recreate)
    await Notifications.deleteNotificationChannelAsync('milestone').catch(() => {});

    // Create milestone channel with HIGH importance - shows heads-up notification
    await Notifications.setNotificationChannelAsync('milestone', {
      name: 'Step Milestones',
      description: 'Celebrates your step milestones',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#22c55e',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      enableLights: true,
    });
    console.log('✅ Milestone channel created (HIGH importance)');
  } catch (error) {
    console.log('❌ Error setting up notification channels:', error.message);
  }
};

// Show heads-up milestone notification
export const showMilestoneNotification = async (steps) => {
  if (Platform.OS === 'web') return;

  try {
    const stepsFormatted = steps.toLocaleString();

    let message = '';
    if (steps >= 10000) {
      message = '🎉 Amazing! You hit your daily goal!';
    } else if (steps >= 5000) {
      message = '💪 Halfway there! Keep going!';
    } else if (steps >= 2500) {
      message = '🔥 Great progress! You\'re on fire!';
    } else if (steps >= 1000) {
      message = '⭐ Nice work! Keep up the pace!';
    } else if (steps >= 500) {
      message = '🚶 Good start! Keep moving!';
    } else if (steps >= 200) {
      message = '👣 You\'re warming up! Keep going!';
    } else {
      message = '👟 Keep walking! Every step counts!';
    }

    const content = {
      title: `🏆 ${stepsFormatted} Steps Milestone!`,
      body: message,
      data: { type: 'milestone', steps },
      sound: 'default',
    };

    if (Platform.OS === 'android') {
      content.channelId = 'milestone';
      content.priority = 'high';
      content.color = '#22c55e';
    }

    console.log('🏆 Showing milestone notification:', stepsFormatted);

    await Notifications.scheduleNotificationAsync({
      identifier: `${MILESTONE_NOTIFICATION_ID}-${steps}`,
      content,
      trigger: null,
    });

    // Auto-dismiss after 5 seconds
    setTimeout(async () => {
      try {
        await Notifications.dismissNotificationAsync(`${MILESTONE_NOTIFICATION_ID}-${steps}`);
      } catch (e) {
        // Ignore if already dismissed
      }
    }, 5000);

    console.log('✅ Milestone notification shown');
  } catch (error) {
    console.log('❌ Error showing milestone notification:', error.message);
  }
};

// Show a heads-up notification for a server notification delivered via the
// in-app notifications API. Uses the HIGH-importance 'milestone' channel so
// Android shows it as a heads-up banner (same treatment as a real push).
export const showServerNotification = async ({ id, title, body, data }) => {
  if (Platform.OS === 'web') return;
  try {
    const content = {
      title: title || 'New notification',
      body: body || '',
      data: { type: 'inbox', id, ...(data || {}) },
      sound: 'default',
    };
    if (Platform.OS === 'android') {
      content.channelId = 'milestone';
      content.priority = 'high';
      content.color = '#3b82f6';
    }
    await Notifications.scheduleNotificationAsync({
      identifier: `inbox-${id || Date.now()}`,
      content,
      trigger: null,
    });
  } catch (error) {
    console.log('❌ showServerNotification failed:', error?.message || error);
  }
};

// Check if notifications are enabled
export const areNotificationsEnabled = async () => {
  if (Platform.OS === 'web') return false;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    return false;
  }
};

// Get all scheduled notifications (for debugging)
export const getScheduledNotifications = async () => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 Scheduled notifications:', notifications.length);
    return notifications;
  } catch (error) {
    console.log('Error getting scheduled notifications:', error);
    return [];
  }
};

// Get all presented notifications (for debugging)
export const getPresentedNotifications = async () => {
  try {
    const notifications = await Notifications.getPresentedNotificationsAsync();
    console.log('📋 Presented notifications:', notifications.length);
    notifications.forEach(n => {
      console.log('  -', n.request.identifier, n.request.content.title);
    });
    return notifications;
  } catch (error) {
    console.log('Error getting presented notifications:', error);
    return [];
  }
};

export default {
  requestNotificationPermissions,
  showWalkingNotification,
  showStepCounterNotification,
  updateWalkingNotification,
  dismissWalkingNotification,
  setupNotificationChannel,
  areNotificationsEnabled,
  showMilestoneNotification,
  getScheduledNotifications,
  getPresentedNotifications,
  showServerNotification,
};
