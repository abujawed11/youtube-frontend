import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  PanResponder,
  Animated,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import Video, { VideoRef, OnProgressData, OnLoadData, OnBufferData } from 'react-native-video';
import VideoPlayer from 'react-native-video-controls';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import LinearGradient from 'react-native-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import KeepAwake from 'react-native-keep-awake';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import { PlayerState } from '../../types';

interface AdvancedVideoPlayerProps {
  uri: string;
  title?: string;
  onFullscreenUpdate?: (status: boolean) => void;
  onProgress?: (currentTime: number, totalTime: number) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const SEEK_TIME = 10000; // 10 seconds in milliseconds

const AdvancedVideoPlayer: React.FC<AdvancedVideoPlayerProps> = ({
  uri,
  title,
  onFullscreenUpdate,
  onProgress: onProgressCallback,
}) => {
  const videoRef = useRef<VideoRef>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTap = useRef<number>(0);
  
  // Animated values for gestures
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const seekIndicatorAnim = useRef(new Animated.Value(0)).current;

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
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch'>('contain');
  const [brightness, setBrightness] = useState(1.0);
  const [networkStatus, setNetworkStatus] = useState<string>('unknown');
  const [seekIndicatorText, setSeekIndicatorText] = useState('');
  const [showSeekIndicator, setShowSeekIndicator] = useState(false);

  // Network monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        setNetworkStatus(state.type || 'unknown');
      } else {
        setNetworkStatus('offline');
        setError('No internet connection');
      }
    });

    return () => unsubscribe();
  }, []);

  // Keep screen awake during playback
  useEffect(() => {
    if (playerState.isPlaying) {
      KeepAwake.activate();
    } else {
      KeepAwake.deactivate();
    }

    return () => KeepAwake.deactivate();
  }, [playerState.isPlaying]);

  // Auto-hide controls
  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (showControls && playerState.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, playerState.isPlaying]);

  // Progress callback
  useEffect(() => {
    if (onProgressCallback && playerState.duration > 0) {
      onProgressCallback(playerState.currentTime, playerState.duration);
    }
  }, [playerState.currentTime, playerState.duration, onProgressCallback]);

  // Video event handlers
  const onLoad = useCallback((data: OnLoadData) => {
    setIsLoading(false);
    setError(null);
    setPlayerState(prev => ({
      ...prev,
      duration: data.duration * 1000,
    }));
  }, []);

  const onProgress = useCallback((data: OnProgressData) => {
    setPlayerState(prev => ({
      ...prev,
      currentTime: data.currentTime * 1000,
    }));
  }, []);

  const onBuffer = useCallback((data: OnBufferData) => {
    setIsBuffering(data.isBuffering);
  }, []);

  const onError = useCallback((error: any) => {
    console.error('Video error:', error);
    setIsLoading(false);
    setIsBuffering(false);
    setError('Failed to load video. Check your connection and try again.');
  }, []);

  // Control functions
  const togglePlayPause = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    setShowControls(true);
  }, []);

  const seekTo = useCallback((position: number) => {
    const seekTime = Math.max(0, Math.min(position, playerState.duration));
    videoRef.current?.seek(seekTime / 1000);
    setPlayerState(prev => ({ ...prev, currentTime: seekTime }));
  }, [playerState.duration]);

  const skipForward = useCallback(() => {
    const newPosition = Math.min(playerState.currentTime + SEEK_TIME, playerState.duration);
    seekTo(newPosition);
    showSeekFeedback(`+${SEEK_TIME / 1000}s`);
  }, [playerState.currentTime, playerState.duration, seekTo]);

  const skipBackward = useCallback(() => {
    const newPosition = Math.max(playerState.currentTime - SEEK_TIME, 0);
    seekTo(newPosition);
    showSeekFeedback(`-${SEEK_TIME / 1000}s`);
  }, [playerState.currentTime, seekTo]);

  const showSeekFeedback = useCallback((text: string) => {
    setSeekIndicatorText(text);
    setShowSeekIndicator(true);
    
    Animated.sequence([
      Animated.timing(seekIndicatorAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1000),
      Animated.timing(seekIndicatorAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSeekIndicator(false);
    });
  }, [seekIndicatorAnim]);

  const toggleFullscreen = useCallback(() => {
    const newFullscreenState = !playerState.isFullscreen;
    
    if (newFullscreenState) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      StatusBar.setHidden(true, 'fade');
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      StatusBar.setHidden(false, 'fade');
    }
    
    setPlayerState(prev => ({ ...prev, isFullscreen: newFullscreenState }));
    onFullscreenUpdate?.(newFullscreenState);
  }, [playerState.isFullscreen, onFullscreenUpdate]);

  const changePlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  }, []);

  // Gesture handling
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 20 || Math.abs(gestureState.dy) > 20;
    },
    onPanResponderGrant: () => {
      scaleAnim.setValue(0.95);
    },
    onPanResponderMove: (evt, gestureState) => {
      // Brightness control (left side, vertical)
      if (evt.nativeEvent.locationX < screenWidth / 2 && Math.abs(gestureState.dy) > 20) {
        const delta = -gestureState.dy / screenHeight;
        const newBrightness = Math.max(0.1, Math.min(1.0, brightness + delta));
        setBrightness(newBrightness);
      }
      
      // Volume control (right side, vertical)
      if (evt.nativeEvent.locationX > screenWidth / 2 && Math.abs(gestureState.dy) > 20) {
        const delta = -gestureState.dy / screenHeight;
        const newVolume = Math.max(0, Math.min(1.0, playerState.volume + delta));
        setPlayerState(prev => ({ ...prev, volume: newVolume }));
      }
      
      // Seek control (horizontal)
      if (Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
        const seekDelta = (gestureState.dx / screenWidth) * 30000; // 30 seconds max
        const newTime = Math.max(0, Math.min(playerState.duration, playerState.currentTime + seekDelta));
        const seekText = seekDelta > 0 ? `+${Math.round(seekDelta / 1000)}s` : `${Math.round(seekDelta / 1000)}s`;
        setSeekIndicatorText(seekText);
        setShowSeekIndicator(true);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      scaleAnim.setValue(1);
      setShowSeekIndicator(false);
      
      // Apply seek if horizontal gesture
      if (Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
        const seekDelta = (gestureState.dx / screenWidth) * 30000;
        const newTime = Math.max(0, Math.min(playerState.duration, playerState.currentTime + seekDelta));
        seekTo(newTime);
      }
    },
  });

  // Double tap handling
  const handleTap = useCallback((event: any) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    
    if (doubleTapTimeoutRef.current) {
      clearTimeout(doubleTapTimeoutRef.current);
      doubleTapTimeoutRef.current = null;
    }
    
    if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
      // Double tap
      const tapX = event.nativeEvent.locationX;
      if (tapX < screenWidth / 3) {
        skipBackward();
      } else if (tapX > (screenWidth * 2) / 3) {
        skipForward();
      } else {
        togglePlayPause();
      }
      lastTap.current = 0;
    } else {
      // Single tap
      doubleTapTimeoutRef.current = setTimeout(() => {
        setShowControls(!showControls);
        doubleTapTimeoutRef.current = null;
      }, DOUBLE_PRESS_DELAY);
      lastTap.current = now;
    }
  }, [showControls, skipBackward, skipForward, togglePlayPause]);

  const formatTime = useCallback((milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Error retry
  const retryVideo = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setIsBuffering(false);
  }, []);

  if (error) {
    return (
      <View className="bg-black justify-center items-center" style={{ height: screenWidth * (9/16) }}>
        <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
        <Text className="text-white text-center mt-4 px-6 text-base">{error}</Text>
        <Text className="text-gray-400 text-center mt-2 px-6 text-sm">
          Network: {networkStatus}
        </Text>
        <TouchableOpacity
          onPress={retryVideo}
          className="mt-4 bg-red-600 px-6 py-3 rounded-lg"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="bg-black relative">
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleTap}
          className="relative"
        >
          <Video
            ref={videoRef}
            source={{ uri }}
            style={{
              width: screenWidth,
              height: playerState.isFullscreen ? screenHeight : screenWidth * (9/16),
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
            bufferConfig={{
              minBufferMs: 15000,
              maxBufferMs: 50000,
              bufferForPlaybackMs: 2500,
              bufferForPlaybackAfterRebufferMs: 5000,
            }}
            maxBitRate={networkStatus === 'wifi' ? undefined : 1000000}
          />

          {/* Loading/Buffering Overlay */}
          {(isLoading || isBuffering) && (
            <View className="absolute inset-0 justify-center items-center">
              <LinearGradient
                colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <View className="bg-black bg-opacity-80 rounded-xl p-6 items-center">
                  <Ionicons
                    name={isLoading ? "download-outline" : "sync-outline"}
                    size={40}
                    color="#fff"
                  />
                  <Text className="text-white mt-3 text-lg font-medium">
                    {isLoading ? 'Loading...' : 'Buffering...'}
                  </Text>
                  <Text className="text-gray-300 mt-1 text-sm">
                    {networkStatus} connection
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Seek Indicator */}
          {showSeekIndicator && (
            <Animated.View
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: [
                  { translateX: -50 },
                  { translateY: -50 },
                  { scale: seekIndicatorAnim },
                ],
                opacity: seekIndicatorAnim,
              }}
              className="bg-black bg-opacity-80 rounded-full px-4 py-2"
            >
              <Text className="text-white text-lg font-bold">{seekIndicatorText}</Text>
            </Animated.View>
          )}

          {/* Controls Overlay */}
          {showControls && !isLoading && (
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.8)']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            >
              {/* Top Controls */}
              <View className="absolute top-0 left-0 right-0 p-4 pt-8">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                      {title || 'Video'}
                    </Text>
                    <Text className="text-gray-300 text-sm mt-1">
                      {networkStatus} • {playbackSpeed}x
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => setResizeMode(prev => 
                      prev === 'contain' ? 'cover' : prev === 'cover' ? 'stretch' : 'contain'
                    )}
                    className="ml-4 p-2"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="expand-outline" size={24} color="#fff" />
                    <Text className="text-white text-xs mt-1 text-center">
                      {resizeMode === 'contain' ? 'Fit' : resizeMode === 'cover' ? 'Fill' : 'Stretch'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Center Controls */}
              <View className="flex-1 justify-center items-center">
                <View className="flex-row items-center" style={{ gap: 60 }}>
                  <TouchableOpacity
                    onPress={skipBackward}
                    className="bg-black bg-opacity-60 rounded-full p-4"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play-skip-back" size={32} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={togglePlayPause}
                    className="bg-red-600 rounded-full p-5 shadow-lg"
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={playerState.isPlaying ? "pause" : "play"}
                      size={44}
                      color="#fff"
                      style={{ marginLeft: playerState.isPlaying ? 0 : 4 }}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={skipForward}
                    className="bg-black bg-opacity-60 rounded-full p-4"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play-skip-forward" size={32} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom Controls */}
              <View className="absolute bottom-0 left-0 right-0 p-4 pb-8">
                {/* Progress Bar */}
                <View className="flex-row items-center mb-4">
                  <Text className="text-white text-sm font-medium w-14 text-center">
                    {formatTime(playerState.currentTime)}
                  </Text>
                  
                  <View className="flex-1 mx-4">
                    <Slider
                      style={{ height: 50 }}
                      minimumValue={0}
                      maximumValue={playerState.duration}
                      value={playerState.currentTime}
                      onValueChange={seekTo}
                      onSlidingStart={() => setShowControls(true)}
                      minimumTrackTintColor="#DC2626"
                      maximumTrackTintColor="rgba(255,255,255,0.3)"
                      thumbStyle={{
                        backgroundColor: '#DC2626',
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                      }}
                      trackStyle={{ height: 4, borderRadius: 2 }}
                    />
                  </View>
                  
                  <Text className="text-white text-sm font-medium w-14 text-center">
                    {formatTime(playerState.duration)}
                  </Text>
                </View>

                {/* Control Buttons */}
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center" style={{ gap: 24 }}>
                    <TouchableOpacity
                      onPress={togglePlayPause}
                      className="p-2"
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={playerState.isPlaying ? "pause" : "play"}
                        size={28}
                        color="#fff"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setPlayerState(prev => ({ ...prev, isMuted: !prev.isMuted }))}
                      className="p-2"
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={playerState.isMuted ? "volume-mute" : "volume-high"}
                        size={28}
                        color="#fff"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setShowSpeedMenu(true)}
                      className="p-2"
                      activeOpacity={0.7}
                    >
                      <Text className="text-white text-base font-bold">
                        {playbackSpeed}x
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setShowQualityMenu(true)}
                      className="p-2"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="settings" size={28} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={toggleFullscreen}
                    className="p-2"
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={playerState.isFullscreen ? "contract" : "expand"}
                      size={28}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Speed Menu */}
      <Modal
        visible={showSpeedMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpeedMenu(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black bg-opacity-80 justify-center items-center"
          onPress={() => setShowSpeedMenu(false)}
          activeOpacity={1}
        >
          <View className="bg-white rounded-2xl mx-8" style={{ minWidth: 250 }}>
            <View className="p-6 border-b border-gray-200">
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
                    speed === playbackSpeed ? 'bg-red-50' : 'bg-white'
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-lg ${
                      speed === playbackSpeed ? 'text-red-600 font-bold' : 'text-gray-700 font-medium'
                    }`}>
                      {speed}x {speed === 1.0 ? '(Normal)' : ''}
                    </Text>
                    {speed === playbackSpeed && (
                      <Ionicons name="checkmark-circle" size={24} color="#DC2626" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              className="p-4"
              onPress={() => setShowSpeedMenu(false)}
              activeOpacity={0.7}
            >
              <Text className="text-center text-gray-500 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Title */}
      {title && !playerState.isFullscreen && (
        <View className="p-4 bg-white">
          <Text className="text-lg font-semibold text-gray-900">{title}</Text>
        </View>
      )}
    </View>
  );
};

export default AdvancedVideoPlayer;