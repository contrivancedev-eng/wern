import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, GradientButton, FeatureCard, Logo } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { onboardingFeatures } from '../../data/staticData';
import { fonts } from '../../utils';

const OnboardingScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.logoContainer}>
              <Logo width={150} />
            </View>

            <Text style={styles.title}>Welcome to the Future</Text>
            <Text style={styles.subtitle}>
              Transform your daily walks into rewards while building a safer, more connected community.
            </Text>
          </View>

          <View style={styles.featuresSection}>
            {onboardingFeatures.map((feature) => (
              <FeatureCard
                key={feature.id}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                iconColor={feature.color}
              />
            ))}
          </View>

          <View style={styles.buttonSection}>
            <GradientButton
              title="Get Started"
              onPress={() => navigation.navigate('SignUp')}
              style={styles.primaryButton}
            />

            <Text
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              I already have an account
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: 30,
  },
  logoContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: fonts.h1,
    fontWeight: '700',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: fonts.body,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresSection: {
    marginBottom: 30,
  },
  buttonSection: {
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    marginBottom: 16,
  },
  loginLink: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.cardBackground,
    borderRadius: 30,
    overflow: 'hidden',
    width: '100%',
  },
});

export default OnboardingScreen;
