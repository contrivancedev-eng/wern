import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground, GradientButton, Icon } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fonts } from '../../utils';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETUP_COMPLETE_KEY = '@wern_setup_complete';

const PermissionsSetupScreen = () => {
  const { colors } = useTheme();
  const { completeSetup } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 = not started, 1-4 = disclosure steps
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({
    notifications: null,
    activity: null,
    locationForeground: null,
    locationBackground: null,
  });

  const disclosures = [
    {
      id: 'notifications',
      title: 'Notification Access',
      icon: 'notifications',
      description: 'WERN would like to send you notifications.',
      details: 'We use notifications to alert you about step milestones, daily goals, and reward updates. This helps you stay motivated and never miss an earned reward.\n\nNotification data is processed locally on your device and is not shared with any third parties.',
      request: async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
      },
    },
    {
      id: 'activity',
      title: 'Physical Activity Access',
      icon: 'fitness',
      description: 'WERN would like to access your physical activity data.',
      details: 'We use your device\'s motion sensors and pedometer to accurately count your steps throughout the day. This is the core functionality of the app — your steps are converted into rewards.\n\nYour activity data is stored locally on your device and sent to our servers only as a step count to calculate your rewards. It is not shared with any third parties.',
      request: async () => {
        try {
          const { status } = await Pedometer.requestPermissionsAsync();
          return status === 'granted';
        } catch (e) {
          return await Pedometer.isAvailableAsync();
        }
      },
    },
    {
      id: 'locationForeground',
      title: 'Location Access',
      icon: 'location',
      description: 'WERN would like to access your location while you use the app.',
      details: 'We use your location to show your walking trail on the map, provide local weather information, and verify step activity.\n\nYour location data is used only within the app to display your trail and for weather updates. Location data is not shared with any third parties for advertising or marketing purposes.',
      request: async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
      },
    },
    {
      id: 'locationBackground',
      title: 'Background Location Access',
      icon: 'navigate',
      description: 'WERN would like to access your location even when the app is in the background.',
      details: 'Background location access allows WERN to continue tracking your steps and walking trail even when the app is closed or running in the background. This ensures you get credit for every step you take.\n\nYour background location data is used solely for step tracking and trail mapping. It is not shared with any third parties for advertising or marketing purposes.\n\nYou can disable this at any time in your device settings.',
      request: async () => {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        return status === 'granted';
      },
      // Only request if foreground location was granted
      shouldSkip: (results) => !results.locationForeground,
    },
  ];

  const handleStartPermissions = () => {
    setCurrentStep(1);
    setShowDisclosure(true);
  };

  const handleConsentAndRequest = async () => {
    setShowDisclosure(false);
    setIsLoading(true);

    const disclosure = disclosures[currentStep - 1];

    // Check if this step should be skipped
    if (disclosure.shouldSkip && disclosure.shouldSkip(permissionStatus)) {
      setPermissionStatus(prev => ({ ...prev, [disclosure.id]: false }));
      moveToNextStep();
      return;
    }

    try {
      const granted = await disclosure.request();
      setPermissionStatus(prev => ({ ...prev, [disclosure.id]: granted }));
    } catch (error) {
      console.log(`Permission request error for ${disclosure.id}:`, error);
      setPermissionStatus(prev => ({ ...prev, [disclosure.id]: false }));
    }

    moveToNextStep();
  };

  const handleDecline = () => {
    setShowDisclosure(false);
    const disclosure = disclosures[currentStep - 1];
    setPermissionStatus(prev => ({ ...prev, [disclosure.id]: false }));
    moveToNextStep();
  };

  const moveToNextStep = () => {
    const nextStep = currentStep + 1;

    if (nextStep > disclosures.length) {
      // All permissions handled, complete setup
      finishSetup();
    } else {
      // Check if next step should be skipped
      const nextDisclosure = disclosures[nextStep - 1];
      if (nextDisclosure.shouldSkip && nextDisclosure.shouldSkip(permissionStatus)) {
        setPermissionStatus(prev => ({ ...prev, [nextDisclosure.id]: false }));
        setCurrentStep(nextStep);
        // Move to the step after
        const stepAfter = nextStep + 1;
        if (stepAfter > disclosures.length) {
          finishSetup();
        } else {
          setCurrentStep(stepAfter);
          setIsLoading(false);
          setShowDisclosure(true);
        }
      } else {
        setCurrentStep(nextStep);
        setIsLoading(false);
        setShowDisclosure(true);
      }
    }
  };

  const finishSetup = async () => {
    try {
      await AsyncStorage.setItem(SETUP_COMPLETE_KEY, 'true');
    } catch (e) {}

    setTimeout(() => {
      setIsLoading(false);
      if (completeSetup) {
        completeSetup();
      }
    }, 500);
  };

  const getStatusIcon = (status) => {
    if (status === null) return { name: 'ellipse-outline', color: colors.textMuted };
    if (status === true) return { name: 'checkmark-circle', color: '#4ade80' };
    return { name: 'close-circle', color: '#f87171' };
  };

  const permissions = [
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Step milestones & rewards alerts',
      icon: 'notifications',
      status: permissionStatus.notifications,
    },
    {
      id: 'activity',
      title: 'Physical Activity',
      description: 'Count your steps accurately',
      icon: 'fitness',
      status: permissionStatus.activity,
    },
    {
      id: 'locationBackground',
      title: 'Background Location',
      description: 'Track steps when app is closed',
      icon: 'location',
      status: permissionStatus.locationBackground,
    },
  ];

  const currentDisclosure = currentStep > 0 && currentStep <= disclosures.length
    ? disclosures[currentStep - 1]
    : null;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.stepIndicator}>Step 2 of 2</Text>
          </View>

          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <LinearGradient
              colors={['rgba(27, 138, 158, 0.3)', 'rgba(27, 138, 158, 0.1)']}
              style={styles.illustrationCircle}
            >
              <View style={styles.shieldIconContainer}>
                <Icon name="shield-checkmark" size={70} color={colors.accent} />
              </View>
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>App Permissions</Text>

          {/* Description */}
          <Text style={styles.description}>
            WERN needs a few permissions to track your steps and send you rewards notifications. You will be asked to approve each permission individually.
          </Text>

          {/* Permissions List */}
          <View style={styles.permissionsContainer}>
            {permissions.map((permission) => {
              const statusIcon = getStatusIcon(permission.status);
              return (
                <View key={permission.id} style={styles.permissionRow}>
                  <View style={styles.permissionIconContainer}>
                    <Icon name={permission.icon} size={24} color={colors.accent} />
                  </View>
                  <View style={styles.permissionInfo}>
                    <Text style={styles.permissionTitle}>{permission.title}</Text>
                    <Text style={styles.permissionDescription}>{permission.description}</Text>
                  </View>
                  <Icon name={statusIcon.name} size={24} color={statusIcon.color} />
                </View>
              );
            })}
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <GradientButton
            title={isLoading ? "Setting up..." : (currentStep === 0 ? "Continue" : "Allow Permissions")}
            onPress={handleStartPermissions}
            disabled={isLoading || currentStep > 0}
            style={styles.primaryButton}
          />

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.loadingText}>Requesting permissions...</Text>
            </View>
          )}
        </View>

        {/* Prominent Disclosure Modal */}
        <Modal
          visible={showDisclosure}
          transparent={true}
          animationType="fade"
          onRequestClose={handleDecline}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Permission Icon */}
                <View style={styles.modalIconContainer}>
                  <Icon
                    name={currentDisclosure?.icon || 'shield-checkmark'}
                    size={40}
                    color={colors.accent}
                  />
                </View>

                {/* Title */}
                <Text style={styles.modalTitle}>
                  {currentDisclosure?.title}
                </Text>

                {/* Description */}
                <Text style={styles.modalDescription}>
                  {currentDisclosure?.description}
                </Text>

                {/* Detailed Disclosure */}
                <View style={styles.disclosureBox}>
                  <Text style={styles.disclosureLabel}>Why we need this:</Text>
                  <Text style={styles.disclosureText}>
                    {currentDisclosure?.details}
                  </Text>
                </View>
              </ScrollView>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={handleDecline}
                >
                  <Text style={styles.declineButtonText}>No thanks</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.consentButton, { backgroundColor: colors.accent }]}
                  onPress={handleConsentAndRequest}
                >
                  <Text style={styles.consentButtonText}>Allow</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  stepIndicator: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '600',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  illustrationCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(27, 138, 158, 0.3)',
  },
  shieldIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(27, 138, 158, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fonts.h1,
    fontWeight: '700',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: fonts.body,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  permissionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  permissionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(27, 138, 158, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 13,
    color: colors.textMuted,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 10,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    padding: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(27, 138, 158, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  disclosureBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  disclosureLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 8,
  },
  disclosureText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  consentButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  consentButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default PermissionsSetupScreen;
