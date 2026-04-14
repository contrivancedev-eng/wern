import React from 'react';
import { StyleSheet, ScrollView, View, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Header,
  BannerCarousel,
  ProductCarousel,
  DailyCheckin,
} from '../../components';
import { bannerData, productData } from '../../data/staticData';

const HomeScreen = () => {
  const navigation = useNavigation();

  const handleClaim = () => {
    // Static - no action needed
  };

  const handleReferPress = () => {
    navigation.navigate('Refer');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Header />

        <BannerCarousel data={bannerData} onPress={() => navigation.navigate('Walk')} />

        <ProductCarousel data={productData} />

        <TouchableOpacity
          style={styles.referralContainer}
          onPress={handleReferPress}
          activeOpacity={0.8}
        >
          <Image
            source={require('../../../assest/img/refer-a-friend.webp')}
            style={styles.referralImage}
            resizeMode="cover"
          />
        </TouchableOpacity>

        <DailyCheckin onClaim={handleClaim} />

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
    backgroundColor: 'transparent',
  },
  bottomPadding: {
    height: 20,
  },
  referralContainer: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  referralImage: {
    width: '100%',
    height: 144,
  },
});

export default HomeScreen;
