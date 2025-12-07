import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { XpToast } from '@/components/XpToast';
import { LevelUpModal } from '@/components/LevelUpModal';
import { useAuth } from '@/contexts/AuthContext';

interface XpNotification {
  amount: number;
  reason?: string;
}

interface XpContextType {
  showXpToast: (amount: number, reason?: string) => void;
  showLevelUp: (level: number) => void;
  handleXpResponse: (response: {
    xpAwarded?: number;
    totalXp?: number;
    level?: number;
    leveledUp?: boolean;
  }, reason?: string) => void;
}

const XpContext = createContext<XpContextType | undefined>(undefined);

export function XpProvider({ children }: { children: ReactNode }) {
  const { refreshUser, pendingXpNotification, clearPendingXpNotification, user } = useAuth();
  const [toastData, setToastData] = useState<XpNotification | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [levelUpVisible, setLevelUpVisible] = useState(false);

  useEffect(() => {
    if (pendingXpNotification && pendingXpNotification.xpAwarded > 0) {
      setTimeout(() => {
        setToastData({ amount: pendingXpNotification.xpAwarded, reason: 'daily_login' });
        setToastVisible(true);
        
        if (pendingXpNotification.leveledUp && user?.level) {
          setTimeout(() => {
            setLevelUpLevel(user.level);
            setLevelUpVisible(true);
          }, 1000);
        }
        
        clearPendingXpNotification();
      }, 500);
    }
  }, [pendingXpNotification, user?.level]);

  const showXpToast = useCallback((amount: number, reason?: string) => {
    if (amount > 0) {
      setToastData({ amount, reason });
      setToastVisible(true);
    }
  }, []);

  const hideToast = useCallback(() => {
    setToastVisible(false);
    setToastData(null);
  }, []);

  const showLevelUp = useCallback((level: number) => {
    setLevelUpLevel(level);
    setLevelUpVisible(true);
  }, []);

  const hideLevelUp = useCallback(() => {
    setLevelUpVisible(false);
    setLevelUpLevel(null);
  }, []);

  const handleXpResponse = useCallback((response: {
    xpAwarded?: number;
    totalXp?: number;
    level?: number;
    leveledUp?: boolean;
  }, reason?: string) => {
    if (response.xpAwarded && response.xpAwarded > 0) {
      showXpToast(response.xpAwarded, reason);
      
      refreshUser().catch(() => {});
      
      if (response.leveledUp && response.level) {
        setTimeout(() => {
          showLevelUp(response.level!);
        }, 1000);
      }
    }
  }, [showXpToast, showLevelUp, refreshUser]);

  return (
    <XpContext.Provider value={{ showXpToast, showLevelUp, handleXpResponse }}>
      {children}
      <XpToast
        amount={toastData?.amount || 0}
        reason={toastData?.reason}
        visible={toastVisible}
        onHide={hideToast}
      />
      <LevelUpModal
        visible={levelUpVisible}
        level={levelUpLevel || 1}
        onDismiss={hideLevelUp}
      />
    </XpContext.Provider>
  );
}

export function useXp() {
  const context = useContext(XpContext);
  if (context === undefined) {
    throw new Error('useXp must be used within an XpProvider');
  }
  return context;
}
