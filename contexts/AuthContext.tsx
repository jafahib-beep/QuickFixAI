import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { api, User } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cleanLegacyDemoToken } from "@/src/demoTokenGuard";

const LOCAL_USER_KEY = "quickfix_local_user";
const LOCAL_USERS_KEY = "quickfix_local_users";

interface LoginResult {
  success: boolean;
  error?: string;
  xpAwarded?: number;
  leveledUp?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  pendingXpNotification: { xpAwarded: number; leveledUp: boolean } | null;
  clearPendingXpNotification: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingXpNotification, setPendingXpNotification] = useState<{ xpAwarded: number; leveledUp: boolean } | null>(null);
  
  const clearPendingXpNotification = () => {
    setPendingXpNotification(null);
  };

  useEffect(() => {
    loadUser();
  }, []);

  // Fix B: Detect ?subscription=success URL and refresh user immediately
  const subscriptionCheckDone = useRef(false);
  useEffect(() => {
    if (subscriptionCheckDone.current) return;
    
    const checkSubscriptionRedirect = async () => {
      try {
        let url: string | null = null;
        
        if (Platform.OS === "web" && typeof window !== "undefined") {
          url = window.location.href;
        } else {
          url = await Linking.getInitialURL();
        }
        
        if (url && url.includes("subscription=success")) {
          subscriptionCheckDone.current = true;
          console.log("[AuthContext] Detected subscription=success, refreshing user...");
          
          // Wait a moment for webhook to process, then refresh user
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            const userData = await api.getMe();
            setUser(userData);
            console.log("[AuthContext] User refreshed after subscription success");
          } catch (err) {
            console.log("[AuthContext] Failed to refresh user after subscription:", err);
          }
          
          // Clean URL on web
          if (Platform.OS === "web" && typeof window !== "undefined") {
            const cleanUrl = url.split("?")[0];
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }
      } catch (err) {
        console.log("[AuthContext] Error checking subscription URL:", err);
      }
    };
    
    checkSubscriptionRedirect();
  }, []);

  const loadUser = async () => {
    try {
      // Clean up any legacy demo tokens first
      const wasDemo = await cleanLegacyDemoToken();
      if (wasDemo) {
        console.warn("[AuthContext] Cleaned legacy demo token on startup");
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      try {
        const userData = await api.getMe();
        setUser(userData);
      } catch {
        const localUserJson = await AsyncStorage.getItem(LOCAL_USER_KEY);
        if (localUserJson) {
          setUser(JSON.parse(localUserJson));
        } else {
          await AsyncStorage.removeItem("authToken");
          setUser(null);
        }
      }
    } catch (error) {
      console.log("No valid session found");
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem(LOCAL_USER_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const result = await api.login(email, password);
      setUser(result.user);
      
      if (result.xpAwarded && result.xpAwarded > 0) {
        setPendingXpNotification({
          xpAwarded: result.xpAwarded,
          leveledUp: result.leveledUp || false,
        });
      }
      
      return { 
        success: true,
        xpAwarded: result.xpAwarded,
        leveledUp: result.leveledUp,
      };
    } catch (error: any) {
      try {
        const usersJson = await AsyncStorage.getItem(LOCAL_USERS_KEY);
        const users = usersJson ? JSON.parse(usersJson) : {};
        const storedUser = users[email.toLowerCase()];
        if (storedUser && storedUser.password === password) {
          const userData: User = storedUser.user;
          setUser(userData);
          await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userData));
          await AsyncStorage.setItem("authToken", `local_${Date.now()}`);
          return { success: true };
        }
        
        // Demo fallback removed - require real authentication
        console.warn("[AuthContext] Demo fallback disabled. Real authentication required.");
        // Do not create demo users - fall through to invalid credentials error
        
        return { success: false, error: "Invalid email or password" };
      } catch {
        return { success: false, error: "Login failed - please try again" };
      }
    }
  };

  const register = async (email: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await api.register(email, password, displayName);
      setUser(result.user);
      return { success: true };
    } catch (error: any) {
      try {
        const usersJson = await AsyncStorage.getItem(LOCAL_USERS_KEY);
        const users = usersJson ? JSON.parse(usersJson) : {};
        if (users[email.toLowerCase()]) {
          return { success: false, error: "Email already registered" };
        }
        const newUser: User = {
          id: `local_${Date.now()}`,
          email: email.toLowerCase(),
          displayName,
          avatarUrl: undefined,
          bio: undefined,
          followersCount: 0,
          followingCount: 0,
          xp: 0,
          level: 1,
          nextLevelXp: 100,
          currentLevelXp: 0,
        };
        users[email.toLowerCase()] = { user: newUser, password };
        await AsyncStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
        await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
        await AsyncStorage.setItem("authToken", `local_${Date.now()}`);
        setUser(newUser);
        return { success: true };
      } catch {
        return { success: false, error: "Registration failed - please try again" };
      }
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch {
      // API logout failed, continue with local cleanup
    }
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem(LOCAL_USER_KEY);
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const updatedUser = await api.updateProfile(updates);
      setUser(updatedUser);
      return { success: true };
    } catch (error: any) {
      if (user) {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updatedUser));
        const usersJson = await AsyncStorage.getItem(LOCAL_USERS_KEY);
        if (usersJson && user.email) {
          const users = JSON.parse(usersJson);
          if (users[user.email]) {
            users[user.email].user = updatedUser;
            await AsyncStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
          }
        }
        return { success: true };
      }
      return { success: false, error: "Update failed" };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.changePassword(currentPassword, newPassword);
      return { success: true };
    } catch (error: any) {
      if (user && user.email) {
        const usersJson = await AsyncStorage.getItem(LOCAL_USERS_KEY);
        if (usersJson) {
          const users = JSON.parse(usersJson);
          if (users[user.email] && users[user.email].password === currentPassword) {
            users[user.email].password = newPassword;
            await AsyncStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
            return { success: true };
          }
        }
        return { success: false, error: "Current password is incorrect" };
      }
      return { success: false, error: "Password change failed" };
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (error) {
      const localUserJson = await AsyncStorage.getItem(LOCAL_USER_KEY);
      if (localUserJson) {
        setUser(JSON.parse(localUserJson));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        refreshUser,
        pendingXpNotification,
        clearPendingXpNotification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
