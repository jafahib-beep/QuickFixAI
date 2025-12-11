import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Platform, Alert } from "react-native";
import * as Linking from "expo-linking";
import { api } from "../utils/api";
import { useAuth } from "./AuthContext";
import { useWebSocket } from "./WebSocketContext";

export interface SubscriptionState {
  plan: "free" | "trial" | "paid";
  status: string;
  isActive: boolean;
  isPremium: boolean;
  trialEndsAt: string | null;
  paidUntil: string | null;
}

export interface UsageState {
  imagesUsedToday: number;
  dailyImageLimit: number | null;
  canUploadVideo: boolean;
}

interface SubscriptionContextType {
  subscription: SubscriptionState | null;
  usage: UsageState | null;
  config: { priceSek: number; trialDays: number } | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  startTrial: () => Promise<{ success: boolean; error?: string }>;
  createCheckout: () => Promise<{ url?: string; error?: string }>;
  cancelSubscription: () => Promise<{ success: boolean; message?: string; error?: string }>;
  checkImageLimit: () => Promise<{ allowed: boolean; remaining?: number; message?: string }>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();
  const { onMessage } = useWebSocket();
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [usage, setUsage] = useState<UsageState | null>(null);
  const [config, setConfig] = useState<{ priceSek: number; trialDays: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fix 2: Listen for WebSocket subscription.updated events
  useEffect(() => {
    const unsubscribe = onMessage('subscription.updated', async (data: any) => {
      console.log('[Subscription] Received WebSocket subscription.updated:', data);
      
      // Immediately update subscription state
      if (data.subscription_status === 'paid') {
        setSubscription(prev => prev ? {
          ...prev,
          plan: 'paid',
          status: 'active',
          isActive: true,
          isPremium: true,
          paidUntil: data.subscription_expiry || prev.paidUntil,
        } : {
          plan: 'paid',
          status: 'active',
          isActive: true,
          isPremium: true,
          trialEndsAt: null,
          paidUntil: data.subscription_expiry || null,
        });
        
        // Reset usage on new subscription
        setUsage(prev => prev ? {
          ...prev,
          imagesUsedToday: 0,
          dailyImageLimit: null,
          canUploadVideo: true,
        } : {
          imagesUsedToday: 0,
          dailyImageLimit: null,
          canUploadVideo: true,
        });
        
        // Refresh user to get updated subscription_status
        await refreshUser();
      } else if (data.subscription_status === 'free') {
        setSubscription(prev => prev ? {
          ...prev,
          plan: 'free',
          status: 'inactive',
          isActive: false,
          isPremium: false,
          paidUntil: null,
        } : {
          plan: 'free',
          status: 'inactive',
          isActive: false,
          isPremium: false,
          trialEndsAt: null,
          paidUntil: null,
        });
        
        await refreshUser();
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [onMessage, refreshUser]);

  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setUsage(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await api.getSubscriptionStatus();
      setSubscription(result.subscription);
      setUsage(result.usage);
      setConfig(result.config);
    } catch (err: any) {
      console.log("[Subscription] Failed to fetch status:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshSubscription();
    } else {
      setSubscription(null);
      setUsage(null);
    }
  }, [user, refreshSubscription]);

  // Detect return from Stripe checkout and refresh subscription status
  const hasCheckedUrl = useRef(false);
  useEffect(() => {
    if (!user || hasCheckedUrl.current) return;
    
    const checkUrlForSubscription = async () => {
      try {
        let url: string | null = null;
        
        if (Platform.OS === "web" && typeof window !== "undefined") {
          url = window.location.href;
        } else {
          url = await Linking.getInitialURL();
        }
        
        if (url && url.includes("subscription=success")) {
          console.log("[Subscription] Detected successful checkout return, refreshing status...");
          hasCheckedUrl.current = true;
          
          // Wait a moment for webhook to process
          await new Promise(resolve => setTimeout(resolve, 2000));
          await refreshSubscription();
          
          // Show success message
          Alert.alert(
            "Welcome to Premium!",
            "Your subscription is now active. Enjoy unlimited LiveAssist access!",
            [{ text: "Got it", style: "default" }]
          );
          
          // Clean URL on web
          if (Platform.OS === "web" && typeof window !== "undefined") {
            const cleanUrl = url.split("?")[0];
            window.history.replaceState({}, document.title, cleanUrl);
          }
        } else if (url && url.includes("subscription=canceled")) {
          hasCheckedUrl.current = true;
          console.log("[Subscription] Checkout was canceled");
          
          if (Platform.OS === "web" && typeof window !== "undefined") {
            const cleanUrl = url.split("?")[0];
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }
      } catch (err) {
        console.log("[Subscription] Error checking URL:", err);
      }
    };
    
    checkUrlForSubscription();
  }, [user, refreshSubscription]);

  const startTrial = useCallback(async () => {
    try {
      const result = await api.startTrial();
      await refreshSubscription();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [refreshSubscription]);

  const createCheckout = useCallback(async () => {
    try {
      const result = await api.createCheckoutSession();
      return { url: result.url };
    } catch (err: any) {
      return { error: err.message };
    }
  }, []);

  const cancelSubscription = useCallback(async () => {
    try {
      const result = await api.cancelSubscription();
      await refreshSubscription();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [refreshSubscription]);

  const checkImageLimit = useCallback(async () => {
    try {
      const result = await api.checkImageLimit();
      return result;
    } catch (err: any) {
      return { allowed: false, message: err.message };
    }
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        usage,
        config,
        loading,
        error,
        refreshSubscription,
        refreshStatus: refreshSubscription,
        startTrial,
        createCheckout,
        cancelSubscription,
        checkImageLimit,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
