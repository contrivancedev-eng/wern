import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Image, Dimensions, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width - 40;
const ITEM_SPACING = 10;
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_SPACING;

const BannerCarousel = ({ data, autoScrollInterval = 3000 }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % data.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * SNAP_INTERVAL,
          animated: true,
        });
        return nextIndex;
      });
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [data.length, autoScrollInterval]);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SNAP_INTERVAL);
    if (index >= 0 && index < data.length) {
      setActiveIndex(index);
    }
  };

  const renderItem = (item, index) => (
    <View key={item.id} style={styles.itemContainer}>
      <Image source={item.image} style={styles.image} resizeMode="cover" />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
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
    marginTop: 0,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: 150,
    marginRight: ITEM_SPACING,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
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

export default BannerCarousel;
