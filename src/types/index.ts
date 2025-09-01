export interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
}

export interface VideoDetails extends VideoItem {
  formats: VideoFormat[];
}

export interface VideoFormat {
  quality: string;
  url: string;
  mimeType: string;
  bitrate?: number;
  fps?: number;
}

export interface SearchResponse {
  items: VideoItem[];
  nextPageToken?: string;
  totalResults: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  googleId?: string;
}

export interface WatchHistoryItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration: string;
  watchedAt: string;
  watchedDuration?: number; // in seconds
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  watchHistory: WatchHistoryItem[];
  addToHistory: (video: VideoItem, watchedDuration?: number) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export interface AppContextType {
  currentVideo: VideoDetails | null;
  setCurrentVideo: (video: VideoDetails | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: VideoItem[];
  setSearchResults: (results: VideoItem[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}