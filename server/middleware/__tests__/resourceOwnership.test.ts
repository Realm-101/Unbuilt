import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  validateSearchOwnership,
  validateIdeaOwnership,
  validateUserProfileAccess,
  validateSessionOwnership,
  validateResourceOwnership,
  enforceUserDataScope,
  validateBulkOwnership
} from '../resourceOwnership';
import { storage } from '../../storage';
import { AuthorizationService } from '../../services/authorizationService';
import { AppError } from '../errorHandler';

// Mock dependencies
vi.mock('../../storage', () => ({
  storage: {
    getSearches: vi.fn(),
    getIdea: vi.fn()
  }
}));

vi.mock('../../services/authorizationService', () => ({
  AuthorizationService: {
    validateResourceOwnership: vi.fn(),
    isAdmin: vi.fn()
  }
}));

vi.mock('../../services/sessionManager', () => ({
  sessionManager: {
    getSessionById: vi.fn()
  }
}));

describe('Resource Ownership Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      query: {}
    };
    
    mockRes = {};
    mockNext = vi.fn();
    
    vi.clearAllMocks();
  });

  describe('validateSearchOwnership', () => {
    it('should return error when user is not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: '1' };

      const middleware = validateSearchOwnership('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        })
      );
    });

    it('should return error when search ID is invalid', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { id: 'invalid' };

      const middleware = validateSearchOwnership('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid search ID',
          code: 'INVALID_SEARCH_ID'
        })
      );
    });

    it('should return error when search is not found', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { id: '999' };
      vi.mocked(storage.getSearches).mockResolvedValue([]);

      const middleware = validateSearchOwnership('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Search not found or access denied',
          code: 'SEARCH_NOT_FOUND'
        })
      );
    });

    it('should validate ownership and attach search to request', async () => {
      const mockSearch = { id: 1, userId: 1, query: 'test' };
      mockReq.user = { id: 1 } as any;
      mockReq.params = { id: '1' };
      
      vi.mocked(storage.getSearches).mockResolvedValue([mockSearch] as any);
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateSearchOwnership('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthorizationService.validateResourceOwnership).toHaveBeenCalledWith(
        mockReq.user,
        1,
        'read'
      );
      expect(mockReq.resource).toEqual(mockSearch);
      expect(mockReq.resourceOwner).toBe(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should check searchId param if id not present', async () => {
      const mockSearch = { id: 1, userId: 1, query: 'test' };
      mockReq.user = { id: 1 } as any;
      mockReq.params = { searchId: '1' };
      
      vi.mocked(storage.getSearches).mockResolvedValue([mockSearch] as any);
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateSearchOwnership('write');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass errors to next', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { id: '1' };
      const error = new Error('Database error');
      vi.mocked(storage.getSearches).mockRejectedValue(error);

      const middleware = validateSearchOwnership('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('validateIdeaOwnership', () => {
    it('should return error when user is not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: '1' };

      const middleware = validateIdeaOwnership('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        })
      );
    });

    it('should return error when idea ID is invalid', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { id: 'invalid' };

      const middleware = validateIdeaOwnership('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid idea ID',
          code: 'INVALID_IDEA_ID'
        })
      );
    });

    it('should return error when idea is not found', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { id: '999' };
      vi.mocked(storage.getIdea).mockResolvedValue(null);

      const middleware = validateIdeaOwnership('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Idea not found or access denied',
          code: 'IDEA_NOT_FOUND'
        })
      );
    });

    it('should validate ownership and attach idea to request', async () => {
      const mockIdea = { id: 1, userId: 1, title: 'Test Idea' };
      mockReq.user = { id: 1 } as any;
      mockReq.params = { id: '1' };
      
      vi.mocked(storage.getIdea).mockResolvedValue(mockIdea as any);
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateIdeaOwnership('write');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(storage.getIdea).toHaveBeenCalledWith(1, '1');
      expect(AuthorizationService.validateResourceOwnership).toHaveBeenCalledWith(
        mockReq.user,
        1,
        'write'
      );
      expect(mockReq.resource).toEqual(mockIdea);
      expect(mockReq.resourceOwner).toBe(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateUserProfileAccess', () => {
    it('should validate access to user profile', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { userId: '1' };
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateUserProfileAccess('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthorizationService.validateResourceOwnership).toHaveBeenCalledWith(
        mockReq.user,
        1,
        'read'
      );
      expect(mockReq.resourceOwner).toBe(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should check id param if userId not present', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { id: '1' };
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateUserProfileAccess('write');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when userId is invalid', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { userId: 'invalid' };

      const middleware = validateUserProfileAccess('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid user ID',
          code: 'INVALID_USER_ID'
        })
      );
    });
  });

  describe('validateSessionOwnership', () => {
    it('should validate session ownership', async () => {
      const mockSession = { id: 'session-1', userId: 1 };
      mockReq.user = { id: 1 } as any;
      mockReq.params = { sessionId: 'session-1' };
      
      const { sessionManager } = await import('../../services/sessionManager');
      vi.mocked(sessionManager.getSessionById).mockResolvedValue(mockSession as any);
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateSessionOwnership('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.resource).toEqual(mockSession);
      expect(mockReq.resourceOwner).toBe(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when sessionId is missing', async () => {
      mockReq.user = { id: 1 } as any;

      const middleware = validateSessionOwnership('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Session ID required',
          code: 'MISSING_SESSION_ID'
        })
      );
    });

    it('should return error when session is not found', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { sessionId: 'invalid-session' };
      
      const { sessionManager } = await import('../../services/sessionManager');
      vi.mocked(sessionManager.getSessionById).mockResolvedValue(null);

      const middleware = validateSessionOwnership('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        })
      );
    });
  });

  describe('validateResourceOwnership (generic)', () => {
    it('should validate ownership using custom loader', async () => {
      const mockResource = { id: 1, userId: 1, name: 'Test' };
      const mockLoader = vi.fn().mockResolvedValue(mockResource);
      
      mockReq.user = { id: 1 } as any;
      mockReq.params = { id: '1' };
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateResourceOwnership(mockLoader, 'id', 'read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLoader).toHaveBeenCalledWith('1', 1);
      expect(mockReq.resource).toEqual(mockResource);
      expect(mockReq.resourceOwner).toBe(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when resource ID is missing', async () => {
      const mockLoader = vi.fn();
      mockReq.user = { id: 1 } as any;

      const middleware = validateResourceOwnership(mockLoader, 'id', 'read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'id is required',
          code: 'MISSING_RESOURCE_ID'
        })
      );
    });

    it('should return error when resource is not found', async () => {
      const mockLoader = vi.fn().mockResolvedValue(null);
      mockReq.user = { id: 1 } as any;
      mockReq.params = { id: '999' };

      const middleware = validateResourceOwnership(mockLoader, 'id', 'read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Resource not found or access denied',
          code: 'RESOURCE_NOT_FOUND'
        })
      );
    });

    it('should check body if param not present', async () => {
      const mockResource = { id: 1, userId: 1, name: 'Test' };
      const mockLoader = vi.fn().mockResolvedValue(mockResource);
      
      mockReq.user = { id: 1 } as any;
      mockReq.body = { resourceId: '1' };
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateResourceOwnership(mockLoader, 'resourceId', 'write');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLoader).toHaveBeenCalledWith('1', 1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('enforceUserDataScope', () => {
    it('should add userId filter to query', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.query = {};

      enforceUserDataScope(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.userId).toBe('1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow admin to override userId', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.query = { targetUserId: '2' };
      vi.mocked(AuthorizationService.isAdmin).mockReturnValue(true);

      enforceUserDataScope(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.userId).toBe('2');
      expect(mockReq.query.targetUserId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not allow non-admin to override userId', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.query = { targetUserId: '2' };
      vi.mocked(AuthorizationService.isAdmin).mockReturnValue(false);

      enforceUserDataScope(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.userId).toBe('1');
      expect(mockReq.query.targetUserId).toBe('2');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return error when user is not authenticated', () => {
      mockReq.user = undefined;

      enforceUserDataScope(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        })
      );
    });
  });

  describe('validateBulkOwnership', () => {
    it('should validate all items belong to user', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.body = {
        items: [
          { userId: 1, name: 'Item 1' },
          { userId: 1, name: 'Item 2' }
        ]
      };
      vi.mocked(AuthorizationService.isAdmin).mockReturnValue(false);

      const middleware = validateBulkOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should set userId for items without it', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.body = {
        items: [
          { name: 'Item 1' },
          { name: 'Item 2' }
        ]
      };
      vi.mocked(AuthorizationService.isAdmin).mockReturnValue(false);

      const middleware = validateBulkOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.items[0].userId).toBe(1);
      expect(mockReq.body.items[1].userId).toBe(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny bulk operation on other users resources', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.body = {
        items: [
          { userId: 1, name: 'Item 1' },
          { userId: 2, name: 'Item 2' }
        ]
      };
      vi.mocked(AuthorizationService.isAdmin).mockReturnValue(false);

      const middleware = validateBulkOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cannot perform bulk operation on resources owned by other users',
          code: 'BULK_OWNERSHIP_VIOLATION'
        })
      );
    });

    it('should allow admin to perform bulk operations on any resources', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.body = {
        items: [
          { userId: 1, name: 'Item 1' },
          { userId: 2, name: 'Item 2' }
        ]
      };
      vi.mocked(AuthorizationService.isAdmin).mockReturnValue(true);

      const middleware = validateBulkOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when items is not an array', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.body = { items: 'not-an-array' };

      const middleware = validateBulkOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Items array required for bulk operation',
          code: 'INVALID_BULK_DATA'
        })
      );
    });

    it('should use custom userId field name', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.body = {
        items: [
          { ownerId: 1, name: 'Item 1' }
        ]
      };
      vi.mocked(AuthorizationService.isAdmin).mockReturnValue(false);

      const middleware = validateBulkOwnership('ownerId');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
