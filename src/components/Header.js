import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useWeather } from '../context/WeatherContext';

const Header = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { temperature, weather } = useWeather();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Get first name for greeting
  const firstName = user?.full_name?.split(' ')[0] || 'User';

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Check if it's night time (between 6 PM and 6 AM)
  const isNightTime = () => {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  };

  // Get weather icon based on condition
  const getWeatherIcon = () => {
    const condition = weather?.condition?.toLowerCase() || weather?.weather?.toLowerCase() || weather?.description?.toLowerCase() || '';
    const isNight = isNightTime();

    // Thunderstorm conditions
    if (condition.includes('thunder') || condition.includes('storm') || condition.includes('lightning')) {
      return { name: 'thunderstorm', color: '#8b5cf6' };
    }

    // Heavy rain conditions
    if (condition.includes('heavy rain') || condition.includes('shower') || condition.includes('downpour')) {
      return { name: 'rainy', color: '#3b82f6' };
    }

    // Light rain / Drizzle conditions
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('precipitation')) {
      return { name: 'rainy-outline', color: '#60a5fa' };
    }

    // Snow conditions
    if (condition.includes('snow') || condition.includes('sleet') || condition.includes('blizzard') || condition.includes('flurr')) {
      return { name: 'snow', color: '#e0f2fe' };
    }

    // Hail
    if (condition.includes('hail')) {
      return { name: 'snow', color: '#94a3b8' };
    }

    // Fog / Mist / Haze conditions
    if (condition.includes('fog') || condition.includes('mist') || condition.includes('haze') || condition.includes('smoke')) {
      return { name: 'cloud', color: '#9ca3af' };
    }

    // Windy conditions
    if (condition.includes('wind') || condition.includes('gust') || condition.includes('breezy')) {
      return { name: 'flag', color: '#6ee7b7' };
    }

    // Overcast / Heavy clouds
    if (condition.includes('overcast') || condition.includes('heavy cloud')) {
      return { name: 'cloud', color: '#6b7280' };
    }

    // Partly cloudy conditions
    if (condition.includes('partly cloud') || condition.includes('scattered cloud') || condition.includes('few cloud')) {
      return { name: isNight ? 'cloudy-night' : 'partly-sunny', color: isNight ? '#94a3b8' : '#fbbf24' };
    }

    // Cloudy conditions
    if (condition.includes('cloud') || condition.includes('cloudy')) {
      return { name: 'cloudy', color: '#9ca3af' };
    }

    // Clear / Sunny conditions
    if (condition.includes('clear') || condition.includes('sunny') || condition.includes('fair')) {
      return { name: isNight ? 'moon' : 'sunny', color: isNight ? '#fcd34d' : '#fbbf24' };
    }

    // Hot conditions
    if (condition.includes('hot') || condition.includes('heat')) {
      return { name: 'sunny', color: '#f97316' };
    }

    // Cold conditions
    if (condition.includes('cold') || condition.includes('freez')) {
      return { name: 'snow-outline', color: '#67e8f9' };
    }

    // Default - sunny during day, moon at night
    return { name: isNight ? 'moon' : 'sunny', color: isNight ? '#fcd34d' : '#fbbf24' };
  };

  const weatherIcon = getWeatherIcon();
  const displayTemp = temperature !== null ? `${temperature}` : '--';
  const isNight = isNightTime();

  return (
    <View style={styles.container}>
      <View style={styles.greetingRow}>
        <View style={styles.greetingContent}>
          <Text style={styles.greetingText} numberOfLines={1}>
            {getGreeting()}, {firstName}
          </Text>
          <Text style={styles.subGreeting}>Ready to earn some rewards?</Text>
        </View>

        <View style={styles.weatherContainer}>
          <View style={styles.weatherIconContainer}>
            <Icon name={weatherIcon.name} size={32} color={weatherIcon.color} />
          </View>
          <Text style={styles.temperatureText}>{displayTemp}°C</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingContent: {
    flex: 1,
  },
  greetingText: {
    color: colors.textWhite,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subGreeting: {
    color: colors.textLight,
    fontSize: 14,
  },
  weatherContainer: {
    alignItems: 'center',
  },
  weatherIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  temperatureText: {
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default Header;
