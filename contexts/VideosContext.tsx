import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { api, Video, Comment, CreateVideoData } from "@/utils/api";
import { useAuth } from "./AuthContext";
import { sampleVideos } from "@/utils/sampleData";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface FeedData {
  recommended: Video[];
  new: Video[];
  popular: Video[];
}

interface VideosContextType {
  videos: Video[];
  feed: FeedData;
  isLoading: boolean;
  refreshVideos: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  addVideo: (video: CreateVideoData) => Promise<Video | null>;
  deleteVideo: (videoId: string) => Promise<boolean>;
  toggleSave: (videoId: string) => Promise<boolean>;
  toggleLike: (videoId: string) => Promise<{ liked: boolean; likesCount: number }>;
  getComments: (videoId: string) => Promise<Comment[]>;
  addComment: (videoId: string, text: string) => Promise<Comment | null>;
  getVideosByAuthor: (authorId: string) => Promise<Video[]>;
  getSavedVideos: () => Promise<Video[]>;
  searchVideos: (query: string, category?: string) => Promise<Video[]>;
  semanticSearch: (query: string, category?: string) => Promise<Video[]>;
  reportVideo: (videoId: string, reason: string, description?: string) => Promise<boolean>;
  suggestTags: (title: string, description?: string, category?: string) => Promise<string[]>;
  generateDescription: (title: string, category?: string, tags?: string[]) => Promise<string>;
}

const VideosContext = createContext<VideosContextType | undefined>(undefined);

const SAVED_VIDEOS_KEY = "quickfix_saved_videos";
const LIKED_VIDEOS_KEY = "quickfix_liked_videos";
const USER_VIDEOS_KEY = "quickfix_user_videos";
const COMMENTS_KEY = "quickfix_comments";

const filterValidVideos = (videos: Video[]): Video[] => {
  return videos.filter(v => v.videoUrl && v.videoUrl.trim() !== "");
};

export function VideosProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [feed, setFeed] = useState<FeedData>({ recommended: [], new: [], popular: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [localComments, setLocalComments] = useState<Record<string, Comment[]>>({});

  const loadSavedState = useCallback(async (): Promise<{
    savedIds: Set<string>;
    likedIds: Set<string>;
    comments: Record<string, Comment[]>;
  }> => {
    try {
      const [savedJson, likedJson, commentsJson] = await Promise.all([
        AsyncStorage.getItem(SAVED_VIDEOS_KEY),
        AsyncStorage.getItem(LIKED_VIDEOS_KEY),
        AsyncStorage.getItem(COMMENTS_KEY),
      ]);
      const loadedSavedIds = savedJson ? new Set<string>(JSON.parse(savedJson)) : new Set<string>();
      const loadedLikedIds = likedJson ? new Set<string>(JSON.parse(likedJson)) : new Set<string>();
      const loadedComments = commentsJson ? JSON.parse(commentsJson) : {};
      
      setSavedIds(loadedSavedIds);
      setLikedIds(loadedLikedIds);
      setLocalComments(loadedComments);
      
      return { savedIds: loadedSavedIds, likedIds: loadedLikedIds, comments: loadedComments };
    } catch (error) {
      console.error("Failed to load saved state:", error);
      return { savedIds: new Set(), likedIds: new Set(), comments: {} };
    }
  }, []);

  const loadSampleData = useCallback((persistedLikedIds: Set<string>, persistedSavedIds: Set<string>) => {
    const validVideos = filterValidVideos(sampleVideos);
    const allVideos = validVideos.map(v => ({
      ...v,
      isLiked: persistedLikedIds.has(v.id),
      isSaved: persistedSavedIds.has(v.id),
    }));
    
    setVideos(allVideos);
    const sorted = [...allVideos].sort((a, b) => b.likesCount - a.likesCount);
    const recent = [...allVideos].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    setFeed({
      recommended: sorted.slice(0, 8),
      new: recent.slice(0, 8),
      popular: sorted.slice(0, 8),
    });
  }, []);

  const loadData = useCallback(async () => {
    const { savedIds: persistedSavedIds, likedIds: persistedLikedIds } = await loadSavedState();
    
    try {
      const [feedData, allVideos] = await Promise.all([
        api.getFeed(),
        api.getVideos(),
      ]);
      if (feedData && allVideos && allVideos.length > 0) {
        setFeed(feedData);
        setVideos(allVideos);
      } else {
        loadSampleData(persistedLikedIds, persistedSavedIds);
      }
    } catch (error) {
      console.error("API unavailable, using sample data:", error);
      loadSampleData(persistedLikedIds, persistedSavedIds);
    } finally {
      setIsLoading(false);
    }
  }, [loadSavedState, loadSampleData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshVideos = async () => {
    setIsLoading(true);
    try {
      const allVideos = await api.getVideos();
      setVideos(allVideos);
    } catch (error) {
      console.error("Failed to refresh videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFeed = async () => {
    setIsLoading(true);
    try {
      const feedData = await api.getFeed();
      setFeed(feedData);
    } catch (error) {
      console.error("Failed to refresh feed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addVideo = async (videoData: CreateVideoData): Promise<Video | null> => {
    if (!user) return null;
    try {
      const newVideo = await api.createVideo(videoData);
      setVideos((prev) => [newVideo, ...prev]);
      await refreshFeed();
      return newVideo;
    } catch (error) {
      const localVideo: Video = {
        id: `local_${Date.now()}`,
        title: videoData.title,
        description: videoData.description || "",
        category: videoData.category,
        tags: videoData.tags || [],
        videoUrl: videoData.videoUrl,
        thumbnailUrl: undefined,
        duration: videoData.duration,
        likesCount: 0,
        commentsEnabled: videoData.commentsEnabled ?? true,
        authorId: user.id,
        authorName: user.displayName,
        authorAvatar: user.avatarUrl,
        isLiked: false,
        isSaved: false,
        createdAt: new Date().toISOString(),
      };
      setVideos((prev) => [localVideo, ...prev]);
      const userVideosJson = await AsyncStorage.getItem(USER_VIDEOS_KEY);
      const userVideos = userVideosJson ? JSON.parse(userVideosJson) : [];
      await AsyncStorage.setItem(USER_VIDEOS_KEY, JSON.stringify([localVideo, ...userVideos]));
      return localVideo;
    }
  };

  const deleteVideo = async (videoId: string): Promise<boolean> => {
    try {
      await api.deleteVideo(videoId);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      await refreshFeed();
      return true;
    } catch (error) {
      console.error("Failed to delete video:", error);
      return false;
    }
  };

  const toggleSave = async (videoId: string): Promise<boolean> => {
    try {
      const result = await api.saveVideo(videoId);
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, isSaved: result.saved } : v))
      );
      return result.saved;
    } catch (error) {
      const currentVideo = videos.find(v => v.id === videoId);
      const newSaved = !currentVideo?.isSaved;
      const newSavedIds = new Set(savedIds);
      if (newSaved) {
        newSavedIds.add(videoId);
      } else {
        newSavedIds.delete(videoId);
      }
      setSavedIds(newSavedIds);
      await AsyncStorage.setItem(SAVED_VIDEOS_KEY, JSON.stringify([...newSavedIds]));
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, isSaved: newSaved } : v))
      );
      return newSaved;
    }
  };

  const toggleLike = async (videoId: string): Promise<{ liked: boolean; likesCount: number }> => {
    try {
      const result = await api.likeVideo(videoId);
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? { ...v, isLiked: result.liked, likesCount: result.likesCount }
            : v
        )
      );
      return result;
    } catch (error) {
      const currentVideo = videos.find(v => v.id === videoId);
      const wasLiked = currentVideo?.isLiked || likedIds.has(videoId);
      const newLiked = !wasLiked;
      const newLikesCount = (currentVideo?.likesCount || 0) + (newLiked ? 1 : -1);
      
      const newLikedIds = new Set(likedIds);
      if (newLiked) {
        newLikedIds.add(videoId);
      } else {
        newLikedIds.delete(videoId);
      }
      setLikedIds(newLikedIds);
      await AsyncStorage.setItem(LIKED_VIDEOS_KEY, JSON.stringify([...newLikedIds]));
      
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? { ...v, isLiked: newLiked, likesCount: Math.max(0, newLikesCount) }
            : v
        )
      );
      return { liked: newLiked, likesCount: Math.max(0, newLikesCount) };
    }
  };

  const getComments = async (videoId: string): Promise<Comment[]> => {
    try {
      return await api.getComments(videoId);
    } catch (error) {
      return localComments[videoId] || [];
    }
  };

  const addComment = async (videoId: string, text: string): Promise<Comment | null> => {
    if (!user) return null;
    try {
      return await api.addComment(videoId, text);
    } catch (error) {
      const newComment: Comment = {
        id: `local_${Date.now()}`,
        content: text,
        authorId: user.id,
        authorName: user.displayName,
        authorAvatar: user.avatarUrl,
        createdAt: new Date().toISOString(),
      };
      const updatedComments = {
        ...localComments,
        [videoId]: [newComment, ...(localComments[videoId] || [])],
      };
      setLocalComments(updatedComments);
      await AsyncStorage.setItem(COMMENTS_KEY, JSON.stringify(updatedComments));
      return newComment;
    }
  };

  const getVideosByAuthor = async (authorId: string): Promise<Video[]> => {
    try {
      return await api.getUserVideos(authorId);
    } catch (error) {
      return videos.filter(v => v.authorId === authorId);
    }
  };

  const getSavedVideos = async (): Promise<Video[]> => {
    try {
      return await api.getSavedVideos();
    } catch (error) {
      return videos.filter(v => savedIds.has(v.id) || v.isSaved);
    }
  };

  const searchVideos = async (query: string, category?: string): Promise<Video[]> => {
    try {
      return await api.getVideos({ search: query, category });
    } catch (error) {
      const lowerQuery = query.toLowerCase();
      return videos.filter(v => {
        const matchesQuery = v.title.toLowerCase().includes(lowerQuery) ||
          (v.description && v.description.toLowerCase().includes(lowerQuery)) ||
          v.tags.some(t => t.toLowerCase().includes(lowerQuery));
        const matchesCategory = !category || category === "all" || v.category === category;
        return matchesQuery && matchesCategory;
      });
    }
  };

  const semanticSearch = async (query: string, category?: string): Promise<Video[]> => {
    try {
      return await api.semanticSearch(query, category);
    } catch (error) {
      console.error("Semantic search failed, falling back to regular search:", error);
      return searchVideos(query, category);
    }
  };

  const reportVideo = async (videoId: string, reason: string, description?: string): Promise<boolean> => {
    try {
      await api.reportVideo(videoId, reason, description);
      return true;
    } catch (error) {
      console.error("Failed to report video:", error);
      return false;
    }
  };

  const suggestTags = async (title: string, description?: string, category?: string): Promise<string[]> => {
    try {
      const result = await api.suggestTags(title, description, category);
      return result.tags;
    } catch (error) {
      const words = title.toLowerCase().split(/\s+/);
      const commonWords = ["how", "to", "a", "the", "in", "on", "for", "with", "and", "or"];
      const tags = words.filter(w => w.length > 2 && !commonWords.includes(w)).slice(0, 3);
      if (category) tags.push(category);
      return [...new Set(tags)].slice(0, 5);
    }
  };

  const generateDescription = async (title: string, category?: string, tags?: string[]): Promise<string> => {
    try {
      const result = await api.generateDescription(title, category, tags);
      return result.description;
    } catch (error) {
      const categoryText = category ? ` in the ${category} category` : "";
      const tagsText = tags && tags.length > 0 ? ` Topics: ${tags.slice(0, 3).join(", ")}.` : "";
      return `Quick fix video: ${title}${categoryText}.${tagsText}`;
    }
  };

  return (
    <VideosContext.Provider
      value={{
        videos,
        feed,
        isLoading,
        refreshVideos,
        refreshFeed,
        addVideo,
        deleteVideo,
        toggleSave,
        toggleLike,
        getComments,
        addComment,
        getVideosByAuthor,
        getSavedVideos,
        searchVideos,
        semanticSearch,
        reportVideo,
        suggestTags,
        generateDescription,
      }}
    >
      {children}
    </VideosContext.Provider>
  );
}

export function useVideos() {
  const context = useContext(VideosContext);
  if (context === undefined) {
    throw new Error("useVideos must be used within a VideosProvider");
  }
  return context;
}
