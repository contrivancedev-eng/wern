import React, { useState, useRef, useMemo } from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const OTPInput = ({ length = 6, onComplete, onChange }) => {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const inputRefs = useRef([]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleChange = (text, index) => {
    const numericText = text.replace(/[^0-9]/g, '');

    if (numericText.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = numericText;
      setOtp(newOtp);

      if (numericText && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Always report current value
      const currentValue = newOtp.join('');
      if (onChange) {
        onChange(currentValue);
      }

      // Call onComplete when all digits are filled
      if (newOtp.every(digit => digit !== '') && onComplete) {
        onComplete(currentValue);
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {otp.map((digit, index) => (
        <View key={index} style={styles.inputWrapper}>
          <TextInput
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            selectTextOnFocus
          />
        </View>
      ))}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  inputWrapper: {
    width: 45,
    height: 55,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  input: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: colors.textWhite,
  },
});

export default OTPInput;
