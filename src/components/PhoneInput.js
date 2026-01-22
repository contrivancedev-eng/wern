import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';
import { countryCodes } from '../data/staticData';

const PhoneInput = ({ value, onChangeText, onChangeCountryCode, selectedCode: initialCode = '+971' }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [currentCode, setCurrentCode] = useState(initialCode);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectedCountry = countryCodes.find(c => c.code === currentCode) || countryCodes.find(c => c.code === '+971');

  const handleSelectCountry = (country) => {
    setCurrentCode(country.code);
    onChangeCountryCode?.(country.code);
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.countryPicker}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.countryCode}>{currentCode}</Text>
        <Icon name="chevron-down" size={12} color={colors.inputText} />
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ''))}
        placeholder="Phone number"
        placeholderTextColor={colors.inputPlaceholder}
        keyboardType="number-pad"
        maxLength={15}
      />

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <FlatList
              data={countryCodes}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItem, item.code === currentCode && styles.selectedItem]}
                  onPress={() => handleSelectCountry(item)}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={[styles.countryName, item.code === currentCode && styles.selectedText]}>{item.country}</Text>
                  <Text style={[styles.code, item.code === currentCode && styles.selectedText]}>{item.code}</Text>
                  {item.code === currentCode && <Icon name="checkmark" size={16} color={colors.accent} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    overflow: 'hidden',
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  countryCode: {
    fontSize: 16,
    color: colors.inputText,
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.inputText,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    color: colors.textWhite,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: colors.inputText,
  },
  code: {
    fontSize: 16,
    color: colors.inputPlaceholder,
  },
  selectedItem: {
    backgroundColor: '#E8F5E9',
  },
  selectedText: {
    color: colors.accent,
    fontWeight: '600',
  },
});

export default PhoneInput;
