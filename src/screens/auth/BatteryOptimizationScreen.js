import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground, GradientButton, Icon } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '../../utils';
import PermissionService from '../../services/PermissionService';

const BatteryOptimizationScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLoading, setIsLoading] = useState(false);

  const handleEnableBattery = async () => {
    setIsLoading(true);
    try {
      await PermissionService.requestBatteryOptimization();
      // Small delay to let the user see the system dialog
      setTimeout(() => {
        setIsLoading(false);
        navigation.replace('PermissionsSetup');
      }, 500);
    } catch (error) {
      console.log('Battery optimization error:', error);
      setIsLoading(false);
      navigation.replace('PermissionsSetup');
    }
  };

  const handleSkip = () => {
    navigation.replace('PermissionsSetup');
  };

  // Only show on Android
  if (Platform.OS !== 'android') {
    navigation.replace('PermissionsSetup');
    return null;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.stepIndicator}>Step 1 of 2</Text>
          </View>

          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <LinearGradient
              colors={['rgba(27, 138, 158, 0.3)', 'rgba(27, 138, 158, 0.1)']}
              style={styles.illustrationCircle}
            >
              <View style={styles.batteryIconContainer}>
                <Icon name="battery-charging" size={60} color="#4ade80" />
              </View>
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>Disable Battery Optimization</Text>

          {/* Description */}
          <Text style={styles.description}>
            To accurately count your steps in the background, WERN needs to run without battery restrictions.
          </Text>

          {/* Benefits List */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Icon name="checkmark-circle" size={24} color="#4ade80" />
              </View>
              <Text style={styles.benefitText}>Track steps even when app is closed</Text>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Icon name="checkmark-circle" size={24} color="#4ade80" />
              </View>
              <Text style={styles.benefitText}>Accurate real-time step counting</Text>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Icon name="checkmark-circle" size={24} color="#4ade80" />
              </View>
              <Text style={styles.benefitText}>Never miss a single step reward</Text>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Icon name="information-circle" size={20} color={colors.accent} />
            <Text style={styles.infoText}>
              When prompted, select "Allow" to let WERN run in the background. This has minimal impact on battery life.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <GradientButton
              title={isLoading ? "Opening Settings..." : "Enable Now"}
              onPress={handleEnableBattery}
              disabled={isLoading}
              style={styles.primaryButton}
            />

            <Text style={styles.skipText} onPress={handleSkip}>
              Skip for now
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepIndicator: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '600',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  illustrationCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  batteryIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
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
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  benefitsContainer: {
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  benefitIcon: {
    marginRight: 14,
  },
  benefitText: {
    fontSize: 16,
    color: colors.textWhite,
    fontWeight: '500',
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(27, 138, 158, 0.2)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(27, 138, 158, 0.3)',
    marginBottom: 30,
  },
  infoText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingTop: 20,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    marginBottom: 16,
  },
  skipText: {
    fontSize: 16,
    color: colors.textLight,
    fontWeight: '500',
    paddingVertical: 12,
  },
});

export default BatteryOptimizationScreen;
