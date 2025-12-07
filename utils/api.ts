import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

const BACKEND_PORT = 5000;

function getApiBaseUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return "/api";
  }

  const replitDevDomain = Constants.expoConfig?.extra?.REPLIT_DEV_DOMAIN;
  if (replitDevDomain) {
    if (replitDevDomain.includes(".riker.replit.dev")) {
      const parts = replitDevDomain.split(".riker.replit.dev")[0];
      return `https://${parts}-${BACKEND_PORT}.riker.replit.dev/api`;
    }
    const parts = replitDevDomain.split(".replit.dev")[0];
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

  async recordVideoWatch(id: string) {
    return this.request<{
      success: boolean;
      xpAwarded: number;
      totalXp?: number;
      level?: number;
    }>(`/videos/${id}/watch`, {
      method: "POST",
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
  }): Promise<{ answer: string; rawResponse?: unknown }> {
    console.log("[API MOCK] chat called with:", data);
    
    const lastMessage =
      data.messages?.filter(m => m.role === "user").pop()?.content || "";

    const mockResponses = [
      "I understand you're experiencing an issue. Let me help you troubleshoot this step by step.",
      "That's a common problem! Here are some things you can try to fix it.",
      "Based on what you've described, this could be caused by a few different things.",
      "Great question! Let me walk you through how to address this.",
    ];
    
    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
    const answer =
      "QuickFix AI (demo mode):\n\n" +
      randomResponse + "\n\n" +
      `You asked: "${lastMessage}"\n\n` +
      "Tips:\n" +
      "1. Check if all connections are secure\n" +
      "2. Try turning the device off and on again\n" +
      "3. Look for any visible damage or wear\n" +
      "4. Consult the user manual for specific guidance\n\n" +
      "When the real backend is connected, you'll get AI-powered responses tailored to your specific issue.";

    return { answer, rawResponse: { mock: true } };
  }


  async liveAssist(imageBase64: string, language: string = "en"): Promise<LiveAssistResponse> {
    console.log("[API MOCK] liveAssist called with:", {
      hasImage: !!imageBase64,
      imageLength: imageBase64?.length || 0,
      language,
    });

    const localizedResponses: Record<string, {
      summary: string;
      possibleIssue: string;
      safetyNote: string;
      steps: { stepNumber: number; text: string }[];
    }> = {
      en: {
        summary: "I analyzed the image and found an area that could be the problem.",
        possibleIssue: "There may be a loose cable, dirt, or a damaged component in the marked area.",
        safetyNote: "Turn off the power and be careful when touching electrical components.",
        steps: [
          { stepNumber: 1, text: "Turn off the device or power before you continue." },
          { stepNumber: 2, text: "Inspect the area that QuickFix AI would highlight for any loose or dirty parts." },
          { stepNumber: 3, text: "Gently clean or reconnect parts that look loose or dirty." },
          { stepNumber: 4, text: "If you are unsure or the problem remains, contact a certified technician." }
        ]
      },
      sv: {
        summary: "Jag analyserade bilden och hittade ett område som kan vara problemet.",
        possibleIssue: "Det kan finnas en lös kabel, smuts eller en skadad komponent i det markerade området.",
        safetyNote: "Stäng av strömmen och var försiktig när du rör elektriska komponenter.",
        steps: [
          { stepNumber: 1, text: "Stäng av enheten eller strömmen innan du fortsätter." },
          { stepNumber: 2, text: "Inspektera området som QuickFix AI skulle markera för lösa eller smutsiga delar." },
          { stepNumber: 3, text: "Rengör försiktigt eller återanslut delar som ser lösa eller smutsiga ut." },
          { stepNumber: 4, text: "Om du är osäker eller problemet kvarstår, kontakta en certifierad tekniker." }
        ]
      },
      de: {
        summary: "Ich habe das Bild analysiert und einen Bereich gefunden, der das Problem sein könnte.",
        possibleIssue: "Es könnte ein loses Kabel, Schmutz oder eine beschädigte Komponente im markierten Bereich sein.",
        safetyNote: "Schalten Sie den Strom aus und seien Sie vorsichtig beim Berühren elektrischer Komponenten.",
        steps: [
          { stepNumber: 1, text: "Schalten Sie das Gerät oder den Strom aus, bevor Sie fortfahren." },
          { stepNumber: 2, text: "Überprüfen Sie den Bereich, den QuickFix AI markieren würde, auf lose oder schmutzige Teile." },
          { stepNumber: 3, text: "Reinigen oder verbinden Sie vorsichtig Teile, die lose oder schmutzig aussehen." },
          { stepNumber: 4, text: "Wenn Sie unsicher sind oder das Problem weiterhin besteht, wenden Sie sich an einen zertifizierten Techniker." }
        ]
      },
      fr: {
        summary: "J'ai analysé l'image et trouvé une zone qui pourrait être le problème.",
        possibleIssue: "Il peut y avoir un câble desserré, de la saleté ou un composant endommagé dans la zone marquée.",
        safetyNote: "Coupez l'alimentation et soyez prudent lorsque vous touchez des composants électriques.",
        steps: [
          { stepNumber: 1, text: "Éteignez l'appareil ou l'alimentation avant de continuer." },
          { stepNumber: 2, text: "Inspectez la zone que QuickFix AI mettrait en évidence pour les pièces desserrées ou sales." },
          { stepNumber: 3, text: "Nettoyez doucement ou reconnectez les pièces qui semblent desserrées ou sales." },
          { stepNumber: 4, text: "Si vous n'êtes pas sûr ou si le problème persiste, contactez un technicien certifié." }
        ]
      },
      es: {
        summary: "Analicé la imagen y encontré un área que podría ser el problema.",
        possibleIssue: "Puede haber un cable suelto, suciedad o un componente dañado en el área marcada.",
        safetyNote: "Apague la energía y tenga cuidado al tocar componentes eléctricos.",
        steps: [
          { stepNumber: 1, text: "Apague el dispositivo o la energía antes de continuar." },
          { stepNumber: 2, text: "Inspeccione el área que QuickFix AI resaltaría en busca de piezas sueltas o sucias." },
          { stepNumber: 3, text: "Limpie suavemente o reconecte las piezas que parezcan sueltas o sucias." },
          { stepNumber: 4, text: "Si no está seguro o el problema persiste, contacte a un técnico certificado." }
        ]
      },
      ar: {
        summary: "قمت بتحليل الصورة ووجدت منطقة قد تكون المشكلة.",
        possibleIssue: "قد يكون هناك كابل مفكوك أو أوساخ أو مكون تالف في المنطقة المحددة.",
        safetyNote: "أوقف التيار الكهربائي وكن حذراً عند لمس المكونات الكهربائية.",
        steps: [
          { stepNumber: 1, text: "أوقف تشغيل الجهاز أو الطاقة قبل المتابعة." },
          { stepNumber: 2, text: "افحص المنطقة التي سيبرزها QuickFix AI بحثاً عن أجزاء مفككة أو متسخة." },
          { stepNumber: 3, text: "نظف بلطف أو أعد توصيل الأجزاء التي تبدو مفككة أو متسخة." },
          { stepNumber: 4, text: "إذا لم تكن متأكداً أو استمرت المشكلة، اتصل بفني معتمد." }
        ]
      }
    };

    const response = localizedResponses[language] || localizedResponses.en;

    return {
      success: true,
      analysis: {
        summary: response.summary,
        possibleIssue: response.possibleIssue,
        safetyNote: response.safetyNote,
        steps: response.steps,
        rawResponse: JSON.stringify({ mock: true, timestamp: Date.now(), language })
      }
    };
  }


  async checkAIServiceHealth(): Promise<boolean> {
    console.log("[API MOCK] checkAIServiceHealth called - returning true (mock mode)");
    return true;
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

  async submitReport(data: {
    targetUserId?: string;
    contentId?: string;
    contentType: "video" | "profile" | "comment";
    reason: string;
    message?: string;
  }) {
    return this.request<{
      success: boolean;
      reportId: string;
      createdAt: string;
    }>("/reports", {
      method: "POST",
      body: data,
      requireAuth: true,
    });
  }

  async blockUser(targetUserId: string) {
    return this.request<{ status: string }>("/block", {
      method: "POST",
      body: { targetUserId },
      requireAuth: true,
    });
  }

  async unblockUser(targetUserId: string) {
    return this.request<{ status: string }>("/unblock", {
      method: "POST",
      body: { targetUserId },
      requireAuth: true,
    });
  }

  async getBlockedUsers() {
    return this.request<{ blockedUserIds: string[] }>("/blocked", {
      requireAuth: true,
    });
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
  xp: number;
  level: number;
  nextLevelXp: number;
  currentLevelXp: number;
  createdAt?: string;
}

export interface UserProfile extends User {
  isFollowing: boolean;
  isBlocked?: boolean;
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
  isYouTube?: boolean;
  youtubeId?: string;
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

export interface LiveAssistOverlay {
  x: number;
  y: number;
  width: number;
  height: number;
  stepIndex: number | null;
  label: string;
}

export type RiskSeverity = "low" | "medium" | "high";

export interface RiskEntry {
  label: string;
  severity: RiskSeverity;
  recommendation: string;
}

export interface RiskOverlay {
  x: number;
  y: number;
  width: number;
  height: number;
  riskLabel: string;
  severity: RiskSeverity;
}

export type SparePartPriority = "primary" | "optional";

export interface SparePart {
  name: string;
  category: string;
  description: string;
  specs: string[];
  compatibility: string;
  priority: SparePartPriority;
  notes: string;
  overlayIndex: number | null;
}

export interface LiveAssistResponse {
  success: boolean;
  analysis: {
    summary: string;
    possibleIssue: string;
    steps: LiveAssistStep[];
    safetyNote?: string;
    overlays?: LiveAssistOverlay[];
    riskLevel?: RiskSeverity;
    riskSummary?: string;
    risks?: RiskEntry[];
    riskOverlays?: RiskOverlay[];
    spareParts?: SparePart[];
    rawResponse: string;
  };
  error?: string;
}

export const api = new ApiClient();
