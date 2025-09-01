import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppContext } from '../../src/contexts/AppContext';
import { useYouTube } from '../../src/hooks/useYouTube';
import { VideoItem } from '../../src/types';
import LoadingSpinner from '../../src/components/common/LoadingSpinner';
import ErrorMessage from '../../src/components/common/ErrorMessage';

export default function SearchScreen() {
  const { 
    searchQuery, 
    setSearchQuery, 
    searchResults, 
    setSearchResults, 
    isLoading, 
    error,
    setError 
  } = useAppContext();
  
  const { searchVideos, getSearchSuggestions, suggestions } = useYouTube();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery.length > 2) {
      getSearchSuggestions(searchQuery);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, getSearchSuggestions]);

  const handleSearch = async (query: string = searchQuery, loadMore: boolean = false) => {
    if (!query.trim()) return;

    setShowSuggestions(false);
    setError(null);
    
    const token = loadMore ? nextPageToken : null;
    const results = await searchVideos(query.trim(), 20, token || undefined);
    
    if (results) {
      if (loadMore) {
        setSearchResults([...searchResults, ...results.items]);
      } else {
        setSearchResults(results.items);
      }
      setNextPageToken(results.nextPageToken || null);
    }
  };

  const handleVideoPress = (videoId: string) => {
    router.push(`/player/${videoId}`);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    handleSearch(suggestion);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSuggestions(false);
    setError(null);
  };

  const renderVideoItem = ({ item }: { item: VideoItem }) => (
    <TouchableOpacity
      onPress={() => handleVideoPress(item.id)}
      className="flex-row mb-3 bg-white rounded-lg overflow-hidden shadow-sm"
    >
      <Image 
        source={{ uri: item.thumbnail }} 
        className="w-32 h-20"
        resizeMode="cover"
      />
      <View className="flex-1 p-3">
        <Text className="text-base font-semibold text-gray-900 mb-1" numberOfLines={2}>
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

  const renderSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity
      onPress={() => handleSuggestionPress(item)}
      className="px-4 py-3 border-b border-gray-100"
    >
      <View className="flex-row items-center">
        <Ionicons name="search" size={16} color="#666" />
        <Text className="ml-3 text-gray-700">{item}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Search Header */}
        <View className="bg-white px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2">
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              className="flex-1 ml-3 text-base"
              placeholder="Search videos..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {showSuggestions && suggestions.length > 0 ? (
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item, index) => `suggestion-${index}`}
            className="bg-white"
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <>
            {error && <ErrorMessage message={error} onRetry={() => handleSearch()} />}
            
            {isLoading && searchResults.length === 0 ? (
              <LoadingSpinner />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderVideoItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}
                onEndReached={() => {
                  if (nextPageToken && !isLoading) {
                    handleSearch(searchQuery, true);
                  }
                }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => 
                  isLoading && searchResults.length > 0 ? (
                    <View className="py-4">
                      <LoadingSpinner size="small" />
                    </View>
                  ) : null
                }
              />
            ) : (
              <View className="flex-1 justify-center items-center px-8">
                <Ionicons name="search" size={64} color="#ccc" />
                <Text className="text-lg text-gray-500 text-center mt-4">
                  Search for YouTube videos
                </Text>
                <Text className="text-sm text-gray-400 text-center mt-2">
                  Enter a search term to find videos
                </Text>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}