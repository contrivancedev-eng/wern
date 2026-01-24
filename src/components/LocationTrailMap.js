import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const LocationTrailMap = ({ userId, isWalking }) => {
  const [trail, setTrail] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef(null);
  const locationSubscription = useRef(null);

  // Get today's date string for storage key
  const getTodayDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Load trail from AsyncStorage
  const loadTrail = useCallback(async () => {
    if (!userId) return;

    try {
      const todayKey = `locationTrail_${userId}_${getTodayDateString()}`;
      const stored = await AsyncStorage.getItem(todayKey);

      if (stored) {
        const parsed = JSON.parse(stored);
        setTrail(parsed);
      } else {
        setTrail([]);
      }
    } catch (error) {
      console.log('Error loading trail:', error.message);
      setTrail([]);
    }
  }, [userId]);

  // Save trail to AsyncStorage
  const saveTrail = useCallback(async (newTrail) => {
    if (!userId) return;

    try {
      const todayKey = `locationTrail_${userId}_${getTodayDateString()}`;
      await AsyncStorage.setItem(todayKey, JSON.stringify(newTrail));
    } catch (error) {
      console.log('Error saving trail:', error.message);
    }
  }, [userId]);

  // Add new location to trail
  const addLocationToTrail = useCallback((lat, lng) => {
    setTrail(prev => {
      // Don't add if same as last location (within ~10 meters)
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const distance = Math.sqrt(
          Math.pow(lat - last.lat, 2) + Math.pow(lng - last.lng, 2)
        );
        // ~0.0001 degrees is roughly 10 meters
        if (distance < 0.0001) return prev;
      }

      const newTrail = [...prev, { lat, lng, timestamp: Date.now() }];
      saveTrail(newTrail);
      return newTrail;
    });
  }, [saveTrail]);

  // Load trail on mount
  useEffect(() => {
    loadTrail();
  }, [loadTrail]);

  // Get current location on mount
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission not granted');
          setIsLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setCurrentLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        setIsLoading(false);
      } catch (error) {
        console.log('Error getting location:', error.message);
        setIsLoading(false);
      }
    };

    getCurrentLocation();
  }, []);

  // Track location when walking
  useEffect(() => {
    if (isWalking) {
      const startTracking = async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') return;

          locationSubscription.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 5000, // Update every 5 seconds
              distanceInterval: 10, // Or every 10 meters
            },
            (location) => {
              const { latitude, longitude } = location.coords;
              setCurrentLocation({ lat: latitude, lng: longitude });
              addLocationToTrail(latitude, longitude);

              // Update WebView with new location
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  updateCurrentLocation(${latitude}, ${longitude});
                  true;
                `);
              }
            }
          );
        } catch (error) {
          console.log('Error starting location tracking:', error.message);
        }
      };

      startTracking();
    }

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [isWalking, addLocationToTrail]);

  // Update WebView when trail changes
  useEffect(() => {
    if (webViewRef.current && trail.length > 0) {
      const trailCoords = trail.map(t => [t.lat, t.lng]);
      webViewRef.current.injectJavaScript(`
        updateTrail(${JSON.stringify(trailCoords)});
        true;
      `);
    }
  }, [trail]);

  // Generate Leaflet HTML
  const getMapHTML = () => {
    const centerLat = currentLocation?.lat || trail[0]?.lat || 0;
    const centerLng = currentLocation?.lng || trail[0]?.lng || 0;
    const trailCoords = trail.map(t => [t.lat, t.lng]);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; }
          .current-location-marker {
            background: #22c55e;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
          .pulse {
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
            100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([${centerLat}, ${centerLng}], 16);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);

          // Custom marker icon for current location
          var currentLocationIcon = L.divIcon({
            className: 'current-location-marker pulse',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          var currentMarker = null;
          var trailPolyline = null;

          // Initialize current location marker
          ${currentLocation ? `
            currentMarker = L.marker([${currentLocation.lat}, ${currentLocation.lng}], {
              icon: currentLocationIcon
            }).addTo(map);
          ` : ''}

          // Initialize trail polyline
          ${trailCoords.length > 1 ? `
            trailPolyline = L.polyline(${JSON.stringify(trailCoords)}, {
              color: '#22c55e',
              weight: 4,
              opacity: 0.8,
              smoothFactor: 1
            }).addTo(map);
          ` : ''}

          // Function to update current location
          function updateCurrentLocation(lat, lng) {
            if (currentMarker) {
              currentMarker.setLatLng([lat, lng]);
            } else {
              currentMarker = L.marker([lat, lng], {
                icon: currentLocationIcon
              }).addTo(map);
            }
            map.panTo([lat, lng]);
          }

          // Function to update trail
          function updateTrail(coords) {
            if (trailPolyline) {
              trailPolyline.setLatLngs(coords);
            } else if (coords.length > 1) {
              trailPolyline = L.polyline(coords, {
                color: '#22c55e',
                weight: 4,
                opacity: 0.8,
                smoothFactor: 1
              }).addTo(map);
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: getMapHTML() }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 0,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});

export default LocationTrailMap;
