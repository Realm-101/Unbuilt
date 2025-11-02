import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { z } from 'zod';
import * as schema from '@shared/schema';
import type { CursorPosition, Metadata } from '@shared/types';
import { planWebSocketService } from './services/planWebSocketService';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

interface CollaborationRoom {
  id: string;
  participants: Map<string, {
    userId: number;
    userName: string;
    cursor?: CursorPosition;
    selection?: string;
    ws: WebSocket;
  }>;
  sharedState: Metadata;
  lastActivity: Date;
}

const MessageSchema = z.object({
  type: z.enum(['join', 'leave', 'cursor', 'selection', 'state-update', 'chat', 'typing']),
  roomId: z.string(),
  data: z.any(),
});

export class CollaborationServer {
  private wss: WebSocketServer;
  private rooms: Map<string, CollaborationRoom> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', async (ws: WebSocket, req) => {
      // Try to authenticate using JWT for action plan features
      const user = await planWebSocketService.authenticateConnection(ws, req);
      
      if (user) {
        // Handle authenticated connection for action plans
        planWebSocketService.handleConnection(ws, user);
        return;
      }

      // Fallback to legacy authentication for collaboration features
      const userId = this.extractUserId(req);
      if (!userId) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          const parsed = MessageSchema.parse(message);
          this.handleMessage(ws, userId, parsed);
        } catch (error) {
          console.error('Invalid message:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws, userId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      ws.send(JSON.stringify({
        type: 'connected',
        userId,
        timestamp: new Date().toISOString(),
      }));
    });

    // Clean up inactive rooms every 5 minutes
    setInterval(() => {
      const now = new Date();
      this.rooms.forEach((room, roomId) => {
        const inactiveTime = now.getTime() - room.lastActivity.getTime();
        if (inactiveTime > 30 * 60 * 1000 && room.participants.size === 0) {
          this.rooms.delete(roomId);
          console.log(`Cleaned up inactive room: ${roomId}`);
        }
      });
    }, 5 * 60 * 1000);
  }

  private extractUserId(req: { headers: { cookie?: string } }): number | null {
    // Extract user ID from session or JWT token
    // This is a simplified version - implement proper authentication
    const cookies = req.headers.cookie?.split('; ') || [];
    const sessionCookie = cookies.find((c: string) => c.startsWith('session='));
    if (sessionCookie) {
      try {
        // Decode session and extract user ID
        // This is placeholder - implement actual session decoding
        return 1; // Return test user ID for now
      } catch {
        return null;
      }
    }
    return null;
  }

  private async handleMessage(ws: WebSocket, userId: number, message: z.infer<typeof MessageSchema>) {
    const { type, roomId, data } = message;
    
    switch (type) {
      case 'join':
        await this.handleJoinRoom(ws, userId, roomId, data);
        break;
      
      case 'leave':
        this.handleLeaveRoom(userId, roomId);
        break;
      
      case 'cursor':
        this.handleCursorUpdate(userId, roomId, data);
        break;
      
      case 'selection':
        this.handleSelectionUpdate(userId, roomId, data);
        break;
      
      case 'state-update':
        this.handleStateUpdate(userId, roomId, data);
        break;
      
      case 'chat':
        this.handleChatMessage(userId, roomId, data);
        break;
      
      case 'typing':
        this.handleTypingIndicator(userId, roomId, data);
        break;
    }
  }

  private async handleJoinRoom(ws: WebSocket, userId: number, roomId: string, data: { userName?: string }) {
    // Get or create room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        participants: new Map(),
        sharedState: {},
        lastActivity: new Date(),
      });
    }

    const room = this.rooms.get(roomId)!;
    
    // Add participant
    room.participants.set(userId.toString(), {
      userId,
      userName: data.userName || `User ${userId}`,
      ws,
    });

    // Notify other participants
    this.broadcastToRoom(roomId, {
      type: 'user-joined',
      userId,
      userName: data.userName,
      participantCount: room.participants.size,
    }, userId);

    // Send current state to new participant
    ws.send(JSON.stringify({
      type: 'room-state',
      roomId,
      participants: Array.from(room.participants.entries()).map(([id, p]) => ({
        userId: p.userId,
        userName: p.userName,
        cursor: p.cursor,
        selection: p.selection,
      })),
      sharedState: room.sharedState,
    }));

    room.lastActivity = new Date();
  }

  private handleLeaveRoom(userId: number, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.delete(userId.toString());
    
    // Notify other participants
    this.broadcastToRoom(roomId, {
      type: 'user-left',
      userId,
      participantCount: room.participants.size,
    });

    room.lastActivity = new Date();
  }

  private handleCursorUpdate(userId: number, roomId: string, data: { cursor: CursorPosition }) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(userId.toString());
    if (!participant) return;

    participant.cursor = data.cursor;

    // Broadcast cursor position to others
    this.broadcastToRoom(roomId, {
      type: 'cursor-update',
      userId,
      cursor: data.cursor,
    }, userId);

    room.lastActivity = new Date();
  }

  private handleSelectionUpdate(userId: number, roomId: string, data: { selection: string }) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(userId.toString());
    if (!participant) return;

    participant.selection = data.selection;

    // Broadcast selection to others
    this.broadcastToRoom(roomId, {
      type: 'selection-update',
      userId,
      selection: data.selection,
    }, userId);

    room.lastActivity = new Date();
  }

  private handleStateUpdate(userId: number, roomId: string, data: { changes: Metadata }) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Apply state update
    room.sharedState = { ...room.sharedState, ...data.changes };

    // Broadcast state changes to all participants
    this.broadcastToRoom(roomId, {
      type: 'state-changed',
      userId,
      changes: data.changes,
      timestamp: new Date().toISOString(),
    });

    room.lastActivity = new Date();
  }

  private handleChatMessage(userId: number, roomId: string, data: { message: string }) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(userId.toString());
    if (!participant) return;

    // Broadcast chat message to all participants
    this.broadcastToRoom(roomId, {
      type: 'chat-message',
      userId,
      userName: participant.userName,
      message: data.message,
      timestamp: new Date().toISOString(),
    });

    room.lastActivity = new Date();
  }

  private handleTypingIndicator(userId: number, roomId: string, data: { isTyping: boolean }) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(userId.toString());
    if (!participant) return;

    // Broadcast typing indicator to others
    this.broadcastToRoom(roomId, {
      type: 'typing-indicator',
      userId,
      userName: participant.userName,
      isTyping: data.isTyping,
    }, userId);
  }

  private handleDisconnect(ws: WebSocket, userId: number) {
    // Remove user from all rooms
    this.rooms.forEach((room, roomId) => {
      const participant = room.participants.get(userId.toString());
      if (participant && participant.ws === ws) {
        this.handleLeaveRoom(userId, roomId);
      }
    });
  }

  private broadcastToRoom(roomId: string, message: Record<string, unknown>, excludeUserId?: number) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    room.participants.forEach((participant) => {
      if (participant.userId !== excludeUserId && participant.ws.readyState === WebSocket.OPEN) {
        participant.ws.send(messageStr);
      }
    });
  }

  public getRoomInfo(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      id: room.id,
      participantCount: room.participants.size,
      participants: Array.from(room.participants.values()).map(p => ({
        userId: p.userId,
        userName: p.userName,
      })),
      lastActivity: room.lastActivity,
    };
  }

  public getAllRooms() {
    return Array.from(this.rooms.entries()).map(([id, room]) => ({
      id,
      participantCount: room.participants.size,
      lastActivity: room.lastActivity,
    }));
  }
}