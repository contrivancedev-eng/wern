import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLocales } from 'expo-localization';
import { GradientBackground, GlassCard, GradientButton, PhoneInput, Icon, Toast } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '../../utils';

const API_URL = 'https://www.wernapp.com/api/';

// Map ISO country codes to phone country codes
const countryCodeMap = {
  'AE': '+971', // UAE
  'US': '+1',   // United States
  'GB': '+44',  // United Kingdom
  'IN': '+91',  // India
  'CN': '+86',  // China
  'JP': '+81',  // Japan
  'KR': '+82',  // South Korea
  'DE': '+49',  // Germany
  'FR': '+33',  // France
  'AU': '+61',  // Australia
  'BR': '+55',  // Brazil
};

const SignUpScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+971');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Detect user's country and set the phone country code
  useEffect(() => {
    try {
      const locales = getLocales();
      if (locales && locales.length > 0) {
        const regionCode = locales[0].regionCode;
        if (regionCode && countryCodeMap[regionCode]) {
          setCountryCode(countryCodeMap[regionCode]);
        }
        // If country not found, default is already UAE (+971)
      }
    } catch (error) {
      console.log('Error detecting locale:', error.message);
      // Default to UAE if detection fails
    }
  }, []);

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      showToast('Please enter your full name');
      return false;
    }
    if (!email.trim()) {
      showToast('Please enter your email address');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address');
      return false;
    }
    if (!password) {
      showToast('Please enter a password');
      return false;
    }
    if (password.length < 8) {
      showToast('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      showToast('Password must include letters, numbers and a symbol');
      return false;
    }
    if (!confirmPassword) {
      showToast('Please confirm your password');
      return false;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        country_code: countryCode,
        phone_number: phoneNumber,
        email: email.trim().toLowerCase(),
        password: password,
        confirm_password: confirmPassword,
        refferal_code: referralCode.trim(),
      };

      const response = await fetch(`${API_URL}user-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status_code === 200 && data.status === true) {
        showToast(data.message || 'Registration successful!', 'success');
        setTimeout(() => {
          navigation.navigate('OTPVerification', { email: data.data?.email || email });
        }, 1500);
      } else {
        showToast(data.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.log('Registration error:', error.message || error);
      if (error.message?.includes('Network request failed')) {
        showToast('Network error. Please check your internet connection.');
      } else if (error.message?.includes('JSON')) {
        showToast('Server returned an invalid response. Please try again.');
      } else {
        showToast('Something went wrong. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GradientBackground>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.headerSection}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Continue your journey to a healthier, more connected life
            </Text>
          </View>

          <GlassCard style={styles.formCard}>
            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={colors.inputPlaceholder}
              value={fullName}
              onChangeText={setFullName}
              editable={!isLoading}
            />

            <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />

            <Text style={styles.label}>Phone Number</Text>
            <PhoneInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              selectedCode={countryCode}
              onChangeCountryCode={setCountryCode}
            />

            <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor={colors.inputPlaceholder}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                <Icon
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={24}
                  color={colors.inputPlaceholder}
                />
              </TouchableOpacity>
            </View>

            {password.length > 0 && (() => {
              const hasLen = password.length >= 8;
              const hasLetter = /[A-Za-z]/.test(password);
              const hasNumber = /\d/.test(password);
              const hasSymbol = /[^A-Za-z0-9]/.test(password);
              const score = [hasLen, hasLetter, hasNumber, hasSymbol].filter(Boolean).length;
              const label = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';
              const color = score <= 1 ? '#ef4444' : score === 2 ? '#f59e0b' : score === 3 ? '#facc15' : '#22c55e';
              return (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBars}>
                    {[0, 1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.strengthBar,
                          { backgroundColor: i < score ? color : 'rgba(255,255,255,0.18)' },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color }]}>{label}</Text>
                </View>
              );
            })()}

            <Text style={styles.strengthHint}>
              Min. 8 chars (letters, numbers & symbols)
            </Text>

            <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.inputPlaceholder}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isLoading}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Icon
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={24}
                  color={colors.inputPlaceholder}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Referral Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter referral code (optional)"
              placeholderTextColor={colors.inputPlaceholder}
              value={referralCode}
              onChangeText={setReferralCode}
              editable={!isLoading}
            />

            <GradientButton
              title={isLoading ? "Signing Up..." : "Sign Up"}
              onPress={handleSignUp}
              style={styles.signUpButton}
              disabled={isLoading}
            />
            {isLoading && (
              <ActivityIndicator style={styles.loader} size="small" color={colors.accent} />
            )}
          </GlassCard>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: fonts.h1,
    fontWeight: '700',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: fonts.body,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  formCard: {
    marginBottom: 24,
  },
  label: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.inputText,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.inputText,
  },
  eyeButton: {
    paddingHorizontal: 16,
  },
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    marginLeft: 10,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'right',
  },
  strengthHint: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textLight,
  },
  signUpButton: {
    marginTop: 24,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    color: colors.textLight,
    fontSize: 14,
  },
  loginLink: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  required: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    marginTop: 12,
  },
});

export default SignUpScreen;
