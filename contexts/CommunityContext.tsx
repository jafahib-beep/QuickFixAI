import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { api, CommunityPost, CommunityComment, CreatePostData } from "@/utils/api";
import { useAuth } from "./AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const POSTS_STORAGE_KEY = "quickfix_community_posts";
const COMMENTS_STORAGE_KEY = "quickfix_community_comments";

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [localPosts, setLocalPosts] = useState<CommunityPost[]>([]);
  const [localComments, setLocalComments] = useState<Record<string, CommunityComment[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadLocalData = useCallback(async () => {
    try {
      const [postsJson, commentsJson] = await Promise.all([
        AsyncStorage.getItem(POSTS_STORAGE_KEY),
        AsyncStorage.getItem(COMMENTS_STORAGE_KEY),
      ]);
      
      if (postsJson) {
        setLocalPosts(JSON.parse(postsJson));
      }
      if (commentsJson) {
        setLocalComments(JSON.parse(commentsJson));
      }
    } catch (error) {
      console.log("[CommunityContext] Failed to load local data:", error);
    }
  }, []);

  const saveLocalPosts = useCallback(async (newPosts: CommunityPost[]) => {
    try {
      await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(newPosts));
    } catch (error) {
      console.log("[CommunityContext] Failed to save local posts:", error);
    }
  }, []);

  const saveLocalComments = useCallback(async (comments: Record<string, CommunityComment[]>) => {
    try {
      await AsyncStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
    } catch (error) {
      console.log("[CommunityContext] Failed to save local comments:", error);
    }
  }, []);

  const loadData = useCallback(async () => {
    await loadLocalData();
    
    try {
      const apiPosts = await api.getCommunityPosts();
      setPosts(apiPosts || []);
    } catch (error) {
      console.log("[CommunityContext] API unavailable, showing empty feed");
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadLocalData]);

  useEffect(() => {
    loadData();
  }, []);

  const refreshPosts = async () => {
    setIsLoading(true);
    try {
      const apiPosts = await api.getCommunityPosts();
      setPosts(apiPosts || []);
    } catch (error) {
      console.log("[CommunityContext] Failed to refresh posts:", error);
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
    
    try {
      const newPost = await api.createCommunityPost(data);
      setPosts(prev => [newPost, ...prev]);
      return newPost;
    } catch (error) {
      console.log("[CommunityContext] API unavailable, creating local post");
      const localPost: CommunityPost = {
        id: `local_${Date.now()}`,
        title: data.title,
        description: data.description,
        category: data.category,
        imageUrl: data.imageUrl,
        status: 'open',
        commentsCount: 0,
        authorId: user.id,
        authorName: user.displayName,
        authorAvatar: user.avatarUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const updatedLocalPosts = [localPost, ...localPosts];
      setLocalPosts(updatedLocalPosts);
      setPosts(prev => [localPost, ...prev]);
      await saveLocalPosts(updatedLocalPosts);
      
      return localPost;
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
    try {
      const comments = await api.getPostComments(postId);
      return comments;
    } catch (error) {
      console.log("[CommunityContext] API unavailable, using local comments");
      return localComments[postId] || [];
    }
  };

  const addComment = async (postId: string, content: string, linkedVideoId?: string): Promise<CommunityComment | null> => {
    if (!user) return null;
    
    try {
      const newComment = await api.addPostComment(postId, content, linkedVideoId);
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      ));
      return newComment;
    } catch (error) {
      console.log("[CommunityContext] API unavailable, creating local comment");
      const localComment: CommunityComment = {
        id: `local_comment_${Date.now()}`,
        content,
        isSolution: false,
        authorId: user.id,
        authorName: user.displayName,
        authorAvatar: user.avatarUrl,
        linkedVideoId,
        createdAt: new Date().toISOString(),
      };
      
      const updatedComments = {
        ...localComments,
        [postId]: [...(localComments[postId] || []), localComment],
      };
      setLocalComments(updatedComments);
      await saveLocalComments(updatedComments);
      
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      ));
      
      return localComment;
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
