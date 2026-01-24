import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, TopNavbar, GradientBackground } from '../components';
import { HomeScreen, WalkScreen, DigitalVaultScreen, ReferScreen, ProfileScreen } from '../screens/main';
import { useWalking, useTheme, useAuth } from '../context';

const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation, colors, bottomInset }) => {
  return (
    <View style={styles.tabBarContainer}>
      <View style={[styles.tabBar, { backgroundColor: colors.tabBarBackground, borderTopColor: colors.cardBorder, paddingBottom: Math.max(bottomInset, 10) }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (route.name === 'Walk') {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.walkButtonContainer}
              >
                <View style={[styles.walkButton, { backgroundColor: colors.secondary }, isFocused && styles.walkButtonFocused]}>
                  <Image
                    source={require('../../assest/img/walk.gif')}
                    style={styles.walkGif}
                  />
                </View>
                <Text style={[styles.tabLabel, { color: colors.textLight }, isFocused && { color: colors.textWhite, fontWeight: '500' }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          }

          let iconName;
          if (route.name === 'Home') {
            iconName = isFocused ? 'home' : 'home-outline';
          } else if (route.name === 'Refer') {
            iconName = isFocused ? 'people' : 'people-outline';
          } else if (route.name === 'DigitalVault') {
            iconName = isFocused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Profile') {
            iconName = isFocused ? 'person' : 'person-outline';
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View style={[
                styles.tabItemInner,
                { backgroundColor: isFocused ? colors.activeTabBg : 'transparent' }
              ]}>
                <Icon
                  name={iconName}
                  size={22}
                  color={isFocused ? colors.textWhite : colors.textLight}
                />
                <Text style={[styles.tabLabel, { color: colors.textLight }, isFocused && { color: colors.textWhite, fontWeight: '500' }]}>
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const BottomTabNavigator = () => {
  const [tabNavigation, setTabNavigation] = useState(null);
  const [currentRoute, setCurrentRoute] = useState('Home');
  const navigation = useNavigation();
  const { isWalking } = useWalking();
  const { colors } = useTheme();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  // Only hide blob when walking AND on Walk screen
  const shouldHideBlob = isWalking && currentRoute === 'Walk';

  const handleLittiesPress = useCallback(() => {
    tabNavigation?.navigate('DigitalVault');
  }, [tabNavigation]);

  const handleReferPress = useCallback(() => {
    tabNavigation?.navigate('Refer');
  }, [tabNavigation]);

  const handleProfilePress = useCallback(() => {
    tabNavigation?.navigate('Profile');
  }, [tabNavigation]);

  const handleLogout = useCallback(async () => {
    await logout();
    // Navigation will automatically switch to Auth due to isAuthenticated change
  }, [logout]);

  return (
    <GradientBackground showBlob={!shouldHideBlob}>
      <View style={styles.mainContainer}>
        <TopNavbar onLittiesPress={handleLittiesPress} onReferPress={handleReferPress} onProfilePress={handleProfilePress} onLogout={handleLogout} />
        <View style={styles.contentContainer}>
          <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} colors={colors} bottomInset={insets.bottom} />}
            screenOptions={{
              headerShown: false,
              lazy: true,
              unmountOnBlur: Platform.OS === 'web',
              freezeOnBlur: Platform.OS !== 'web',
            }}
            screenListeners={({ navigation, route }) => ({
              state: (e) => {
                // Track current route when tab changes
                const routeName = e.data.state?.routes[e.data.state.index]?.name;
                if (routeName) {
                  setCurrentRoute(routeName);
                }
              },
              focus: () => {
                if (!tabNavigation) {
                  setTabNavigation(navigation);
                }
              },
            })}
            detachInactiveScreens={Platform.OS === 'web'}
            sceneContainerStyle={{
              backgroundColor: 'transparent',
            }}
          >
            <Tab.Screen
              name="Home"
              component={HomeScreen}
              options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
              name="Refer"
              component={ReferScreen}
              options={{ tabBarLabel: 'Refer' }}
            />
            <Tab.Screen
              name="Walk"
              component={WalkScreen}
              options={{ tabBarLabel: 'Walk' }}
            />
            <Tab.Screen
              name="DigitalVault"
              component={DigitalVaultScreen}
              options={{ tabBarLabel: 'Vault' }}
            />
            <Tab.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ tabBarLabel: 'Profile' }}
            />
          </Tab.Navigator>
        </View>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 90,
    backgroundColor: 'transparent',
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  walkButtonContainer: {
    alignItems: 'center',
    marginTop: -35,
    flex: 1,
  },
  walkButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#CC9900',
  },
  walkButtonFocused: {
    borderColor: '#CC9900',
  },
  walkGif: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default BottomTabNavigator;
