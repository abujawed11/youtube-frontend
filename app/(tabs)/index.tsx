import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppContext } from '../../src/contexts/AppContext';
import { useYouTube } from '../../src/hooks/useYouTube';
import { VideoItem } from '../../src/types';
import LoadingSpinner from '../../src/components/common/LoadingSpinner';
import ErrorMessage from '../../src/components/common/ErrorMessage';

const TRENDING_QUERIES = [
  'react native tutorial',
  'javascript tips',
  'mobile development',
  'expo app development'
];

export default function HomeScreen() {
  const { searchResults, setSearchResults, isLoading, error } = useAppContext();
  const { searchVideos } = useYouTube();

  useEffect(() => {
    loadTrendingVideos();
  }, []);

  const loadTrendingVideos = async () => {
    const randomQuery = TRENDING_QUERIES[Math.floor(Math.random() * TRENDING_QUERIES.length)];
    const results = await searchVideos(randomQuery, 10);
    if (results) {
      setSearchResults(results.items);
    }
  };

  const handleVideoPress = (videoId: string) => {
    router.push(`/player/${videoId}`);
  };

  const renderVideoItem = ({ item }: { item: VideoItem }) => (
    <TouchableOpacity
      onPress={() => handleVideoPress(item.id)}
      className="mb-4 bg-white rounded-lg overflow-hidden shadow-sm"
    >
      <Image 
        source={{ uri: item.thumbnail }} 
        className="w-full h-48"
        resizeMode="cover"
      />
      <View className="p-3">
        <Text className="text-lg font-semibold text-gray-900 mb-1" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="text-sm text-gray-600 mb-1">
          {item.channelTitle}
        </Text>
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500">
            {item.viewCount} views
          </Text>
          <Text className="text-xs text-gray-500">
            {item.duration}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && searchResults.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-2 bg-white border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">YouTube Player</Text>
        <Text className="text-sm text-gray-600">Trending videos</Text>
      </View>
      
      {error && <ErrorMessage message={error} />}
      
      <FlatList
        data={searchResults}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}