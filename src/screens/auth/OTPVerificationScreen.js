import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, GlassCard, GradientButton, OTPInput, Toast } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'https://www.videosdownloaders.com/firsttrackapi/api/';

const OTPVerificationScreen = ({ navigation, route }) => {
  const { email, fromForgotPassword } = route.params || { email: 'user@example.com' };
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const timerRef = useRef(null);
  const { colors } = useTheme();
  const { signup } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [countdown]);

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || isResending) return;

    setIsResending(true);
    try {
      // Use different endpoint based on flow
      const endpoint = fromForgotPassword
        ? 'forgot-password-send-otp'
        : 'resend-verify-otp';

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.status_code === 200 && data.status === true) {
        showToast(data.message || 'OTP sent successfully!', 'success');
        setCountdown(60); // Reset countdown
      } else {
        showToast(data.message || 'Failed to resend OTP. Please try again.');
      }
    } catch (error) {
      console.log('Resend OTP error:', error.message || error);
      showToast('Network error. Please check your connection.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      showToast('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        email: email,
        otp: otp,
      };

      // Use different endpoint based on flow
      const endpoint = fromForgotPassword
        ? 'forgot-password-verify-otp'
        : 'verify-registration-account';

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status_code === 200 && data.status === true) {
        showToast(data.message || 'Verification successful!', 'success');

        // Get token from response
        const authToken = data.data?.token || data.token;

        setTimeout(async () => {
          if (fromForgotPassword) {
            // Navigate to reset password screen with token
            navigation.navigate('ResetPassword', {
              token: authToken,
              email: email,
            });
          } else {
            // For registration, store token and fetch user details
            if (authToken) {
              await signup(authToken);
            }
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          }
        }, 1500);
      } else {
        showToast(data.message || 'Verification failed. Please try again.');
      }
    } catch (error) {
      console.log('Verification error:', error.message || error);
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
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <GlassCard style={styles.verificationCard}>
            <Text style={styles.title}>Verification Code</Text>
            <Text style={styles.subtitle}>
              We have sent the verification code to your email address{' '}
              <Text style={styles.email}>{email}</Text>
            </Text>

            <OTPInput length={6} onChange={(code) => setOtp(code)} />

            <GradientButton
              title={isLoading ? "Verifying..." : "Verify"}
              onPress={handleVerify}
              showArrow={false}
              style={styles.verifyButton}
              disabled={isLoading}
            />
            {isLoading && (
              <ActivityIndicator style={styles.loader} size="small" color={colors.accent} />
            )}

            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Did not receive the code? </Text>
              {countdown > 0 ? (
                <Text style={styles.resendDisabled}>Resend in {countdown}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResendOtp} disabled={isResending}>
                  <Text style={styles.resendLink}>
                    {isResending ? 'Sending...' : 'Resend'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backText}>
                {fromForgotPassword ? 'Back to Login' : 'Back to Signup'}
              </Text>
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
  verificationCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  email: {
    color: colors.textWhite,
    fontWeight: '500',
  },
  verifyButton: {
    width: '100%',
    marginTop: 10,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  resendText: {
    color: colors.textLight,
    fontSize: 14,
  },
  resendLink: {
    color: colors.accent || '#1B8A9E',
    fontSize: 14,
    fontWeight: '600',
  },
  resendDisabled: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
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

export default OTPVerificationScreen;
