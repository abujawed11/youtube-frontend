import { useState, useCallback } from 'react';
import { YouTubeAPI } from '../services/api';
import { VideoItem, VideoDetails, SearchResponse } from '../types';
import { useAppContext } from '../contexts/AppContext';

export const useYouTube = () => {
  const { setError, setIsLoading } = useAppContext();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const searchVideos = useCallback(async (
    query: string,
    maxResults: number = 20,
    pageToken?: string
  ): Promise<SearchResponse | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const results = await YouTubeAPI.searchVideos(query, maxResults, pageToken);
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search videos';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setError, setIsLoading]);

  const getVideoDetails = useCallback(async (videoId: string): Promise<VideoDetails | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const videoDetails = await YouTubeAPI.getVideoDetails(videoId);
      return videoDetails;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load video';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setError, setIsLoading]);

  const getSearchSuggestions = useCallback(async (query: string): Promise<void> => {
    try {
      const suggestions = await YouTubeAPI.getSearchSuggestions(query);
      setSuggestions(suggestions);
    } catch (error) {
      setSuggestions([]);
    }
  }, []);

  return {
    searchVideos,
    getVideoDetails,
    getSearchSuggestions,
    suggestions,
  };
};

export default useYouTube;