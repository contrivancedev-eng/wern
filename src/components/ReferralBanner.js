import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const ReferralBanner = ({ onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.text}>Invite a friend, get</Text>
        <Text style={styles.text}>10 litties</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={onPress}>
        <Text style={styles.buttonText}>Get 10 Litties</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  content: {
    flex: 1,
  },
  text: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buttonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ReferralBanner;
