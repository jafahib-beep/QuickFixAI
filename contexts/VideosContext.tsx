import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { storage, Video, Comment } from "@/utils/storage";
import { useAuth } from "./AuthContext";

interface VideosContextType {
  videos: Video[];
  savedVideoIds: string[];
  likedVideoIds: string[];
  isLoading: boolean;
  refreshVideos: () => Promise<void>;
  addVideo: (video: Omit<Video, "id" | "createdAt" | "likes" | "authorId" | "authorName" | "authorAvatar">) => Promise<Video | null>;
  toggleSave: (videoId: string) => Promise<boolean>;
  toggleLike: (videoId: string) => Promise<boolean>;
  getComments: (videoId: string) => Promise<Comment[]>;
  addComment: (videoId: string, text: string) => Promise<Comment | null>;
  getVideosByAuthor: (authorId: string) => Video[];
  getSavedVideos: () => Video[];
  searchVideos: (query: string, category?: string) => Video[];
}

const VideosContext = createContext<VideosContextType | undefined>(undefined);

export function VideosProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [savedVideoIds, setSavedVideoIds] = useState<string[]>([]);
  const [likedVideoIds, setLikedVideoIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [loadedVideos, saved, liked] = await Promise.all([
        storage.getVideos(),
        storage.getSavedVideoIds(),
        storage.getLikedVideoIds(),
      ]);
      setVideos(loadedVideos);
      setSavedVideoIds(saved);
      setLikedVideoIds(liked);
    } catch (error) {
      console.error("Failed to load videos data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshVideos = async () => {
    setIsLoading(true);
    await loadData();
  };

  const addVideo = async (
    videoData: Omit<Video, "id" | "createdAt" | "likes" | "authorId" | "authorName" | "authorAvatar">
  ): Promise<Video | null> => {
    if (!user) return null;
    try {
      const newVideo = await storage.addVideo({
        ...videoData,
        authorId: user.id,
        authorName: user.displayName,
        authorAvatar: user.avatar,
      });
      setVideos((prev) => [newVideo, ...prev]);
      return newVideo;
    } catch (error) {
      console.error("Failed to add video:", error);
      return null;
    }
  };

  const toggleSave = async (videoId: string): Promise<boolean> => {
    const isSaved = await storage.toggleSaveVideo(videoId);
    setSavedVideoIds((prev) =>
      isSaved ? [...prev, videoId] : prev.filter((id) => id !== videoId)
    );
    return isSaved;
  };

  const toggleLike = async (videoId: string): Promise<boolean> => {
    const isLiked = await storage.toggleLikeVideo(videoId);
    setLikedVideoIds((prev) =>
      isLiked ? [...prev, videoId] : prev.filter((id) => id !== videoId)
    );
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId ? { ...v, likes: v.likes + (isLiked ? 1 : -1) } : v
      )
    );
    return isLiked;
  };

  const getComments = async (videoId: string): Promise<Comment[]> => {
    return storage.getComments(videoId);
  };

  const addComment = async (videoId: string, text: string): Promise<Comment | null> => {
    if (!user) return null;
    try {
      return await storage.addComment({
        videoId,
        userId: user.id,
        userName: user.displayName,
        userAvatar: user.avatar,
        text,
      });
    } catch {
      return null;
    }
  };

  const getVideosByAuthor = (authorId: string): Video[] => {
    return videos.filter((v) => v.authorId === authorId);
  };

  const getSavedVideos = (): Video[] => {
    return videos.filter((v) => savedVideoIds.includes(v.id));
  };

  const searchVideos = (query: string, category?: string): Video[] => {
    const lowerQuery = query.toLowerCase();
    return videos.filter((v) => {
      const matchesQuery =
        !query ||
        v.title.toLowerCase().includes(lowerQuery) ||
        v.description?.toLowerCase().includes(lowerQuery) ||
        v.tags.some((t) => t.toLowerCase().includes(lowerQuery));
      const matchesCategory = !category || category === "all" || v.category === category;
      return matchesQuery && matchesCategory;
    });
  };

  return (
    <VideosContext.Provider
      value={{
        videos,
        savedVideoIds,
        likedVideoIds,
        isLoading,
        refreshVideos,
        addVideo,
        toggleSave,
        toggleLike,
        getComments,
        addComment,
        getVideosByAuthor,
        getSavedVideos,
        searchVideos,
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
