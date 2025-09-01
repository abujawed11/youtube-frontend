import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import Video, { VideoRef, OnProgressData, OnLoadData, OnBufferData } from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import LinearGradient from 'react-native-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import KeepAwake from 'react-native-keep-awake';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface VideoSource {
  uri: string;
  label: string;
  resolution: string;
}

interface ProVideoPlayerProps {
  sources: VideoSource[];
  title?: string;
  onFullscreenUpdate?: (status: boolean) => void;
  onProgress?: (currentTime: number, totalTime: number) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

const ProVideoPlayer: React.FC<ProVideoPlayerProps> = ({
  sources,
  title,
  onFullscreenUpdate,
  onProgress: onProgressCallback,
}) => {
  const videoRef = useRef<VideoRef>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animated values
  const controlsOpacity = useSharedValue(1);
  const loadingOpacity = useSharedValue(1);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time state - separate for smooth scrubbing
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTime, setSeekTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Quality and settings
  const [selectedQualityIndex, setSelectedQualityIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // UI state
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [networkType, setNetworkType] = useState('unknown');

  // Screen orientation handling
  useEffect(() => {
    const setupOrientation = async () => {
      if (isFullscreen) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        if (Platform.OS === 'android') {
          StatusBar.setHidden(true, 'fade');
        }
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        if (Platform.OS === 'android') {
          StatusBar.setHidden(false, 'fade');
        }
      }
    };

    setupOrientation();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      if (Platform.OS === 'android') {
        StatusBar.setHidden(false, 'fade');
      }
    };
  }, [isFullscreen]);

  // Network monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        setNetworkType(state.type || 'unknown');
        if (error === 'No internet connection') {
          setError(null);
        }
      } else {
        setNetworkType('offline');
        setError('No internet connection');
      }
    });

    return unsubscribe;
  }, [error]);

  // Keep screen awake during playback
  useEffect(() => {
    if (isPlaying) {
      KeepAwake.activate();
    } else {
      KeepAwake.deactivate();
    }

    return () => KeepAwake.deactivate();
  }, [isPlaying]);

  // Auto-hide controls with smooth animation
  const hideControlsAnimated = useCallback(() => {
    controlsOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(setShowControls)(false);
      }
    });
  }, [controlsOpacity]);

  const showControlsAnimated = useCallback(() => {
    setShowControls(true);
    controlsOpacity.value = withTiming(1, { duration: 200 });
  }, [controlsOpacity]);

  // Auto-hide controls logic
  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (showControls && isPlaying && !isSeeking && !showSpeedMenu && !showQualityMenu && !showVolumeSlider) {
      controlsTimeoutRef.current = setTimeout(() => {
        hideControlsAnimated();
      }, 4000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying, isSeeking, showSpeedMenu, showQualityMenu, showVolumeSlider, hideControlsAnimated]);

  // Video event handlers
  const onLoad = useCallback((data: OnLoadData) => {
    setIsLoading(false);
    setError(null);
    setDuration(data.duration);
    loadingOpacity.value = withTiming(0, { duration: 300 });
  }, [loadingOpacity]);

  // Smooth progress updates without conflicts
  const onProgress = useCallback((data: OnProgressData) => {
    if (!isSeeking) {
      // Throttle progress updates to prevent UI jank
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current);
      }
      
      progressUpdateTimeoutRef.current = setTimeout(() => {
        setCurrentTime(data.currentTime);
        onProgressCallback?.(data.currentTime, duration);
      }, 100);
    }
  }, [isSeeking, duration, onProgressCallback]);

  const onBuffer = useCallback((data: OnBufferData) => {
    setIsBuffering(data.isBuffering);
  }, []);

  const onError = useCallback((error: any) => {
    console.error('Video error:', error);
    setIsLoading(false);
    setIsBuffering(false);
    showControlsAnimated();
    setError('Failed to load video. Please check your connection and try again.');
  }, [showControlsAnimated]);

  // Playback controls
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
    showControlsAnimated();
  }, [showControlsAnimated]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    showControlsAnimated();
  }, [showControlsAnimated]);

  // Smart seeking with debouncing
  const seekTo = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, duration));
    setSeekTime(clampedTime);

    // Clear previous seek timeout
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }

    // Debounced seek - only seek after user stops sliding
    seekTimeoutRef.current = setTimeout(() => {
      videoRef.current?.seek(clampedTime);
      setCurrentTime(clampedTime);
      setIsSeeking(false);
    }, 150);
  }, [duration]);

  const handleSliderStart = useCallback(() => {
    setIsSeeking(true);
    showControlsAnimated();
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  }, [showControlsAnimated]);

  const handleSliderChange = useCallback((value: number) => {
    setSeekTime(value);
  }, []);

  const handleSliderComplete = useCallback((value: number) => {
    seekTo(value);
  }, [seekTo]);

  const skipForward = useCallback(() => {
    const newTime = Math.min(currentTime + 10, duration);
    seekTo(newTime);
    showControlsAnimated();
  }, [currentTime, duration, seekTo, showControlsAnimated]);

  const skipBackward = useCallback(() => {
    const newTime = Math.max(currentTime - 10, 0);
    seekTo(newTime);
    showControlsAnimated();
  }, [currentTime, seekTo, showControlsAnimated]);

  const toggleFullscreen = useCallback(() => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    onFullscreenUpdate?.(newFullscreenState);
    showControlsAnimated();
  }, [isFullscreen, onFullscreenUpdate, showControlsAnimated]);

  const changeQuality = useCallback((index: number) => {
    const currentPosition = isSeeking ? seekTime : currentTime;
    setSelectedQualityIndex(index);
    setShowQualityMenu(false);
    setIsLoading(true);
    loadingOpacity.value = withTiming(1, { duration: 200 });
    
    // Resume from current position after quality change
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.seek(currentPosition);
      }
    }, 500);
  }, [currentTime, seekTime, isSeeking, loadingOpacity]);

  const changePlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    showControlsAnimated();
  }, [showControlsAnimated]);

  // Format time helper
  const formatTime = useCallback((seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Get current video source
  const currentSource = useMemo(() => {
    return sources[selectedQualityIndex] || sources[0];
  }, [sources, selectedQualityIndex]);

  // Animated styles
  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));

  // Error state
  if (error) {
    return (
      <View className="bg-black justify-center items-center" style={{ 
        width: SCREEN_WIDTH, 
        height: isFullscreen ? SCREEN_HEIGHT : SCREEN_WIDTH * (9/16) 
      }}>
        <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
        <Text className="text-white text-center mt-4 px-6 text-base">{error}</Text>
        <Text className="text-gray-400 text-center mt-2 px-6 text-sm">
          Network: {networkType}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setError(null);
            setIsLoading(true);
            loadingOpacity.value = withTiming(1, { duration: 200 });
          }}
          className="mt-4 bg-red-600 px-6 py-3 rounded-lg"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="bg-black relative" style={{ width: '100%' }}>
      {/* Video Container */}
      <View style={{
        width: SCREEN_WIDTH,
        height: isFullscreen ? SCREEN_HEIGHT : SCREEN_WIDTH * (9/16),
        position: 'relative',
      }}>
        {/* Video Component */}
        <Video
          ref={videoRef}
          source={{ uri: currentSource.uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={isFullscreen ? 'contain' : 'contain'}
          paused={!isPlaying}
          volume={isMuted ? 0 : volume}
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
          progressUpdateInterval={250}
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000,
          }}
          maxBitRate={networkType === 'wifi' ? undefined : 2000000}
        />

        {/* Loading Overlay */}
        <Animated.View 
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.8)',
            },
            loadingAnimatedStyle
          ]}
          pointerEvents={isLoading || isBuffering ? 'auto' : 'none'}
        >
          <View className="bg-black bg-opacity-90 rounded-2xl p-8 items-center">
            <Ionicons
              name={isLoading ? "download-outline" : "sync-outline"}
              size={48}
              color="#fff"
            />
            <Text className="text-white mt-4 text-xl font-medium">
              {isLoading ? 'Loading video...' : 'Buffering...'}
            </Text>
            <Text className="text-gray-300 mt-2 text-base">
              {currentSource.label} • {networkType}
            </Text>
          </View>
        </Animated.View>

        {/* Tap Area for Controls */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          activeOpacity={1}
          onPress={() => {
            if (showControls) {
              hideControlsAnimated();
            } else {
              showControlsAnimated();
            }
          }}
        />

        {/* Controls Overlay */}
        {showControls && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              },
              controlsAnimatedStyle
            ]}
            pointerEvents="box-none"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.9)']}
              style={{ flex: 1 }}
              pointerEvents="box-none"
            >
              {/* Top Controls */}
              <View className="absolute top-0 left-0 right-0 p-4 pt-12" style={{ zIndex: 10 }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text className="text-white text-xl font-bold" numberOfLines={1}>
                      {title || 'Video Player'}
                    </Text>
                    <Text className="text-gray-300 text-sm mt-1">
                      {currentSource.label} • {playbackSpeed}x • {networkType}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => setShowQualityMenu(true)}
                    className="p-3 mr-2"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="settings-outline" size={26} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={toggleFullscreen}
                    className="p-3"
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={isFullscreen ? "contract-outline" : "expand-outline"} 
                      size={26} 
                      color="#fff" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Center Controls */}
              <View className="flex-1 justify-center items-center" style={{ zIndex: 10 }}>
                <View className="flex-row items-center" style={{ gap: 80 }}>
                  <TouchableOpacity
                    onPress={skipBackward}
                    className="bg-black bg-opacity-70 rounded-full p-6"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play-skip-back" size={36} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={togglePlayPause}
                    className="bg-red-600 rounded-full p-8 shadow-2xl"
                    activeOpacity={0.8}
                    style={{ elevation: 8 }}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={48}
                      color="#fff"
                      style={{ marginLeft: isPlaying ? 0 : 6 }}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={skipForward}
                    className="bg-black bg-opacity-70 rounded-full p-6"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play-skip-forward" size={36} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom Controls */}
              <View className="absolute bottom-0 left-0 right-0 p-4 pb-8" style={{ zIndex: 10 }}>
                {/* Progress Bar */}
                <View className="flex-row items-center mb-6" style={{ paddingHorizontal: 8 }}>
                  <Text className="text-white text-base font-medium" style={{ minWidth: 60, textAlign: 'center' }}>
                    {formatTime(isSeeking ? seekTime : currentTime)}
                  </Text>
                  
                  <View className="flex-1 mx-4">
                    <Slider
                      style={{ height: 60, width: '100%' }}
                      minimumValue={0}
                      maximumValue={duration}
                      value={isSeeking ? seekTime : currentTime}
                      onValueChange={handleSliderChange}
                      onSlidingStart={handleSliderStart}
                      onSlidingComplete={handleSliderComplete}
                      minimumTrackTintColor="#DC2626"
                      maximumTrackTintColor="rgba(255,255,255,0.3)"
                      thumbStyle={{
                        backgroundColor: '#DC2626',
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                      }}
                      trackStyle={{ 
                        height: 6, 
                        borderRadius: 3,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                      }}
                    />
                  </View>
                  
                  <Text className="text-white text-base font-medium" style={{ minWidth: 60, textAlign: 'center' }}>
                    {formatTime(duration)}
                  </Text>
                </View>

                {/* Control Buttons */}
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center" style={{ gap: 28 }}>
                    <TouchableOpacity
                      onPress={togglePlayPause}
                      className="p-3"
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={32}
                        color="#fff"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setShowVolumeSlider(!showVolumeSlider)}
                      className="p-3"
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isMuted ? "volume-mute" : "volume-high"}
                        size={32}
                        color="#fff"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setShowSpeedMenu(true)}
                      className="p-3 bg-black bg-opacity-50 rounded-lg"
                      activeOpacity={0.7}
                    >
                      <Text className="text-white text-lg font-bold">
                        {playbackSpeed}x
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => setShowQualityMenu(true)}
                    className="p-3 bg-black bg-opacity-50 rounded-lg"
                    activeOpacity={0.7}
                  >
                    <Text className="text-white text-sm font-semibold">
                      {currentSource.label}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Volume Slider */}
                {showVolumeSlider && (
                  <View className="mt-6 bg-black bg-opacity-90 rounded-2xl p-6">
                    <View className="flex-row items-center justify-between mb-4">
                      <Text className="text-white text-lg font-semibold">Volume</Text>
                      <TouchableOpacity
                        onPress={() => setShowVolumeSlider(false)}
                        className="p-2"
                      >
                        <Ionicons name="close" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <View className="flex-row items-center" style={{ gap: 16 }}>
                      <TouchableOpacity onPress={toggleMute}>
                        <Ionicons
                          name={isMuted ? "volume-mute" : "volume-low"}
                          size={24}
                          color="#ccc"
                        />
                      </TouchableOpacity>
                      <Slider
                        style={{ flex: 1, height: 50 }}
                        minimumValue={0}
                        maximumValue={1}
                        value={volume}
                        onValueChange={setVolume}
                        minimumTrackTintColor="#DC2626"
                        maximumTrackTintColor="#555"
                        thumbStyle={{ backgroundColor: '#DC2626', width: 22, height: 22 }}
                        trackStyle={{ height: 5, borderRadius: 3 }}
                      />
                      <Ionicons name="volume-high" size={24} color="#ccc" />
                    </View>
                  </View>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        )}
      </View>

      {/* Quality Selection Modal */}
      <Modal
        visible={showQualityMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQualityMenu(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black bg-opacity-90 justify-center items-center"
          onPress={() => setShowQualityMenu(false)}
          activeOpacity={1}
        >
          <View className="bg-white rounded-3xl mx-6 shadow-2xl" style={{ minWidth: 300, maxWidth: 400 }}>
            <View className="p-6 border-b border-gray-200">
              <Text className="text-2xl font-bold text-gray-900 text-center">
                Video Quality
              </Text>
            </View>
            
            <ScrollView style={{ maxHeight: 450 }}>
              {sources.map((source, index) => (
                <TouchableOpacity
                  key={`${source.label}-${index}`}
                  onPress={() => changeQuality(index)}
                  className={`py-5 px-6 border-b border-gray-100 ${
                    index === selectedQualityIndex ? 'bg-red-50' : 'bg-white'
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className={`text-xl ${
                        index === selectedQualityIndex ? 'text-red-600 font-bold' : 'text-gray-800 font-semibold'
                      }`}>
                        {source.label}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        {source.resolution}
                      </Text>
                    </View>
                    {index === selectedQualityIndex && (
                      <Ionicons name="checkmark-circle" size={28} color="#DC2626" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              className="p-5 border-t border-gray-200"
              onPress={() => setShowQualityMenu(false)}
              activeOpacity={0.7}
            >
              <Text className="text-center text-gray-600 text-lg font-medium">Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Speed Selection Modal */}
      <Modal
        visible={showSpeedMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpeedMenu(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black bg-opacity-90 justify-center items-center"
          onPress={() => setShowSpeedMenu(false)}
          activeOpacity={1}
        >
          <View className="bg-white rounded-3xl mx-6 shadow-2xl" style={{ minWidth: 280 }}>
            <View className="p-6 border-b border-gray-200">
              <Text className="text-2xl font-bold text-gray-900 text-center">
                Playback Speed
              </Text>
            </View>
            
            <ScrollView style={{ maxHeight: 450 }}>
              {PLAYBACK_SPEEDS.map((speed) => (
                <TouchableOpacity
                  key={speed}
                  onPress={() => changePlaybackSpeed(speed)}
                  className={`py-5 px-6 border-b border-gray-100 ${
                    speed === playbackSpeed ? 'bg-red-50' : 'bg-white'
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-xl ${
                      speed === playbackSpeed ? 'text-red-600 font-bold' : 'text-gray-800 font-semibold'
                    }`}>
                      {speed}x {speed === 1.0 ? '(Normal)' : ''}
                    </Text>
                    {speed === playbackSpeed && (
                      <Ionicons name="checkmark-circle" size={28} color="#DC2626" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              className="p-5 border-t border-gray-200"
              onPress={() => setShowSpeedMenu(false)}
              activeOpacity={0.7}
            >
              <Text className="text-center text-gray-600 text-lg font-medium">Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Title Bar (only when not fullscreen) */}
      {title && !isFullscreen && (
        <View className="p-4 bg-white">
          <Text className="text-xl font-bold text-gray-900">{title}</Text>
        </View>
      )}
    </View>
  );
};

export default ProVideoPlayer;