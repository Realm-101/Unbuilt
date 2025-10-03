import { useEffect, useRef, useCallback, useState } from 'react';
import { create } from 'zustand';
import { useAuth } from './useAuth';
import { ChatMessage } from '@/types/collaboration';

interface Participant {
  userId: number;
  userName: string;
  cursor?: { x: number; y: number };
  selection?: string;
  color?: string;
}

interface CollaborationState {
  ws: WebSocket | null;
  roomId: string | null;
  participants: Map<string, Participant>;
  sharedState: any;
  isConnected: boolean;
  messages: ChatMessage[];
  typingUsers: Set<number>;
}

interface CollaborationActions {
  connect: (roomId: string) => void;
  disconnect: () => void;
  sendCursorUpdate: (cursor: { x: number; y: number }) => void;
  sendSelectionUpdate: (selection: string) => void;
  sendStateUpdate: (changes: any) => void;
  sendChatMessage: (message: string) => void;
  sendTypingIndicator: (isTyping: boolean) => void;
  setParticipants: (participants: Map<string, Participant>) => void;
  addMessage: (message: any) => void;
  setTypingUser: (userId: number, isTyping: boolean) => void;
}

const useCollaborationStore = create<CollaborationState & CollaborationActions>((set, get) => ({
  ws: null,
  roomId: null,
  participants: new Map(),
  sharedState: {},
  isConnected: false,
  messages: [],
  typingUsers: new Set(),

  connect: (roomId: string) => {
    const existingWs = get().ws;
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    ws.onopen = () => {
      set({ isConnected: true, ws, roomId });
      ws.send(JSON.stringify({
        type: 'join',
        roomId,
        data: { userName: 'User' }, // Will be updated with actual username
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message, set, get);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      set({ isConnected: false, ws: null });
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        const currentRoomId = get().roomId;
        if (currentRoomId) {
          get().connect(currentRoomId);
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  },

  disconnect: () => {
    const ws = get().ws;
    if (ws) {
      ws.close();
      set({ ws: null, isConnected: false, roomId: null, participants: new Map() });
    }
  },

  sendCursorUpdate: (cursor) => {
    const ws = get().ws;
    const roomId = get().roomId;
    if (ws && ws.readyState === WebSocket.OPEN && roomId) {
      ws.send(JSON.stringify({
        type: 'cursor',
        roomId,
        data: { cursor },
      }));
    }
  },

  sendSelectionUpdate: (selection) => {
    const ws = get().ws;
    const roomId = get().roomId;
    if (ws && ws.readyState === WebSocket.OPEN && roomId) {
      ws.send(JSON.stringify({
        type: 'selection',
        roomId,
        data: { selection },
      }));
    }
  },

  sendStateUpdate: (changes) => {
    const ws = get().ws;
    const roomId = get().roomId;
    if (ws && ws.readyState === WebSocket.OPEN && roomId) {
      ws.send(JSON.stringify({
        type: 'state-update',
        roomId,
        data: { changes },
      }));
    }
  },

  sendChatMessage: (message) => {
    const ws = get().ws;
    const roomId = get().roomId;
    if (ws && ws.readyState === WebSocket.OPEN && roomId) {
      ws.send(JSON.stringify({
        type: 'chat',
        roomId,
        data: { message },
      }));
    }
  },

  sendTypingIndicator: (isTyping) => {
    const ws = get().ws;
    const roomId = get().roomId;
    if (ws && ws.readyState === WebSocket.OPEN && roomId) {
      ws.send(JSON.stringify({
        type: 'typing',
        roomId,
        data: { isTyping },
      }));
    }
  },

  setParticipants: (participants) => set({ participants }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, { ...message, type: message.type || 'message' }].slice(-100), // Keep last 100 messages
  })),

  setTypingUser: (userId, isTyping) => set((state) => {
    const typingUsers = new Set(state.typingUsers);
    if (isTyping) {
      typingUsers.add(userId);
    } else {
      typingUsers.delete(userId);
    }
    return { typingUsers };
  }),
}));

function handleWebSocketMessage(
  message: any,
  set: any,
  get: () => CollaborationState & CollaborationActions
) {
  switch (message.type) {
    case 'connected':
      console.log('Connected to collaboration server');
      break;

    case 'room-state':
      const participants = new Map();
      message.participants.forEach((p: Participant) => {
        participants.set(p.userId.toString(), {
          ...p,
          color: generateUserColor(p.userId),
        });
      });
      set({ participants, sharedState: message.sharedState });
      break;

    case 'user-joined':
      set((state: CollaborationState) => {
        const participants = new Map(state.participants);
        participants.set(message.userId.toString(), {
          userId: message.userId,
          userName: message.userName,
          color: generateUserColor(message.userId),
        });
        return { participants };
      });
      break;

    case 'user-left':
      set((state: CollaborationState) => {
        const participants = new Map(state.participants);
        participants.delete(message.userId.toString());
        return { participants };
      });
      get().setTypingUser(message.userId, false);
      break;

    case 'cursor-update':
      set((state: CollaborationState) => {
        const participants = new Map(state.participants);
        const participant = participants.get(message.userId.toString());
        if (participant) {
          participant.cursor = message.cursor;
        }
        return { participants };
      });
      break;

    case 'selection-update':
      set((state: CollaborationState) => {
        const participants = new Map(state.participants);
        const participant = participants.get(message.userId.toString());
        if (participant) {
          participant.selection = message.selection;
        }
        return { participants };
      });
      break;

    case 'state-changed':
      set((state: CollaborationState) => ({
        sharedState: { ...state.sharedState, ...message.changes },
      }));
      break;

    case 'chat-message':
      get().addMessage(message);
      break;

    case 'typing-indicator':
      get().setTypingUser(message.userId, message.isTyping);
      break;
  }
}

function generateUserColor(userId: number): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#FFD700', '#FA8072', '#20B2AA',
  ];
  return colors[userId % colors.length];
}

export function useCollaboration(roomId?: string) {
  const { user } = useAuth();
  const {
    ws,
    isConnected,
    participants,
    sharedState,
    messages,
    typingUsers,
    connect,
    disconnect,
    sendCursorUpdate,
    sendSelectionUpdate,
    sendStateUpdate,
    sendChatMessage,
    sendTypingIndicator,
  } = useCollaborationStore();

  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (roomId && user) {
      connect(roomId);
      return () => {
        disconnect();
      };
    }
  }, [roomId, user]);

  const sendTyping = useCallback((isTyping: boolean) => {
    sendTypingIndicator(isTyping);
    
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 3000);
    }
  }, [sendTypingIndicator]);

  const participantsList = Array.from(participants.values());
  const typingUsersList = Array.from(typingUsers)
    .map(userId => participants.get(userId.toString()))
    .filter(Boolean);

  return {
    isConnected,
    participants: participantsList,
    sharedState,
    messages,
    typingUsers: typingUsersList,
    sendCursorUpdate,
    sendSelectionUpdate,
    sendStateUpdate,
    sendChatMessage,
    sendTyping,
  };
}