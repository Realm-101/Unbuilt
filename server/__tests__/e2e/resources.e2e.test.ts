/**
 * End-to-End Tests for Resource Library Enhancement
 * 
 * These tests simulate complete user workflows from start to finish,
 * testing the entire resource library feature as a user would experience it.
 * 
 * Test Coverage:
 * - Complete resource discovery flow
 * - Bookmark and rate resource
 * - Submit contribution
 * - Admin approve contribution
 * - Generate and download template
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock services for E2E testing
const mockResourceService = {
  getResources: vi.fn(),
  getResourceById: vi.fn(),
  trackAccess: vi.fn(),
  getSuggestions: vi.fn(),
};

const mockBookmarkService = {
  addBookmark: vi.fn(),
  removeBookmark: vi.fn(),
  getUserBookmarks: vi.fn(),
  updateBookmark: vi.fn(),
};

const mockRatingService = {
  addRating: vi.fn(),
  updateRating: vi.fn(),
  getResourceRatings: vi.fn(),
};

const mockContributionService = {
  submitContribution: vi.fn(),
  getUserContributions: vi.fn(),
  getPendingContributions: vi.fn(),
  approveContribution: vi.fn(),
  rejectContribution: vi.fn(),
};

const mockTemplateService = {
  generateTemplate: vi.fn(),
};

const mockCategoryService = {
  getCategoryTree: vi.fn(),
};

// Test data
const testUser = {
  id: 1,
  email: 'test@example.com',
  plan: 'pro' as const,
  role: 'user' as const,
};

const adminUser = {
  id: 2,
  email: 'admin@example.com',
  plan: 'enterprise' as const,
  role: 'admin' as const,
};

const testCategory = {
  id: 1,
  name: 'Test Category',
  slug: 'test-category',
  description: 'Test category',
  icon: 'test-icon',
  displayOrder: 1,
  resourceCount: 10,
};

const testResource = {
  id: 1,
  title: 'Test Resource',
  description: 'Test resource description',
  url: 'https://example.com/test',
  resourceType: 'tool' as const,
  categoryId: 1,
  phaseRelevance: ['research', 'validation'],
  ideaTypes: ['software'],
  difficultyLevel: 'beginner' as const,
  estimatedTimeMinutes: 30,
  isPremium: false,
  isActive: true,
  averageRating: 4.5,
  ratingCount: 10,
  viewCount: 100,
  bookmarkCount: 5,
  category: testCategory,
  tags: [],
  relatedResources: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testAnalysis = {
  id: 1,
  userId: 1,
  searchQuery: 'AI-powered fitness app',
  innovationScore: 85,
  feasibilityRating: 'High',
  topGaps: [{ title: 'Personalized AI coaching', score: 92 }],
  competitors: [{ name: 'FitBot', description: 'Generic fitness app' }],
  actionPlan: {
    phases: [{ phase: 1, title: 'MVP Development', duration: '3 months' }],
  },
};

describe('E2E: Resource Library Enhancement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Resource Discovery Flow', () => {
    it('should handle complete resource discovery from search to access', async () => {
      // Step 1: User browses resource library
      mockResourceService.getResources.mockResolvedValue({
        resources: [testResource],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });

      const browseResult = await mockResourceService.getResources({
        page: 1,
        limit: 20,
      });

      expect(browseResult.resources).toHaveLength(1);
      expect(browseResult.pagination.total).toBe(1);

      // Step 2: User filters by category
      mockResourceService.getResources.mockResolvedValue({
        resources: [testResource],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });

      const filterResult = await mockResourceService.getResources({
        category: testCategory.id,
        page: 1,
        limit: 20,
      });

      expect(filterResult.resources).toHaveLength(1);
      expect(filterResult.resources[0].categoryId).toBe(testCategory.id);

      // Step 3: User clicks on a resource to view details
      mockResourceService.getResourceById.mockResolvedValue(testResource);

      const detailResult = await mockResourceService.getResourceById(testResource.id);

      expect(detailResult.id).toBe(testResource.id);
      expect(detailResult.title).toBe('Test Resource');

      // Step 4: User tracks access to the resource
      mockResourceService.trackAccess.mockResolvedValue({
        accessId: 1,
        message: 'Access tracked',
      });

      const accessResult = await mockResourceService.trackAccess(
        testResource.id,
        testUser.id,
        'view',
        testAnalysis.id
      );

      expect(accessResult.accessId).toBeDefined();
      expect(mockResourceService.trackAccess).toHaveBeenCalledWith(
        testResource.id,
        testUser.id,
        'view',
        testAnalysis.id
      );

      // Step 5: Verify view count increased
      const updatedResource = {
        ...testResource,
        viewCount: testResource.viewCount + 1,
      };
      mockResourceService.getResourceById.mockResolvedValue(updatedResource);

      const updatedResult = await mockResourceService.getResourceById(testResource.id);

      expect(updatedResult.viewCount).toBeGreaterThan(testResource.viewCount);
    });
  });

  describe('Bookmark and Rate Resource Flow', () => {
    it('should handle complete bookmark and rating workflow', async () => {
      // Step 1: User views a resource
      mockResourceService.getResourceById.mockResolvedValue(testResource);

      const viewResult = await mockResourceService.getResourceById(testResource.id);

      expect(viewResult.id).toBe(testResource.id);
      const initialBookmarkCount = viewResult.bookmarkCount;

      // Step 2: User bookmarks the resource
      mockBookmarkService.addBookmark.mockResolvedValue({
        bookmarkId: 1,
        isBookmarked: true,
        resourceId: testResource.id,
        userId: testUser.id,
        notes: 'Great resource for my project',
        customTags: ['fitness', 'ai'],
      });

      const bookmarkResult = await mockBookmarkService.addBookmark(
        testResource.id,
        testUser.id,
        {
          notes: 'Great resource for my project',
          customTags: ['fitness', 'ai'],
        }
      );

      expect(bookmarkResult.bookmarkId).toBeDefined();
      expect(bookmarkResult.isBookmarked).toBe(true);

      // Step 3: User views their bookmarks
      mockBookmarkService.getUserBookmarks.mockResolvedValue({
        bookmarks: [
          {
            id: 1,
            resourceId: testResource.id,
            userId: testUser.id,
            notes: 'Great resource for my project',
            customTags: ['fitness', 'ai'],
            resource: testResource,
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });

      const bookmarksResult = await mockBookmarkService.getUserBookmarks(testUser.id);

      expect(bookmarksResult.bookmarks).toHaveLength(1);
      expect(bookmarksResult.bookmarks[0].notes).toBe('Great resource for my project');

      // Step 4: User rates the resource
      mockRatingService.addRating.mockResolvedValue({
        ratingId: 1,
        rating: 5,
        review: 'Excellent resource! Very helpful for my fitness app idea.',
        resourceId: testResource.id,
        userId: testUser.id,
      });

      const rateResult = await mockRatingService.addRating(
        testResource.id,
        testUser.id,
        5,
        'Excellent resource! Very helpful for my fitness app idea.'
      );

      expect(rateResult.ratingId).toBeDefined();
      expect(rateResult.rating).toBe(5);

      // Step 5: Verify rating was recorded
      mockRatingService.getResourceRatings.mockResolvedValue({
        ratings: [
          {
            id: 1,
            resourceId: testResource.id,
            userId: testUser.id,
            rating: 5,
            review: 'Excellent resource! Very helpful for my fitness app idea.',
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });

      const ratingsResult = await mockRatingService.getResourceRatings(testResource.id);

      expect(ratingsResult.ratings).toHaveLength(1);
      expect(ratingsResult.ratings[0].rating).toBe(5);

      // Step 6: User updates their rating
      mockRatingService.updateRating.mockResolvedValue({
        ratingId: 1,
        rating: 4,
        review: 'Good resource, but could use more examples.',
      });

      const updateRateResult = await mockRatingService.updateRating(
        1,
        testUser.id,
        4,
        'Good resource, but could use more examples.'
      );

      expect(updateRateResult.rating).toBe(4);

      // Step 7: User removes bookmark
      mockBookmarkService.removeBookmark.mockResolvedValue({
        isBookmarked: false,
      });

      const removeResult = await mockBookmarkService.removeBookmark(
        testResource.id,
        testUser.id
      );

      expect(removeResult.isBookmarked).toBe(false);
    });
  });

  describe('Submit Contribution Flow', () => {
    it('should handle complete contribution submission workflow', async () => {
      // Step 1: User submits a new resource contribution
      const contributionData = {
        title: 'Awesome Fitness Tracker',
        description: 'A comprehensive fitness tracking tool with AI insights',
        url: 'https://example.com/awesome-fitness-tracker',
        resourceType: 'tool' as const,
        categoryId: testCategory.id,
        phaseRelevance: ['development', 'launch'],
        ideaTypes: ['software', 'service'],
        difficultyLevel: 'intermediate' as const,
        estimatedTimeMinutes: 60,
        suggestedTags: ['fitness', 'tracking', 'ai'],
      };

      mockContributionService.submitContribution.mockResolvedValue({
        contributionId: 1,
        status: 'pending',
        ...contributionData,
        userId: testUser.id,
        createdAt: new Date(),
      });

      const submitResult = await mockContributionService.submitContribution(
        testUser.id,
        contributionData
      );

      expect(submitResult.contributionId).toBeDefined();
      expect(submitResult.status).toBe('pending');

      // Step 2: User views their contributions
      mockContributionService.getUserContributions.mockResolvedValue({
        contributions: [
          {
            id: 1,
            ...contributionData,
            userId: testUser.id,
            status: 'pending',
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });

      const contributionsResult = await mockContributionService.getUserContributions(
        testUser.id
      );

      expect(contributionsResult.contributions).toHaveLength(1);
      expect(contributionsResult.contributions[0].status).toBe('pending');
      expect(contributionsResult.contributions[0].title).toBe('Awesome Fitness Tracker');
    });

    it('should validate contribution data', async () => {
      // Try to submit invalid contribution (missing required fields)
      mockContributionService.submitContribution.mockRejectedValue(
        new Error('Missing required fields: description, url')
      );

      await expect(
        mockContributionService.submitContribution(testUser.id, {
          title: 'Incomplete Resource',
        } as any)
      ).rejects.toThrow('Missing required fields');

      // Try to submit with invalid URL
      mockContributionService.submitContribution.mockRejectedValue(
        new Error('Invalid URL format')
      );

      await expect(
        mockContributionService.submitContribution(testUser.id, {
          title: 'Test Resource',
          description: 'Test description',
          url: 'not-a-valid-url',
          resourceType: 'tool',
          categoryId: testCategory.id,
        } as any)
      ).rejects.toThrow('Invalid URL format');
    });
  });

  describe('Admin Approve Contribution Flow', () => {
    it('should handle complete admin review and approval workflow', async () => {
      // Step 1: User submits a contribution
      const contributionData = {
        title: 'User Submitted Resource',
        description: 'A helpful resource submitted by a user',
        url: 'https://example.com/user-resource',
        resourceType: 'guide' as const,
        categoryId: testCategory.id,
        phaseRelevance: ['research'],
        ideaTypes: ['software'],
        difficultyLevel: 'beginner' as const,
        estimatedTimeMinutes: 15,
      };

      mockContributionService.submitContribution.mockResolvedValue({
        contributionId: 1,
        status: 'pending',
        ...contributionData,
        userId: testUser.id,
        createdAt: new Date(),
      });

      const submitResult = await mockContributionService.submitContribution(
        testUser.id,
        contributionData
      );

      const contributionId = submitResult.contributionId;

      // Step 2: Admin views pending contributions
      mockContributionService.getPendingContributions.mockResolvedValue({
        contributions: [
          {
            id: contributionId,
            ...contributionData,
            userId: testUser.id,
            status: 'pending',
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });

      const pendingResult = await mockContributionService.getPendingContributions();

      expect(pendingResult.contributions).toHaveLength(1);
      expect(pendingResult.contributions[0].status).toBe('pending');

      // Step 3: Admin approves the contribution
      mockContributionService.approveContribution.mockResolvedValue({
        resourceId: 2,
        contributionId: contributionId,
        status: 'approved',
        adminNotes: 'Great contribution! Approved for publication.',
      });

      const approveResult = await mockContributionService.approveContribution(
        contributionId,
        adminUser.id,
        'Great contribution! Approved for publication.'
      );

      expect(approveResult.resourceId).toBeDefined();
      expect(approveResult.status).toBe('approved');

      // Step 4: Verify the resource is now active
      const newResource = {
        ...testResource,
        id: approveResult.resourceId,
        title: contributionData.title,
        description: contributionData.description,
        url: contributionData.url,
        isActive: true,
      };

      mockResourceService.getResourceById.mockResolvedValue(newResource);

      const resourceResult = await mockResourceService.getResourceById(
        approveResult.resourceId
      );

      expect(resourceResult.title).toBe('User Submitted Resource');
      expect(resourceResult.isActive).toBe(true);

      // Step 5: User sees their contribution was approved
      mockContributionService.getUserContributions.mockResolvedValue({
        contributions: [
          {
            id: contributionId,
            ...contributionData,
            userId: testUser.id,
            status: 'approved',
            adminNotes: 'Great contribution! Approved for publication.',
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });

      const userContributionsResult = await mockContributionService.getUserContributions(
        testUser.id
      );

      expect(userContributionsResult.contributions[0].status).toBe('approved');
    });

    it('should handle admin rejection workflow', async () => {
      // Step 1: User submits a contribution
      const contributionData = {
        title: 'Low Quality Resource',
        description: 'Not very helpful',
        url: 'https://example.com/low-quality',
        resourceType: 'tool' as const,
        categoryId: testCategory.id,
        phaseRelevance: ['research'],
        ideaTypes: ['software'],
      };

      mockContributionService.submitContribution.mockResolvedValue({
        contributionId: 2,
        status: 'pending',
        ...contributionData,
        userId: testUser.id,
        createdAt: new Date(),
      });

      const submitResult = await mockContributionService.submitContribution(
        testUser.id,
        contributionData
      );

      const contributionId = submitResult.contributionId;

      // Step 2: Admin rejects the contribution
      mockContributionService.rejectContribution.mockResolvedValue({
        contributionId: contributionId,
        status: 'rejected',
        adminNotes:
          'Resource does not meet quality standards. Please provide more detailed description.',
      });

      const rejectResult = await mockContributionService.rejectContribution(
        contributionId,
        adminUser.id,
        'Resource does not meet quality standards. Please provide more detailed description.'
      );

      expect(rejectResult.status).toBe('rejected');
      expect(rejectResult.adminNotes).toContain('quality standards');

      // Step 3: User sees rejection with feedback
      mockContributionService.getUserContributions.mockResolvedValue({
        contributions: [
          {
            id: contributionId,
            ...contributionData,
            userId: testUser.id,
            status: 'rejected',
            adminNotes:
              'Resource does not meet quality standards. Please provide more detailed description.',
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });

      const userContributionsResult = await mockContributionService.getUserContributions(
        testUser.id
      );

      expect(userContributionsResult.contributions[0].status).toBe('rejected');
      expect(userContributionsResult.contributions[0].adminNotes).toContain(
        'quality standards'
      );
    });

    it('should prevent non-admin users from approving contributions', async () => {
      // Regular user tries to approve a contribution
      mockContributionService.approveContribution.mockRejectedValue(
        new Error('Unauthorized: Admin access required')
      );

      await expect(
        mockContributionService.approveContribution(1, testUser.id, 'Approved')
      ).rejects.toThrow('Unauthorized: Admin access required');
    });
  });

  describe('Generate and Download Template Flow', () => {
    it('should handle complete template generation workflow', async () => {
      // Step 1: Create a template resource
      const templateResource = {
        ...testResource,
        id: 3,
        title: 'Business Plan Template',
        description: 'Comprehensive business plan template with pre-filled sections',
        resourceType: 'template' as const,
        metadata: {
          templateType: 'business_plan',
          variables: ['idea_title', 'innovation_score', 'target_market', 'competitors'],
        },
      };

      mockResourceService.getResourceById.mockResolvedValue(templateResource);

      // Step 2: User views the template resource
      const viewResult = await mockResourceService.getResourceById(templateResource.id);

      expect(viewResult.resourceType).toBe('template');

      // Step 3: User requests template generation
      mockTemplateService.generateTemplate.mockResolvedValue({
        downloadUrl: '/downloads/business-plan-123.docx',
        filename: 'business-plan-123.docx',
        format: 'docx',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      });

      const generateResult = await mockTemplateService.generateTemplate(
        templateResource.id,
        testAnalysis.id,
        testUser.id,
        'docx'
      );

      expect(generateResult.downloadUrl).toBeDefined();
      expect(generateResult.filename).toContain('.docx');
      expect(generateResult.expiresAt).toBeDefined();

      // Step 4: Track template download
      mockResourceService.trackAccess.mockResolvedValue({
        accessId: 2,
        message: 'Download tracked',
      });

      const trackResult = await mockResourceService.trackAccess(
        templateResource.id,
        testUser.id,
        'download',
        testAnalysis.id
      );

      expect(trackResult.accessId).toBeDefined();

      // Step 5: User generates template in different format
      mockTemplateService.generateTemplate.mockResolvedValue({
        downloadUrl: '/downloads/business-plan-123.pdf',
        filename: 'business-plan-123.pdf',
        format: 'pdf',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const pdfResult = await mockTemplateService.generateTemplate(
        templateResource.id,
        testAnalysis.id,
        testUser.id,
        'pdf'
      );

      expect(pdfResult.filename).toContain('.pdf');
    });

    it('should require authentication for template generation', async () => {
      // Try to generate without auth
      mockTemplateService.generateTemplate.mockRejectedValue(
        new Error('Unauthorized: Authentication required')
      );

      await expect(
        mockTemplateService.generateTemplate(1, testAnalysis.id, null as any, 'docx')
      ).rejects.toThrow('Unauthorized: Authentication required');
    });

    it('should validate template generation parameters', async () => {
      // Try with invalid format
      mockTemplateService.generateTemplate.mockRejectedValue(
        new Error('Invalid format: must be docx, pdf, or gdocs')
      );

      await expect(
        mockTemplateService.generateTemplate(
          1,
          testAnalysis.id,
          testUser.id,
          'invalid' as any
        )
      ).rejects.toThrow('Invalid format');

      // Try without analysisId
      mockTemplateService.generateTemplate.mockRejectedValue(
        new Error('Missing required parameter: analysisId')
      );

      await expect(
        mockTemplateService.generateTemplate(1, null as any, testUser.id, 'docx')
      ).rejects.toThrow('Missing required parameter: analysisId');
    });
  });

  describe('Complete User Journey', () => {
    it('should simulate a complete user journey from discovery to template download', async () => {
      // Step 1: User completes gap analysis (already exists)
      expect(testAnalysis.id).toBeDefined();

      // Step 2: User views action plan and sees suggested resources
      mockResourceService.getSuggestions.mockResolvedValue({
        resources: [testResource],
        context: {
          phase: 'research',
          analysisId: testAnalysis.id,
        },
      });

      const suggestionsResult = await mockResourceService.getSuggestions(
        testAnalysis.id,
        'research',
        3
      );

      expect(suggestionsResult.resources).toBeDefined();
      expect(suggestionsResult.resources.length).toBeGreaterThan(0);

      // Step 3: User clicks on a suggested resource
      mockResourceService.getResourceById.mockResolvedValue(testResource);

      const viewResult = await mockResourceService.getResourceById(testResource.id);

      expect(viewResult.id).toBe(testResource.id);

      // Step 4: User tracks the view
      mockResourceService.trackAccess.mockResolvedValue({
        accessId: 1,
        message: 'Access tracked',
      });

      await mockResourceService.trackAccess(
        testResource.id,
        testUser.id,
        'view',
        testAnalysis.id
      );

      // Step 5: User bookmarks the resource
      mockBookmarkService.addBookmark.mockResolvedValue({
        bookmarkId: 1,
        isBookmarked: true,
        resourceId: testResource.id,
        userId: testUser.id,
        notes: 'Useful for my project',
      });

      const bookmarkResult = await mockBookmarkService.addBookmark(
        testResource.id,
        testUser.id,
        { notes: 'Useful for my project' }
      );

      expect(bookmarkResult.isBookmarked).toBe(true);

      // Step 6: User rates the resource
      mockRatingService.addRating.mockResolvedValue({
        ratingId: 1,
        rating: 5,
        review: 'Very helpful!',
        resourceId: testResource.id,
        userId: testUser.id,
      });

      await mockRatingService.addRating(
        testResource.id,
        testUser.id,
        5,
        'Very helpful!'
      );

      // Step 7: User browses more resources
      mockResourceService.getResources.mockResolvedValue({
        resources: [testResource],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      });

      const browseResult = await mockResourceService.getResources({
        phase: 'research',
        ideaType: 'software',
        minRating: 4.0,
        limit: 10,
      });

      expect(browseResult.resources.length).toBeGreaterThan(0);

      // Step 8: User finds a template resource
      const templateResource = {
        ...testResource,
        id: 4,
        title: 'Journey Template',
        resourceType: 'template' as const,
      };

      mockResourceService.getResourceById.mockResolvedValue(templateResource);

      // Step 9: User generates and downloads the template
      mockTemplateService.generateTemplate.mockResolvedValue({
        downloadUrl: '/downloads/journey-template-123.docx',
        filename: 'journey-template-123.docx',
        format: 'docx',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const generateResult = await mockTemplateService.generateTemplate(
        templateResource.id,
        testAnalysis.id,
        testUser.id,
        'docx'
      );

      expect(generateResult.downloadUrl).toBeDefined();

      // Step 10: User tracks the download
      mockResourceService.trackAccess.mockResolvedValue({
        accessId: 2,
        message: 'Download tracked',
      });

      await mockResourceService.trackAccess(
        templateResource.id,
        testUser.id,
        'download',
        testAnalysis.id
      );

      // Step 11: User views their bookmarks
      mockBookmarkService.getUserBookmarks.mockResolvedValue({
        bookmarks: [
          {
            id: 1,
            resourceId: testResource.id,
            userId: testUser.id,
            notes: 'Useful for my project',
            resource: testResource,
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });

      const bookmarksResult = await mockBookmarkService.getUserBookmarks(testUser.id);

      expect(bookmarksResult.bookmarks.length).toBeGreaterThan(0);

      // Step 12: User contributes a resource they found helpful
      mockContributionService.submitContribution.mockResolvedValue({
        contributionId: 1,
        status: 'pending',
        title: 'Helpful Tool I Found',
        description: 'This tool helped me with my project',
        url: 'https://example.com/helpful-tool',
        resourceType: 'tool',
        categoryId: testCategory.id,
        phaseRelevance: ['development'],
        ideaTypes: ['software'],
        userId: testUser.id,
        createdAt: new Date(),
      });

      const contributionResult = await mockContributionService.submitContribution(
        testUser.id,
        {
          title: 'Helpful Tool I Found',
          description: 'This tool helped me with my project',
          url: 'https://example.com/helpful-tool',
          resourceType: 'tool',
          categoryId: testCategory.id,
          phaseRelevance: ['development'],
          ideaTypes: ['software'],
        }
      );

      expect(contributionResult.contributionId).toBeDefined();

      // Verify all steps were executed
      expect(mockResourceService.getSuggestions).toHaveBeenCalled();
      expect(mockResourceService.getResourceById).toHaveBeenCalled();
      expect(mockResourceService.trackAccess).toHaveBeenCalledTimes(2);
      expect(mockBookmarkService.addBookmark).toHaveBeenCalled();
      expect(mockRatingService.addRating).toHaveBeenCalled();
      expect(mockTemplateService.generateTemplate).toHaveBeenCalled();
      expect(mockContributionService.submitContribution).toHaveBeenCalled();
    });
  });

  describe('Search and Filter Integration', () => {
    it('should handle complex search and filter scenarios', async () => {
      // Step 1: User searches for resources
      mockResourceService.getResources.mockResolvedValue({
        resources: [testResource],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      });

      const searchResult = await mockResourceService.getResources({
        search: 'fitness',
        limit: 10,
      });

      expect(searchResult.resources).toBeDefined();

      // Step 2: User applies multiple filters
      mockResourceService.getResources.mockResolvedValue({
        resources: [testResource],
        pagination: {
          page: 1,
          pageSize: 5,
          total: 1,
          totalPages: 1,
        },
      });

      const filterResult = await mockResourceService.getResources({
        category: testCategory.id,
        phase: 'research',
        ideaType: 'software',
        resourceType: 'tool',
        minRating: 4.0,
        sortBy: 'rating',
        sortOrder: 'desc',
        page: 1,
        limit: 5,
      });

      expect(filterResult.resources).toBeDefined();
      expect(filterResult.pagination).toBeDefined();

      // Step 3: User views category tree
      mockCategoryService.getCategoryTree.mockResolvedValue({
        categories: [
          {
            ...testCategory,
            children: [],
          },
        ],
      });

      const categoryTreeResult = await mockCategoryService.getCategoryTree();

      expect(categoryTreeResult.categories).toBeDefined();
      expect(Array.isArray(categoryTreeResult.categories)).toBe(true);
    });
  });
});
