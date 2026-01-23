import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, GlassCard, GradientButton, Icon, Toast } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fonts } from '../../utils';

const API_URL = 'https://www.videosdownloaders.com/firsttrackapi/api/';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const { colors } = useTheme();
  const { login } = useAuth();
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
    if (!password) {
      showToast('Please enter your password');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password: password,
      };

      const response = await fetch(`${API_URL}user-login-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status_code === 200 && data.status === true) {
        // Get token from response
        const authToken = data.data?.token || data.token;

        if (authToken) {
          // Store token and fetch user details
          await login(authToken);
        }

        showToast(data.message || 'Login successful!', 'success');
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        }, 1500);
      } else {
        showToast(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.log('Login error:', error.message || error);
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
          <View style={styles.headerSection}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Continue your journey to a healthier, more connected life
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

            <Text style={styles.label}>Password</Text>
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

            <View style={styles.optionsRow}>
              <TouchableOpacity style={styles.rememberRow}>
                <View style={styles.checkbox}>
                  <Icon name="checkmark" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <GradientButton
              title={isLoading ? "Signing In..." : "Sign In"}
              onPress={handleLogin}
              style={styles.signInButton}
              disabled={isLoading}
            />
            {isLoading && (
              <ActivityIndicator style={styles.loader} size="small" color={colors.accent} />
            )}
          </GlassCard>

          <Text style={styles.orText}>Or continue with</Text>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signupLink}>Sign up</Text>
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
    marginBottom: 24,
  },
  label: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    borderWidth: 2,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberText: {
    color: colors.textWhite,
    fontSize: 14,
  },
  forgotText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  signInButton: {
    marginTop: 8,
  },
  orText: {
    color: colors.textLight,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 24,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: colors.textLight,
    fontSize: 14,
  },
  signupLink: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  loader: {
    marginTop: 12,
  },
});

export default LoginScreen;
