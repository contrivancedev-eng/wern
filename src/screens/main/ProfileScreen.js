import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Icon, Toast } from '../../components';
import { useTheme, useAuth } from '../../context';

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

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

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
          setDailyStepGoal(String(data.data.goal.daily_step_goal || '8000'));
          setActivityLevel(data.data.goal.activity_level || 'Intermediate');
          setWeeklyGoal(String(data.data.goal.weekly_goal || '5'));
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
  }, [token]);

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
    // Refresh user details from API to get fresh data (not from local storage)
    refreshUserDetails();
  }, [fetchProfileData]);

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

    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
      // Format date key as YYYY-MM-DD
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const steps = monthlySteps[dateKey] || 0;

      let status;
      if (day > currentDay) {
        status = 'upcoming';
      } else if (day === currentDay) {
        // Current day - show as "current" (in progress), or "completed" if goal met
        status = steps > 0 ? 'completed' : 'current';
      } else if (steps > 0) {
        status = 'completed';
      } else {
        status = 'missed';
      }

      data.push({ day, status, steps });
    }
    return data;
  }, [monthlySteps]);

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

            {/* Calendar */}
            <View style={styles.calendar}>
              {/* Week days header */}
              <View style={styles.weekDaysRow}>
                {weekDays.map((day, index) => (
                  <Text key={index} style={styles.weekDayLabel}>{day}</Text>
                ))}
              </View>

              {/* Calendar grid */}
              {getCalendarWeeks().map((week, weekIndex) => (
                <View key={weekIndex} style={styles.calendarRow}>
                  {week.map((day, dayIndex) => (
                    <View key={dayIndex} style={styles.calendarCell}>
                      {day ? (
                        <>
                          {renderStatusIcon(day.status)}
                          <Text style={styles.calendarDay}>{day.day.toString().padStart(2, '0')}</Text>
                        </>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
            </View>

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
    fontSize: 24,
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
    fontSize: 18,
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
    fontSize: 24,
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
});

export default ProfileScreen;
