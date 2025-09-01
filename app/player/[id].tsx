import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/contexts/AppContext';
import { useYouTube } from '../../src/hooks/useYouTube';
import ExpoVideoPlayer from '../../src/components/video/ExpoVideoPlayer';
import { useAuth } from '../../src/contexts/AuthContext';
import LoadingSpinner from '../../src/components/common/LoadingSpinner';
import ErrorMessage from '../../src/components/common/ErrorMessage';

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentVideo, setCurrentVideo, error, setError } = useAppContext();
  const { getVideoDetails } = useYouTube();
  const { isAuthenticated, addToHistory } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAddedToHistory, setHasAddedToHistory] = useState(false);

  useEffect(() => {
    if (id) {
      loadVideoDetails();
    }
  }, [id]);

  const loadVideoDetails = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    const videoDetails = await getVideoDetails(id);
    if (videoDetails) {
      setCurrentVideo(videoDetails);
    }
    setIsLoading(false);
  };

  const handleBack = () => {
    setCurrentVideo(null);
    router.back();
  };

  const handleRetry = () => {
    loadVideoDetails();
  };

  const handleVideoProgress = async (currentSec: number, totalSec: number) => {
    // Add to history when user has watched at least 30 seconds or 10% of the video
    // const watchedSeconds = Math.floor(currentTime / 1000);
    // const totalSeconds = Math.floor(totalTime / 1000);
    const watchedSeconds = Math.floor(currentSec);
    const totalSeconds = Math.floor(totalSec);
    const watchedPercentage = totalSeconds > 0 ? (watchedSeconds / totalSeconds) * 100 : 0;
    // const watchedPercentage = totalSeconds > 0 ? (watchedSeconds / totalSeconds) * 100 : 0;

    if (!hasAddedToHistory && isAuthenticated && currentVideo &&
      (watchedSeconds >= 30 || watchedPercentage >= 10)) {
      try {
        await addToHistory({
          id: currentVideo.id,
          title: currentVideo.title,
          thumbnail: currentVideo.thumbnail,
          channelTitle: currentVideo.channelTitle || 'Unknown Channel',
          duration: currentVideo.duration || 'Unknown',
          description: currentVideo.description || '',
          viewCount: '0',
          publishedAt: new Date().toISOString()
        }, watchedSeconds);
        setHasAddedToHistory(true);
      } catch (error) {
        console.error('Failed to add to history:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar barStyle="light-content" />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (error || !currentVideo) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar barStyle="light-content" />
        <View className="flex-row items-center p-4 bg-black">
          <TouchableOpacity onPress={handleBack} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Video Player</Text>
        </View>
        <ErrorMessage
          message={error || 'Video not found'}
          onRetry={error ? handleRetry : undefined}
          showRetry={!!error}
        />
      </SafeAreaView>
    );
  }

  const videoUri = currentVideo.formats[selectedFormat]?.url;
  const hasValidFormats = currentVideo.formats && currentVideo.formats.length > 0;

  if (!hasValidFormats) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar barStyle="light-content" />
        <View className="flex-row items-center p-4 bg-black">
          <TouchableOpacity onPress={handleBack} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Video Player</Text>
        </View>
        <View className="flex-1 bg-white">
          {/* Video Info */}
          <View className="p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              {currentVideo.title}
            </Text>
            <Text className="text-sm text-gray-600 mb-2">
              Video temporarily unavailable
            </Text>
          </View>
          <ErrorMessage
            message="Video streams are temporarily unavailable. This may be due to YouTube restrictions or the video being region-locked. Please try a different video or try again later."
            onRetry={handleRetry}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!videoUri) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar barStyle="light-content" />
        <View className="flex-row items-center p-4 bg-black">
          <TouchableOpacity onPress={handleBack} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Video Player</Text>
        </View>
        <ErrorMessage
          message="Selected video quality is not available"
          onRetry={() => setSelectedFormat(0)}
          showRetry={true}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={isFullscreen ? [] : ['top']}>
      <StatusBar barStyle="light-content" hidden={isFullscreen} />

      {!isFullscreen && (
        <View className="flex-row items-center p-4 bg-black">
          <TouchableOpacity onPress={handleBack} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold flex-1" numberOfLines={1}>
            {currentVideo.title}
          </Text>
        </View>
      )}

      <ScrollView className="flex-1" bounces={false}>
        <ExpoVideoPlayer
          sources={currentVideo.formats.map((format, index) => ({
            uri: format.url,
            label: format.quality,
            resolution: format.quality.includes('p') ? format.quality : `${format.quality} Quality`,
          }))}
          title={!isFullscreen ? currentVideo.title : undefined}
          onFullscreenUpdate={setIsFullscreen}
          onProgress={handleVideoProgress}
        />

        {!isFullscreen && (
          <View className="bg-white">
            {/* Video Info */}
            <View className="p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                {currentVideo.title}
              </Text>
              <Text className="text-sm text-gray-600 mb-2">
                {currentVideo.channelTitle}
              </Text>
              <View className="flex-row justify-between text-xs text-gray-500">
                <Text>{currentVideo.viewCount} views</Text>
                <Text>{currentVideo.duration}</Text>
              </View>
            </View>

            {/* Quality Selection */}
            {currentVideo.formats.length > 1 && (
              <View className="p-4 border-b border-gray-200">
                <Text className="text-base font-semibold text-gray-900 mb-3">
                  Quality
                </Text>
                <View className="space-y-2">
                  {currentVideo.formats.map((format, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedFormat(index)}
                      className={`flex-row items-center justify-between p-3 rounded-lg border ${selectedFormat === index
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200'
                        }`}
                    >
                      <Text className={`font-medium ${selectedFormat === index ? 'text-red-600' : 'text-gray-700'
                        }`}>
                        {format.quality}
                      </Text>
                      {selectedFormat === index && (
                        <Ionicons name="checkmark-circle" size={20} color="#DC2626" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Description */}
            {currentVideo.description && (
              <View className="p-4">
                <Text className="text-base font-semibold text-gray-900 mb-2">
                  Description
                </Text>
                <Text className="text-sm text-gray-600 leading-5" numberOfLines={10}>
                  {currentVideo.description}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}