import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth, requirePlan } from '../auth';
import { authService } from '../../auth';

// Mock authService
vi.mock('../../auth', () => ({
  authService: {
    getSessionUser: vi.fn()
  }
}));

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      cookies: {}
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = vi.fn();
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return 401 when no session cookie is present', async () => {
      mockReq.cookies = {};

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when session is invalid', async () => {
      mockReq.cookies = { sessionId: 'invalid-session' };
      vi.mocked(authService.getSessionUser).mockResolvedValue(null);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.getSessionUser).toHaveBeenCalledWith('invalid-session');
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid session' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should attach user to request and call next when session is valid', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
        isActive: true
      };
      
      mockReq.cookies = { sessionId: 'valid-session' };
      vi.mocked(authService.getSessionUser).mockResolvedValue(mockUser as any);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.getSessionUser).toHaveBeenCalledWith('valid-session');
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockReq.cookies = { sessionId: 'error-session' };
      vi.mocked(authService.getSessionUser).mockRejectedValue(new Error('Database error'));

      await expect(
        requireAuth(mockReq as Request, mockRes as Response, mockNext)
      ).rejects.toThrow('Database error');
    });
  });

  describe('optionalAuth', () => {
    it('should call next without attaching user when no session cookie', async () => {
      mockReq.cookies = {};

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.getSessionUser).not.toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next without attaching user when session is invalid', async () => {
      mockReq.cookies = { sessionId: 'invalid-session' };
      vi.mocked(authService.getSessionUser).mockResolvedValue(null);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.getSessionUser).toHaveBeenCalledWith('invalid-session');
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach user to request when session is valid', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        plan: 'pro',
        isActive: true
      };
      
      mockReq.cookies = { sessionId: 'valid-session' };
      vi.mocked(authService.getSessionUser).mockResolvedValue(mockUser as any);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.getSessionUser).toHaveBeenCalledWith('valid-session');
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should propagate errors from getSessionUser', async () => {
      mockReq.cookies = { sessionId: 'error-session' };
      vi.mocked(authService.getSessionUser).mockRejectedValue(new Error('Database error'));

      await expect(
        optionalAuth(mockReq as Request, mockRes as Response, mockNext)
      ).rejects.toThrow('Database error');
    });
  });

  describe('requirePlan', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;
      const middleware = await requirePlan('pro');

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow pro users to access pro features', async () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        plan: 'pro',
        isActive: true
      } as any;
      
      const middleware = await requirePlan('pro');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow enterprise users to access pro features', async () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        plan: 'enterprise',
        isActive: true
      } as any;
      
      const middleware = await requirePlan('pro');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny free users access to pro features', async () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
        isActive: true
      } as any;
      
      const middleware = await requirePlan('pro');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Upgrade required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should only allow enterprise users to access enterprise features', async () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        plan: 'enterprise',
        isActive: true
      } as any;
      
      const middleware = await requirePlan('enterprise');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny pro users access to enterprise features', async () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        plan: 'pro',
        isActive: true
      } as any;
      
      const middleware = await requirePlan('enterprise');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Upgrade required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny free users access to enterprise features', async () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
        isActive: true
      } as any;
      
      const middleware = await requirePlan('enterprise');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Upgrade required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
