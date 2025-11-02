import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateService } from '../templateService';
import { db } from '../../db';
import { 
  planTemplates, 
  actionPlans, 
  planPhases, 
  planTasks,
  searches,
  users,
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

describe('TemplateService', () => {
  let templateService: TemplateService;
  let testUserId: number;
  let testSearchId: number;
  let testTemplateId: number;

  beforeEach(async () => {
    templateService = new TemplateService();

    // Create test user
    const [user] = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      password: 'hashedpassword',
      name: 'Test User',
      plan: 'pro',
    }).returning();
    testUserId = user.id;

    // Create test search
    const [search] = await db.insert(searches).values({
      query: 'Test search for templates',
      userId: testUserId,
    }).returning();
    testSearchId = search.id;

    // Create test template
    const [template] = await db.insert(planTemplates).values({
      name: `Test Template ${Date.now()}`,
      description: 'Test template description',
      category: 'software',
      icon: 'code',
      isDefault: false,
      isActive: true,
      phases: [
        {
          name: 'Phase 1',
          description: 'First phase',
          order: 1,
          estimatedDuration: '2 weeks',
          tasks: [
            {
              title: 'Task 1',
              description: 'First task',
              estimatedTime: '1 week',
              resources: [],
              order: 1,
            },
          ],
        },
      ],
    }).returning();
    testTemplateId = template.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testTemplateId) {
      await db.delete(planTemplates).where(eq(planTemplates.id, testTemplateId));
    }
    if (testSearchId) {
      await db.delete(searches).where(eq(searches.id, testSearchId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  describe('getTemplates', () => {
    it('should return all active templates', async () => {
      const templates = await templateService.getTemplates();
      
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.isActive)).toBe(true);
    });

    it('should filter templates by category', async () => {
      const templates = await templateService.getTemplates('software');
      
      expect(templates).toBeDefined();
      expect(templates.every(t => t.category === 'software')).toBe(true);
    });
  });

  describe('getTemplateById', () => {
    it('should return template by ID', async () => {
      const template = await templateService.getTemplateById(testTemplateId);
      
      expect(template).toBeDefined();
      expect(template?.id).toBe(testTemplateId);
      expect(template?.name).toContain('Test Template');
    });

    it('should return null for non-existent template', async () => {
      const template = await templateService.getTemplateById(999999);
      
      expect(template).toBeNull();
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return a default template', async () => {
      const template = await templateService.getDefaultTemplate();
      
      expect(template).toBeDefined();
      expect(template?.isActive).toBe(true);
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const newTemplate = await templateService.createTemplate({
        name: `New Template ${Date.now()}`,
        description: 'New template description',
        category: 'service',
        icon: 'briefcase',
        isDefault: false,
        isActive: true,
        phases: [],
      });
      
      expect(newTemplate).toBeDefined();
      expect(newTemplate.name).toContain('New Template');
      expect(newTemplate.category).toBe('service');

      // Clean up
      await db.delete(planTemplates).where(eq(planTemplates.id, newTemplate.id));
    });
  });

  describe('updateTemplate', () => {
    it('should update template properties', async () => {
      const updatedTemplate = await templateService.updateTemplate(testTemplateId, {
        description: 'Updated description',
      });
      
      expect(updatedTemplate).toBeDefined();
      expect(updatedTemplate.description).toBe('Updated description');
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        templateService.updateTemplate(999999, { description: 'Test' })
      ).rejects.toThrow('Template not found');
    });
  });

  describe('deleteTemplate', () => {
    it('should soft delete template', async () => {
      await templateService.deleteTemplate(testTemplateId);
      
      const template = await templateService.getTemplateById(testTemplateId);
      expect(template?.isActive).toBe(false);
    });
  });

  describe('applyTemplateToPlan', () => {
    it('should apply template to plan', async () => {
      // Create a test plan
      const [plan] = await db.insert(actionPlans).values({
        searchId: testSearchId,
        userId: testUserId,
        title: 'Test Plan',
        description: 'Test plan description',
        status: 'active',
        originalPlan: { insights: 'AI generated insights' },
        customizations: {},
      }).returning();

      // Apply template
      const updatedPlan = await templateService.applyTemplateToPlan(
        plan.id,
        testTemplateId,
        testUserId
      );
      
      expect(updatedPlan).toBeDefined();
      expect(updatedPlan.templateId).toBe(testTemplateId);

      // Verify phases were created
      const phases = await db
        .select()
        .from(planPhases)
        .where(eq(planPhases.planId, plan.id));
      
      expect(phases.length).toBeGreaterThan(0);

      // Verify tasks were created
      const tasks = await db
        .select()
        .from(planTasks)
        .where(eq(planTasks.planId, plan.id));
      
      expect(tasks.length).toBeGreaterThan(0);

      // Clean up
      await db.delete(planTasks).where(eq(planTasks.planId, plan.id));
      await db.delete(planPhases).where(eq(planPhases.planId, plan.id));
      await db.delete(actionPlans).where(eq(actionPlans.id, plan.id));
    });

    it('should throw error for non-existent plan', async () => {
      await expect(
        templateService.applyTemplateToPlan(999999, testTemplateId, testUserId)
      ).rejects.toThrow('Plan not found or access denied');
    });

    it('should throw error for non-existent template', async () => {
      // Create a test plan
      const [plan] = await db.insert(actionPlans).values({
        searchId: testSearchId,
        userId: testUserId,
        title: 'Test Plan',
        description: 'Test plan description',
        status: 'active',
        originalPlan: {},
        customizations: {},
      }).returning();

      await expect(
        templateService.applyTemplateToPlan(plan.id, 999999, testUserId)
      ).rejects.toThrow('Template not found');

      // Clean up
      await db.delete(actionPlans).where(eq(actionPlans.id, plan.id));
    });
  });

  describe('getTemplateUsageStats', () => {
    it('should return usage statistics', async () => {
      const stats = await templateService.getTemplateUsageStats(testTemplateId);
      
      expect(stats).toBeDefined();
      expect(stats.totalUsage).toBeGreaterThanOrEqual(0);
      expect(stats.activeUsage).toBeGreaterThanOrEqual(0);
      expect(stats.completedUsage).toBeGreaterThanOrEqual(0);
    });
  });
});
