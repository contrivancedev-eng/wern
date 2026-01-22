import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Modal, Dimensions, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { Icon } from '../../components';
import CauseLottie from '../../components/CauseLottie';
import { useTheme } from '../../context/ThemeContext';
import { useWalking, useAuth, useWeather } from '../../context';

// Import SVG backgrounds for causes 1, 2, 3
import Forest1 from '../../../assest/forest/1.svg';
import Forest2 from '../../../assest/forest/2.svg';
import Forest3 from '../../../assest/forest/3.svg';
import Forest4 from '../../../assest/forest/4.svg';
import Water1 from '../../../assest/clean-water/1.svg';
import Water2 from '../../../assest/clean-water/2.svg';
import Water3 from '../../../assest/clean-water/3.svg';
import Water4 from '../../../assest/clean-water/4.svg';
import Food1 from '../../../assest/food-security/1.svg';
import Food2 from '../../../assest/food-security/2.svg';
import Food3 from '../../../assest/food-security/3.svg';
import Food4 from '../../../assest/food-security/4.svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = 'https://www.videosdownloaders.com/firsttrackapi/api/';

// Background SVG components mapping
const backgroundSvgs = {
  forest: [Forest1, Forest2, Forest3, Forest4],
  water: [Water1, Water2, Water3, Water4],
  food: [Food1, Food2, Food3, Food4],
};

const WalkScreen = () => {
  const [showCauseModal, setShowCauseModal] = useState(false);
  const [selectedCause, setSelectedCause] = useState(null);
  const [todaySummary, setTodaySummary] = useState({
    steps: 0,
    goal: 10000,
    progress: 0,
    kilometre: 0,
    kcal: 0,
    litres: 0,
  });
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const {
    isWalking,
    stepCount,
    sessionSteps,
    activeCause,
    startWalking,
    stopWalking,
    refreshSteps,
    isPedometerAvailable,
    updateGoalSteps,
    updateLocation,
    setCurrentUser,
    kilometre,
    kcal,
    litres,
  } = useWalking();
  const { user, token, dataRefreshTrigger } = useAuth();

  // Set current user for per-user step data storage
  useEffect(() => {
    const userId = user?.id || user?.user_id;
    if (userId) {
      setCurrentUser(userId);
    }
  }, [user, setCurrentUser]);
  const { temperature, weather, location } = useWeather();

  // Fetch today's step summary from API
  const fetchTodaySummary = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}get-step-summary-today?token=${token}`);
      const data = await response.json();

      if (data.status === true && data.data) {
        const goalFromAPI = data.data.goal || 10000;
        setTodaySummary({
          steps: data.data.steps || 0,
          goal: goalFromAPI,
          progress: data.data.progress || 0,
          kilometre: data.data.kilometre || 0,
          kcal: data.data.kcal || 0,
          litres: data.data.litres || 0,
        });
        // Sync goal with WalkingContext so notification shows correct progress
        updateGoalSteps(goalFromAPI);
      }
    } catch (error) {
      console.log('Error fetching today summary:', error.message);
    }
  }, [token, updateGoalSteps]);

  // Fetch today's summary on mount and when token changes
  useEffect(() => {
    fetchTodaySummary();
  }, [fetchTodaySummary]);

  // Refetch data when dataRefreshTrigger changes (e.g., after saving goals in ProfileScreen)
  useEffect(() => {
    if (dataRefreshTrigger > 0) {
      fetchTodaySummary();
    }
  }, [dataRefreshTrigger, fetchTodaySummary]);

  // Update location in WalkingContext when location changes while walking
  useEffect(() => {
    if (isWalking && location) {
      updateLocation(location.latitude, location.longitude);
    }
  }, [isWalking, location, updateLocation]);

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchTodaySummary();
    }, [fetchTodaySummary])
  );

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

  // Animation for scrolling background
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);

  // Progress calculation - use API goal or default to 10000
  const goalSteps = todaySummary.goal || 10000;
  const progressPercent = Math.min((stepCount / goalSteps) * 100, 100); // Cap at 100%

  // Use km, kcal, litres from context (persisted locally for today)
  const displayKm = kilometre;
  const displayKcal = kcal;
  const displayLitres = litres;

  // Cause progress data
  const causeProgressSteps = 8750 + stepCount;
  const causeProgressGoal = 100000;
  const causeProgressPercent = (causeProgressSteps / causeProgressGoal) * 100;

  // Cause reward configurations
  const causeRewardConfig = {
    1: { // Forest Restoration
      name: 'EcoSeeds',
      value: 0.875,
      info: '10 EcoSeeds = 1 Tree Planted',
      icon: 'leaf',
      lottieUrl: 'https://lottie.host/f219581c-303b-427b-bb97-f6d2d1059e7d/SrUPOGT0XZ.lottie',
      fallbackIcon: 'leaf',
      gradientColors: isDarkMode ? ['#1e5c5c', '#2d7a7a'] : ['#dff3f3', '#cfecee'],
      iconBgColor: 'rgba(34, 197, 94, 0.2)',
      iconColor: '#22c55e',
      textColor: colors.textWhite,
      subTextColor: colors.textLight,
      backgroundType: 'forest',
    },
    2: { // Clean Water Access
      name: 'AquaDrops',
      value: 0.875,
      info: '10 AquaDrops = 1 Bottle Clean Water',
      icon: 'water',
      lottieUrl: 'https://lottie.host/e5a2704b-f791-4ac1-855c-2d03d9f64f67/dQyGnjxuVO.lottie',
      fallbackIcon: 'water',
      gradientColors: isDarkMode ? ['#4a6b7c', '#7a9bac'] : ['#e1eef6', '#cfe3f0'],
      iconBgColor: 'rgba(59, 130, 246, 0.2)',
      iconColor: '#3b82f6',
      textColor: colors.textWhite,
      subTextColor: colors.textLight,
      backgroundType: 'water',
    },
    3: { // Food Security
      name: 'GrainBundles',
      value: 1.75,
      info: '5 GrainBundles = 1 Lunch Donated',
      icon: 'leaf',
      lottieUrl: 'https://lottie.host/7b2c9015-623c-4b73-98bc-4e355637a054/itpKz5Ioow.lottie',
      fallbackIcon: 'leaf',
      gradientColors: isDarkMode ? ['#2d5a5a', '#3d7a7a'] : ['#e3f2f2', '#d5ecec'],
      iconBgColor: 'rgba(34, 197, 94, 0.2)',
      iconColor: '#22c55e',
      textColor: colors.textWhite,
      subTextColor: colors.textLight,
      backgroundType: 'food',
    },
    4: { // Women's Empowerment
      name: 'BloomPetals',
      value: 0.875,
      info: "Support women's rights and education",
      icon: 'people',
      lottieUrl: 'https://lottie.host/1c0eba2e-2271-467f-9796-1854de4aa8ad/ae2KUSkuB4.lottie',
      fallbackIcon: 'people',
      gradientColors: isDarkMode ? ['#8b7355', '#c4a882'] : ['#f3ebe6', '#eadfd6'],
      iconBgColor: 'rgba(244, 114, 182, 0.2)',
      iconColor: '#f472b6',
      textColor: colors.textWhite,
      subTextColor: colors.textLight,
      video: require('../../../assest/video/women-empowerment.mp4'),
    },
    5: { // Kids Walk for Labubu
      name: 'Laboobs',
      value: 0.875,
      info: 'Earn Labubu Eco-Collections with every step.',
      icon: 'gift',
      lottieUrl: 'https://lottie.host/4624cfa9-7d6c-4657-bdad-2989b3d4e6bf/SzSJOqSbt7.lottie',
      fallbackIcon: 'gift',
      gradientColors: isDarkMode ? ['#2d6a6a', '#4a8a8a'] : ['#e7f4f4', '#d6eeee'],
      iconBgColor: 'rgba(251, 191, 36, 0.2)',
      iconColor: '#fbbf24',
      textColor: colors.textWhite,
      subTextColor: colors.textLight,
      video: require('../../../assest/video/labubus.mp4'),
    },
  };

  const currentCauseReward = causeRewardConfig[activeCause] || causeRewardConfig[1];

  // Get current background SVG component based on progress (4 stages)
  const getCurrentBackgroundSvg = () => {
    if (!currentCauseReward.backgroundType) return null;
    const stageSize = causeProgressGoal / 4;
    const stage = Math.min(Math.floor(causeProgressSteps / stageSize), 3);
    return backgroundSvgs[currentCauseReward.backgroundType][stage];
  };

  // Check if current cause has animated background (causes 1, 2, 3)
  const hasAnimatedBackground = currentCauseReward.backgroundType && !currentCauseReward.video;

  // Get current background SVG component
  const BackgroundSvg = getCurrentBackgroundSvg();

  // Start scrolling animation
  const startScrollAnimation = () => {
    scrollAnim.setValue(0);
    animationRef.current = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: 1,
        duration: 20000, // 20 seconds
        useNativeDriver: true,
      })
    );
    animationRef.current.start();
  };

  // Stop scrolling animation
  const stopScrollAnimation = () => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
  };

  // Handle animation start/stop based on walking state
  useEffect(() => {
    if (isWalking && hasAnimatedBackground) {
      startScrollAnimation();
    } else {
      stopScrollAnimation();
    }
    return () => stopScrollAnimation();
  }, [isWalking, hasAnimatedBackground]);

  // Circular progress component
  const CircularProgress = ({ percent, size, strokeWidth, children }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#22c55e"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {children}
      </View>
    );
  };

  // Impact portfolio data
  const impactData = [
    { id: 1, value: '24', label: 'Trees Planted', image: require('../../../assest/img/impact-portfolio-img-1.webp'), imageHeight: 45 },
    { id: 2, value: '34L', label: 'Water Donated', image: require('../../../assest/img/impact-portfolio-img-2.webp'), imageHeight: 50 },
    { id: 3, value: '15', label: 'Meals Provided', image: require('../../../assest/img/impact-portfolio-img-3.webp'), imageHeight: 45 },
    { id: 4, value: '8', label: 'Safety Reports', image: require('../../../assest/img/impact-portfolio-img-4.webp'), imageHeight: 40 },
    { id: 5, value: '124', label: 'Lives Touched', image: require('../../../assest/img/impact-portfolio-img-5.webp'), imageHeight: 50 },
    { id: 6, value: '123', label: 'Interaction', image: require('../../../assest/img/impact-portfolio-img-6.webp'), imageHeight: 45 },
  ];

  // Rewards data
  const rewardsData = [
    { id: 1, title: '10 AquaDrops', subtitle: '100,000 Steps', description: 'Each drop counts! Support clean water with your steps.', icon: 'water', iconColor: '#3b82f6' },
    { id: 2, title: '5 GrainBundles', subtitle: '50,000 Steps', description: 'Walk to help provide food to those in need.', icon: 'gift', iconColor: '#f97316' },
    { id: 3, title: '10 EcoSeeds', subtitle: '100,000 Steps', description: 'We will plant 1 tree for your 10 EcoSeeds', icon: 'leaf', iconColor: '#22c55e' },
  ];

  // Causes data for modal
  const causesData = [
    {
      id: 1,
      title: 'Forest Restoration',
      description: 'Help plant trees and restore forests.',
      lottieUrl: 'https://lottie.host/f219581c-303b-427b-bb97-f6d2d1059e7d/SrUPOGT0XZ.lottie',
      fallbackIcon: 'leaf',
    },
    {
      id: 2,
      title: 'Clean Water Access',
      description: 'Provide clean water to communities.',
      lottieUrl: 'https://lottie.host/e5a2704b-f791-4ac1-855c-2d03d9f64f67/dQyGnjxuVO.lottie',
      fallbackIcon: 'water',
    },
    {
      id: 3,
      title: 'Food Security',
      description: 'Fight hunger and malnutrition.',
      lottieUrl: 'https://lottie.host/7b2c9015-623c-4b73-98bc-4e355637a054/itpKz5Ioow.lottie',
      fallbackIcon: 'leaf',
    },
    {
      id: 4,
      title: "Women's Empowerment",
      description: "Support women's rights and education.",
      lottieUrl: 'https://lottie.host/1c0eba2e-2271-467f-9796-1854de4aa8ad/ae2KUSkuB4.lottie',
      fallbackIcon: 'people',
    },
    {
      id: 5,
      title: 'Kids Walk for Labubu',
      description: 'Earn Labubu Eco-Collections with every step.',
      lottieUrl: 'https://lottie.host/4624cfa9-7d6c-4657-bdad-2989b3d4e6bf/SzSJOqSbt7.lottie',
      fallbackIcon: 'gift',
    },
  ];

  // Refresh steps periodically when walking
  useEffect(() => {
    let interval;
    if (isWalking) {
      interval = setInterval(() => {
        refreshSteps();
      }, 5000); // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWalking, refreshSteps]);

  const handleStartWalkingPress = () => {
    if (isWalking) {
      // Stop walking
      stopWalking();
    } else {
      // Show cause selection modal
      setShowCauseModal(true);
    }
  };

  const handleCauseSelect = (causeId) => {
    setSelectedCause(causeId);
  };

  const handleModalClose = () => {
    setShowCauseModal(false);
    setSelectedCause(null);
  };

  const handleConfirmWalking = () => {
    // Start walking with selected cause, user ID, and location
    if (selectedCause) {
      const userId = user?.id || user?.user_id;
      const currentLocation = location ? { lat: location.latitude, lng: location.longitude } : { lat: 0, lng: 0 };
      startWalking(selectedCause, userId, currentLocation);
    }
    setShowCauseModal(false);
    setSelectedCause(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Section - at top when not walking, at bottom when walking */}
        {!(isWalking && (currentCauseReward.video || hasAnimatedBackground)) && (
          <View style={styles.greetingSection}>
            <View style={styles.greetingContent}>
              <Text style={styles.greetingTitle} numberOfLines={1}>{getGreeting()}, {firstName}</Text>
              <Text style={styles.greetingSubtitle}>Ready to earn some rewards?</Text>
            </View>
            <View style={styles.weatherContainer}>
              <View style={styles.weatherIconContainer}>
                <Icon name={weatherIcon.name} size={32} color={weatherIcon.color} />
              </View>
              <Text style={styles.weatherTemp}>{displayTemp}°C</Text>
            </View>
          </View>
        )}

        {/* Animated Background (for Forest, Water, Food causes) - edge to edge */}
        {isWalking && hasAnimatedBackground && BackgroundSvg && (
          <View style={styles.walkingVideoContainer}>
            <Animated.View
              style={[
                styles.animatedBackgroundContainer,
                {
                  transform: [
                    {
                      translateX: scrollAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -SCREEN_WIDTH * 1.8], // Move from right to left
                      }),
                    },
                  ],
                },
              ]}
            >
              <BackgroundSvg
                width={SCREEN_WIDTH * 2.8}
                height={280}
                preserveAspectRatio="xMinYMid slice"
              />
            </Animated.View>
            {/* Walking man gif overlay */}
            <Image
              source={require('../../../assest/img/walkingman.gif')}
              style={styles.walkingManGif}
              resizeMode="contain"
            />
            {/* Bottom gradient overlay for blending */}
            <LinearGradient
              colors={
                isDarkMode
                  ? ['transparent', 'rgba(17, 116, 132, 0.37)', 'rgb(17, 116, 132)']
                  : ['transparent', 'rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.95)']
              }
              style={styles.videoGradientOverlay}
            />
          </View>
        )}

        {/* Walking Video (for Labubu and Women's Empowerment) - edge to edge */}
        {isWalking && currentCauseReward.video && (
          <View style={styles.walkingVideoContainer}>
            <Video
              source={currentCauseReward.video}
              style={styles.walkingVideo}
              resizeMode={ResizeMode.COVER}
              isLooping
              isMuted
              shouldPlay
            />
            {/* Bottom gradient overlay for blending */}
            <LinearGradient
              colors={
                isDarkMode
                  ? ['transparent', 'rgba(17, 116, 132, 0.8)', 'rgb(17, 116, 132)']
                  : ['transparent', 'rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.98)']
              }
              style={styles.videoGradientOverlay}
            />
          </View>
        )}

        {/* Today's Progress Card */}
        <View style={styles.progressCard}>
          <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={styles.progressCardBlur}>
            <View style={styles.progressCardContent}>
              <CircularProgress percent={progressPercent} size={120} strokeWidth={10}>
                <View style={styles.progressCenter}>
                  <Text style={styles.progressValue}>{stepCount}</Text>
                  <View style={styles.progressDivider} />
                  <Text style={styles.progressGoal}>{goalSteps}</Text>
                </View>
              </CircularProgress>

              <View style={styles.progressRight}>
                <Text style={styles.progressTitle}>Todays Progress</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <View style={styles.statValueRow}>
                      <Icon
                        name="walk"
                        size={14}
                        color={isDarkMode ? 'rgba(255,255,255,0.6)' : colors.textMuted}
                      />
                      <Text style={styles.statValue}>{displayKm}</Text>
                    </View>
                    <Text style={styles.statLabel}>Kilometre</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={styles.statValueRow}>
                      <Icon
                        name="flame"
                        size={14}
                        color={isDarkMode ? 'rgba(255,255,255,0.6)' : colors.textMuted}
                      />
                      <Text style={styles.statValue}>{displayKcal}</Text>
                    </View>
                    <Text style={styles.statLabel}>Kcal</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{displayLitres}</Text>
                    <Text style={styles.statLabel}>Litres</Text>
                  </View>
                </View>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Start/Stop Walking Button */}
        <TouchableOpacity style={styles.startButton} activeOpacity={0.8} onPress={handleStartWalkingPress}>
          <LinearGradient
            colors={isWalking ? ['#ef4444', '#dc2626'] : ['#22c55e', '#16a34a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButtonGradient}
          >
            <Icon name={isWalking ? 'stop' : 'walk'} size={24} color="#FFFFFF" />
            <Text style={styles.startButtonText}>{isWalking ? 'Stop Walking' : 'Start Walking'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.sectionDivider} />

        {/* Your Impact Portfolio */}
        <Text style={styles.sectionTitle}>Your Impact Portfolio</Text>

        <View style={styles.impactGrid}>
          {/* First row */}
          <View style={styles.impactRow}>
            {impactData.slice(0, 3).map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.impactCard,
                  index === 0 && styles.impactCardFirst,
                  index === 1 && styles.impactCardMiddle,
                  index === 2 && styles.impactCardLast,
                ]}
              >
                <BlurView intensity={15} tint={isDarkMode ? 'dark' : 'light'} style={styles.impactCardBlur}>
                  <Text style={styles.impactValue}>{item.value}</Text>
                  <Text style={styles.impactLabel}>{item.label}</Text>
                  <Image
                    source={item.image}
                    style={[styles.impactImage, { height: item.imageHeight }]}
                    resizeMode="contain"
                  />
                </BlurView>
              </View>
            ))}
          </View>

          {/* Second row */}
          <View style={styles.impactRow}>
            {impactData.slice(3, 6).map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.impactCard,
                  styles.impactCardSecondRow,
                  index === 0 && styles.impactCardFirst,
                  index === 1 && styles.impactCardMiddle,
                  index === 2 && styles.impactCardLast,
                ]}
              >
                <BlurView intensity={15} tint={isDarkMode ? 'dark' : 'light'} style={styles.impactCardBlur}>
                  <Text style={[styles.impactValue, styles.impactValueSecondRow]}>{item.value}</Text>
                  <Text style={styles.impactLabel}>{item.label}</Text>
                  <Image
                    source={item.image}
                    style={[styles.impactImage, { height: item.imageHeight }]}
                    resizeMode="contain"
                  />
                </BlurView>
              </View>
            ))}
          </View>
        </View>

        {/* Walk & Earn Rewards */}
        <Text style={styles.sectionTitle}>Walk & Earn Rewards</Text>

        <View style={styles.rewardsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rewardsScrollContent}
          >
            {rewardsData.map((reward) => (
              <View key={reward.id} style={styles.rewardCard}>
                <BlurView intensity={15} tint={isDarkMode ? 'dark' : 'light'} style={styles.rewardCardBlur}>
                  <View style={styles.rewardHeader}>
                    <View style={[styles.rewardIcon, { backgroundColor: reward.iconColor + '20' }]}>
                      <Icon name={reward.icon} size={24} color={reward.iconColor} />
                    </View>
                    <View style={styles.rewardTitleContainer}>
                      <Text style={styles.rewardTitle}>{reward.title}</Text>
                      <Text style={styles.rewardSubtitle}>{reward.subtitle}</Text>
                    </View>
                  </View>
                  <Text style={styles.rewardDescription}>{reward.description}</Text>
                </BlurView>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Dynamic Cause Progress Card */}
        <View style={styles.causeProgressCard}>
          <LinearGradient
            colors={currentCauseReward.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.causeProgressGradient}
          >
            <View style={styles.causeProgressContent}>
              <View style={styles.causeProgressLeft}>
                <View style={[styles.causeProgressCircle, { backgroundColor: currentCauseReward.iconBgColor }]}>
                  <CauseLottie
                    lottieUrl={currentCauseReward.lottieUrl}
                    fallbackIcon={currentCauseReward.fallbackIcon}
                    size={60}
                  />
                </View>
              </View>
              <View style={styles.causeProgressRight}>
                <View style={styles.causeProgressHeader}>
                  <Text style={[styles.causeProgressValue, { color: currentCauseReward.textColor }]}>
                    {currentCauseReward.value}
                  </Text>
                  <Text style={[styles.causeProgressLabel, { color: currentCauseReward.textColor }]}>
                    {' '}{currentCauseReward.name}
                  </Text>
                </View>
                <Text style={[styles.causeProgressInfo, { color: currentCauseReward.subTextColor }]}>
                  {currentCauseReward.info}
                </Text>
                <View style={styles.causeProgressBar}>
                  <LinearGradient
                    colors={['#22c55e', '#fbbf24', '#ef4444']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.causeProgressFill, { width: `${causeProgressPercent}%` }]}
                  />
                </View>
                <Text style={[styles.causeProgressSteps, { color: currentCauseReward.subTextColor }]}>
                  {causeProgressSteps.toLocaleString()} of {causeProgressGoal.toLocaleString()} steps
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Choose Your Cause Modal */}
      <Modal
        visible={showCauseModal}
        transparent
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={50} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Choose Your Cause</Text>
                  <Text style={styles.modalSubtitle}>Select a cause to focus your walking efforts</Text>
                </View>
                <TouchableOpacity onPress={handleModalClose} style={styles.modalCloseButton}>
                  <Icon name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Causes Grid */}
              <ScrollView
                style={styles.causesScrollView}
                contentContainerStyle={styles.causesScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.causesGrid}>
                  {/* First row - 2 items */}
                  <View style={styles.causesRow}>
                    {causesData.slice(0, 2).map((cause) => (
                      <TouchableOpacity
                        key={cause.id}
                        style={[
                          styles.causeCard,
                          selectedCause === cause.id && styles.causeCardSelected,
                        ]}
                        onPress={() => handleCauseSelect(cause.id)}
                        activeOpacity={0.8}
                      >
                        <BlurView intensity={20} tint="dark" style={styles.causeCardBlur}>
                          <View style={styles.causeIconContainer}>
                            <CauseLottie lottieUrl={cause.lottieUrl} fallbackIcon={cause.fallbackIcon} />
                          </View>
                          <Text style={styles.causeTitle}>{cause.title}</Text>
                          <Text style={styles.causeDescription}>{cause.description}</Text>
                        </BlurView>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Second row - 2 items */}
                  <View style={styles.causesRow}>
                    {causesData.slice(2, 4).map((cause) => (
                      <TouchableOpacity
                        key={cause.id}
                        style={[
                          styles.causeCard,
                          selectedCause === cause.id && styles.causeCardSelected,
                        ]}
                        onPress={() => handleCauseSelect(cause.id)}
                        activeOpacity={0.8}
                      >
                        <BlurView intensity={20} tint="dark" style={styles.causeCardBlur}>
                          <View style={styles.causeIconContainer}>
                            <CauseLottie lottieUrl={cause.lottieUrl} fallbackIcon={cause.fallbackIcon} />
                          </View>
                          <Text style={styles.causeTitle}>{cause.title}</Text>
                          <Text style={styles.causeDescription}>{cause.description}</Text>
                        </BlurView>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Third row - 1 item (Kids Walk for Labubu) */}
                  <View style={styles.causesRow}>
                    <TouchableOpacity
                      style={[
                        styles.causeCard,
                        styles.causeCardSingle,
                        selectedCause === causesData[4].id && styles.causeCardSelected,
                      ]}
                      onPress={() => handleCauseSelect(causesData[4].id)}
                      activeOpacity={0.8}
                    >
                      <BlurView intensity={20} tint="dark" style={styles.causeCardBlur}>
                        <View style={styles.causeIconContainer}>
                          <CauseLottie lottieUrl={causesData[4].lottieUrl} fallbackIcon={causesData[4].fallbackIcon} />
                        </View>
                        <Text style={styles.causeTitle}>{causesData[4].title}</Text>
                        <Text style={styles.causeDescription}>{causesData[4].description}</Text>
                      </BlurView>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              {/* Bottom Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleModalClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, !selectedCause && styles.confirmButtonDisabled]}
                  onPress={handleConfirmWalking}
                  activeOpacity={0.8}
                  disabled={!selectedCause}
                >
                  <Text style={styles.confirmButtonText}>Start Walking</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 120,
    backgroundColor: 'transparent',
  },
  // Walking Video - edge to edge
  walkingVideoContainer: {
    marginHorizontal: -20,
    marginTop: -10,
    width: SCREEN_WIDTH,
    height: 280,
    overflow: 'hidden',
    marginBottom: 16,
  },
  walkingVideo: {
    width: '100%',
    height: '100%',
  },
  videoGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  // Animated background for causes 1, 2, 3
  animatedBackgroundContainer: {
    width: SCREEN_WIDTH * 2.8, // 280% width for scrolling effect
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  walkingManGif: {
    position: 'absolute',
    width: 220,
    height: 220,
    bottom: 20,
    left: '50%',
    marginLeft: -110, // Center horizontally
    zIndex: 10,
  },
  // Greeting Section
  greetingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingContent: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: colors.textLight,
  },
  weatherContainer: {
    alignItems: 'center',
  },
  weatherIconContainer: {
    position: 'relative',
  },
  cloudOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -8,
  },
  weatherTemp: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textWhite,
    marginTop: 4,
  },
  // Progress Card
  progressCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
  },
  progressCardBlur: {
    padding: 16,
    backgroundColor: isDarkMode ? 'rgba(249, 249, 249, 0.1)' : 'rgba(0, 0, 0, 0.08)',
  },
  progressCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCenter: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textWhite,
  },
  progressDivider: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 2,
  },
  progressGoal: {
    fontSize: 14,
    color: colors.textMuted,
  },
  progressRight: {
    flex: 1,
    marginLeft: 20,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textWhite,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
    marginLeft: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  // Start Button
  startButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  // Section styles
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: 16,
  },
  // Impact Portfolio
  impactGrid: {
    marginBottom: 24,
  },
  impactRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  impactCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
  },
  impactCardFirst: {
    marginLeft: 0,
  },
  impactCardMiddle: {
  },
  impactCardLast: {
    marginRight: 0,
  },
  impactCardSecondRow: {
  },
  impactCardBlur: {
    padding: 12,
    alignItems: 'center',
    minHeight: 120,
    backgroundColor: isDarkMode ? 'rgba(249, 249, 249, 0.1)' : 'rgba(242, 244, 246, 0.35)',
  },
  impactValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textWhite,
  },
  impactValueSecondRow: {
    color: colors.textWhite,
  },
  impactLabel: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  impactImage: {
    width: '100%',
    marginTop: 'auto',
  },
  // Rewards
  rewardsContainer: {
    marginRight: -20,
  },
  rewardsScrollContent: {
    paddingRight: 20,
  },
  rewardCard: {
    width: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
  },
  rewardCardBlur: {
    padding: 16,
    backgroundColor: isDarkMode ? 'rgba(249, 249, 249, 0.1)' : 'rgba(242, 244, 246, 0.35)',
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rewardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rewardTitleContainer: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textWhite,
  },
  rewardSubtitle: {
    fontSize: 12,
    color: colors.textLight,
  },
  rewardDescription: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  // Cause Progress Card
  causeProgressCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
  },
  causeProgressGradient: {
    padding: 20,
  },
  causeProgressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  causeProgressLeft: {
    marginRight: 16,
  },
  causeProgressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  causeProgressRight: {
    flex: 1,
  },
  causeProgressHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  causeProgressValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  causeProgressLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  causeProgressInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  causeProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  causeProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  causeProgressSteps: {
    fontSize: 12,
    marginTop: 6,
  },
  bottomPadding: {
    height: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modalBlur: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalCloseButton: {
    padding: 4,
  },
  causesScrollView: {
    flex: 1,
  },
  causesScrollContent: {
    paddingBottom: 10,
  },
  causesGrid: {
  },
  causesRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  causeCard: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
  },
  causeCardSingle: {
    flex: 0,
    width: (SCREEN_WIDTH - 40 - 24) / 2,
  },
  causeCardSelected: {
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  causeCardBlur: {
    padding: 14,
    height: 180,
    backgroundColor: isDarkMode ? 'rgba(249, 249, 249, 0.1)' : 'rgba(255, 255, 255, 0.15)',
  },
  causeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  causeLottie: {
    width: 50,
    height: 50,
  },
  causeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  causeDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default WalkScreen;
