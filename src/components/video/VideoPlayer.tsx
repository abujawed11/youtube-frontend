import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { PlayerState } from '../../types';

interface VideoPlayerProps {
  uri: string;
  title?: string;
  onFullscreenUpdate?: (status: boolean) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  uri, 
  title,
  onFullscreenUpdate 
}) => {
  const videoRef = useRef<Video>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    isMuted: false,
    isFullscreen: false,
  });
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls && playerState.isPlaying) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls, playerState.isPlaying]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setPlayerState(prev => ({
        ...prev,
        isPlaying: status.isPlaying || false,
        currentTime: status.positionMillis || 0,
        duration: status.durationMillis || 0,
        volume: status.volume || 1.0,
        isMuted: status.isMuted || false,
      }));
      setError(null);
    } else if (status.error) {
      setIsLoading(false);
      setError('Failed to load video. Please try again.');
    }
  };

  const togglePlayPause = async () => {
    try {
      if (playerState.isPlaying) {
        await videoRef.current?.pauseAsync();
      } else {
        await videoRef.current?.playAsync();
      }
    } catch (error) {
      setError('Playback control failed');
    }
  };

  const toggleMute = async () => {
    try {
      await videoRef.current?.setIsMutedAsync(!playerState.isMuted);
    } catch (error) {
      setError('Volume control failed');
    }
  };

  const seekTo = async (position: number) => {
    try {
      await videoRef.current?.setPositionAsync(position);
    } catch (error) {
      setError('Seek failed');
    }
  };

  const toggleFullscreen = async () => {
    try {
      const newFullscreenState = !playerState.isFullscreen;
      await videoRef.current?.presentFullscreenPlayer();
      setPlayerState(prev => ({ ...prev, isFullscreen: newFullscreenState }));
      onFullscreenUpdate?.(newFullscreenState);
    } catch (error) {
      setError('Fullscreen toggle failed');
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = playerState.duration > 0 
    ? (playerState.currentTime / playerState.duration) * 100 
    : 0;

  if (error) {
    return (
      <View className="bg-black justify-center items-center" style={{ height: 200 }}>
        <Ionicons name="alert-circle" size={48} color="#fff" />
        <Text className="text-white text-center mt-2 px-4">{error}</Text>
        <TouchableOpacity 
          onPress={() => setError(null)}
          className="mt-3 bg-red-600 px-4 py-2 rounded"
        >
          <Text className="text-white">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="bg-black relative">
      <TouchableOpacity 
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
        className="relative"
      >
        <Video
          ref={videoRef}
          source={{ uri }}
          style={{ 
            width: screenWidth, 
            height: screenWidth * (9/16) // 16:9 aspect ratio
          }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          useNativeControls={false}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <View className="absolute inset-0 justify-center items-center bg-black bg-opacity-50">
            <Ionicons name="refresh" size={32} color="#fff" />
            <Text className="text-white mt-2">Loading...</Text>
          </View>
        )}

        {/* Controls Overlay */}
        {showControls && !isLoading && (
          <View className="absolute inset-0 justify-center items-center">
            {/* Center Play/Pause Button */}
            <TouchableOpacity onPress={togglePlayPause} className="bg-black bg-opacity-50 rounded-full p-4">
              <Ionicons 
                name={playerState.isPlaying ? "pause" : "play"} 
                size={32} 
                color="#fff" 
              />
            </TouchableOpacity>

            {/* Bottom Controls */}
            <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              {/* Progress Bar */}
              <View className="flex-row items-center mb-3">
                <Text className="text-white text-xs w-12 text-center">
                  {formatTime(playerState.currentTime)}
                </Text>
                <View className="flex-1 mx-2">
                  <View className="bg-gray-600 h-1 rounded-full">
                    <View 
                      className="bg-red-600 h-1 rounded-full" 
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </View>
                  <TouchableOpacity
                    className="absolute -top-2 -bottom-2 left-0 right-0"
                    onPress={(event) => {
                      const { locationX } = event.nativeEvent;
                      const { width } = event.currentTarget.props.style || { width: screenWidth - 80 };
                      const seekPosition = (locationX / width) * playerState.duration;
                      seekTo(seekPosition);
                    }}
                  />
                </View>
                <Text className="text-white text-xs w-12 text-center">
                  {formatTime(playerState.duration)}
                </Text>
              </View>

              {/* Control Buttons */}
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <TouchableOpacity onPress={togglePlayPause} className="mr-4">
                    <Ionicons 
                      name={playerState.isPlaying ? "pause" : "play"} 
                      size={24} 
                      color="#fff" 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={toggleMute}>
                    <Ionicons 
                      name={playerState.isMuted ? "volume-mute" : "volume-high"} 
                      size={24} 
                      color="#fff" 
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={toggleFullscreen}>
                  <Ionicons name="expand" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Video Title */}
      {title && (
        <View className="p-3 bg-white">
          <Text className="text-lg font-semibold text-gray-900">{title}</Text>
        </View>
      )}
    </View>
  );
};

export default VideoPlayer;