import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';

const LocationTrailMap = ({ userId, isWalking }) => {
  const [trail, setTrail] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef(null);
  const locationSubscription = useRef(null);
  const magnetometerSubscription = useRef(null);
  const lastHeadingRef = useRef(0);
  const lastHeadingUpdateRef = useRef(0);

  // Get today's date string for storage key
  const getTodayDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Calculate heading from magnetometer data
  const calculateHeading = (magnetometerData) => {
    const { x, y } = magnetometerData;
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    // Normalize to 0-360
    if (angle < 0) {
      angle += 360;
    }
    // Adjust for device orientation (pointing up)
    angle = (angle + 90) % 360;
    return angle;
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

  // Subscribe to magnetometer for compass heading
  useEffect(() => {
    const subscribe = async () => {
      Magnetometer.setUpdateInterval(200); // Update every 200ms
      magnetometerSubscription.current = Magnetometer.addListener((data) => {
        const newHeading = calculateHeading(data);
        const now = Date.now();

        // Only update if heading changed by more than 5 degrees AND at least 300ms passed
        const headingDiff = Math.abs(newHeading - lastHeadingRef.current);
        const timeDiff = now - lastHeadingUpdateRef.current;

        // Handle wrap-around (e.g., 355 to 5 degrees)
        const normalizedDiff = headingDiff > 180 ? 360 - headingDiff : headingDiff;

        if (normalizedDiff > 5 && timeDiff > 300) {
          lastHeadingRef.current = newHeading;
          lastHeadingUpdateRef.current = now;
          setHeading(newHeading);

          // Update WebView with new heading
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              updateHeading(${newHeading});
              true;
            `);
          }
        }
      });
    };

    subscribe();

    return () => {
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.remove();
        magnetometerSubscription.current = null;
      }
    };
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
          .arrow-marker {
            width: 36px;
            height: 36px;
            transition: transform 0.3s ease-out;
          }
          .arrow-container {
            display: flex;
            justify-content: center;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            touchZoom: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            tap: false
          }).setView([${centerLat}, ${centerLng}], 16);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);

          var currentHeading = 0;

          var navArrowBase64 = 'data:image/png;base64,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';

          // Create arrow icon with rotation (only used for initial creation)
          function createArrowIcon(rotation) {
            return L.divIcon({
              className: 'arrow-container',
              html: '<img id="arrow-element" class="arrow-marker" src="' + navArrowBase64 + '" style="transform: rotate(' + rotation + 'deg);" />',
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            });
          }

          var currentMarker = null;
          var trailPolyline = null;

          // Initialize current location marker with arrow
          ${currentLocation ? `
            currentMarker = L.marker([${currentLocation.lat}, ${currentLocation.lng}], {
              icon: createArrowIcon(${heading})
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

          // Function to update heading/rotation - directly update CSS transform
          function updateHeading(newHeading) {
            currentHeading = newHeading;
            var arrowEl = document.getElementById('arrow-element');
            if (arrowEl) {
              arrowEl.style.transform = 'rotate(' + newHeading + 'deg)';
            }
          }

          // Function to update current location
          function updateCurrentLocation(lat, lng) {
            if (currentMarker) {
              currentMarker.setLatLng([lat, lng]);
            } else {
              currentMarker = L.marker([lat, lng], {
                icon: createArrowIcon(currentHeading)
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
