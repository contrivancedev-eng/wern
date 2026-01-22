import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation';
import { WalkingProvider, ThemeProvider, AuthProvider, WeatherProvider } from './src/context';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <WeatherProvider>
            <WalkingProvider>
              <AppNavigator />
            </WalkingProvider>
          </WeatherProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
