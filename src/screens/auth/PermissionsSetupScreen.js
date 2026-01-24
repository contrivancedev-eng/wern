import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground, GradientButton, Icon } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fonts } from '../../utils';
import PermissionService from '../../services/PermissionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETUP_COMPLETE_KEY = '@wern_setup_complete';

const PermissionsSetupScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { completeSetup } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({
    notifications: null,
    activity: null,
    locationForeground: null,
    locationBackground: null,
  });

  const handleRequestPermissions = async () => {
    setIsLoading(true);
    try {
      const results = await PermissionService.requestAllPermissions();
      setPermissionStatus(results);

      // Mark setup as complete
      await AsyncStorage.setItem(SETUP_COMPLETE_KEY, 'true');

      // Small delay to show the results
      setTimeout(() => {
        setIsLoading(false);
        if (completeSetup) {
          completeSetup();
        }
      }, 1000);
    } catch (error) {
      console.log('Permission request error:', error);
      setIsLoading(false);
      // Still complete setup even if permissions fail
      await AsyncStorage.setItem(SETUP_COMPLETE_KEY, 'true');
      if (completeSetup) {
        completeSetup();
      }
    }
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
            WERN needs a few permissions to track your steps and send you rewards notifications.
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
            title={isLoading ? "Setting up..." : "Allow Permissions"}
            onPress={handleRequestPermissions}
            disabled={isLoading}
            style={styles.primaryButton}
          />

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.loadingText}>Requesting permissions...</Text>
            </View>
          )}
        </View>
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
});

export default PermissionsSetupScreen;
