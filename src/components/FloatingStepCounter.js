import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, PanResponder } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './index';
import { useWalking } from '../context/WalkingContext';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Approximate heights for animation
const COLLAPSED_HEIGHT = 42;
const EXPANDED_HEIGHT = 320;
const COLLAPSED_WIDTH = 160;
const EXPANDED_WIDTH = SCREEN_WIDTH - 40;

const FloatingStepCounter = () => {
  const { isWalking, stepCount, activeCause, stopWalking, kilometre, kcal, litres, goalSteps } = useWalking();
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [isVisible, setIsVisible] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastPosition = useRef({ x: 0, y: 0 });

  const styles = useMemo(() => createStyles(colors, isDarkMode, insets), [colors, isDarkMode, insets]);

  // Full cause names mapping
  const causeNames = {
    1: 'Forest Restoration',
    2: 'Clean Water Access',
    3: 'Food Security',
    4: "Women's Empowerment",
    5: 'Kids Walk for Labubu',
  };

  // Progress percentage
  const progress = Math.min((stepCount / goalSteps) * 100, 100);

  // PanResponder for dragging
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
        },
        onPanResponderGrant: () => {
          pan.setOffset({
            x: lastPosition.current.x,
            y: lastPosition.current.y,
          });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gestureState) => {
          pan.flattenOffset();

          const maxX = (SCREEN_WIDTH - 180) / 2;
          const minX = -maxX;
          const maxY = 0;
          const minY = -(SCREEN_HEIGHT - insets.bottom - 250);

          let newX = lastPosition.current.x + gestureState.dx;
          let newY = lastPosition.current.y + gestureState.dy;

          newX = Math.max(minX, Math.min(maxX, newX));
          newY = Math.max(minY, Math.min(maxY, newY));

          lastPosition.current = { x: newX, y: newY };

          Animated.spring(pan, {
            toValue: { x: newX, y: newY },
            useNativeDriver: false,
            tension: 40,
            friction: 8,
          }).start();
        },
      }),
    [insets.bottom]
  );

  // Show/hide animation
  useEffect(() => {
    if (isWalking && !isHidden) {
      slideAnim.setValue(0);
      setIsVisible(true);
      requestAnimationFrame(() => {
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: false,
        }).start();
      });
    } else if (isHidden || !isWalking) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 12,
        useNativeDriver: false,
      }).start(() => {
        if (!isWalking) {
          setIsVisible(false);
          setIsExpanded(false);
          setIsHidden(false);
          expandAnim.setValue(0);
          pan.setValue({ x: 0, y: 0 });
          lastPosition.current = { x: 0, y: 0 };
        }
      });
    }
  }, [isWalking, isHidden]);

  if (!isWalking || !isVisible || isHidden) {
    return null;
  }

  const handleToggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);

    Animated.spring(expandAnim, {
      toValue,
      tension: 50,
      friction: 9,
      useNativeDriver: false,
    }).start();
  };

  const handleHide = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 100,
      friction: 12,
      useNativeDriver: false,
    }).start(() => {
      setIsHidden(true);
    });
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    Animated.spring(expandAnim, {
      toValue: 0,
      tension: 50,
      friction: 9,
      useNativeDriver: false,
    }).start();
  };

  const handleStopWalking = () => {
    stopWalking();
  };

  // Interpolations for smooth slide up/down animation
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
    extrapolate: 'clamp',
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.7, 1],
    extrapolate: 'clamp',
  });

  const scale = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
    extrapolate: 'clamp',
  });

  // Expand/collapse interpolations
  const animatedWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_WIDTH, EXPANDED_WIDTH],
    extrapolate: 'clamp',
  });

  const animatedHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_HEIGHT, EXPANDED_HEIGHT],
    extrapolate: 'clamp',
  });

  const collapsedOpacity = expandAnim.interpolate({
    inputRange: [0, 0.4],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const expandedOpacity = expandAnim.interpolate({
    inputRange: [0.6, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const combinedTranslateY = Animated.add(pan.y, translateY);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: animatedWidth,
          height: animatedHeight,
          transform: [
            { translateX: pan.x },
            { translateY: combinedTranslateY },
            { scale },
          ],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <BlurView intensity={40} tint={isDarkMode ? 'dark' : 'light'} style={styles.blurContainer}>
        {/* Collapsed view - compact pill */}
        <Animated.View
          style={[
            styles.collapsedWrapper,
            { opacity: collapsedOpacity },
            isExpanded && styles.hiddenView,
          ]}
          pointerEvents={isExpanded ? 'none' : 'auto'}
        >
          <View style={styles.collapsedContent}>
            <TouchableOpacity style={styles.collapsedTouchable} onPress={handleToggleExpand} activeOpacity={0.9}>
              <View style={styles.stepIcon}>
                <Icon name="footsteps" size={14} color="#22c55e" />
              </View>
              <Text style={styles.stepCountText}>{stepCount.toLocaleString()}</Text>
              <Text style={styles.targetText}>/{goalSteps.toLocaleString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleHide} style={styles.closeIconButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={12} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Expanded view */}
        <Animated.View
          style={[
            styles.expandedWrapper,
            { opacity: expandedOpacity },
            !isExpanded && styles.hiddenView,
          ]}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          <View style={styles.expandedContent}>
            <View style={styles.expandedHeader}>
              <View style={styles.expandedLeft}>
                <View style={styles.stepIconLarge}>
                  <Icon name="footsteps" size={22} color="#22c55e" />
                </View>
                <View style={styles.causeInfo}>
                  <Text style={styles.walkingLabel}>Walking for</Text>
                  <Text style={styles.causeName} numberOfLines={1}>
                    {causeNames[activeCause] || 'Cause'}
                  </Text>
                </View>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity onPress={handleCollapse} style={styles.collapseButton}>
                  <Icon name="chevron-down" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleHide} style={styles.closeButton}>
                  <Icon name="close" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main step count with target */}
            <View style={styles.mainStepRow}>
              <Text style={styles.mainStepValue}>{stepCount.toLocaleString()}</Text>
              <Text style={styles.mainStepTarget}>/ {goalSteps.toLocaleString()}</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress.toFixed(0)}% of daily goal</Text>

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statGridItem}>
                <Icon name="walk" size={16} color="#3b82f6" />
                <Text style={styles.statGridValue}>{kilometre}</Text>
                <Text style={styles.statGridLabel}>km</Text>
              </View>
              <View style={styles.statGridDivider} />
              <View style={styles.statGridItem}>
                <Icon name="flame" size={16} color="#f97316" />
                <Text style={styles.statGridValue}>{kcal}</Text>
                <Text style={styles.statGridLabel}>kcal</Text>
              </View>
              <View style={styles.statGridDivider} />
              <View style={styles.statGridItem}>
                <Icon name="star" size={16} color="#fbbf24" />
                <Text style={styles.statGridValue}>{litres}</Text>
                <Text style={styles.statGridLabel}>litties</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.stopButton} onPress={handleStopWalking} activeOpacity={0.8}>
              <Icon name="stop" size={16} color="#FFFFFF" />
              <Text style={styles.stopButtonText}>Stop Walking</Text>
            </TouchableOpacity>

            <View style={styles.dragHandle}>
              <View style={styles.dragHandleBar} />
            </View>
          </View>
        </Animated.View>
      </BlurView>
    </Animated.View>
  );
};

const createStyles = (colors, isDarkMode, insets) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: insets.bottom + 90,
      alignSelf: 'center',
      borderRadius: 22,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 8,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
    },
    blurContainer: {
      flex: 1,
      backgroundColor: isDarkMode ? 'rgba(0, 40, 50, 0.92)' : 'rgba(255, 255, 255, 0.95)',
    },
    // Wrapper styles for animation
    collapsedWrapper: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    expandedWrapper: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    hiddenView: {
      pointerEvents: 'none',
    },
    // Collapsed state - compact pill
    collapsedContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingLeft: 8,
      paddingRight: 6,
    },
    collapsedTouchable: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    stepIcon: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 6,
    },
    stepCountText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textWhite,
    },
    targetText: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
      marginLeft: 1,
      marginRight: 6,
    },
    closeIconButton: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    // Expanded state
    expandedContent: {
      padding: 16,
    },
    expandedHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    expandedLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    stepIconLarge: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    causeInfo: {
      flex: 1,
    },
    walkingLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
    causeName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textWhite,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    collapseButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    closeButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Main step count
    mainStepRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      marginBottom: 8,
    },
    mainStepValue: {
      fontSize: 34,
      fontWeight: '700',
      color: colors.textWhite,
    },
    mainStepTarget: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textMuted,
      marginLeft: 4,
    },
    // Progress bar
    progressContainer: {
      height: 6,
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      borderRadius: 3,
      marginBottom: 6,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: '#22c55e',
      borderRadius: 3,
    },
    progressText: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 12,
    },
    // Stats grid
    statsGrid: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    statGridItem: {
      flex: 1,
      alignItems: 'center',
    },
    statGridDivider: {
      width: 1,
      height: 36,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
    },
    statGridValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textWhite,
      marginTop: 4,
    },
    statGridLabel: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 2,
    },
    stopButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ef4444',
      paddingVertical: 12,
      borderRadius: 20,
    },
    stopButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: 6,
    },
    dragHandle: {
      alignItems: 'center',
      marginTop: 10,
    },
    dragHandleBar: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
    },
  });

export default FloatingStepCounter;
