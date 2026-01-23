import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, GlassCard, GradientButton, Icon, Toast } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '../../utils';

const API_URL = 'https://www.videosdownloaders.com/firsttrackapi/api/';

const ResetPasswordScreen = ({ navigation, route }) => {
  const { token, email } = route.params || {};
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    if (!password) {
      showToast('Please enter a new password');
      return false;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters');
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

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const payload = {
        token: token,
        password: password,
        confirm_password: confirmPassword,
      };

      const response = await fetch(`${API_URL}forgot-password-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status_code === 200 && data.status === true) {
        showToast(data.message || 'Password changed successfully!', 'success');
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }, 1500);
      } else {
        showToast(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.log('Reset password error:', error.message || error);
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
            <View style={styles.content}>
          <View style={styles.headerSection}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Create a new password for your account
            </Text>
          </View>

          <GlassCard style={styles.formCard}>
            <Text style={styles.label}>New Password <Text style={styles.required}>*</Text></Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
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

            <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm new password"
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

            <GradientButton
              title={isLoading ? "Resetting..." : "Reset Password"}
              onPress={handleResetPassword}
              style={styles.resetButton}
              disabled={isLoading}
            />
            {isLoading && (
              <ActivityIndicator style={styles.loader} size="small" color={colors.accent} />
            )}

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>
          </GlassCard>
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
    justifyContent: 'center',
  },
  content: {
    flex: 1,
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
    marginTop: 16,
  },
  required: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
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
  resetButton: {
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

export default ResetPasswordScreen;
