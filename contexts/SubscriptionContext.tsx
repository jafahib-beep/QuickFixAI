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

  // Listen for WebSocket subscription.updated events
  useEffect(() => {
    const unsubscribe = onMessage('subscription.updated', async (data: any) => {
      console.log('[SubscriptionContext] ====== WEBSOCKET subscription.updated RECEIVED ======');
      console.log('[SubscriptionContext] Raw data:', JSON.stringify(data));
      console.log('[SubscriptionContext] subscription_status:', data.subscription_status);
      console.log('[SubscriptionContext] subscription_expiry:', data.subscription_expiry);
      
      // Immediately update subscription state
      if (data.subscription_status === 'paid') {
        console.log('[SubscriptionContext] Updating to PAID state');
        setSubscription(prev => {
          const newState = {
            plan: 'paid' as const,
            status: 'active',
            isActive: true,
            isPremium: true,
            trialEndsAt: prev?.trialEndsAt || null,
            paidUntil: data.subscription_expiry || prev?.paidUntil || null,
          };
          console.log('[SubscriptionContext] New subscription state:', JSON.stringify(newState));
          return newState;
        });
        
        // Reset usage on new subscription
        setUsage(prev => ({
          imagesUsedToday: 0,
          dailyImageLimit: null,
          canUploadVideo: true,
        }));
        console.log('[SubscriptionContext] Reset usage state');
        
        // Refresh user to get updated subscription_status from server
        console.log('[SubscriptionContext] Calling refreshUser()...');
        try {
          await refreshUser();
          console.log('[SubscriptionContext] refreshUser() completed successfully');
        } catch (err) {
          console.log('[SubscriptionContext] refreshUser() error:', err);
        }
      } else if (data.subscription_status === 'free') {
        console.log('[SubscriptionContext] Updating to FREE state');
        setSubscription({
          plan: 'free',
          status: 'inactive',
          isActive: false,
          isPremium: false,
          trialEndsAt: null,
          paidUntil: null,
        });
        
        await refreshUser();
      }
      console.log('[SubscriptionContext] ====== WEBSOCKET PROCESSING COMPLETE ======');
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
