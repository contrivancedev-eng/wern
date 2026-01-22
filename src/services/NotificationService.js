import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const WALKING_NOTIFICATION_ID = 'walking-step-counter';
const MILESTONE_NOTIFICATION_ID = 'milestone-notification';

// Track notification state
let isNotificationActive = false;
let isFirstNotification = true;

// Configure notification handler
// shouldShowAlert: false = no heads-up popup, notification only in drawer
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false, // NO heads-up popup - only in notification drawer
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
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

    console.log('Notification permission status:', finalStatus);
    return finalStatus === 'granted';
  } catch (error) {
    console.log('Error requesting notification permissions:', error);
    return false;
  }
};

// Show persistent notification for walking session - Simple Fitze-like format
export const showWalkingNotification = async (totalSteps, goalSteps = 10000, causeName = 'Walking', stats = {}) => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    const stepsFormatted = totalSteps.toLocaleString();

    // Build notification content - Simple Fitze-like format
    const notificationContent = {
      title: 'Counting your steps',
      body: `Steps: ${stepsFormatted}`,
      data: { type: 'walking', steps: totalSteps, goal: goalSteps },
      sound: null,
    };

    // Android-specific options
    if (Platform.OS === 'android') {
      notificationContent.channelId = 'walking';
      notificationContent.sticky = true;
      notificationContent.autoDismiss = false;
      notificationContent.priority = 'default'; // DEFAULT = shows in drawer reliably
      notificationContent.color = '#1B8A9E';
      notificationContent.ongoing = true;
    }

    console.log('📢 Showing notification:', { title: notificationContent.title, body: notificationContent.body });

    // Schedule notification with same ID - this UPDATES existing notification silently
    await Notifications.scheduleNotificationAsync({
      identifier: WALKING_NOTIFICATION_ID,
      content: notificationContent,
      trigger: null,
    });

    console.log('✅ Notification scheduled successfully');
    isNotificationActive = true;
    isFirstNotification = false;
  } catch (error) {
    console.log('❌ Error showing notification:', error.message);
  }
};

// Update walking notification (alias for show)
export const updateWalkingNotification = async (totalSteps, goalSteps = 10000, causeName = 'Walking', stats = {}) => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await showWalkingNotification(totalSteps, goalSteps, causeName, stats);
  } catch (error) {
    console.log('Error updating notification:', error.message);
  }
};

// Dismiss walking notification
export const dismissWalkingNotification = async () => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.dismissNotificationAsync(WALKING_NOTIFICATION_ID);
    isNotificationActive = false;
    isFirstNotification = true; // Reset for next walking session
    console.log('Walking notification dismissed');
  } catch (error) {
    console.log('Error dismissing notification:', error.message);
  }
};

// Set up notification channels for Android
export const setupNotificationChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    // Delete old channels if exist (to apply new settings)
    await Notifications.deleteNotificationChannelAsync('walking').catch(() => {});
    await Notifications.deleteNotificationChannelAsync('milestone').catch(() => {});

    // Create channel with DEFAULT importance - shows in drawer, may show heads-up for first notification
    // Using DEFAULT because LOW doesn't show on some devices
    await Notifications.setNotificationChannelAsync('walking', {
      name: 'Walking Progress',
      description: 'Shows your step count progress while walking',
      importance: Notifications.AndroidImportance.DEFAULT, // DEFAULT = shows in drawer reliably
      vibrationPattern: null,
      lightColor: '#1B8A9E',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      sound: null,
      enableVibrate: false,
      showBadge: false,
      enableLights: false,
    });
    console.log('Walking notification channel created with DEFAULT importance');

    // Create milestone channel with HIGH importance - shows heads-up notification
    await Notifications.setNotificationChannelAsync('milestone', {
      name: 'Step Milestones',
      description: 'Celebrates your step milestones every 500 steps',
      importance: Notifications.AndroidImportance.HIGH, // HIGH = heads-up notification
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#22c55e',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      enableLights: true,
    });
    console.log('Milestone notification channel created with HIGH importance');
  } catch (error) {
    console.log('Error setting up notification channel:', error.message);
  }
};

// Show heads-up milestone notification every 500 steps
export const showMilestoneNotification = async (steps) => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    const stepsFormatted = steps.toLocaleString();

    // Get encouraging message based on milestone
    let message = '';
    if (steps >= 10000) {
      message = '🎉 Amazing! You hit your daily goal!';
    } else if (steps >= 5000) {
      message = '💪 Halfway there! Keep going!';
    } else if (steps >= 2000) {
      message = '🔥 Great progress! You\'re on fire!';
    } else if (steps >= 1000) {
      message = '⭐ Nice work! Keep up the pace!';
    } else {
      message = '👟 Keep walking! Every step counts!';
    }

    const notificationContent = {
      title: `🏆 ${stepsFormatted} Steps Milestone!`,
      body: message,
      data: { type: 'milestone', steps },
      sound: 'default',
    };

    // Android-specific options for heads-up notification
    if (Platform.OS === 'android') {
      notificationContent.channelId = 'milestone';
      notificationContent.priority = 'high';
      notificationContent.color = '#22c55e';
    }

    console.log('🏆 Showing milestone notification:', { steps: stepsFormatted });

    // Show the notification - auto-dismiss after a few seconds
    await Notifications.scheduleNotificationAsync({
      identifier: `${MILESTONE_NOTIFICATION_ID}-${steps}`,
      content: notificationContent,
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

// Check if notifications are enabled
export const areNotificationsEnabled = async () => {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    return false;
  }
};

export default {
  requestNotificationPermissions,
  showWalkingNotification,
  updateWalkingNotification,
  dismissWalkingNotification,
  setupNotificationChannel,
  areNotificationsEnabled,
  showMilestoneNotification,
};
