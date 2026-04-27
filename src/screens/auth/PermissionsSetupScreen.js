import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { colors, isDarkMode } = useTheme();
  const { completeSetup } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({
    notifications: null,
    activity: null,
    locationForeground: null,
    locationBackground: null,
  });

  // Concise disclosures — each reason is a short bullet. Meets Play Store
  // prominent disclosure requirements without wall-of-text fatigue.
  const disclosures = [
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'notifications',
      description: 'Get notified about milestones and rewards.',
      bullets: [
        'Step milestones & daily goal alerts',
        'New reward notifications',
        'Processed on your device only',
      ],
      request: async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
      },
    },
    {
      id: 'activity',
      title: 'Physical Activity',
      icon: 'fitness',
      description: 'Needed to count your steps accurately.',
      bullets: [
        'Reads pedometer & motion sensors',
        'Steps convert into rewards',
        'Not shared with third parties',
      ],
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
      title: 'Location',
      icon: 'location',
      description: 'Used to show your walking trail and local weather.',
      bullets: [
        'Maps your walking route',
        'Local weather on the home screen',
        'Never sold or used for ads',
      ],
      request: async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
      },
    },
    {
      id: 'locationBackground',
      title: 'Background Location',
      icon: 'navigate',
      description: 'Keeps tracking your steps when the app is closed.',
      bullets: [
        'Credits every step, even in background',
        'Used only for step tracking',
        'Disable anytime in device settings',
      ],
      request: async () => {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        return status === 'granted';
      },
      shouldSkip: (results) => !results.locationForeground,
    },
  ];

  const handleStartPermissions = () => {
    setCurrentStep(1);
    setDetailsExpanded(false);
    setShowDisclosure(true);
  };

  const handleConsentAndRequest = async () => {
    setShowDisclosure(false);
    setIsLoading(true);

    const disclosure = disclosures[currentStep - 1];

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
      finishSetup();
    } else {
      const nextDisclosure = disclosures[nextStep - 1];
      if (nextDisclosure.shouldSkip && nextDisclosure.shouldSkip(permissionStatus)) {
        setPermissionStatus(prev => ({ ...prev, [nextDisclosure.id]: false }));
        setCurrentStep(nextStep);
        const stepAfter = nextStep + 1;
        if (stepAfter > disclosures.length) {
          finishSetup();
        } else {
          setCurrentStep(stepAfter);
          setIsLoading(false);
          setDetailsExpanded(false);
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
    if (status === true) return { name: 'checkmark-circle', color: '#22c55e' };
    return { name: 'close-circle', color: '#ef4444' };
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
          <View style={styles.header}>
            <Text style={styles.stepIndicator}>Step 2 of 2</Text>
          </View>

          <View style={styles.illustrationContainer}>
            <View style={styles.illustrationCircle}>
              <Icon name="shield-checkmark" size={56} color={colors.textWhite} />
            </View>
          </View>

          <Text style={styles.title}>App Permissions</Text>

          <Text style={styles.description}>
            WERN needs a few permissions to track steps and send rewards alerts.
          </Text>

          <View style={styles.permissionsContainer}>
            {permissions.map((permission, idx) => {
              const statusIcon = getStatusIcon(permission.status);
              const isLast = idx === permissions.length - 1;
              return (
                <View
                  key={permission.id}
                  style={[styles.permissionRow, isLast && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.permissionIconContainer}>
                    <Icon name={permission.icon} size={22} color={colors.textWhite} />
                  </View>
                  <View style={styles.permissionInfo}>
                    <Text style={styles.permissionTitle}>{permission.title}</Text>
                    <Text style={styles.permissionDescription}>{permission.description}</Text>
                  </View>
                  <Icon name={statusIcon.name} size={22} color={statusIcon.color} />
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <GradientButton
            title={isLoading ? "Setting up..." : (currentStep === 0 ? "Continue" : "Allow Permissions")}
            onPress={handleStartPermissions}
            disabled={isLoading || currentStep > 0}
            style={styles.primaryButton}
          />

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.textWhite} />
              <Text style={styles.loadingText}>Requesting permissions...</Text>
            </View>
          )}
        </View>

        {/* Minimal disclosure sheet — bottom-anchored, system-dialog style.
            Full Play Store disclosure text lives inside an expandable
            "Why we need this" section so the default view stays compact. */}
        <Modal
          visible={showDisclosure}
          transparent
          animationType="slide"
          onRequestClose={handleDecline}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleDecline}
          >
            <TouchableOpacity
              style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}
              activeOpacity={1}
              onPress={() => {}}
            >
              <View style={styles.sheetHandle} />

              <View style={styles.modalHeaderRow}>
                <View style={styles.modalIconContainer}>
                  <Icon
                    name={currentDisclosure?.icon || 'shield-checkmark'}
                    size={22}
                    color="#22C55E"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{currentDisclosure?.title}</Text>
                  <Text style={styles.modalDescription}>
                    {currentDisclosure?.description}
                  </Text>
                </View>
              </View>

              {/* Expandable disclosure. Collapsed by default so the sheet
                  stays minimal; tap to reveal the full Play Store text. */}
              <TouchableOpacity
                style={styles.whyToggle}
                onPress={() => setDetailsExpanded(!detailsExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.whyToggleText}>
                  {detailsExpanded ? 'Hide details' : 'Why we need this'}
                </Text>
                <Icon
                  name={detailsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color="#6B7280"
                />
              </TouchableOpacity>

              {detailsExpanded && (
                <View style={styles.bulletList}>
                  {currentDisclosure?.bullets?.map((b, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={handleDecline}
                >
                  <Text style={styles.declineButtonText}>Don't allow</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.consentButton}
                  onPress={handleConsentAndRequest}
                >
                  <Text style={styles.consentButtonText}>Allow</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
};

const createStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    stepIndicator: {
      fontSize: 13,
      color: colors.textLight,
      fontWeight: '600',
    },
    illustrationContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    illustrationCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.45)',
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.7)',
    },
    title: {
      fontSize: fonts.h1,
      fontWeight: '700',
      color: colors.textWhite,
      textAlign: 'center',
      marginBottom: 10,
    },
    description: {
      fontSize: fonts.body,
      color: colors.textLight,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    permissionsContainer: {
      borderRadius: 16,
      padding: 4,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)',
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)',
    },
    permissionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)',
    },
    permissionIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    permissionInfo: { flex: 1 },
    permissionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textWhite,
      marginBottom: 2,
    },
    permissionDescription: {
      fontSize: 12,
      color: colors.textMuted,
    },
    buttonContainer: {
      paddingHorizontal: 24,
      paddingBottom: 30,
      alignItems: 'center',
    },
    primaryButton: { width: '100%' },
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

    // Modal styles — dark compact bottom-sheet with white text in both themes.
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: '#1A2A30',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 12,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.2)',
      marginBottom: 14,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 4,
    },
    modalIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(34, 197, 94, 0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 2,
    },
    modalDescription: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.75)',
      lineHeight: 18,
    },
    whyToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginTop: 12,
      paddingVertical: 6,
    },
    whyToggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.65)',
    },
    bulletList: {
      marginTop: 10,
      paddingHorizontal: 4,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 4,
    },
    bulletDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: '#22C55E',
      marginTop: 7,
      marginRight: 10,
    },
    bulletText: {
      flex: 1,
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
      lineHeight: 18,
    },
    modalButtons: {
      flexDirection: 'row',
      marginTop: 18,
      gap: 10,
    },
    declineButton: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    declineButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.85)',
    },
    consentButton: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: '#22C55E',
    },
    consentButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });

export default PermissionsSetupScreen;
