import { WebSocket } from 'ws';
import { jwtService } from '../jwt';
import type { PlanTask } from '@shared/schema';

/**
 * WebSocket Service for Action Plan Real-Time Updates
 * 
 * Provides real-time synchronization for action plan modifications:
 * - Task status changes
 * - Task creation/editing/deletion
 * - Task reordering
 * - Progress updates
 * - User presence indicators
 */

interface PlanRoom {
  planId: string;
  participants: Map<string, PlanParticipant>;
  lastActivity: Date;
}

interface PlanParticipant {
  userId: number;
  userName: string;
  email: string;
  ws: WebSocket;
  joinedAt: Date;
  lastActivity: Date;
}

interface WebSocketMessage {
  type: 'join-plan' | 'leave-plan' | 'task-updated' | 'task-created' | 'task-deleted' | 
        'task-reordered' | 'progress-updated' | 'ping' | 'pong';
  planId?: string;
  data?: any;
  timestamp?: string;
}

export class PlanWebSocketService {
  private rooms: Map<string, PlanRoom> = new Map();
  private userConnections: Map<number, Set<WebSocket>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTask();
  }

  /**
   * Authenticate WebSocket connection using JWT token
   * Supports both query parameter and Authorization header
   */
  async authenticateConnection(
    ws: WebSocket,
    req: { url?: string; headers: { authorization?: string; cookie?: string } }
  ): Promise<{ userId: number; email: string; userName: string } | null> {
    try {
      // Try to extract token from query parameter
      let token: string | null = null;
      
      if (req.url) {
        const url = new URL(req.url, 'http://localhost');
        token = url.searchParams.get('token');
      }

      // Fallback to Authorization header
      if (!token && req.headers.authorization) {
        token = jwtService.extractTokenFromHeader(req.headers.authorization);
      }

      if (!token) {
        return null;
      }

      // Validate JWT token
      const payload = await jwtService.validateToken(token, 'access');
      if (!payload) {
        return null;
      }

      return {
        userId: parseInt(payload.sub),
        email: payload.email,
        userName: payload.email.split('@')[0], // Simple username extraction
      };
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      return null;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws: WebSocket, user: { userId: number; email: string; userName: string }) {
    // Track user connection
    if (!this.userConnections.has(user.userId)) {
      this.userConnections.set(user.userId, new Set());
    }
    this.userConnections.get(user.userId)!.add(ws);

    // Set up message handler
    ws.on('message', (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(ws, user, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      this.handleDisconnection(ws, user.userId);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Handle ping/pong for connection health
    ws.on('ping', () => {
      ws.pong();
    });

    // Send connection confirmation
    this.sendMessage(ws, {
      type: 'pong',
      data: { 
        userId: user.userId,
        connected: true,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(
    ws: WebSocket,
    user: { userId: number; email: string; userName: string },
    message: WebSocketMessage
  ) {
    switch (message.type) {
      case 'join-plan':
        if (message.planId) {
          this.handleJoinPlan(ws, user, message.planId);
        }
        break;

      case 'leave-plan':
        if (message.planId) {
          this.handleLeavePlan(user.userId, message.planId);
        }
        break;

      case 'ping':
        this.sendMessage(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Handle user joining a plan room
   */
  private handleJoinPlan(
    ws: WebSocket,
    user: { userId: number; email: string; userName: string },
    planId: string
  ) {
    // Create room if it doesn't exist
    if (!this.rooms.has(planId)) {
      this.rooms.set(planId, {
        planId,
        participants: new Map(),
        lastActivity: new Date(),
      });
    }

    const room = this.rooms.get(planId)!;

    // Add participant to room
    room.participants.set(user.userId.toString(), {
      userId: user.userId,
      userName: user.userName,
      email: user.email,
      ws,
      joinedAt: new Date(),
      lastActivity: new Date(),
    });

    room.lastActivity = new Date();

    // Notify user they've joined
    this.sendMessage(ws, {
      type: 'join-plan',
      planId,
      data: {
        success: true,
        participantCount: room.participants.size,
        participants: Array.from(room.participants.values()).map(p => ({
          userId: p.userId,
          userName: p.userName,
        })),
      },
    });

    // Notify other participants
    this.broadcastToPlan(planId, {
      type: 'join-plan',
      planId,
      data: {
        userId: user.userId,
        userName: user.userName,
        participantCount: room.participants.size,
      },
    }, user.userId);

    console.log(`User ${user.userId} joined plan ${planId}`);
  }

  /**
   * Handle user leaving a plan room
   */
  private handleLeavePlan(userId: number, planId: string) {
    const room = this.rooms.get(planId);
    if (!room) return;

    room.participants.delete(userId.toString());
    room.lastActivity = new Date();

    // Notify other participants
    this.broadcastToPlan(planId, {
      type: 'leave-plan',
      planId,
      data: {
        userId,
        participantCount: room.participants.size,
      },
    });

    // Clean up empty rooms
    if (room.participants.size === 0) {
      this.rooms.delete(planId);
      console.log(`Cleaned up empty room for plan ${planId}`);
    }

    console.log(`User ${userId} left plan ${planId}`);
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleDisconnection(ws: WebSocket, userId: number) {
    // Remove from user connections
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    // Remove from all plan rooms
    this.rooms.forEach((room, planId) => {
      const participant = room.participants.get(userId.toString());
      if (participant && participant.ws === ws) {
        this.handleLeavePlan(userId, planId);
      }
    });

    console.log(`User ${userId} disconnected`);
  }

  /**
   * Broadcast task update to all participants in a plan
   */
  broadcastTaskUpdate(planId: string, task: PlanTask, userId?: number) {
    this.broadcastToPlan(planId, {
      type: 'task-updated',
      planId,
      data: { task },
      timestamp: new Date().toISOString(),
    }, userId);
  }

  /**
   * Broadcast task creation to all participants in a plan
   */
  broadcastTaskCreated(planId: string, task: PlanTask, userId?: number) {
    this.broadcastToPlan(planId, {
      type: 'task-created',
      planId,
      data: { task },
      timestamp: new Date().toISOString(),
    }, userId);
  }

  /**
   * Broadcast task deletion to all participants in a plan
   */
  broadcastTaskDeleted(planId: string, taskId: string, userId?: number) {
    this.broadcastToPlan(planId, {
      type: 'task-deleted',
      planId,
      data: { taskId },
      timestamp: new Date().toISOString(),
    }, userId);
  }

  /**
   * Broadcast task reordering to all participants in a plan
   */
  broadcastTaskReordered(planId: string, taskIds: string[], userId?: number) {
    this.broadcastToPlan(planId, {
      type: 'task-reordered',
      planId,
      data: { taskIds },
      timestamp: new Date().toISOString(),
    }, userId);
  }

  /**
   * Broadcast progress update to all participants in a plan
   */
  broadcastProgressUpdate(planId: string, progress: any, userId?: number) {
    this.broadcastToPlan(planId, {
      type: 'progress-updated',
      planId,
      data: { progress },
      timestamp: new Date().toISOString(),
    }, userId);
  }

  /**
   * Broadcast message to all participants in a plan room
   */
  private broadcastToPlan(planId: string, message: WebSocketMessage, excludeUserId?: number) {
    const room = this.rooms.get(planId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    room.participants.forEach((participant) => {
      if (participant.userId !== excludeUserId && participant.ws.readyState === WebSocket.OPEN) {
        try {
          participant.ws.send(messageStr);
          participant.lastActivity = new Date();
          sentCount++;
        } catch (error) {
          console.error(`Failed to send message to user ${participant.userId}:`, error);
        }
      }
    });

    room.lastActivity = new Date();
    
    if (sentCount > 0) {
      console.log(`Broadcasted ${message.type} to ${sentCount} participants in plan ${planId}`);
    }
  }

  /**
   * Send message to specific WebSocket connection
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  }

  /**
   * Send error message to WebSocket connection
   */
  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'pong',
      data: { error },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get room information
   */
  getRoomInfo(planId: string) {
    const room = this.rooms.get(planId);
    if (!room) return null;

    return {
      planId: room.planId,
      participantCount: room.participants.size,
      participants: Array.from(room.participants.values()).map(p => ({
        userId: p.userId,
        userName: p.userName,
        joinedAt: p.joinedAt,
        lastActivity: p.lastActivity,
      })),
      lastActivity: room.lastActivity,
    };
  }

  /**
   * Get all active rooms
   */
  getAllRooms() {
    return Array.from(this.rooms.entries()).map(([planId, room]) => ({
      planId,
      participantCount: room.participants.size,
      lastActivity: room.lastActivity,
    }));
  }

  /**
   * Get user's active connections count
   */
  getUserConnectionCount(userId: number): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  /**
   * Start cleanup task for inactive rooms
   */
  private startCleanupTask() {
    // Clean up inactive rooms every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

      this.rooms.forEach((room, planId) => {
        const inactiveTime = now.getTime() - room.lastActivity.getTime();
        
        // Remove inactive participants
        room.participants.forEach((participant, userId) => {
          const participantInactiveTime = now.getTime() - participant.lastActivity.getTime();
          if (participantInactiveTime > inactiveThreshold) {
            console.log(`Removing inactive participant ${userId} from plan ${planId}`);
            room.participants.delete(userId);
          }
        });

        // Remove empty rooms
        if (room.participants.size === 0 && inactiveTime > inactiveThreshold) {
          console.log(`Cleaning up inactive room for plan ${planId}`);
          this.rooms.delete(planId);
        }
      });
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Stop cleanup task
   */
  stopCleanupTask() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Shutdown service and close all connections
   */
  shutdown() {
    this.stopCleanupTask();

    // Close all WebSocket connections
    this.userConnections.forEach((connections) => {
      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1001, 'Server shutting down');
        }
      });
    });

    // Clear all data
    this.rooms.clear();
    this.userConnections.clear();

    console.log('PlanWebSocketService shut down');
  }
}

// Export singleton instance
export const planWebSocketService = new PlanWebSocketService();
