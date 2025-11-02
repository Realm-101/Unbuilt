import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PlanTask } from '@/types/action-plan';

/**
 * WebSocket Hook for Action Plan Real-Time Updates
 * 
 * Provides real-time synchronization for action plan modifications:
 * - Automatically connects when component mounts
 * - Joins specified plan room
 * - Listens for task updates and invalidates queries
 * - Handles reconnection on connection loss
 * - Cleans up on unmount
 */

interface WebSocketMessage {
  type: 'join-plan' | 'leave-plan' | 'task-updated' | 'task-created' | 'task-deleted' | 
        'task-reordered' | 'progress-updated' | 'pong';
  planId?: string;
  data?: any;
  timestamp?: string;
}

interface UsePlanWebSocketOptions {
  planId: string;
  enabled?: boolean;
  onTaskUpdated?: (task: PlanTask) => void;
  onTaskCreated?: (task: PlanTask) => void;
  onTaskDeleted?: (taskId: string) => void;
  onTaskReordered?: (taskIds: string[]) => void;
  onProgressUpdated?: (progress: any) => void;
  onUserJoined?: (data: { userId: number; userName: string; participantCount: number }) => void;
  onUserLeft?: (data: { userId: number; participantCount: number }) => void;
}

export function usePlanWebSocket(options: UsePlanWebSocketOptions) {
  const {
    planId,
    enabled = true,
    onTaskUpdated,
    onTaskCreated,
    onTaskDeleted,
    onTaskReordered,
    onProgressUpdated,
    onUserJoined,
    onUserLeft,
  } = options;

  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!enabled || !planId) return;

    // Get access token from localStorage or cookie
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('No access token found for WebSocket connection');
      return;
    }

    // Determine WebSocket URL based on environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Join plan room
        ws.send(JSON.stringify({
          type: 'join-plan',
          planId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [enabled, planId]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'join-plan':
        if (message.data?.participantCount !== undefined) {
          setParticipantCount(message.data.participantCount);
        }
        if (message.data?.userId && message.data?.userName && onUserJoined) {
          onUserJoined(message.data);
        }
        break;

      case 'leave-plan':
        if (message.data?.participantCount !== undefined) {
          setParticipantCount(message.data.participantCount);
        }
        if (message.data?.userId && onUserLeft) {
          onUserLeft(message.data);
        }
        break;

      case 'task-updated':
        if (message.data?.task) {
          // Invalidate queries to refetch updated data
          queryClient.invalidateQueries({ queryKey: ['plan', planId] });
          queryClient.invalidateQueries({ queryKey: ['plan', planId, 'tasks'] });
          queryClient.invalidateQueries({ queryKey: ['plan', planId, 'progress'] });
          
          if (onTaskUpdated) {
            onTaskUpdated(message.data.task);
          }
        }
        break;

      case 'task-created':
        if (message.data?.task) {
          // Invalidate queries to refetch updated data
          queryClient.invalidateQueries({ queryKey: ['plan', planId] });
          queryClient.invalidateQueries({ queryKey: ['plan', planId, 'tasks'] });
          queryClient.invalidateQueries({ queryKey: ['plan', planId, 'progress'] });
          
          if (onTaskCreated) {
            onTaskCreated(message.data.task);
          }
        }
        break;

      case 'task-deleted':
        if (message.data?.taskId) {
          // Invalidate queries to refetch updated data
          queryClient.invalidateQueries({ queryKey: ['plan', planId] });
          queryClient.invalidateQueries({ queryKey: ['plan', planId, 'tasks'] });
          queryClient.invalidateQueries({ queryKey: ['plan', planId, 'progress'] });
          
          if (onTaskDeleted) {
            onTaskDeleted(message.data.taskId);
          }
        }
        break;

      case 'task-reordered':
        if (message.data?.taskIds) {
          // Invalidate queries to refetch updated data
          queryClient.invalidateQueries({ queryKey: ['plan', planId] });
          queryClient.invalidateQueries({ queryKey: ['plan', planId, 'tasks'] });
          
          if (onTaskReordered) {
            onTaskReordered(message.data.taskIds);
          }
        }
        break;

      case 'progress-updated':
        if (message.data?.progress) {
          // Invalidate progress queries
          queryClient.invalidateQueries({ queryKey: ['plan', planId, 'progress'] });
          
          if (onProgressUpdated) {
            onProgressUpdated(message.data.progress);
          }
        }
        break;

      case 'pong':
        // Connection health check response
        break;

      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }, [planId, queryClient, onTaskUpdated, onTaskCreated, onTaskDeleted, onTaskReordered, onProgressUpdated, onUserJoined, onUserLeft]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      // Send leave message before closing
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'leave-plan',
          planId,
        }));
      }

      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, [planId]);

  const sendPing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'ping',
      }));
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    // Set up ping interval to keep connection alive
    const pingInterval = setInterval(sendPing, 30000); // Ping every 30 seconds

    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, sendPing]);

  return {
    isConnected,
    participantCount,
    reconnect: connect,
    disconnect,
  };
}
