import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

const WeatherContext = createContext();
const API_URL = 'https://www.wernapp.com/api/';
const WEATHER_REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh every 5 minutes

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};

export const WeatherProvider = ({ children }) => {
  const [weather, setWeather] = useState(null);
  const [temperature, setTemperature] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const locationSubscription = useRef(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    initializeWeather();
    return () => {
      // Cleanup location subscription
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      // Cleanup refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const initializeWeather = async () => {
    try {
      // Request location permission and fetch fresh weather
      await requestLocationPermission();
    } catch (error) {
      console.log('Error initializing weather:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === 'granted') {
        // Get initial location and fetch weather
        await getCurrentLocation();
        // Start watching location changes
        startLocationTracking();
        // Start periodic refresh
        startPeriodicRefresh();
      }

      return status === 'granted';
    } catch (error) {
      console.log('Error requesting location permission:', error);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentLocation.coords;
      setLocation({ latitude, longitude });

      // Always fetch fresh weather data
      await fetchWeather(latitude, longitude);

      return { latitude, longitude };
    } catch (error) {
      console.log('Error getting current location:', error);
      return null;
    }
  };

  const startLocationTracking = async () => {
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000, // Check every minute
          distanceInterval: 100, // Check every 100 meters movement
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setLocation({ latitude, longitude });
          // Fetch fresh weather on location change
          fetchWeather(latitude, longitude);
        }
      );
    } catch (error) {
      console.log('Error starting location tracking:', error);
    }
  };

  // Periodic refresh to keep weather data up-to-date
  const startPeriodicRefresh = () => {
    refreshIntervalRef.current = setInterval(() => {
      if (location) {
        fetchWeather(location.latitude, location.longitude);
      }
    }, WEATHER_REFRESH_INTERVAL);
  };

  const fetchWeather = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `${API_URL}get-weather-by-location?latitude=${latitude}&longitude=${longitude}&unit=C`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache', // Prevent HTTP caching
          },
        }
      );

      const data = await response.json();

      if (data.status_code === 200 && data.status === true) {
        const weatherData = data.data;
        setWeather(weatherData);
        setTemperature(weatherData.temperature || weatherData.temp);
        console.log('Weather updated:', weatherData.temperature || weatherData.temp, '°C');
        return { success: true, data: weatherData };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.log('Error fetching weather:', error);
      return { success: false, error: error.message };
    }
  };

  const refreshWeather = async () => {
    if (location) {
      return await fetchWeather(location.latitude, location.longitude);
    } else {
      const currentLoc = await getCurrentLocation();
      if (currentLoc) {
        return await fetchWeather(currentLoc.latitude, currentLoc.longitude);
      }
    }
    return { success: false, error: 'No location available' };
  };

  const value = {
    weather,
    temperature,
    location,
    locationPermission,
    isLoading,
    requestLocationPermission,
    getCurrentLocation,
    refreshWeather,
  };

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
};

export default WeatherContext;
