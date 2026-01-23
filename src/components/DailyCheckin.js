import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ImageBackground, Image, Animated, Dimensions, Platform, Modal, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Icon from './Icon';
import LinearGradient from './LinearGradient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = 'https://www.videosdownloaders.com/firsttrackapi/api/';

const WavyBorder = ({ style }) => (
  <Svg width="100%" height="16" viewBox="0 0 360 16" preserveAspectRatio="none" style={style}>
    <Path
      d="M0,16 L0,8 Q9,0 18,8 T36,8 T54,8 T72,8 T90,8 T108,8 T126,8 T144,8 T162,8 T180,8 T198,8 T216,8 T234,8 T252,8 T270,8 T288,8 T306,8 T324,8 T342,8 T360,8 L360,16 Z"
      fill="rgba(99, 177, 195, 0.46)"
    />
  </Svg>
);

const CalendarIcon = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z"
      stroke="#f97316"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M15.694 13.7h.009M15.694 16.7h.009M11.995 13.7h.01M11.995 16.7h.01M8.295 13.7h.01M8.295 16.7h.01"
      stroke="#f97316"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ClockIcon = () => (
  <Svg width="28" height="28" viewBox="0 0 28 28">
    <Circle cx="14" cy="14" r="12" fill="none" stroke="#00ff5e" strokeWidth="2.5" />
    <Path d="M14,7 v8 l5,3" stroke="#00ff5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

const GradientCircle = () => (
  <Svg width="36" height="36" viewBox="0 0 36 36">
    <Defs>
      <SvgLinearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#f59e0b" />
        <Stop offset="100%" stopColor="#f67318" />
      </SvgLinearGradient>
    </Defs>
    <Circle cx="18" cy="18" r="18" fill="url(#orangeGradient)" />
  </Svg>
);

const GoldBackground = () => (
  <View style={StyleSheet.absoluteFill}>
    {/* Base gradient - bottom layer */}
    <LinearGradient
      colors={['#5d4a1f', '#5d4a1f', '#D1B464', '#FFFFAC', '#FFFFFF']}
      locations={[0, 0.375, 0.75, 0.92, 1]}
      start={{ x: 1, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
    {/* Top gradient overlay */}
    <LinearGradient
      colors={['transparent', 'transparent', '#8A6E2F', '#9f7928', '#FDB931', '#FEDB37']}
      locations={[0, 0.2, 0.6, 0.7, 0.92, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, { opacity: 0.85 }]}
    />
  </View>
);

// Animated Coin Component - positioned absolutely on screen
const AnimatedCoin = ({ delay, startX, startY, targetX, targetY, onComplete, styles }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      // First appear with a pop
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      // Then fly to wallet
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: targetY - startY,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: targetX - startX,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(scale, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(700),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    animation.start(() => {
      onComplete?.();
    });

    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.flyingCoin,
        {
          left: startX,
          top: startY,
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <Image
        source={require('../../assest/img/bitcoin.webp')}
        style={styles.flyingCoinImage}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const DailyCheckin = ({ onClaim }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { token, refreshLitties, triggerWalletAnimation } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showModal, setShowModal] = useState(false);
  const [showCoins, setShowCoins] = useState(false);
  const [completedCoins, setCompletedCoins] = useState(0);

  // API state
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [todayClaimed, setTodayClaimed] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  const [dailyList, setDailyList] = useState([]);
  const [claimResult, setClaimResult] = useState(null);
  const [apiResponseCount, setApiResponseCount] = useState(0); // Tracks API responses to trigger timer
  const timerRef = useRef(null);

  // Fetch daily claim status
  const fetchClaimStatus = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}get-daily-claim-status?token=${token}`);
      const data = await response.json();

      if (data.status === true && data.data) {
        setTodayClaimed(data.data.today_claimed || false);
        setCurrentDay(parseInt(data.data.current_day) || 1);
        setTimeLeft(data.data.time_left || '00:00:00');
        setDailyList(data.data.daily_list || []);
        // Increment counter to trigger timer restart with new API data
        setApiResponseCount(prev => prev + 1);
      }
    } catch (error) {
      console.log('Error fetching daily claim status:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch status on mount
  useEffect(() => {
    fetchClaimStatus();
  }, [fetchClaimStatus]);

  // Store initial time from API in a ref (won't trigger re-renders)
  const initialSecondsRef = useRef(0);

  // Countdown timer - runs based on initial time from API
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Parse initial time and store in ref
    if (!timeLeft || timeLeft === '00:00:00') {
      initialSecondsRef.current = 0;
      return;
    }

    const parseTime = (timeStr) => {
      const parts = timeStr.split(':').map(Number);
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    };

    // Only update initial seconds if this is a new value (not from interval)
    const newSeconds = parseTime(timeLeft);
    if (newSeconds > 0) {
      initialSecondsRef.current = newSeconds;
    }

    let seconds = initialSecondsRef.current;
    if (seconds <= 0) return;

    timerRef.current = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setTimeLeft('00:00:00');
        // Refresh status when timer ends
        fetchClaimStatus();
        return;
      }

      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiResponseCount]); // Trigger when API response is received

  // Build daily rewards from API data
  const dailyRewards = useMemo(() => {
    if (dailyList.length === 0) {
      // Default fallback
      return [
        { day: 1, litties: 1 },
        { day: 2, litties: 5 },
        { day: 3, litties: 10 },
        { day: 4, litties: 10 },
        { day: 5, litties: 15 },
        { day: 6, litties: 15 },
        { day: 7, litties: 20 },
      ].map(item => ({
        ...item,
        completed: item.day < currentDay || (item.day === currentDay && todayClaimed),
        current: item.day === currentDay && !todayClaimed,
      }));
    }

    return dailyList.map(item => ({
      day: item.day,
      litties: parseInt(item.points) || 0,
      completed: item.day < currentDay || (item.day === currentDay && todayClaimed),
      current: item.day === currentDay && !todayClaimed,
    }));
  }, [dailyList, currentDay, todayClaimed]);

  const currentDayData = dailyRewards.find(d => d.current) || dailyRewards.find(d => d.day === currentDay);

  const handleClaim = async () => {
    if (todayClaimed || isClaiming || !token) return;

    setIsClaiming(true);
    try {
      const response = await fetch(`${API_URL}user-daily-claim?token=${token}`);
      const data = await response.json();

      if (data.status === true && data.data) {
        setClaimResult(data.data);
        setShowModal(true);
        setShowCoins(true);
        setCompletedCoins(0);
        setTodayClaimed(true);

        // Refresh litties balance in navbar
        refreshLitties?.();

        // Trigger wallet bounce animation when first coin lands (~900ms after animation starts)
        setTimeout(() => {
          triggerWalletAnimation?.();
        }, 900);

        // Re-fetch claim status to get updated time_left
        setTimeout(() => {
          fetchClaimStatus();
        }, 1000);

        onClaim?.();
      } else {
        console.log('Claim failed:', data.message);
      }
    } catch (error) {
      console.log('Error claiming daily reward:', error.message);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowCoins(false);
    setCompletedCoins(0);
    setClaimResult(null);
  };

  const handleCoinComplete = () => {
    setCompletedCoins(prev => {
      const newCount = prev + 1;
      // Close modal after all coins complete animation
      if (newCount >= coinPositions.length) {
        setTimeout(() => {
          handleCloseModal();
        }, 300);
      }
      return newCount;
    });
  };

  // Calculate wallet target position (top-right of screen)
  const walletTargetX = SCREEN_WIDTH - 140;
  const walletTargetY = insets.top + 25;

  // Modal center position
  const modalCenterX = SCREEN_WIDTH / 2;
  const modalCenterY = SCREEN_HEIGHT / 2;

  // Generate coin start positions (around the modal coin image)
  const coinPositions = [
    { startX: modalCenterX - 40, startY: modalCenterY - 60, delay: 0 },
    { startX: modalCenterX + 40, startY: modalCenterY - 50, delay: 100 },
    { startX: modalCenterX - 60, startY: modalCenterY, delay: 200 },
    { startX: modalCenterX + 50, startY: modalCenterY + 10, delay: 300 },
    { startX: modalCenterX, startY: modalCenterY + 40, delay: 400 },
  ];

  return (
    <View style={styles.container}>
        <View style={styles.card}>
        {/* Top Section with Image Background */}
        <ImageBackground
          source={require('../../assest/img/winReward.jpg')}
          style={styles.imageBackground}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <Text style={styles.promoTitle}>Win a Yacht Trip Gift Card!</Text>
            <Text style={styles.promoSubtitle}>
              Claim Daily Rewards in the next 7 days and{'\n'}earn an entry into Prize Draw each day!
            </Text>
          </View>
        </ImageBackground>

        {/* Wavy Border */}
        <WavyBorder style={styles.wavySvg} />

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Checkin Row */}
          <View style={styles.checkinRow}>
            <View style={styles.checkinLabel}>
              <CalendarIcon />
              <View style={styles.checkinTextContainer}>
                <Text style={styles.checkinText}>Daily</Text>
                <Text style={styles.checkinSubtext}>Checkin</Text>
              </View>
            </View>

            <View style={styles.timeContainer}>
              <ClockIcon />
              <View style={styles.timeTextContainer}>
                <Text style={styles.timeLabel}>{todayClaimed ? 'Next claim in' : 'Time left'}</Text>
                <Text style={styles.timeValue}>{timeLeft}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClaim}
              activeOpacity={0.8}
              disabled={todayClaimed || isClaiming || isLoading}
            >
              <LinearGradient
                colors={todayClaimed ? ['#6b7280', '#4b5563'] : ['#f59e0b', '#f67318']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.claimButton}
              >
                {isClaiming ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.claimText}>{todayClaimed ? 'Claimed' : 'Claim'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Days Row */}
          <View style={styles.daysContainer}>
            {dailyRewards.map((day) => (
              <View key={day.day} style={styles.dayItem}>
                {day.current ? (
                  <View style={styles.gradientCircleWrapper}>
                    <GradientCircle />
                    <View style={styles.gradientCircleContent}>
                      <Text style={styles.currentLitties}>
                        {day.litties > 0 ? day.litties : ''}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.dayCircle,
                      day.completed && styles.completedCircle,
                    ]}
                  >
                    {day.completed ? (
                      <Icon name="checkmark" size={18} color={colors.textWhite} />
                    ) : (
                      <Text style={styles.dayLitties}>
                        {day.litties > 0 ? day.litties : ''}
                      </Text>
                    )}
                  </View>
                )}
                <Text style={styles.dayLabel}>Day {day.day}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Claim Success Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseModal}
      >
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 60 }]}>
          <TouchableOpacity
            style={[styles.overlayBackground, { top: insets.top + 60 }]}
            activeOpacity={1}
            onPress={handleCloseModal}
          />

          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <GoldBackground />

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseModal}
                activeOpacity={0.7}
              >
                <Icon name="close" size={24} color={colors.textWhite} />
              </TouchableOpacity>

              {/* Coin Image */}
              <View style={styles.coinContainer}>
                <Image
                  source={require('../../assest/img/bitcoin.webp')}
                  style={styles.coinImage}
                  resizeMode="contain"
                />
              </View>

              {/* Title */}
              <Text style={styles.modalTitle}>
                {claimResult?.points || currentDayData?.litties || 5} Litties for Day {claimResult?.day || currentDayData?.day || currentDay}.
              </Text>

              {/* Subtitle */}
              <Text style={styles.modalSubtitle}>
                {claimResult?.message || "Congratulations! The Litties have been deposited into your wallet."}
              </Text>
            </View>
          </View>

          {/* Flying Coins Animation - inside modal for visibility */}
          {showCoins && coinPositions.map((pos, index) => (
            <AnimatedCoin
              key={index}
              startX={pos.startX}
              startY={pos.startY}
              targetX={walletTargetX}
              targetY={walletTargetY}
              delay={pos.delay}
              onComplete={handleCoinComplete}
              styles={styles}
            />
          ))}
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(99, 177, 195, 0.46)',
  },
  imageBackground: {
    width: '100%',
    height: 175,
  },
  overlay: {
    flex: 1,
    padding: 16,
    paddingTop: 20,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 6,
  },
  promoSubtitle: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.95,
  },
  wavySvg: {
    marginTop: -8,
  },
  bottomSection: {
    backgroundColor: 'rgba(99, 177, 195, 0.46)',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 16,
  },
  checkinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  checkinLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkinTextContainer: {
    marginLeft: 6,
  },
  checkinText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  checkinSubtext: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeTextContainer: {
    marginLeft: 6,
  },
  timeLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    lineHeight: 14,
  },
  timeValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  claimButton: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  claimText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayItem: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3D8A95',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  completedCircle: {
    backgroundColor: '#10b981',
  },
  gradientCircleWrapper: {
    width: 36,
    height: 36,
    marginBottom: 4,
  },
  gradientCircleContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayLitties: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  currentLitties: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dayLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#5d4a1f',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  coinContainer: {
    width: 100,
    height: 100,
    marginBottom: 20,
    zIndex: 1,
  },
  coinImage: {
    width: '100%',
    height: '100%',
  },
  flyingCoin: {
    position: 'absolute',
    width: 40,
    height: 40,
    zIndex: 100,
  },
  flyingCoinImage: {
    width: '100%',
    height: '100%',
  },
  modalTitle: {
    color: colors.textWhite,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    zIndex: 1,
  },
  modalSubtitle: {
    color: colors.textLight,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    zIndex: 1,
  },
});

export default DailyCheckin;
