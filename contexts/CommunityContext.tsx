import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Platform } from "react-native";
import { api, CommunityPost, CommunityComment, CreatePostData } from "@/utils/api";
import { useAuth } from "./AuthContext";

interface CommunityContextType {
  posts: CommunityPost[];
  isLoading: boolean;
  refreshPosts: () => Promise<void>;
  getPost: (postId: string) => Promise<CommunityPost | null>;
  createPost: (data: CreatePostData) => Promise<CommunityPost | null>;
  updatePostStatus: (postId: string, status: 'open' | 'answered' | 'solved') => Promise<boolean>;
  getComments: (postId: string) => Promise<CommunityComment[]>;
  addComment: (postId: string, content: string, linkedVideoId?: string) => Promise<CommunityComment | null>;
  markAsSolution: (postId: string, commentId: string) => Promise<boolean>;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

const getLogPrefix = () => Platform.OS === 'web' ? '[WEB]' : '[MOBILE]';

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    const prefix = getLogPrefix();
    console.log(`${prefix} Fetching /api/community...`);
    
    try {
      const apiPosts = await api.getCommunityPosts();
      console.log(`${prefix} Received ${apiPosts?.length || 0} posts from backend`);
      setPosts(apiPosts || []);
    } catch (error: any) {
      console.log(`${prefix} Failed to fetch posts:`, error?.message || error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const refreshPosts = async () => {
    const prefix = getLogPrefix();
    console.log(`${prefix} Refreshing /api/community...`);
    setIsLoading(true);
    try {
      const apiPosts = await api.getCommunityPosts();
      console.log(`${prefix} Refresh received ${apiPosts?.length || 0} posts from backend`);
      setPosts(apiPosts || []);
    } catch (error: any) {
      console.log(`${prefix} Failed to refresh posts:`, error?.message || error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getPost = async (postId: string): Promise<CommunityPost | null> => {
    const localPost = posts.find(p => p.id === postId);
    if (localPost) return localPost;
    
    try {
      return await api.getCommunityPost(postId);
    } catch (error) {
      console.log("[CommunityContext] Failed to get post:", error);
      return null;
    }
  };

  const createPost = async (data: CreatePostData): Promise<CommunityPost | null> => {
    if (!user) return null;
    const prefix = getLogPrefix();
    console.log(`${prefix} Creating post via /api/community...`);
    
    try {
      const newPost = await api.createCommunityPost(data);
      console.log(`${prefix} Post created successfully:`, newPost.id);
      setPosts(prev => [newPost, ...prev]);
      return newPost;
    } catch (error: any) {
      console.log(`${prefix} Failed to create post:`, error?.message || error);
      throw error;
    }
  };

  const updatePostStatus = async (postId: string, status: 'open' | 'answered' | 'solved'): Promise<boolean> => {
    try {
      await api.updatePostStatus(postId, status);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status, updatedAt: new Date().toISOString() } : p));
      return true;
    } catch (error) {
      console.log("[CommunityContext] Failed to update post status:", error);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status, updatedAt: new Date().toISOString() } : p));
      return true;
    }
  };

  const getComments = async (postId: string): Promise<CommunityComment[]> => {
    const prefix = getLogPrefix();
    console.log(`${prefix} Fetching comments for post ${postId}...`);
    try {
      const comments = await api.getPostComments(postId);
      console.log(`${prefix} Received ${comments?.length || 0} comments from backend`);
      return comments;
    } catch (error: any) {
      console.log(`${prefix} Failed to fetch comments:`, error?.message || error);
      return [];
    }
  };

  const addComment = async (postId: string, content: string, linkedVideoId?: string): Promise<CommunityComment | null> => {
    if (!user) return null;
    const prefix = getLogPrefix();
    console.log(`${prefix} Adding comment to post ${postId}...`);
    
    try {
      const newComment = await api.addPostComment(postId, content, linkedVideoId);
      console.log(`${prefix} Comment added successfully:`, newComment.id);
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      ));
      return newComment;
    } catch (error: any) {
      console.log(`${prefix} Failed to add comment:`, error?.message || error);
      throw error;
    }
  };

  const markAsSolution = async (postId: string, commentId: string): Promise<boolean> => {
    try {
      await api.markCommentAsSolution(postId, commentId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'solved' } : p));
      return true;
    } catch (error) {
      console.log("[CommunityContext] Failed to mark as solution:", error);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'solved' } : p));
      return true;
    }
  };

  return (
    <CommunityContext.Provider
      value={{
        posts,
        isLoading,
        refreshPosts,
        getPost,
        createPost,
        updatePostStatus,
        getComments,
        addComment,
        markAsSolution,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (context === undefined) {
    throw new Error("useCommunity must be used within a CommunityProvider");
  }
  return context;
}
