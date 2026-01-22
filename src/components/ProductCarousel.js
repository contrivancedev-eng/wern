import React, { useState, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, Image, Dimensions, ScrollView, Platform } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width - 100;

const ProductCarousel = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (ITEM_WIDTH + 20));
    if (index >= 0 && index < data.length) {
      setActiveIndex(index);
    }
  };

  const renderItem = (item) => (
    <View key={item.id} style={styles.itemContainer}>
      <View style={styles.mediaWrapper}>
        {item.type === 'video' ? (
          Platform.OS === 'web' ? (
            <video
              src={item.video}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <Video
              source={item.video}
              style={styles.media}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
              useNativeControls={false}
            />
          )
        ) : (
          <Image source={item.image} style={styles.media} resizeMode="cover" />
        )}
      </View>
      <Text style={styles.title}>{item.title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={ITEM_WIDTH + 20}
        snapToAlignment="start"
      >
        {data.map(renderItem)}
      </ScrollView>
      <View style={styles.pagination}>
        {data.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activeIndex && styles.activeDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    marginRight: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  mediaWrapper: {
    width: '100%',
    height: 150,
    backgroundColor: '#000',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
    padding: 12,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: colors.secondary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default ProductCarousel;
