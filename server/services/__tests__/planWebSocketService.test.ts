import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { PlanWebSocketService } from '../planWebSocketService';
import { jwtService } from '../../jwt';

// Mock JWT service
vi.mock('../../jwt', () => ({
  jwtService: {
    validateToken: vi.fn(),
    extractTokenFromHeader: vi.fn(),
  },
}));

describe('PlanWebSocketService', () => {
  let service: PlanWebSocketService;
  let mockWs: Partial<WebSocket>;

  beforeEach(() => {
    service = new PlanWebSocketService();
    
    // Create mock WebSocket
    mockWs = {
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
    };
  });

  afterEach(() => {
    service.shutdown();
    vi.clearAllMocks();
  });

  describe('authenticateConnection', () => {
    it('should authenticate with valid token in query parameter', async () => {
      const mockPayload = {
        sub: '123',
        email: 'test@example.com',
        role: 'pro',
        iat: Date.now(),
        exp: Date.now() + 3600,
        jti: 'test-jti',
        type: 'access' as const,
      };

      vi.mocked(jwtService.validateToken).mockResolvedValue(mockPayload);

      const result = await service.authenticateConnection(mockWs as WebSocket, {
        url: 'ws://localhost/ws?token=valid-token',
        headers: {},
      });

      expect(result).toEqual({
        userId: 123,
        email: 'test@example.com',
        userName: 'test',
      });
      expect(jwtService.validateToken).toHaveBeenCalledWith('valid-token', 'access');
    });

    it('should authenticate with valid token in Authorization header', async () => {
      const mockPayload = {
        sub: '456',
        email: 'user@example.com',
        role: 'free',
        iat: Date.now(),
        exp: Date.now() + 3600,
        jti: 'test-jti-2',
        type: 'access' as const,
      };

      vi.mocked(jwtService.extractTokenFromHeader).mockReturnValue('header-token');
      vi.mocked(jwtService.validateToken).mockResolvedValue(mockPayload);

      const result = await service.authenticateConnection(mockWs as WebSocket, {
        headers: { authorization: 'Bearer header-token' },
      });

      expect(result).toEqual({
        userId: 456,
        email: 'user@example.com',
        userName: 'user',
      });
    });

    it('should return null for invalid token', async () => {
      vi.mocked(jwtService.validateToken).mockResolvedValue(null);

      const result = await service.authenticateConnection(mockWs as WebSocket, {
        url: 'ws://localhost/ws?token=invalid-token',
        headers: {},
      });

      expect(result).toBeNull();
    });

    it('should return null when no token provided', async () => {
      const result = await service.authenticateConnection(mockWs as WebSocket, {
        headers: {},
      });

      expect(result).toBeNull();
    });
  });

  describe('room management', () => {
    it('should create room when user joins', () => {
      const user = { userId: 1, email: 'test@example.com', userName: 'test' };
      
      service.handleConnection(mockWs as WebSocket, user);

      // Simulate join-plan message
      const messageHandler = vi.mocked(mockWs.on).mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        messageHandler(JSON.stringify({
          type: 'join-plan',
          planId: 'plan-123',
        }));
      }

      const roomInfo = service.getRoomInfo('plan-123');
      expect(roomInfo).toBeDefined();
      expect(roomInfo?.participantCount).toBe(1);
    });

    it('should track multiple participants in a room', () => {
      const user1 = { userId: 1, email: 'user1@example.com', userName: 'user1' };
      const user2 = { userId: 2, email: 'user2@example.com', userName: 'user2' };
      
      // Create separate mock WebSocket instances
      const mockWs1 = {
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN,
      };
      const mockWs2 = {
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN,
      };

      service.handleConnection(mockWs1 as WebSocket, user1);
      service.handleConnection(mockWs2 as WebSocket, user2);

      // Simulate both users joining the same plan
      const messageHandler1 = vi.mocked(mockWs1.on).mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      const messageHandler2 = vi.mocked(mockWs2.on).mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler1) {
        messageHandler1(JSON.stringify({
          type: 'join-plan',
          planId: 'plan-123',
        }));
      }

      if (messageHandler2) {
        messageHandler2(JSON.stringify({
          type: 'join-plan',
          planId: 'plan-123',
        }));
      }

      const roomInfo = service.getRoomInfo('plan-123');
      expect(roomInfo?.participantCount).toBe(2);
    });

    it('should return null for non-existent room', () => {
      const roomInfo = service.getRoomInfo('non-existent');
      expect(roomInfo).toBeNull();
    });
  });

  describe('broadcasting', () => {
    it('should broadcast task update to room participants', () => {
      const user = { userId: 1, email: 'test@example.com', userName: 'test' };
      
      service.handleConnection(mockWs as WebSocket, user);

      // Simulate join-plan message
      const messageHandler = vi.mocked(mockWs.on).mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        messageHandler(JSON.stringify({
          type: 'join-plan',
          planId: 'plan-123',
        }));
      }

      // Broadcast task update
      const mockTask = {
        id: 1,
        title: 'Test Task',
        status: 'completed' as const,
        planId: 123,
        phaseId: 1,
        description: '',
        estimatedTime: '',
        resources: [],
        order: 0,
        isCustom: false,
        assigneeId: null,
        completedAt: null,
        completedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      service.broadcastTaskUpdate('plan-123', mockTask);

      // Verify send was called (excluding the user who made the change)
      expect(mockWs.send).toHaveBeenCalled();
    });

    it('should not broadcast to disconnected participants', () => {
      const user = { userId: 1, email: 'test@example.com', userName: 'test' };
      
      // Create mock with closed connection
      const closedWs = {
        ...mockWs,
        readyState: WebSocket.CLOSED,
      };

      service.handleConnection(closedWs as WebSocket, user);

      // Simulate join-plan message
      const messageHandler = vi.mocked(closedWs.on).mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        messageHandler(JSON.stringify({
          type: 'join-plan',
          planId: 'plan-123',
        }));
      }

      // Broadcast task update
      const mockTask = {
        id: 1,
        title: 'Test Task',
        status: 'completed' as const,
        planId: 123,
        phaseId: 1,
        description: '',
        estimatedTime: '',
        resources: [],
        order: 0,
        isCustom: false,
        assigneeId: null,
        completedAt: null,
        completedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      service.broadcastTaskUpdate('plan-123', mockTask);

      // Verify send was not called for closed connection
      expect(closedWs.send).not.toHaveBeenCalled();
    });
  });

  describe('connection tracking', () => {
    it('should track user connection count', () => {
      const user = { userId: 1, email: 'test@example.com', userName: 'test' };
      
      expect(service.getUserConnectionCount(1)).toBe(0);

      service.handleConnection(mockWs as WebSocket, user);

      expect(service.getUserConnectionCount(1)).toBe(1);
    });

    it('should track multiple connections for same user', () => {
      const user = { userId: 1, email: 'test@example.com', userName: 'test' };
      
      // Create separate mock WebSocket instances
      const mockWs1 = {
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN,
      };
      const mockWs2 = {
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN,
      };

      service.handleConnection(mockWs1 as WebSocket, user);
      service.handleConnection(mockWs2 as WebSocket, user);

      expect(service.getUserConnectionCount(1)).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('should clean up on shutdown', () => {
      const user = { userId: 1, email: 'test@example.com', userName: 'test' };
      
      service.handleConnection(mockWs as WebSocket, user);

      service.shutdown();

      expect(mockWs.close).toHaveBeenCalledWith(1001, 'Server shutting down');
      expect(service.getAllRooms()).toHaveLength(0);
    });
  });
});
