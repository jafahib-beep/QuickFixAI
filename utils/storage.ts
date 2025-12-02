import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  USER: "@quickfix_user",
  ONBOARDING_COMPLETED: "@quickfix_onboarding_completed",
  VIDEOS: "@quickfix_videos",
  SAVED_VIDEOS: "@quickfix_saved_videos",
  LIKED_VIDEOS: "@quickfix_liked_videos",
  COMMENTS: "@quickfix_comments",
  USERS: "@quickfix_users",
} as const;

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  expertise: string[];
  followers: number;
  following: number;
  createdAt: string;
}

export interface Video {
  id: string;
  uri: string;
  thumbnailUri?: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  duration: number;
  likes: number;
  commentsEnabled: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const storage = {
  async getUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async setUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error("Failed to save user:", error);
    }
  },

  async updateUser(updates: Partial<User>): Promise<User | null> {
    try {
      const user = await this.getUser();
      if (!user) return null;
      const updatedUser = { ...user, ...updates };
      await this.setUser(updatedUser);
      return updatedUser;
    } catch {
      return null;
    }
  },

  async clearUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    } catch (error) {
      console.error("Failed to clear user:", error);
    }
  },

  async isOnboardingCompleted(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      return value === "true";
    } catch {
      return false;
    }
  },

  async setOnboardingCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, "true");
    } catch (error) {
      console.error("Failed to save onboarding status:", error);
    }
  },

  async getVideos(): Promise<Video[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.VIDEOS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async addVideo(video: Omit<Video, "id" | "createdAt" | "likes">): Promise<Video> {
    try {
      const videos = await this.getVideos();
      const newVideo: Video = {
        ...video,
        id: generateId(),
        likes: 0,
        createdAt: new Date().toISOString(),
      };
      videos.unshift(newVideo);
      await AsyncStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
      return newVideo;
    } catch (error) {
      console.error("Failed to add video:", error);
      throw error;
    }
  },

  async getSavedVideoIds(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_VIDEOS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async toggleSaveVideo(videoId: string): Promise<boolean> {
    try {
      const savedIds = await this.getSavedVideoIds();
      const index = savedIds.indexOf(videoId);
      const isSaved = index === -1;
      
      if (isSaved) {
        savedIds.push(videoId);
      } else {
        savedIds.splice(index, 1);
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_VIDEOS, JSON.stringify(savedIds));
      return isSaved;
    } catch {
      return false;
    }
  },

  async getLikedVideoIds(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LIKED_VIDEOS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async toggleLikeVideo(videoId: string): Promise<boolean> {
    try {
      const likedIds = await this.getLikedVideoIds();
      const videos = await this.getVideos();
      const index = likedIds.indexOf(videoId);
      const isLiked = index === -1;
      
      if (isLiked) {
        likedIds.push(videoId);
      } else {
        likedIds.splice(index, 1);
      }
      
      const videoIndex = videos.findIndex((v) => v.id === videoId);
      if (videoIndex !== -1) {
        videos[videoIndex].likes += isLiked ? 1 : -1;
        await AsyncStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.LIKED_VIDEOS, JSON.stringify(likedIds));
      return isLiked;
    } catch {
      return false;
    }
  },

  async getComments(videoId: string): Promise<Comment[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COMMENTS);
      const allComments: Comment[] = data ? JSON.parse(data) : [];
      return allComments.filter((c) => c.videoId === videoId);
    } catch {
      return [];
    }
  },

  async addComment(comment: Omit<Comment, "id" | "createdAt">): Promise<Comment> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COMMENTS);
      const allComments: Comment[] = data ? JSON.parse(data) : [];
      const newComment: Comment = {
        ...comment,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      allComments.unshift(newComment);
      await AsyncStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(allComments));
      return newComment;
    } catch (error) {
      console.error("Failed to add comment:", error);
      throw error;
    }
  },

  async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error("Failed to clear all data:", error);
    }
  },
};

export default storage;
