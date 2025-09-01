import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthContextType, VideoItem, WatchHistoryItem } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// For now, we'll use a simplified auth approach
// In production, you would set up proper Google OAuth

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);

  // Load user data and history on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      // Load user from secure storage
      const storedUser = await SecureStore.getItemAsync('user');
      const storedToken = await SecureStore.getItemAsync('accessToken');
      
      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
        await loadWatchHistory(userData.id);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Simplified demo sign-in (replace with proper Google OAuth in production)
  const simulateGoogleSignIn = async () => {
    try {
      // For demo purposes, create a mock user
      const userData: User = {
        id: 'demo_user_123',
        email: 'demo@example.com',
        name: 'Demo User',
        picture: 'https://via.placeholder.com/150',
        googleId: 'demo_user_123',
      };

      // Store user data
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      await SecureStore.setItemAsync('accessToken', 'demo_token');
      
      setUser(userData);
      setIsAuthenticated(true);
      
      // Load watch history
      await loadWatchHistory(userData.id);
    } catch (error) {
      console.error('Error with demo sign in:', error);
      throw error;
    }
  };

  const loadWatchHistory = async (userId: string) => {
    try {
      const historyKey = `watchHistory_${userId}`;
      const storedHistory = await AsyncStorage.getItem(historyKey);
      
      if (storedHistory) {
        const history: WatchHistoryItem[] = JSON.parse(storedHistory);
        setWatchHistory(history.sort((a, b) => 
          new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime()
        ));
      }
    } catch (error) {
      console.error('Error loading watch history:', error);
    }
  };

  const saveWatchHistory = async (history: WatchHistoryItem[]) => {
    if (!user) return;
    
    try {
      const historyKey = `watchHistory_${user.id}`;
      await AsyncStorage.setItem(historyKey, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving watch history:', error);
    }
  };

  const signIn = async (): Promise<void> => {
    try {
      // For demo purposes, use the simplified sign-in
      // In production, replace this with proper Google OAuth
      await simulateGoogleSignIn();
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // Clear stored data
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('accessToken');
      
      setUser(null);
      setIsAuthenticated(false);
      setWatchHistory([]);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const addToHistory = async (video: VideoItem, watchedDuration?: number): Promise<void> => {
    if (!user) return;

    const historyItem: WatchHistoryItem = {
      id: `${video.id}_${Date.now()}`,
      videoId: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      channelTitle: video.channelTitle,
      duration: video.duration,
      watchedAt: new Date().toISOString(),
      watchedDuration,
    };

    // Remove any existing entry for this video
    const filteredHistory = watchHistory.filter(item => item.videoId !== video.id);
    
    // Add new entry at the beginning
    const newHistory = [historyItem, ...filteredHistory].slice(0, 100); // Keep last 100 items
    
    setWatchHistory(newHistory);
    await saveWatchHistory(newHistory);
  };

  const clearHistory = async (): Promise<void> => {
    if (!user) return;
    
    setWatchHistory([]);
    await saveWatchHistory([]);
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    watchHistory,
    addToHistory,
    clearHistory,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;