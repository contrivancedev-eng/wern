import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();
const API_URL = 'https://www.videosdownloaders.com/firsttrackapi/api/';

// Fetch litties balance from API
const fetchLittiesBalance = async (authToken) => {
  try {
    const response = await fetch(`${API_URL}get-littes-transection?token=${authToken}`);
    const data = await response.json();
    if (data.status === true && data.data?.totals) {
      return data.data.totals.total_earn || 0;
    }
    return 0;
  } catch (error) {
    console.log('Error fetching litties balance:', error.message);
    return 0;
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasLoggedInBefore, setHasLoggedInBefore] = useState(false);
  const [litties, setLitties] = useState(0);
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);
  const [walletAnimationTrigger, setWalletAnimationTrigger] = useState(0);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      const loggedInBefore = await AsyncStorage.getItem('hasLoggedInBefore');

      if (loggedInBefore === 'true') {
        setHasLoggedInBefore(true);
      }

      if (storedToken && userData) {
        setToken(storedToken);
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);

        // Fetch litties balance
        const littiesBalance = await fetchLittiesBalance(storedToken);
        setLitties(littiesBalance);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserDetails = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}get-user-details?token=${authToken}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (data.status_code === 200 && data.status === true) {
        return { success: true, data: data.data };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.log('Fetch user details error:', error.message);
      return { success: false, error: error.message };
    }
  };

  const login = async (authToken) => {
    try {
      // Store token and mark as logged in before
      await AsyncStorage.setItem('token', authToken);
      await AsyncStorage.setItem('hasLoggedInBefore', 'true');
      setToken(authToken);
      setHasLoggedInBefore(true);

      // Fetch user details
      const userResult = await fetchUserDetails(authToken);

      if (userResult.success) {
        const userData = userResult.data;
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);

        // Fetch litties balance
        const littiesBalance = await fetchLittiesBalance(authToken);
        setLitties(littiesBalance);

        return { success: true, user: userData };
      } else {
        // Still mark as authenticated even if user details fail
        setIsAuthenticated(true);
        return { success: true, user: null };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signup = async (authToken) => {
    try {
      // Store token and mark as logged in before
      await AsyncStorage.setItem('token', authToken);
      await AsyncStorage.setItem('hasLoggedInBefore', 'true');
      setToken(authToken);
      setHasLoggedInBefore(true);

      // Fetch user details
      const userResult = await fetchUserDetails(authToken);

      if (userResult.success) {
        const userData = userResult.data;
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);

        // Fetch litties balance
        const littiesBalance = await fetchLittiesBalance(authToken);
        setLitties(littiesBalance);

        return { success: true, user: userData };
      } else {
        setIsAuthenticated(true);
        return { success: true, user: null };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      setLitties(0);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const refreshUserDetails = async () => {
    if (token) {
      const result = await fetchUserDetails(token);
      if (result.success) {
        setUser(result.data);
        await AsyncStorage.setItem('user', JSON.stringify(result.data));

        // Also refresh litties balance
        const littiesBalance = await fetchLittiesBalance(token);
        setLitties(littiesBalance);

        return { success: true, user: result.data };
      }
    }
    return { success: false };
  };

  const refreshLitties = async () => {
    if (token) {
      const littiesBalance = await fetchLittiesBalance(token);
      setLitties(littiesBalance);
      return littiesBalance;
    }
    return 0;
  };

  const updateLitties = (amount) => {
    setLitties(prev => prev + amount);
  };

  // Trigger data refresh across all screens (e.g., after saving goals)
  const triggerDataRefresh = () => {
    setDataRefreshTrigger(prev => prev + 1);
  };

  // Trigger wallet bounce animation (e.g., when coins land from daily claim)
  const triggerWalletAnimation = () => {
    setWalletAnimationTrigger(prev => prev + 1);
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    hasLoggedInBefore,
    litties,
    dataRefreshTrigger,
    walletAnimationTrigger,
    login,
    signup,
    logout,
    updateLitties,
    refreshUserDetails,
    refreshLitties,
    fetchUserDetails,
    triggerDataRefresh,
    triggerWalletAnimation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
