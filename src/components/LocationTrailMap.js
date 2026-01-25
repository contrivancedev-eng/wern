import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { WebView } from 'react-native-webview';

// Get the resolved URI for the nav-arrow image
const navArrowSource = Image.resolveAssetSource(require('../../assest/img/nav-arrow.png'));
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

          // Update WebView with new heading (no React state update to avoid re-render)
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
            width: 32px;
            height: 32px;
            transition: transform 0.3s ease-out;
          }
          .arrow-container {
            overflow: visible !important;
          }
          .leaflet-marker-icon {
            overflow: visible !important;
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

          var navArrowUrl = '${navArrowSource.uri}';

          // Create arrow icon with rotation (only used for initial creation)
          function createArrowIcon(rotation) {
            return L.divIcon({
              className: 'arrow-container',
              html: '<img id="arrow-element" class="arrow-marker" src="' + navArrowUrl + '" style="transform: rotate(' + rotation + 'deg);" />',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
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
