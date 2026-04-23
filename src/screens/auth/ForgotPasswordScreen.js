import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, GlassCard, GradientButton, Toast } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '../../utils';

const API_URL = 'https://www.wernapp.com/api/';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  const validateForm = () => {
    if (!email.trim()) {
      showToast('Please enter your email address');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}forgot-password-send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (data.status_code === 200 && data.status === true) {
        showToast(data.message || 'OTP sent successfully!', 'success');
        setTimeout(() => {
          navigation.navigate('OTPVerification', {
            email: email.trim().toLowerCase(),
            fromForgotPassword: true
          });
        }, 1500);
      } else {
        showToast(data.message || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.log('Forgot password error:', error.message || error);
      if (error.message?.includes('Network request failed')) {
        showToast('Network error. Please check your internet connection.');
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
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerSection}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a verification code
            </Text>
          </View>

          <GlassCard style={styles.formCard}>
            <Text style={styles.label}>Email Address</Text>
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

            <GradientButton
              title={isLoading ? "Sending OTP..." : "Send OTP"}
              onPress={handleSendOTP}
              style={styles.sendButton}
              disabled={isLoading}
            />
            {isLoading && (
              <ActivityIndicator style={styles.loader} size="small" color={colors.accent} />
            )}

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>
          </GlassCard>
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
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
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
    paddingVertical: 32,
  },
  label: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.inputText,
  },
  sendButton: {
    marginTop: 24,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 24,
  },
  backText: {
    color: colors.textLight,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  loader: {
    marginTop: 12,
  },
});

export default ForgotPasswordScreen;
