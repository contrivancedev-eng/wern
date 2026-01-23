import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon, Toast } from '../../components';
import { useTheme, useAuth } from '../../context';
import { fonts } from '../../utils';

const API_URL = 'https://www.videosdownloaders.com/firsttrackapi/api/';
const activityLevels = ['Beginner', 'Intermediate', 'Advanced'];

const ProfileScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const { user, token, refreshUserDetails, triggerDataRefresh } = useAuth();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [personalGoalExpanded, setPersonalGoalExpanded] = useState(false);
  const [accountSettingsExpanded, setAccountSettingsExpanded] = useState(false);
  const [dailyStepGoal, setDailyStepGoal] = useState('8000');
  const [activityLevel, setActivityLevel] = useState('Intermediate');
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [showStreakInfoModal, setShowStreakInfoModal] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.user_image || null);
  const [weeklyGoal, setWeeklyGoal] = useState('5');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [monthlySteps, setMonthlySteps] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  // Transaction history state
  const [transactionHistory, setTransactionHistory] = useState(null);
  const [transactionsByDate, setTransactionsByDate] = useState({});
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [selectedDayHourlyData, setSelectedDayHourlyData] = useState(Array(24).fill(0));
  const hourlyScrollRef = useRef(null);

  // Historical goals state - maps date strings to goal values
  const [historicalGoals, setHistoricalGoals] = useState({});

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  // Get today's date string for storage key
  const getTodayDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Load historical goals from AsyncStorage
  const loadHistoricalGoals = useCallback(async () => {
    const userId = user?.id || user?.user_id;
    if (!userId) return;

    try {
      const goalsKey = `historicalGoals_${userId}`;
      const stored = await AsyncStorage.getItem(goalsKey);
      if (stored) {
        setHistoricalGoals(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Error loading historical goals:', error.message);
    }
  }, [user]);

  // Save goal to AsyncStorage for a specific date
  const saveGoalForDate = useCallback(async (goal, dateString = null) => {
    const userId = user?.id || user?.user_id;
    if (!userId) return;

    try {
      const goalsKey = `historicalGoals_${userId}`;
      const stored = await AsyncStorage.getItem(goalsKey);
      const goals = stored ? JSON.parse(stored) : {};

      // Save goal for the specified date (or today if not specified)
      const date = dateString || getTodayDateString();
      goals[date] = parseInt(goal) || 8000;

      await AsyncStorage.setItem(goalsKey, JSON.stringify(goals));
      setHistoricalGoals(goals);
    } catch (error) {
      console.log('Error saving goal for date:', error.message);
    }
  }, [user]);

  // Fetch step transaction history
  const fetchTransactionHistory = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}get-step-transection-history?token=${token}`);
      const data = await response.json();

      if (data.status === true && data.data) {
        setTransactionHistory(data.data);

        // Group transactions by date
        if (data.data.transactions) {
          const grouped = {};
          data.data.transactions.forEach((transaction) => {
            const date = transaction.is_date;
            if (!grouped[date]) {
              grouped[date] = {
                transactions: [],
                totalSteps: 0,
                totalKm: 0,
                totalKcal: 0,
              };
            }
            grouped[date].transactions.push(transaction);
            grouped[date].totalSteps += parseInt(transaction.steps) || 0;
            grouped[date].totalKm += parseFloat(transaction.kilometre) || 0;
            grouped[date].totalKcal += parseFloat(transaction.kcal) || 0;
          });
          setTransactionsByDate(grouped);
        }
      }
    } catch (error) {
      console.log('Error fetching transaction history:', error.message);
    }
  }, [token]);

  // Fetch all profile data from consolidated API
  const fetchProfileData = useCallback(async () => {
    if (!token) return;

    setIsLoadingProfile(true);
    try {
      const response = await fetch(`${API_URL}get-profile-data?token=${token}`);
      const data = await response.json();

      if (data.status === true && data.data) {
        // Extract goal data
        if (data.data.goal) {
          const fetchedGoal = String(data.data.goal.daily_step_goal || '8000');
          setDailyStepGoal(fetchedGoal);
          setActivityLevel(data.data.goal.activity_level || 'Intermediate');
          setWeeklyGoal(String(data.data.goal.weekly_goal || '5'));
          // Save current goal to historical goals for today (so we track it even without explicit save)
          saveGoalForDate(fetchedGoal);
        }

        // Extract monthly steps data
        if (data.data.monthly_steps && data.data.monthly_steps.daily_steps) {
          setMonthlySteps(data.data.monthly_steps.daily_steps);
        }
      }
    } catch (error) {
      console.log('Error fetching profile data:', error.message);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [token, saveGoalForDate]);

  // Save user goals to API
  const saveUserGoals = async () => {
    if (!token) return;

    setIsSavingGoals(true);
    try {
      const response = await fetch(`${API_URL}save-user-goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          daily_step_goal: parseInt(dailyStepGoal) || 8000,
          activity_level: activityLevel,
          weekly_goal: parseInt(weeklyGoal) || 5,
        }),
      });

      const data = await response.json();

      if (data.status === true) {
        showToast('Goals saved successfully!', 'success');
        // Save goal to AsyncStorage for today's date (for historical tracking)
        await saveGoalForDate(dailyStepGoal);
        // Trigger data refresh so other screens (like WalkScreen) get updated goal
        triggerDataRefresh();
      } else {
        showToast(data.message || 'Failed to save goals.');
      }
    } catch (error) {
      console.log('Error saving user goals:', error.message);
      showToast('Failed to save goals. Please try again.');
    } finally {
      setIsSavingGoals(false);
    }
  };

  // Change password API
  const handleChangePassword = async () => {
    if (!token) return;

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(`${API_URL}change-password-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.status === true) {
        showToast('Password changed successfully!', 'success');
        // Clear password fields
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.message || 'Failed to change password.');
      }
    } catch (error) {
      console.log('Error changing password:', error.message);
      showToast('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Fetch fresh profile data and user details on mount
  useEffect(() => {
    fetchProfileData();
    fetchTransactionHistory();
    loadHistoricalGoals();
    // Refresh user details from API to get fresh data (not from local storage)
    refreshUserDetails();
  }, [fetchProfileData, fetchTransactionHistory, loadHistoricalGoals]);

  // Upload image to API
  const uploadUserImage = async (imageAsset) => {
    console.log('uploadUserImage called');
    if (!token || !imageAsset?.uri) {
      console.log('Missing token or uri');
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileUri = imageAsset.uri;
      const filename = fileUri.split('/').pop() || `profile_${Date.now()}.jpg`;
      const mimeType = imageAsset.mimeType || 'image/jpeg';

      // Create FormData
      const formData = new FormData();
      formData.append('token', token);
      formData.append('user_image', {
        uri: fileUri,
        name: filename,
        type: mimeType,
      });

      console.log('Calling API:', `${API_URL}update-user-image`);

      // Use AbortController for timeout (60 seconds for large images)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${API_URL}update-user-image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      console.log('API response:', JSON.stringify(data));

      if (data.status === true) {
        setProfileImage(fileUri);
        await refreshUserDetails();
        showToast('Profile picture updated successfully!', 'success');
      } else {
        showToast(data.message || 'Failed to update profile picture.');
      }
    } catch (error) {
      console.log('Error uploading image:', error.message);
      showToast('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const pickImageFromGallery = async () => {
    console.log('pickImageFromGallery called');
    setShowImagePickerModal(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Media library permission status:', status);
      if (status !== 'granted') {
        showToast('We need camera roll permissions to change your profile picture.', 'warning');
        return;
      }

      console.log('Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Reduced quality for faster upload
      });

      console.log('Image picker result:', JSON.stringify(result));
      if (!result.canceled && result.assets[0]) {
        console.log('Selected image asset:', JSON.stringify(result.assets[0]));
        // Upload the selected image to API (pass full asset for mimeType)
        await uploadUserImage(result.assets[0]);
      } else {
        console.log('Image selection canceled or no asset');
      }
    } catch (error) {
      console.log('Error in pickImageFromGallery:', error.message);
      showToast('Error selecting image: ' + error.message);
    }
  };

  const takePhoto = async () => {
    console.log('takePhoto called');
    setShowImagePickerModal(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      if (status !== 'granted') {
        showToast('We need camera permissions to take a photo.', 'warning');
        return;
      }

      console.log('Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Reduced quality for faster upload
      });

      console.log('Camera result:', JSON.stringify(result));
      if (!result.canceled && result.assets[0]) {
        console.log('Captured image asset:', JSON.stringify(result.assets[0]));
        // Upload the photo to API (pass full asset for mimeType)
        await uploadUserImage(result.assets[0]);
      } else {
        console.log('Camera canceled or no asset');
      }
    } catch (error) {
      console.log('Error in takePhoto:', error.message);
      showToast('Error taking photo: ' + error.message);
    }
  };

  // Generate calendar data from monthly steps API
  const calendarData = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentGoal = parseInt(dailyStepGoal) || 8000;

    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
      // Format date key as YYYY-MM-DD
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const steps = monthlySteps[dateKey] || 0;

      // Use historical goal for that specific day, fallback to current goal
      const goalSteps = historicalGoals[dateKey] || currentGoal;

      let status;
      if (day > currentDay) {
        status = 'upcoming';
      } else if (day === currentDay) {
        // Current day - show as "completed" if goal met, otherwise "current" (in progress)
        status = steps >= goalSteps ? 'completed' : 'current';
      } else if (steps >= goalSteps) {
        // Past day - completed only if daily goal was achieved
        status = 'completed';
      } else {
        // Past day - missed if goal was not achieved (even if some steps were recorded)
        status = 'missed';
      }

      data.push({ day, status, steps, goalSteps });
    }
    return data;
  }, [monthlySteps, dailyStepGoal, historicalGoals]);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const renderStatusIcon = (status) => {
    if (status === 'completed') {
      return (
        <View style={[styles.statusIcon, styles.completedIcon]}>
          <Icon name="checkmark" size={14} color="#FFFFFF" />
        </View>
      );
    } else if (status === 'current') {
      return (
        <View style={[styles.statusIcon, styles.currentIcon]}>
          <Icon name="footsteps" size={12} color="#FFFFFF" />
        </View>
      );
    } else if (status === 'missed') {
      return (
        <View style={[styles.statusIcon, styles.missedIcon]}>
          <Icon name="close" size={14} color="#FFFFFF" />
        </View>
      );
    } else {
      return (
        <View style={[styles.statusIcon, styles.upcomingIcon]}>
          <Icon
            name="lock"
            size={12}
            color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
          />
        </View>
      );
    }
  };

  // Get current month name (short and long)
  const currentMonthShort = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'short' });
  }, []);

  // Calculate streak count (consecutive completed days ending at today or last completed day)
  const streakCount = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    let streak = 0;

    // Count from today backwards
    for (let i = currentDay - 1; i >= 0; i--) {
      const dayData = calendarData[i];
      if (dayData && dayData.status === 'completed') {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [calendarData]);

  // Handle date click for details
  const handleDateClick = (day) => {
    if (!day || day.status === 'upcoming') return;

    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
    const dayData = transactionsByDate[dateKey];

    // Calculate hourly data for this day
    const hourlySteps = Array(24).fill(0);
    if (dayData?.transactions) {
      dayData.transactions.forEach((transaction) => {
        if (transaction.event_time) {
          const eventDate = new Date(transaction.event_time);
          const hour = eventDate.getHours();
          hourlySteps[hour] += parseInt(transaction.steps) || 0;
        }
      });
    }
    setSelectedDayHourlyData(hourlySteps);

    setSelectedDayDetails({
      date: dateKey,
      day: day.day,
      month: today.toLocaleDateString('en-US', { month: 'long' }),
      year: today.getFullYear(),
      status: day.status,
      steps: day.steps,
      goalSteps: day.goalSteps,
      ...dayData,
    });
    setShowDayDetailsModal(true);

    // Auto-scroll to hour with most steps after modal opens
    setTimeout(() => {
      const maxStepsHour = hourlySteps.indexOf(Math.max(...hourlySteps));
      if (maxStepsHour >= 0 && hourlyScrollRef.current) {
        const scrollPosition = Math.max(0, (maxStepsHour * 32) - 80);
        hourlyScrollRef.current?.scrollTo({ x: scrollPosition, animated: true });
      }
    }, 300);
  };

  // Get cause name by ID
  const getCauseName = (categoryId) => {
    const causes = {
      1: 'Forest Restoration',
      2: 'Clean Water',
      3: 'Food Security',
      4: "Women's Empowerment",
      5: 'Kids Walk for Labubu',
    };
    return causes[categoryId] || 'Walking';
  };

  // Format time from event_time
  const formatTime = (eventTime) => {
    if (!eventTime) return '';
    const date = new Date(eventTime);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Group calendar into weeks (starting from Sunday)
  const getCalendarWeeks = () => {
    const weeks = [];
    let currentWeek = [];

    // Calculate the start day of the current month (0 = Sunday, 6 = Saturday)
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDay = firstDayOfMonth.getDay();

    // Add empty cells for days before the 1st
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }

    calendarData.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // Fill remaining days in last week
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <Image
              source={profileImage ? { uri: profileImage } : require('../../../assest/img/no-img.gif')}
              style={styles.avatar}
            />
            {isUploadingImage && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => setShowImagePickerModal(true)}
              disabled={isUploadingImage}
            >
              <Icon name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Info */}
        <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>

        {/* Tier Card */}
        <View style={styles.tierCard}>
          <LinearGradient
            colors={['rgba(205, 127, 50, 0.8)', 'rgba(139, 90, 43, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tierGradient}
          >
            <View style={styles.tierContent}>
              <View style={styles.tierLeft}>
                <Text style={styles.tierLabel}>{user?.tier_details?.current_tier?.replace(' Tier', '') || 'Bronze'}</Text>
                <Text style={styles.tierTitle}>Tier</Text>
                <Image
                  source={require('../../../assest/img/bronze-tier.webp')}
                  style={styles.tierBadge}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.tierRight}>
                <View style={styles.tierProgressHeader}>
                  <Text style={styles.tierProgressLabel}>{user?.tier_details?.current_tier?.replace(' Tier', '') || 'Bronze'}</Text>
                  <Text style={styles.tierProgressValue}>
                    {user?.tier_details?.total_earn_points || 0}/{(user?.tier_details?.total_earn_points || 0) + (user?.tier_details?.points_needed_for_next_tier || 1000)}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${Math.min(100, ((user?.tier_details?.total_earn_points || 0) / ((user?.tier_details?.total_earn_points || 0) + (user?.tier_details?.points_needed_for_next_tier || 1000))) * 100)}%` }]} />
                </View>
                <Text style={styles.tierTimeRemaining}>Points: {user?.tier_details?.total_earn_points?.toLocaleString() || 0}</Text>
                <Text style={styles.tierDescription}>
                  Earn {user?.tier_details?.points_needed_for_next_tier?.toLocaleString() || '1,000'} more points to reach {user?.tier_details?.next_tier || 'Silver Tier'}.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Walking Streak */}
        <View style={styles.streakCard}>
          <BlurView intensity={15} tint="dark" style={styles.streakBlur}>
            <View style={styles.streakHeader}>
              <View style={styles.streakLeft}>
                <View style={styles.flameContainer}>
                  <Icon name="flame" size={24} color="#f97316" />
                </View>
                <View style={styles.streakTextContainer}>
                  <Text style={styles.streakNumber}>{streakCount}</Text>
                  <Text style={styles.streakLabel}> Your {currentMonthShort} walking streak</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.helpButton}
                onPress={() => setShowStreakInfoModal(true)}
              >
                <Icon
                  name="information-circle"
                  size={24}
                  color={isDarkMode ? 'rgba(255,255,255,0.4)' : colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* All-time Totals Summary */}
            {transactionHistory?.totals && (
              <View style={styles.totalsSummary}>
                <View style={styles.totalItem}>
                  <Icon name="footsteps" size={18} color="#22c55e" />
                  <Text style={styles.totalValue}>
                    {transactionHistory.totals.total_steps?.toLocaleString() || 0}
                  </Text>
                  <Text style={styles.totalLabel}>Total Steps</Text>
                </View>
                <View style={styles.totalDivider} />
                <View style={styles.totalItem}>
                  <Icon name="walk" size={18} color="#3b82f6" />
                  <Text style={styles.totalValue}>
                    {transactionHistory.totals.total_km?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.totalLabel}>Total Km</Text>
                </View>
                <View style={styles.totalDivider} />
                <View style={styles.totalItem}>
                  <Icon name="flame" size={18} color="#f97316" />
                  <Text style={styles.totalValue}>
                    {transactionHistory.totals.total_kcal?.toFixed(0) || 0}
                  </Text>
                  <Text style={styles.totalLabel}>Total Kcal</Text>
                </View>
              </View>
            )}

            {/* Calendar */}
            <View style={styles.calendar}>
              {/* Week days header */}
              <View style={styles.weekDaysRow}>
                {weekDays.map((day, index) => (
                  <Text key={index} style={styles.weekDayLabel}>{day}</Text>
                ))}
              </View>

              {/* Calendar grid - now clickable */}
              {getCalendarWeeks().map((week, weekIndex) => (
                <View key={weekIndex} style={styles.calendarRow}>
                  {week.map((day, dayIndex) => (
                    <TouchableOpacity
                      key={dayIndex}
                      style={styles.calendarCell}
                      onPress={() => handleDateClick(day)}
                      disabled={!day || day.status === 'upcoming'}
                      activeOpacity={0.7}
                    >
                      {day ? (
                        <>
                          {renderStatusIcon(day.status)}
                          <Text style={styles.calendarDay}>{day.day.toString().padStart(2, '0')}</Text>
                        </>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {/* Tap hint */}
            <Text style={styles.tapHint}>Tap on a date to view details</Text>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.statusIcon, styles.completedIcon, styles.legendIcon]}>
                  <Icon name="checkmark" size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.legendText}>Completed</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.statusIcon, styles.currentIcon, styles.legendIcon]}>
                  <Icon name="footsteps" size={10} color="#FFFFFF" />
                </View>
                <Text style={styles.legendText}>Today</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.statusIcon, styles.missedIcon, styles.legendIcon]}>
                  <Icon name="close" size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.legendText}>Missed</Text>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Personal Goal Accordion */}
        <View style={styles.accordionCard}>
          <BlurView intensity={15} tint="dark" style={styles.accordionBlur}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setPersonalGoalExpanded(!personalGoalExpanded)}
            >
              <View style={styles.accordionHeaderLeft}>
                <Icon
                  name="navigate"
                  size={24}
                  color={isDarkMode ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                />
                <Text style={styles.accordionTitle}>Personal Goal</Text>
              </View>
              <Icon
                name={personalGoalExpanded ? 'chevron-down' : 'arrow-forward'}
                size={20}
                color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
              />
            </TouchableOpacity>

            {personalGoalExpanded && (
              <View style={styles.accordionContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Daily Step Goal</Text>
                  <TextInput
                    style={styles.input}
                    value={dailyStepGoal}
                    onChangeText={setDailyStepGoal}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Activity Level</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowActivityDropdown(true)}
                  >
                    <Text style={styles.dropdownButtonText}>{activityLevel}</Text>
                    <Icon
                      name="chevron-down"
                      size={20}
                      color={isDarkMode ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Target Active Days</Text>
                  <TextInput
                    style={styles.input}
                    value={weeklyGoal}
                    onChangeText={setWeeklyGoal}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, isSavingGoals && styles.saveButtonDisabled]}
                  onPress={saveUserGoals}
                  disabled={isSavingGoals}
                >
                  {isSavingGoals ? (
                    <ActivityIndicator size="small" color="#1a1a1a" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Goals</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </BlurView>
        </View>

        {/* Account Settings Accordion */}
        <View style={styles.accordionCard}>
          <BlurView intensity={15} tint="dark" style={styles.accordionBlur}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setAccountSettingsExpanded(!accountSettingsExpanded)}
            >
              <View style={styles.accordionHeaderLeft}>
                <Icon
                  name="settings"
                  size={24}
                  color={isDarkMode ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                />
                <Text style={styles.accordionTitle}>Account Settings</Text>
              </View>
              <Icon
                name={accountSettingsExpanded ? 'chevron-down' : 'arrow-forward'}
                size={20}
                color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
              />
            </TouchableOpacity>

            {accountSettingsExpanded && (
              <View style={styles.accordionContent}>
                <Text style={styles.sectionLabel}>Change Password</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Old Password</Text>
                  <TextInput
                    style={styles.input}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, isChangingPassword && styles.saveButtonDisabled]}
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <ActivityIndicator size="small" color="#1a1a1a" />
                  ) : (
                    <Text style={styles.saveButtonText}>Change Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </BlurView>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Activity Level Dropdown Modal */}
      <Modal
        visible={showActivityDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActivityDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowActivityDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            {activityLevels.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.dropdownOption,
                  activityLevel === level && styles.dropdownOptionSelected,
                ]}
                onPress={() => {
                  setActivityLevel(level);
                  setShowActivityDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    activityLevel === level && styles.dropdownOptionTextSelected,
                  ]}
                >
                  {level}
                </Text>
                {activityLevel === level && (
                  <Icon name="checkmark" size={18} color="#f5c842" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePickerModal(false)}
        >
          <View style={styles.imagePickerModal}>
            <Text style={styles.imagePickerTitle}>Change Profile Photo</Text>

            <TouchableOpacity style={styles.imagePickerOption} onPress={takePhoto}>
              <Icon name="camera" size={24} color={colors.textWhite} />
              <Text style={styles.imagePickerOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.imagePickerOption} onPress={pickImageFromGallery}>
              <Icon name="image" size={24} color={colors.textWhite} />
              <Text style={styles.imagePickerOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.imagePickerCancel}
              onPress={() => setShowImagePickerModal(false)}
            >
              <Text style={styles.imagePickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Streak Info Modal */}
      <Modal
        visible={showStreakInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStreakInfoModal(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowStreakInfoModal(false)}
        >
          <View style={styles.streakInfoModal}>
            <View style={styles.streakInfoHeader}>
              <Icon name="flame" size={32} color="#f97316" />
              <Text style={styles.streakInfoTitle}>Walking Streak</Text>
            </View>

            <Text style={styles.streakInfoText}>
              Your walking streak shows how many consecutive days you've reached your daily step goal this month.
            </Text>

            <View style={styles.streakInfoItem}>
              <View style={[styles.statusIcon, styles.completedIcon]}>
                <Icon name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.streakInfoItemText}>
                <Text style={styles.streakInfoBold}>Completed: </Text>
                You reached your daily step goal
              </Text>
            </View>

            <View style={styles.streakInfoItem}>
              <View style={[styles.statusIcon, styles.missedIcon]}>
                <Icon name="close" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.streakInfoItemText}>
                <Text style={styles.streakInfoBold}>Missed: </Text>
                You didn't reach your goal that day
              </Text>
            </View>

            <View style={styles.streakInfoItem}>
              <View style={[styles.statusIcon, styles.upcomingIcon]}>
                <Icon
                  name="lock"
                  size={12}
                  color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
                />
              </View>
              <Text style={styles.streakInfoItemText}>
                <Text style={styles.streakInfoBold}>Upcoming: </Text>
                Future days yet to be completed
              </Text>
            </View>

            <Text style={styles.streakInfoTip}>
              Maintain a streak of 7+ days to earn bonus Litties!
            </Text>

            <TouchableOpacity
              style={styles.streakInfoButton}
              onPress={() => setShowStreakInfoModal(false)}
            >
              <Text style={styles.streakInfoButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Day Details Modal */}
      <Modal
        visible={showDayDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDayDetailsModal(false)}
      >
        <View style={styles.dayDetailsOverlay}>
          <View style={styles.dayDetailsModal}>
            {/* Header */}
            <View style={styles.dayDetailsHeader}>
              <View>
                <Text style={styles.dayDetailsDate}>
                  {selectedDayDetails?.month} {selectedDayDetails?.day}, {selectedDayDetails?.year}
                </Text>
                <View style={styles.dayDetailsStatusRow}>
                  {renderStatusIcon(selectedDayDetails?.status)}
                  <Text style={styles.dayDetailsStatusText}>
                    {selectedDayDetails?.status === 'completed' ? 'Goal Completed' :
                     selectedDayDetails?.status === 'current' ? 'In Progress' : 'Missed'}
                  </Text>
                </View>
                <Text style={styles.dayDetailsGoalText}>
                  Goal: {selectedDayDetails?.goalSteps?.toLocaleString() || '8,000'} steps
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dayDetailsCloseBtn}
                onPress={() => setShowDayDetailsModal(false)}
              >
                <Icon name="close" size={24} color={colors.textWhite} />
              </TouchableOpacity>
            </View>

            {/* Day Summary */}
            <View style={styles.daySummary}>
              <View style={styles.daySummaryItem}>
                <Icon name="footsteps" size={20} color="#22c55e" />
                <Text style={styles.daySummaryValue}>
                  {selectedDayDetails?.totalSteps?.toLocaleString() || selectedDayDetails?.steps || 0}
                </Text>
                <Text style={styles.daySummaryLabel}>Steps</Text>
              </View>
              <View style={styles.daySummaryDivider} />
              <View style={styles.daySummaryItem}>
                <Icon name="walk" size={20} color="#3b82f6" />
                <Text style={styles.daySummaryValue}>
                  {selectedDayDetails?.totalKm?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.daySummaryLabel}>Km</Text>
              </View>
              <View style={styles.daySummaryDivider} />
              <View style={styles.daySummaryItem}>
                <Icon name="flame" size={20} color="#f97316" />
                <Text style={styles.daySummaryValue}>
                  {selectedDayDetails?.totalKcal?.toFixed(0) || 0}
                </Text>
                <Text style={styles.daySummaryLabel}>Kcal</Text>
              </View>
            </View>

            {/* Hourly Activity Graph */}
            <Text style={styles.activityTitle}>Hourly Activity</Text>
            <View style={styles.hourlyGraphContainer}>
              {selectedDayHourlyData.some(steps => steps > 0) ? (
                <>
                  <ScrollView
                    ref={hourlyScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hourlyBarsScrollContent}
                  >
                    {selectedDayHourlyData.map((steps, hour) => {
                      const maxSteps = Math.max(...selectedDayHourlyData, 100);
                      const barHeight = maxSteps > 0 ? (steps / maxSteps) * 100 : 0;
                      const hasSteps = steps > 0;

                      return (
                        <View key={hour} style={styles.hourlyBarColumn}>
                          <Text style={styles.hourlyBarValue}>
                            {steps > 0 ? steps : ''}
                          </Text>
                          <View style={styles.hourlyBarWrapper}>
                            <LinearGradient
                              colors={hasSteps ? ['#22c55e', '#16a34a'] : ['transparent', 'transparent']}
                              style={[
                                styles.hourlyBar,
                                { height: Math.max(barHeight, steps > 0 ? 4 : 0) }
                              ]}
                            />
                          </View>
                          <Text style={styles.hourlyBarLabel}>
                            {hour === 0 ? '12am' :
                             hour === 12 ? '12pm' :
                             hour < 12 ? `${hour}am` : `${hour - 12}pm`}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                  {/* Legend */}
                  <View style={styles.hourlyLegend}>
                    <View style={styles.hourlyLegendItem}>
                      <View style={[styles.hourlyLegendDot, { backgroundColor: '#22c55e' }]} />
                      <Text style={styles.hourlyLegendText}>Steps per hour</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.noActivityContainer}>
                  <Icon name="bar-chart-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.noActivityText}>No activity recorded for this day</Text>
                </View>
              )}
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.dayDetailsButton}
              onPress={() => setShowDayDetailsModal(false)}
            >
              <Text style={styles.dayDetailsButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 120,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  // Avatar
  avatarContainer: {
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#0891b2',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0891b2',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // User Info
  userName: {
    fontSize: fonts.h2,
    fontWeight: '700',
    color: colors.textWhite,
    textAlign: 'center',
    marginTop: 12,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  // Tier Card
  tierCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tierGradient: {
    padding: 16,
  },
  tierContent: {
    flexDirection: 'row',
  },
  tierLeft: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.2)',
  },
  tierLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tierTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tierBadge: {
    width: 60,
    height: 60,
    marginTop: 8,
  },
  tierRight: {
    flex: 1,
    paddingLeft: 16,
  },
  tierProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierProgressLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tierProgressValue: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22d3ee',
    borderRadius: 4,
  },
  tierTimeRemaining: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 10,
  },
  tierDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    lineHeight: 16,
  },
  // Streak Card
  streakCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  streakBlur: {
    padding: 16,
    backgroundColor: 'rgba(249, 249, 249, 0.1)',
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flameContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 12,
  },
  streakNumber: {
    fontSize: fonts.h2,
    fontWeight: '700',
    color: colors.textWhite,
  },
  streakLabel: {
    fontSize: 14,
    color: colors.textWhite,
  },
  helpButton: {
    padding: 4,
  },
  // Calendar
  calendar: {
    marginBottom: 16,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarCell: {
    flex: 1,
    alignItems: 'center',
  },
  calendarDay: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedIcon: {
    backgroundColor: '#22c55e',
  },
  missedIcon: {
    backgroundColor: '#ef4444',
  },
  currentIcon: {
    backgroundColor: '#f97316',
    overflow: 'hidden',
  },
  upcomingIcon: {
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0, 0, 0, 0.08)',
  },
  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  legendText: {
    fontSize: 12,
    color: colors.textLight,
    marginLeft: 6,
  },
  // Accordion
  accordionCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  accordionBlur: {
    backgroundColor: 'rgba(249, 249, 249, 0.1)',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
    marginLeft: 12,
  },
  accordionContent: {
    padding: 16,
    paddingTop: 0,
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  themeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  themeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textWhite,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: isDarkMode ? 0 : 1,
    borderColor: isDarkMode ? 'transparent' : '#D0D5DD',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.textWhite,
  },
  saveButton: {
    backgroundColor: '#f5c842',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 32,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  bottomPadding: {
    height: 20,
  },
  // Dropdown styles
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
    borderRadius: 12,
    borderWidth: isDarkMode ? 0 : 1,
    borderColor: isDarkMode ? 'transparent' : '#D0D5DD',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: colors.textWhite,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: '#1a3a40',
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dropdownOptionSelected: {
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: colors.textWhite,
  },
  dropdownOptionTextSelected: {
    color: '#f5c842',
    fontWeight: '600',
  },
  // Image Picker Modal styles
  imagePickerModal: {
    backgroundColor: '#1a3a40',
    borderRadius: 16,
    width: '100%',
    maxWidth: 300,
    padding: 20,
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 20,
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  imagePickerOptionText: {
    fontSize: 16,
    color: colors.textWhite,
    marginLeft: 16,
  },
  imagePickerCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  imagePickerCancelText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  // Streak Info Modal styles
  streakInfoModal: {
    backgroundColor: isDarkMode ? '#1a3a40' : '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    padding: 24,
  },
  streakInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  streakInfoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textWhite,
    marginLeft: 10,
  },
  streakInfoText: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  streakInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  streakInfoItemText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 12,
    flex: 1,
  },
  streakInfoBold: {
    fontWeight: '700',
    color: colors.textWhite,
  },
  streakInfoTip: {
    fontSize: 13,
    color: isDarkMode ? '#f5c842' : '#0891b2',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  streakInfoButton: {
    backgroundColor: '#f5c842',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  streakInfoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  // Totals Summary
  totalsSummary: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textWhite,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  totalDivider: {
    width: 1,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
  },
  // Tap hint
  tapHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  // Day Details Modal
  dayDetailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  dayDetailsModal: {
    backgroundColor: isDarkMode ? '#1a3a40' : '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  dayDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  dayDetailsDate: {
    fontSize: fonts.h2,
    fontWeight: '700',
    color: colors.textWhite,
  },
  dayDetailsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dayDetailsStatusText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 8,
  },
  dayDetailsGoalText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  dayDetailsCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Day Summary
  daySummary: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  daySummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  daySummaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textWhite,
    marginTop: 6,
  },
  daySummaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  daySummaryDivider: {
    width: 1,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    marginHorizontal: 8,
  },
  // Activity List
  activityTitle: {
    fontSize: fonts.h4,
    fontWeight: '600',
    color: colors.textWhite,
    marginBottom: 12,
  },
  activityList: {
    maxHeight: 250,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    marginLeft: 12,
    flex: 1,
  },
  activityCause: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activitySteps: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
  },
  activityKm: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  noActivityContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noActivityText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
  // Hourly Graph styles
  hourlyGraphContainer: {
    marginBottom: 16,
  },
  hourlyBarsScrollContent: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  hourlyBarColumn: {
    alignItems: 'center',
    width: 28,
    marginHorizontal: 2,
  },
  hourlyBarValue: {
    fontSize: 8,
    color: colors.textMuted,
    height: 14,
    textAlign: 'center',
  },
  hourlyBarWrapper: {
    height: 100,
    width: 16,
    justifyContent: 'flex-end',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  hourlyBar: {
    width: '100%',
    borderRadius: 4,
  },
  hourlyBarLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },
  hourlyLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  hourlyLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourlyLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  hourlyLegendText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dayDetailsButton: {
    backgroundColor: '#f5c842',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 16,
  },
  dayDetailsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});

export default ProfileScreen;
