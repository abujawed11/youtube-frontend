import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  FlatList, 
  Image,
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { WatchHistoryItem } from '../../src/types';
import LoadingSpinner from '../../src/components/common/LoadingSpinner';

export default function LibraryScreen() {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    signIn, 
    signOut, 
    watchHistory, 
    clearHistory 
  } = useAuth();

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      Alert.alert('Sign In Failed', 'Please try again');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: signOut 
        }
      ]
    );
  };

  const handleClearHistory = async () => {
    Alert.alert(
      'Clear Watch History',
      'Are you sure you want to clear your watch history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: clearHistory 
        }
      ]
    );
  };

  const handleVideoPress = (videoId: string) => {
    router.push(`/player/${videoId}`);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderHistoryItem = ({ item }: { item: WatchHistoryItem }) => (
    <TouchableOpacity
      onPress={() => handleVideoPress(item.videoId)}
      className="flex-row mb-3 bg-white rounded-lg overflow-hidden shadow-sm p-3"
    >
      <Image 
        source={{ uri: item.thumbnail }} 
        className="w-32 h-20 rounded-lg"
        resizeMode="cover"
      />
      <View className="flex-1 ml-3">
        <Text className="text-base font-semibold text-gray-900 mb-1" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="text-sm text-gray-600 mb-1">
          {item.channelTitle}
        </Text>
        <View className="flex-row justify-between items-center">
          <Text className="text-xs text-gray-500">
            {item.duration}
          </Text>
          <Text className="text-xs text-gray-500">
            {formatTimeAgo(item.watchedAt)}
          </Text>
        </View>
        {item.watchedDuration && item.watchedDuration > 0 && (
          <View className="mt-1 bg-gray-200 h-1 rounded-full">
            <View 
              className="bg-red-600 h-1 rounded-full" 
              style={{ width: '60%' }} // You can calculate actual percentage
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="px-4 py-2 bg-white border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">Library</Text>
        </View>
        
        <View className="flex-1 justify-center items-center px-8">
          <Ionicons name="person-circle-outline" size={80} color="#ccc" />
          <Text className="text-lg text-gray-900 font-semibold text-center mt-4">
            Sign in to access your library
          </Text>
          <Text className="text-sm text-gray-600 text-center mt-2 mb-6">
            Keep track of your watch history, create playlists, and sync across devices
          </Text>
          <TouchableOpacity
            onPress={handleSignIn}
            className="bg-red-600 px-8 py-3 rounded-full"
          >
            <View className="flex-row items-center">
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text className="text-white font-semibold ml-2">Sign in with Google</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header with User Info */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Library</Text>
            <Text className="text-sm text-gray-600">Welcome back, {user?.name}</Text>
          </View>
          <View className="flex-row items-center space-x-3">
            {user?.picture && (
              <Image 
                source={{ uri: user.picture }}
                className="w-10 h-10 rounded-full"
              />
            )}
            <TouchableOpacity onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Watch History Section */}
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <Text className="text-lg font-semibold text-gray-900">Watch History</Text>
          {watchHistory.length > 0 && (
            <TouchableOpacity onPress={handleClearHistory}>
              <Text className="text-red-600 text-sm font-medium">Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {watchHistory.length === 0 ? (
          <View className="flex-1 justify-center items-center px-8">
            <Ionicons name="time-outline" size={64} color="#ccc" />
            <Text className="text-lg text-gray-500 text-center mt-4">
              No watch history yet
            </Text>
            <Text className="text-sm text-gray-400 text-center mt-2">
              Videos you watch will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={watchHistory}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Coming Soon Sections */}
      <View className="bg-white border-t border-gray-200 p-4">
        <Text className="text-sm text-gray-500 text-center">
          🎵 Playlists, liked videos, and more features coming soon in Phase 4!
        </Text>
      </View>
    </SafeAreaView>
  );
}