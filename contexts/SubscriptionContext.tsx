import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../utils/api";
import { useAuth } from "./AuthContext";

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
  startTrial: () => Promise<{ success: boolean; error?: string }>;
  createCheckout: () => Promise<{ url?: string; error?: string }>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  checkImageLimit: () => Promise<{ allowed: boolean; remaining?: number; message?: string }>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [usage, setUsage] = useState<UsageState | null>(null);
  const [config, setConfig] = useState<{ priceSek: number; trialDays: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
