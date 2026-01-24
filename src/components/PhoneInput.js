import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';
import { countryCodes } from '../data/staticData';

const PhoneInput = ({ value, onChangeText, onChangeCountryCode, selectedCode: initialCode = '+971' }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [searchQuery, setSearchQuery] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectedCountry = countryCodes.find(c => c.code === currentCode) || countryCodes.find(c => c.code === '+971');

  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countryCodes;
    const query = searchQuery.toLowerCase().trim();
    return countryCodes.filter(
      country =>
        country.country.toLowerCase().includes(query) ||
        country.code.includes(query)
    );
  }, [searchQuery]);

  const handleSelectCountry = (country) => {
    setCurrentCode(country.code);
    onChangeCountryCode?.(country.code);
    setShowPicker(false);
    setSearchQuery('');
  };

  const handleClosePicker = () => {
    setShowPicker(false);
    setSearchQuery('');
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
        onRequestClose={handleClosePicker}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClosePicker}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={handleClosePicker} style={styles.closeButton}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Icon name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={item => item.code}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No countries found</Text>
                </View>
              }
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
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
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
    color: '#333',
  },
  code: {
    fontSize: 16,
    color: '#999',
    marginRight: 8,
  },
  selectedItem: {
    backgroundColor: '#E8F5E9',
  },
  selectedText: {
    color: colors.accent,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default PhoneInput;
