import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Icon from './Icon';
import GlassCard from './GlassCard';
import { useTheme } from '../context/ThemeContext';

const FeatureCard = ({ icon, title, description, iconColor }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
        <Icon name={icon} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </GlassCard>
  );
};

const createStyles = (colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: colors.textLight,
    fontSize: 14,
  },
});

export default FeatureCard;
