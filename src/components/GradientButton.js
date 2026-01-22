import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from './LinearGradient';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';

const GradientButton = ({
  title,
  onPress,
  style,
  textStyle,
  showArrow = true,
  disabled = false
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, style]}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={disabled ? ['#999', '#777'] : colors.buttonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {showArrow && (
            <View style={styles.arrowContainer}>
              <Icon name="arrow-forward" size={18} color="#FFFFFF" />
              <Text style={styles.arrowBracket}>)</Text>
            </View>
          )}
          <Text style={[styles.text, textStyle]}>{title}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  arrowBracket: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 2,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default GradientButton;
