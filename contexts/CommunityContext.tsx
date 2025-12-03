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

const samplePosts: CommunityPost[] = [
  {
    id: "sample_post_1",
    title: "Kitchen faucet won't stop dripping",
    description: "My kitchen faucet has been dripping for a week now. I've tried tightening the handle but it doesn't help. The faucet is about 5 years old. Any suggestions on how to fix this without calling a plumber?",
    category: "plumbing",
    imageUrl: undefined,
    status: "open",
    commentsCount: 2,
    authorId: "sample_user_1",
    authorName: "HomeHelper",
    authorAvatar: undefined,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample_post_2",
    title: "Washing machine makes loud noise during spin",
    description: "My washing machine started making a really loud banging noise during the spin cycle. It's a front-loader, about 3 years old. The clothes come out fine but the noise is concerning. Is this something I can fix myself?",
    category: "laundry",
    imageUrl: undefined,
    status: "answered",
    commentsCount: 3,
    authorId: "sample_user_2",
    authorName: "FixItFan",
    authorAvatar: undefined,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample_post_3",
    title: "How to remove stubborn grease from stovetop?",
    description: "I have some really burnt-on grease around my burners that won't come off with regular cleaning. I've tried dish soap and baking soda but nothing works. Any tips for getting rid of tough grease stains?",
    category: "cleaning",
    imageUrl: undefined,
    status: "solved",
    commentsCount: 5,
    authorId: "sample_user_3",
    authorName: "CleanFreak",
    authorAvatar: undefined,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample_post_4",
    title: "TV remote not working after battery change",
    description: "Changed the batteries in my TV remote but it still doesn't work. The TV is a Samsung Smart TV. I've tried new batteries from different brands. The power button on the TV itself works fine.",
    category: "electronics",
    imageUrl: undefined,
    status: "open",
    commentsCount: 1,
    authorId: "sample_user_4",
    authorName: "TechTrouble",
    authorAvatar: undefined,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const sampleComments: Record<string, CommunityComment[]> = {
  sample_post_1: [
    {
      id: "comment_1_1",
      content: "You probably need to replace the washer inside the faucet. It's a common issue and pretty easy to fix. Turn off the water supply first, then unscrew the handle to access the cartridge.",
      isSolution: false,
      authorId: "sample_user_5",
      authorName: "PlumbingPro",
      authorAvatar: undefined,
      createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "comment_1_2",
      content: "Check if there's a video on QuickFix about faucet repair - I saw one recently that was really helpful!",
      isSolution: false,
      authorId: "sample_user_6",
      authorName: "DIYDave",
      authorAvatar: undefined,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  sample_post_2: [
    {
      id: "comment_2_1",
      content: "This could be an unbalanced load or worn drum bearings. Try running an empty cycle to see if it still makes noise.",
      isSolution: false,
      authorId: "sample_user_7",
      authorName: "ApplianceAce",
      authorAvatar: undefined,
      createdAt: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  sample_post_3: [
    {
      id: "comment_3_1",
      content: "Try making a paste with baking soda and dish soap, let it sit for 30 minutes, then scrub with a non-scratch sponge. Works great for tough grease!",
      isSolution: true,
      authorId: "sample_user_8",
      authorName: "CleanQueen",
      authorAvatar: undefined,
      createdAt: new Date(Date.now() - 6.5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

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
      if (apiPosts && apiPosts.length > 0) {
        setPosts(apiPosts);
      } else {
        setPosts([...samplePosts, ...localPosts]);
      }
    } catch (error) {
      console.log("[CommunityContext] API unavailable, using sample data");
      setPosts([...samplePosts, ...localPosts]);
    } finally {
      setIsLoading(false);
    }
  }, [loadLocalData, localPosts]);

  useEffect(() => {
    loadData();
  }, []);

  const refreshPosts = async () => {
    setIsLoading(true);
    try {
      const apiPosts = await api.getCommunityPosts();
      if (apiPosts && apiPosts.length > 0) {
        setPosts(apiPosts);
      } else {
        await loadLocalData();
        setPosts([...samplePosts, ...localPosts]);
      }
    } catch (error) {
      console.log("[CommunityContext] Failed to refresh posts:", error);
      setPosts([...samplePosts, ...localPosts]);
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
      return localComments[postId] || sampleComments[postId] || [];
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
