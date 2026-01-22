import React from 'react';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { FloatingStepCounter } from '../components';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

const getNavigationTheme = (isDarkMode) => ({
  dark: isDarkMode,
  colors: {
    primary: '#00D97E',
    background: 'transparent',
    card: 'transparent',
    text: isDarkMode ? '#FFFFFF' : '#1B8A9E',
    border: 'transparent',
    notification: '#00D97E',
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700',
    },
    heavy: {
      fontFamily: 'System',
      fontWeight: '800',
    },
  },
});

const linking = {
  prefixes: [],
  config: {
    screens: {
      Auth: {
        screens: {
          Onboarding: '',
          Login: 'login',
          SignUp: 'signup',
          ForgotPassword: 'forgot-password',
          OTPVerification: 'verify',
        },
      },
      Main: {
        screens: {
          MainTabs: {
            screens: {
              Home: 'home',
              Wallet: 'wallet',
              Community: 'community',
              Profile: 'profile',
            },
          },
        },
      },
    },
  },
};

const AppNavigator = () => {
  const { isDarkMode } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const navigationTheme = getNavigationTheme(isDarkMode);

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B8A9E" />
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavigationContainer linking={Platform.OS === 'web' ? linking : undefined} theme={navigationTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main" component={MainNavigator} />
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      {/* Global floating step counter - visible on all screens when walking */}
      {isAuthenticated && <FloatingStepCounter />}
    </View>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a2e36',
  },
});

export default AppNavigator;
