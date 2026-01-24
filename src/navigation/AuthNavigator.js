import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  OnboardingScreen,
  LoginScreen,
  SignUpScreen,
  ForgotPasswordScreen,
  OTPVerificationScreen,
  ResetPasswordScreen,
  BatteryOptimizationScreen,
  PermissionsSetupScreen,
} from '../screens/auth';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  const { hasLoggedInBefore, needsSetup } = useAuth();

  // If user has logged in but needs setup, show setup screens
  if (needsSetup) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="BatteryOptimization" component={BatteryOptimizationScreen} />
        <Stack.Screen name="PermissionsSetup" component={PermissionsSetupScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {hasLoggedInBefore ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AuthNavigator;
