/**
 * WebSocket Manager for QuickFix
 * Provides real-time communication for:
 * - message.updated: LiveAssist step progress updates
 * - subscription.updated: Subscription status changes
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const JWT_SECRET = process.env.SESSION_SECRET || 'quickfix-jwt-secret-key';

/**
 * Verify JWT token and return decoded payload or null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Verify that a user owns a LiveAssist session
 */
async function verifySessionOwnership(userId, sessionId) {
  try {
    const result = await pool.query(
      'SELECT id FROM liveassist_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.log('[WebSocket] Error verifying session ownership:', err.message);
    return false;
  }
}

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.userSockets = new Map(); // userId -> Set of WebSocket connections
    this.sessionSockets = new Map(); // sessionId -> Set of WebSocket connections
  }

  /**
   * Initialize WebSocket server on the HTTP server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    
    this.wss.on('connection', (ws, req) => {
      console.log('[WebSocket] New connection');
      
      ws.isAlive = true;
      ws.userId = null;
      ws.sessionId = null;
      
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (err) {
          console.log('[WebSocket] Invalid message:', err.message);
        }
      });
      
      ws.on('close', () => {
        this.removeConnection(ws);
      });
      
      ws.on('error', (err) => {
        console.log('[WebSocket] Error:', err.message);
        this.removeConnection(ws);
      });
    });
    
    // Ping/pong heartbeat every 30 seconds
    setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          this.removeConnection(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
    
    console.log('[WebSocket] Server initialized on /ws');
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(ws, message) {
    const { type, sessionId, token } = message;
    
    if (type === 'auth') {
      // Fix: Validate JWT token before authentication
      if (!token) {
        console.log('[WebSocket] Auth rejected: no token provided');
        ws.send(JSON.stringify({ type: 'auth.error', error: 'Token required' }));
        return;
      }
      
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        console.log('[WebSocket] Auth rejected: invalid or expired token');
        ws.send(JSON.stringify({ type: 'auth.error', error: 'Invalid or expired token' }));
        return;
      }
      
      const userId = decoded.userId;
      ws.userId = userId;
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(ws);
      console.log('[WebSocket] User authenticated:', userId);
      ws.send(JSON.stringify({ type: 'auth.success', userId }));
    }
    
    if (type === 'subscribe.session') {
      // Fix: Verify user is authenticated and owns the session
      if (!ws.userId) {
        console.log('[WebSocket] Subscribe rejected: not authenticated');
        ws.send(JSON.stringify({ type: 'subscribe.error', error: 'Authentication required' }));
        return;
      }
      
      if (!sessionId) {
        ws.send(JSON.stringify({ type: 'subscribe.error', error: 'Session ID required' }));
        return;
      }
      
      // Verify user owns this session
      const ownsSession = await verifySessionOwnership(ws.userId, sessionId);
      if (!ownsSession) {
        console.log('[WebSocket] Subscribe rejected: user does not own session', sessionId);
        ws.send(JSON.stringify({ type: 'subscribe.error', error: 'Access denied' }));
        return;
      }
      
      ws.sessionId = sessionId;
      if (!this.sessionSockets.has(sessionId)) {
        this.sessionSockets.set(sessionId, new Set());
      }
      this.sessionSockets.get(sessionId).add(ws);
      console.log('[WebSocket] Subscribed to session:', sessionId);
      ws.send(JSON.stringify({ type: 'subscribe.success', sessionId }));
    }
    
    if (type === 'unsubscribe.session') {
      if (ws.sessionId && this.sessionSockets.has(ws.sessionId)) {
        this.sessionSockets.get(ws.sessionId).delete(ws);
        console.log('[WebSocket] Unsubscribed from session:', ws.sessionId);
        ws.sessionId = null;
      }
    }
  }

  /**
   * Remove a connection from all maps
   */
  removeConnection(ws) {
    if (ws.userId && this.userSockets.has(ws.userId)) {
      this.userSockets.get(ws.userId).delete(ws);
      if (this.userSockets.get(ws.userId).size === 0) {
        this.userSockets.delete(ws.userId);
      }
    }
    
    if (ws.sessionId && this.sessionSockets.has(ws.sessionId)) {
      this.sessionSockets.get(ws.sessionId).delete(ws);
      if (this.sessionSockets.get(ws.sessionId).size === 0) {
        this.sessionSockets.delete(ws.sessionId);
      }
    }
  }

  /**
   * Emit to all sockets for a specific user
   */
  emitToUser(userId, event) {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      console.log(`[WebSocket] EMIT ${event.type}: No active sockets for user ${userId}`);
      return 0;
    }
    
    const message = JSON.stringify(event);
    const socketIds = [];
    let sent = 0;
    sockets.forEach((ws, index) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        socketIds.push(`ws-${userId.substring(0, 8)}-${index}`);
        sent++;
      }
    });
    console.log(`[WebSocket] EMIT ${event.type} to user ${userId}`);
    console.log(`[WebSocket] Socket IDs: [${socketIds.join(', ')}]`);
    console.log(`[WebSocket] Payload: ${message}`);
    return sent;
  }

  /**
   * Emit to all sockets subscribed to a session
   */
  emitToSession(sessionId, event) {
    const sockets = this.sessionSockets.get(sessionId);
    if (!sockets || sockets.size === 0) {
      console.log('[WebSocket] No active sockets for session:', sessionId);
      return;
    }
    
    const message = JSON.stringify(event);
    let sent = 0;
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sent++;
      }
    });
    console.log(`[WebSocket] Emitted ${event.type} to session ${sessionId} (${sent} sockets)`);
  }

  /**
   * Emit subscription.updated event to a user
   */
  emitSubscriptionUpdated(userId, payload) {
    this.emitToUser(userId, {
      type: 'subscription.updated',
      timestamp: new Date().toISOString(),
      ...payload
    });
  }

  /**
   * Emit message.updated event to a session
   * Fix: Emit with messageId and meta fields that frontend expects
   */
  emitMessageUpdated(sessionId, message) {
    this.emitToSession(sessionId, {
      type: 'message.updated',
      timestamp: new Date().toISOString(),
      messageId: message.id,
      meta: message.meta
    });
  }
}

// Singleton instance
const wsManager = new WebSocketManager();

module.exports = { wsManager };
