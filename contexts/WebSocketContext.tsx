/**
 * WebSocket Context for QuickFix
 * Provides real-time communication for:
 * - message.updated: LiveAssist step progress updates  
 * - subscription.updated: Subscription status changes
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

type WebSocketEventHandler = (data: any) => void;

interface WebSocketContextType {
  connected: boolean;
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: () => void;
  onMessage: (eventType: string, handler: WebSocketEventHandler) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    return {
      connected: false,
      subscribeToSession: () => {},
      unsubscribeFromSession: () => {},
      onMessage: () => () => {},
    };
  }
  return ctx;
};

// Get WebSocket URL based on platform
const getWebSocketUrl = (): string => {
  if (Platform.OS === 'web') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  // For native apps, use the backend URL
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://2185aef7-8c7d-4229-b7af-f871e5ca81dc-00-2tts9ks91qr3q.riker.replit.dev';
  const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws';
  return wsUrl;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, setWebSocketConnected } = useAuth();
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<WebSocketEventHandler>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSessionRef = useRef<string | null>(null);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = getWebSocketUrl();
      console.log('[WebSocket] Connecting to:', wsUrl);
      
      // Get auth token from AsyncStorage
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        console.log('[WebSocket] No auth token found, skipping connection');
        return;
      }
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setConnected(true);
        setWebSocketConnected(true);

        // Authenticate with JWT token (Fix: use token instead of userId)
        ws.send(JSON.stringify({ type: 'auth', token: authToken }));

        // Resubscribe to session if we had one after auth succeeds
        // Note: Subscription is handled in onmessage after auth.success
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] ====== MESSAGE RECEIVED ======');
          console.log('[WebSocket] Type:', data.type);
          console.log('[WebSocket] Payload:', JSON.stringify(data));

          // Handle auth success - resubscribe to session if we had one
          if (data.type === 'auth.success') {
            console.log('[WebSocket] Authentication successful');
            if (currentSessionRef.current) {
              console.log('[WebSocket] Resubscribing to session:', currentSessionRef.current);
              ws.send(JSON.stringify({ type: 'subscribe.session', sessionId: currentSessionRef.current }));
            }
          }
          
          // Log subscription.updated events specially
          if (data.type === 'subscription.updated') {
            console.log('[WebSocket] *** SUBSCRIPTION.UPDATED EVENT ***');
            console.log('[WebSocket] subscription_status:', data.subscription_status);
            console.log('[WebSocket] subscription_expiry:', data.subscription_expiry);
          }

          // Dispatch to handlers
          const handlers = handlersRef.current.get(data.type);
          if (handlers && handlers.size > 0) {
            console.log('[WebSocket] Dispatching to', handlers.size, 'handlers for', data.type);
            handlers.forEach((handler) => handler(data));
          } else {
            console.log('[WebSocket] No handlers registered for:', data.type);
          }
        } catch (err) {
          console.log('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        setConnected(false);
        setWebSocketConnected(false);
        wsRef.current = null;

        // Reconnect after 5 seconds if we were authenticated
        if (isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.log('[WebSocket] Error:', error);
      };
    } catch (err) {
      console.log('[WebSocket] Connection error:', err);
    }
  }, [user?.id, isAuthenticated, setWebSocketConnected]);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, connect]);

  const subscribeToSession = useCallback((sessionId: string) => {
    currentSessionRef.current = sessionId;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe.session', sessionId }));
      console.log('[WebSocket] Subscribed to session:', sessionId);
    }
  }, []);

  const unsubscribeFromSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && currentSessionRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe.session' }));
    }
    currentSessionRef.current = null;
  }, []);

  const onMessage = useCallback((eventType: string, handler: WebSocketEventHandler) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());
    }
    handlersRef.current.get(eventType)!.add(handler);

    // Return cleanup function
    return () => {
      handlersRef.current.get(eventType)?.delete(handler);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ connected, subscribeToSession, unsubscribeFromSession, onMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};
