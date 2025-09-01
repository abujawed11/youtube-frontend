import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Modal, ScrollView, Platform } from 'react-native';
import Video, { VideoRef, OnProgressData, OnLoadData, OnBufferData } from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { PlayerState } from '../../types';

interface NativeVideoPlayerProps {
  uri: string;
  title?: string;
  onFullscreenUpdate?: (status: boolean) => void;
  onProgress?: (currentTime: number, totalTime: number) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

const NativeVideoPlayer: React.FC<NativeVideoPlayerProps> = ({ 
  uri, 
  title,
  onFullscreenUpdate,
  onProgress: onProgressCallback 
}) => {
  const videoRef = useRef<VideoRef>(null);
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
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch'>('contain');

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls && playerState.isPlaying) {
      timeout = setTimeout(() => setShowControls(false), 4000);
    }
    return () => clearTimeout(timeout);
  }, [showControls, playerState.isPlaying]);

  useEffect(() => {
    if (onProgressCallback && playerState.duration > 0) {
      onProgressCallback(playerState.currentTime, playerState.duration);
    }
  }, [playerState.currentTime, playerState.duration, onProgressCallback]);

  const onLoad = (data: OnLoadData) => {
    setIsLoading(false);
    setError(null);
    setPlayerState(prev => ({
      ...prev,
      duration: data.duration * 1000, // Convert to milliseconds
    }));
  };

  const onProgress = (data: OnProgressData) => {
    setPlayerState(prev => ({
      ...prev,
      currentTime: data.currentTime * 1000, // Convert to milliseconds
    }));
  };

  const onBuffer = (data: OnBufferData) => {
    setIsBuffering(data.isBuffering);
  };

  const onError = (error: any) => {
    console.error('Video error:', error);
    setIsLoading(false);
    setIsBuffering(false);
    setError('Failed to load video. Please try again.');
  };

  const togglePlayPause = () => {
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const toggleMute = () => {
    setPlayerState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const setVolume = (volume: number) => {
    setPlayerState(prev => ({ ...prev, volume }));
  };

  const seekTo = (position: number) => {
    const seekTime = position / 1000; // Convert to seconds
    videoRef.current?.seek(seekTime);
  };

  const skipForward = () => {
    const newPosition = Math.min(playerState.currentTime + 10000, playerState.duration);
    seekTo(newPosition);
  };

  const skipBackward = () => {
    const newPosition = Math.max(playerState.currentTime - 10000, 0);
    seekTo(newPosition);
  };

  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    const newFullscreenState = !playerState.isFullscreen;
    setPlayerState(prev => ({ ...prev, isFullscreen: newFullscreenState }));
    onFullscreenUpdate?.(newFullscreenState);
    
    if (newFullscreenState) {
      videoRef.current?.presentFullscreenPlayer();
    } else {
      videoRef.current?.dismissFullscreenPlayer();
    }
  };

  const cycleResizeMode = () => {
    const modes: Array<'contain' | 'cover' | 'stretch'> = ['contain', 'cover', 'stretch'];
    const currentIndex = modes.indexOf(resizeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setResizeMode(modes[nextIndex]);
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
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
          onPress={() => {
            setError(null);
            setIsLoading(true);
          }}
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
            height: screenWidth * (9/16)
          }}
          resizeMode={resizeMode}
          paused={!playerState.isPlaying}
          volume={playerState.isMuted ? 0 : playerState.volume}
          rate={playbackSpeed}
          onLoad={onLoad}
          onProgress={onProgress}
          onBuffer={onBuffer}
          onError={onError}
          controls={false}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          mixWithOthers="mix"
          // Enhanced buffering settings
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000,
          }}
          // Prevent screen shaking
          poster={undefined}
          posterResizeMode="contain"
        />

        {/* Loading Overlay */}
        {(isLoading || isBuffering) && (
          <View className="absolute inset-0 justify-center items-center bg-black bg-opacity-70">
            <View className="bg-black bg-opacity-80 rounded-lg p-6 items-center">
              <Ionicons 
                name={isLoading ? "download-outline" : "sync-outline"} 
                size={36} 
                color="#fff" 
              />
              <Text className="text-white mt-3 text-base font-medium">
                {isLoading ? 'Loading video...' : 'Buffering...'}
              </Text>
              {isBuffering && (
                <Text className="text-gray-300 mt-1 text-sm">
                  Optimizing quality...
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Controls Overlay */}
        {showControls && !isLoading && (
          <View className="absolute inset-0">
            {/* Top Controls */}
            <View className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-white text-lg font-semibold flex-1" numberOfLines={1}>
                  {title || 'Video'}
                </Text>
                <TouchableOpacity
                  onPress={cycleResizeMode}
                  style={{ padding: 8, minWidth: 40, alignItems: 'center' }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="expand-outline" size={24} color="#fff" />
                  <Text className="text-white text-xs mt-1">
                    {resizeMode === 'contain' ? 'Fit' : resizeMode === 'cover' ? 'Fill' : 'Stretch'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Center Controls */}
            <View className="flex-1 justify-center items-center">
              <View className="flex-row items-center justify-center" style={{ gap: 40 }}>
                <TouchableOpacity 
                  onPress={skipBackward}
                  className="bg-black bg-opacity-60 rounded-full"
                  style={{ padding: 16, minWidth: 56, minHeight: 56 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="play-skip-back" size={28} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={togglePlayPause} 
                  className="bg-red-600 rounded-full shadow-lg"
                  style={{ padding: 20, minWidth: 72, minHeight: 72 }}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={playerState.isPlaying ? "pause" : "play"} 
                    size={40} 
                    color="#fff" 
                    style={{ marginLeft: playerState.isPlaying ? 0 : 3 }}
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={skipForward}
                  className="bg-black bg-opacity-60 rounded-full"
                  style={{ padding: 16, minWidth: 56, minHeight: 56 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="play-skip-forward" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Controls */}
            <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              {/* Progress Bar */}
              <View className="flex-row items-center mb-4" style={{ paddingHorizontal: 4 }}>
                <Text className="text-white text-sm font-medium" style={{ minWidth: 50, textAlign: 'center' }}>
                  {formatTime(playerState.currentTime)}
                </Text>
                <View className="flex-1 mx-3">
                  <Slider
                    style={{ height: 50 }}
                    minimumValue={0}
                    maximumValue={playerState.duration}
                    value={playerState.currentTime}
                    onValueChange={seekTo}
                    minimumTrackTintColor="#DC2626"
                    maximumTrackTintColor="#555"
                    thumbStyle={{ 
                      backgroundColor: '#DC2626', 
                      width: 18, 
                      height: 18,
                      borderRadius: 9
                    }}
                    trackStyle={{ height: 4, borderRadius: 2 }}
                  />
                </View>
                <Text className="text-white text-sm font-medium" style={{ minWidth: 50, textAlign: 'center' }}>
                  {formatTime(playerState.duration)}
                </Text>
              </View>

              {/* Control Buttons */}
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center" style={{ gap: 20 }}>
                  <TouchableOpacity 
                    onPress={togglePlayPause}
                    style={{ padding: 8, minWidth: 40, alignItems: 'center' }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={playerState.isPlaying ? "pause" : "play"} 
                      size={26} 
                      color="#fff" 
                    />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setShowVolumeSlider(!showVolumeSlider)}
                    style={{ padding: 8, minWidth: 40, alignItems: 'center' }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={playerState.isMuted ? "volume-mute" : "volume-high"} 
                      size={26} 
                      color="#fff" 
                    />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setShowSpeedMenu(true)}
                    style={{ padding: 8, minWidth: 40, alignItems: 'center' }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-white text-base font-semibold">
                      {playbackSpeed}x
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  onPress={toggleFullscreen}
                  style={{ padding: 8, minWidth: 40, alignItems: 'center' }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="expand" size={26} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Volume Slider */}
              {showVolumeSlider && (
                <View className="mt-4 bg-black bg-opacity-90 rounded-xl p-5">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-white text-base font-medium">Volume</Text>
                    <TouchableOpacity 
                      onPress={() => setShowVolumeSlider(false)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    <Ionicons name="volume-low" size={20} color="#ccc" />
                    <Slider
                      style={{ flex: 1, height: 40 }}
                      minimumValue={0}
                      maximumValue={1}
                      value={playerState.volume}
                      onValueChange={setVolume}
                      minimumTrackTintColor="#DC2626"
                      maximumTrackTintColor="#555"
                      thumbStyle={{ backgroundColor: '#DC2626', width: 20, height: 20 }}
                    />
                    <Ionicons name="volume-high" size={20} color="#ccc" />
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Playback Speed Menu */}
      <Modal
        visible={showSpeedMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSpeedMenu(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black bg-opacity-70 justify-center items-center"
          onPress={() => setShowSpeedMenu(false)}
          activeOpacity={1}
        >
          <View className="bg-white rounded-xl shadow-lg" style={{ minWidth: 200, maxWidth: 280 }}>
            <View className="p-5 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900 text-center">
                Playback Speed
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {PLAYBACK_SPEEDS.map((speed) => (
                <TouchableOpacity
                  key={speed}
                  onPress={() => changePlaybackSpeed(speed)}
                  className={`py-4 px-6 border-b border-gray-100 ${
                    speed === playbackSpeed ? 'bg-red-50' : 'bg-transparent'
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-lg ${
                      speed === playbackSpeed ? 'text-red-600 font-bold' : 'text-gray-700 font-medium'
                    }`}>
                      {speed}x
                    </Text>
                    {speed === playbackSpeed && (
                      <Ionicons name="checkmark-circle" size={24} color="#DC2626" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              className="p-4 border-t border-gray-200"
              onPress={() => setShowSpeedMenu(false)}
              activeOpacity={0.7}
            >
              <Text className="text-center text-gray-500 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Video Title */}
      {title && (
        <View className="p-3 bg-white">
          <Text className="text-lg font-semibold text-gray-900">{title}</Text>
        </View>
      )}
    </View>
  );
};

export default NativeVideoPlayer;