import axios, { AxiosResponse } from 'axios';
import { VideoItem, VideoDetails, SearchResponse, ApiResponse } from '../types';

const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.101:3001/api/youtube' 
  : 'https://your-production-api.com/api/youtube';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging in development
apiClient.interceptors.request.use((config) => {
  if (__DEV__) {
    console.log('API Request:', config.url, config.params);
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      console.error('API Error:', error.response?.data || error.message);
    }
    
    // Handle network errors
    if (!error.response) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // Handle API errors
    const message = error.response.data?.error || 'An unexpected error occurred';
    throw new Error(message);
  }
);

export class YouTubeAPI {
  static async searchVideos(
    query: string, 
    maxResults: number = 20, 
    pageToken?: string
  ): Promise<SearchResponse> {
    const response: AxiosResponse<ApiResponse<SearchResponse>> = await apiClient.get('/search', {
      params: {
        q: query,
        maxResults,
        ...(pageToken && { pageToken }),
      },
    });
    
    return response.data.data;
  }

  static async getVideoDetails(videoId: string): Promise<VideoDetails> {
    const response: AxiosResponse<ApiResponse<VideoDetails>> = await apiClient.get(`/video/${videoId}`);
    return response.data.data;
  }

  static async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      const response: AxiosResponse<ApiResponse<string[]>> = await apiClient.get('/suggestions', {
        params: { q: query },
      });
      return response.data.data;
    } catch (error) {
      // Return empty array if suggestions fail
      return [];
    }
  }
}

export default YouTubeAPI;