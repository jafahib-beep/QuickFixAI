import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

const BACKEND_PORT = 5000;

function getApiBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return '/api';
  }
  
  const replitDevDomain = Constants.expoConfig?.extra?.REPLIT_DEV_DOMAIN;
  if (replitDevDomain) {
    if (replitDevDomain.includes('.riker.replit.dev')) {
      const parts = replitDevDomain.split('.riker.replit.dev')[0];
      return `https://${parts}-${BACKEND_PORT}.riker.replit.dev/api`;
    }
    const parts = replitDevDomain.split('.replit.dev')[0];
    return `https://${parts}-${BACKEND_PORT}.replit.dev/api`;
  }
  
  return `http://localhost:${BACKEND_PORT}/api`;
}

const API_BASE_URL = getApiBaseUrl();

console.log("[API] FULL API URL:", API_BASE_URL);

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  requireAuth?: boolean;
}

class ApiClient {
  private token: string | null = null;

  async setToken(token: string | null) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem("authToken", token);
    } else {
      await AsyncStorage.removeItem("authToken");
    }
  }

  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    this.token = await AsyncStorage.getItem("authToken");
    return this.token;
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = "GET", body, requireAuth = false } = options;
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (requireAuth) {
      const token = await this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body && method !== "GET") {
      config.body = JSON.stringify(body);
    }

    try {
      console.log(`[API] ${method} ${url}`);
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Request failed" }));
        console.log(
          `[API] Error ${response.status}: ${JSON.stringify(errorData)}`,
        );
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }

      return response.json();
    } catch (error: any) {
      if (error.message?.includes("Request failed")) {
        throw error;
      }
      console.log(`[API] Network error for ${url}:`, error.message || error);
      throw new Error(`Network error: ${error.message || "Connection failed"}`);
    }
  }

  async register(email: string, password: string, displayName: string) {
    const result = await this.request<{ user: User; token: string }>(
      "/auth/register",
      {
        method: "POST",
        body: { email, password, displayName },
      },
    );
    await this.setToken(result.token);
    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request<{ user: User; token: string }>(
      "/auth/login",
      {
        method: "POST",
        body: { email, password },
      },
    );
    await this.setToken(result.token);
    return result;
  }

  async logout() {
    await this.setToken(null);
  }

  async getMe() {
    return this.request<User>("/auth/me", { requireAuth: true });
  }

  async updateProfile(data: Partial<User>) {
    return this.request<User>("/auth/me", {
      method: "PUT",
      body: data,
      requireAuth: true,
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>("/auth/password", {
      method: "PUT",
      body: { currentPassword, newPassword },
      requireAuth: true,
    });
  }

  async getFeed() {
    return this.request<{
      recommended: Video[];
      new: Video[];
      popular: Video[];
    }>("/videos/feed", { requireAuth: true });
  }

  async getVideos(params?: {
    category?: string;
    search?: string;
    sort?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    if (params?.sort) query.set("sort", params.sort);

    const queryString = query.toString();
    return this.request<Video[]>(
      `/videos${queryString ? `?${queryString}` : ""}`,
      {
        requireAuth: true,
      },
    );
  }

  async getVideo(id: string) {
    return this.request<Video>(`/videos/${id}`, { requireAuth: true });
  }

  async createVideo(data: CreateVideoData) {
    return this.request<Video>("/videos", {
      method: "POST",
      body: data,
      requireAuth: true,
    });
  }

  async deleteVideo(id: string) {
    return this.request<{ message: string }>(`/videos/${id}`, {
      method: "DELETE",
      requireAuth: true,
    });
  }

  async likeVideo(id: string) {
    return this.request<{ liked: boolean; likesCount: number }>(
      `/videos/${id}/like`,
      {
        method: "POST",
        requireAuth: true,
      },
    );
  }

  async saveVideo(id: string, folderId?: string) {
    return this.request<{ saved: boolean }>(`/videos/${id}/save`, {
      method: "POST",
      body: { folderId },
      requireAuth: true,
    });
  }

  async getComments(videoId: string) {
    return this.request<Comment[]>(`/videos/${videoId}/comments`);
  }

  async addComment(videoId: string, content: string) {
    return this.request<Comment>(`/videos/${videoId}/comments`, {
      method: "POST",
      body: { content },
      requireAuth: true,
    });
  }

  async reportVideo(videoId: string, reason: string, description?: string) {
    return this.request<{ message: string }>(`/videos/${videoId}/report`, {
      method: "POST",
      body: { reason, description },
      requireAuth: true,
    });
  }

  async getUser(id: string) {
    return this.request<UserProfile>(`/users/${id}`, { requireAuth: true });
  }

  async getUserVideos(userId: string) {
    return this.request<Video[]>(`/users/${userId}/videos`, {
      requireAuth: true,
    });
  }

  async followUser(id: string) {
    return this.request<{ following: boolean }>(`/users/${id}/follow`, {
      method: "POST",
      requireAuth: true,
    });
  }

  async getFollowers(userId: string) {
    return this.request<UserPreview[]>(`/users/${userId}/followers`);
  }

  async getFollowing(userId: string) {
    return this.request<UserPreview[]>(`/users/${userId}/following`);
  }

  async getSavedVideos(folderId?: string) {
    const query = folderId ? `?folderId=${folderId}` : "";
    return this.request<Video[]>(`/toolbox/saved${query}`, {
      requireAuth: true,
    });
  }

  async getFolders() {
    return this.request<{ folders: Folder[]; uncategorizedCount: number }>(
      "/toolbox/folders",
      {
        requireAuth: true,
      },
    );
  }

  async createFolder(name: string) {
    return this.request<Folder>("/toolbox/folders", {
      method: "POST",
      body: { name },
      requireAuth: true,
    });
  }

  async updateFolder(id: string, name: string) {
    return this.request<Folder>(`/toolbox/folders/${id}`, {
      method: "PUT",
      body: { name },
      requireAuth: true,
    });
  }

  async deleteFolder(id: string) {
    return this.request<{ message: string }>(`/toolbox/folders/${id}`, {
      method: "DELETE",
      requireAuth: true,
    });
  }

  async moveVideoToFolder(videoId: string, folderId: string | null) {
    return this.request<{ message: string }>(
      `/toolbox/saved/${videoId}/folder`,
      {
        method: "PUT",
        body: { folderId },
        requireAuth: true,
      },
    );
  }

  async getNotifications() {
    return this.request<Notification[]>("/notifications", {
      requireAuth: true,
    });
  }

  async getUnreadCount() {
    return this.request<{ count: number }>("/notifications/unread-count", {
      requireAuth: true,
    });
  }

  async markNotificationRead(id: string) {
    return this.request<{ message: string }>(`/notifications/${id}/read`, {
      method: "PUT",
      requireAuth: true,
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ message: string }>("/notifications/read-all", {
      method: "PUT",
      requireAuth: true,
    });
  }

  async suggestTags(title: string, description?: string, category?: string) {
    return this.request<{ tags: string[] }>("/ai/suggest-tags", {
      method: "POST",
      body: { title, description, category },
      requireAuth: true,
    });
  }

  async generateDescription(title: string, category?: string, tags?: string[]) {
    return this.request<{ description: string }>("/ai/generate-description", {
      method: "POST",
      body: { title, category, tags },
      requireAuth: true,
    });
  }

  async moderateContent(title: string, description?: string, tags?: string[]) {
    return this.request<{ approved: boolean; reason: string | null }>(
      "/ai/moderate-content",
      {
        method: "POST",
        body: { title, description, tags },
        requireAuth: true,
      },
    );
  }

  async semanticSearch(query: string, category?: string) {
    return this.request<Video[]>("/ai/semantic-search", {
      method: "POST",
      body: { query, category },
      requireAuth: true,
    });
  }

  async generateGuide(
    query: string,
    language: string = "en",
    includeImages: boolean = true,
  ) {
    return this.request<AIGuide>("/ai/generate-guide", {
      method: "POST",
      body: { query, language, includeImages },
      requireAuth: true,
    });
  }

  async askAI(question: string, language: string = "en") {
    return this.request<{ answer: string }>("/ai/ask-ai", {
      method: "POST",
      body: { question, language },
    });
  }

  async chat(data: {
    messages: { role: string; content: string }[];
    language?: string;
    imageBase64?: string;
    videoFileName?: string;
  }) {
    return this.request<{ answer: string }>("/ai/chat", {
      method: "POST",
      body: data,
    });
  }

  async liveAssist(imageBase64: string, language: string = "en") {
    return this.request<LiveAssistResponse>("/ai/liveassist", {
      method: "POST",
      body: { imageBase64, language },
    });
  }

  async checkAIServiceHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log("[API] AI service health check failed:", error);
      return false;
    }
  }

  async getCommunityPosts(params?: { category?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.category && params.category !== "all")
      query.set("category", params.category);
    if (params?.status && params.status !== "all")
      query.set("status", params.status);

    const queryString = query.toString();
    return this.request<CommunityPost[]>(
      `/community${queryString ? `?${queryString}` : ""}`,
      {
        requireAuth: true,
      },
    );
  }

  async getCommunityPost(id: string) {
    return this.request<CommunityPost>(`/community/${id}`, {
      requireAuth: true,
    });
  }

  async createCommunityPost(data: CreatePostData) {
    return this.request<CommunityPost>("/community", {
      method: "POST",
      body: data,
      requireAuth: true,
    });
  }

  async updatePostStatus(
    postId: string,
    status: "open" | "answered" | "solved",
  ) {
    return this.request<{ success: boolean }>(`/community/${postId}/status`, {
      method: "PUT",
      body: { status },
      requireAuth: true,
    });
  }

  async getPostComments(postId: string) {
    return this.request<CommunityComment[]>(`/community/${postId}/comments`, {
      requireAuth: true,
    });
  }

  async addPostComment(
    postId: string,
    content: string,
    linkedVideoId?: string,
  ) {
    return this.request<CommunityComment>(`/community/${postId}/comments`, {
      method: "POST",
      body: { content, linkedVideoId },
      requireAuth: true,
    });
  }

  async markCommentAsSolution(postId: string, commentId: string) {
    return this.request<{ success: boolean }>(
      `/community/${postId}/comments/${commentId}/solution`,
      {
        method: "PUT",
        requireAuth: true,
      },
    );
  }
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  expertiseCategories?: string[];
  followersCount: number;
  followingCount: number;
  createdAt?: string;
}

export interface UserProfile extends User {
  isFollowing: boolean;
}

export interface UserPreview {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  likesCount: number;
  commentsEnabled: boolean;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
}

export interface CreateVideoData {
  title: string;
  description?: string;
  category: string;
  tags?: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  commentsEnabled?: boolean;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  videoCount: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  isRead: boolean;
  relatedUserId?: string;
  relatedUserName?: string;
  relatedUserAvatar?: string;
  relatedVideoId?: string;
  relatedVideoTitle?: string;
  createdAt: string;
}

export interface GuideStep {
  stepNumber: number;
  text: string;
}

export interface GuideImage {
  url: string;
  caption: string;
}

export interface AIGuide {
  id?: string;
  query: string;
  steps: GuideStep[];
  images: GuideImage[];
  language: string;
  createdAt?: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  status: "open" | "answered" | "solved";
  commentsCount: number;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostData {
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
}

export interface CommunityComment {
  id: string;
  content: string;
  isSolution: boolean;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  linkedVideoId?: string;
  linkedVideoTitle?: string;
  linkedVideoThumbnail?: string;
  createdAt: string;
}

export interface LiveAssistStep {
  stepNumber: number;
  text: string;
}

export interface LiveAssistResponse {
  success: boolean;
  analysis: {
    summary: string;
    possibleIssue: string;
    steps: LiveAssistStep[];
    safetyNote?: string;
    rawResponse: string;
  };
  error?: string;
}

export const api = new ApiClient();
