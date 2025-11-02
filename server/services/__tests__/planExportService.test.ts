import { describe, it, expect, beforeEach } from 'vitest';
import { planExportService } from '../planExportService';
import type { ActionPlan, PlanPhase, PlanTask } from '@shared/schema';

describe('PlanExportService', () => {
  let mockPlan: ActionPlan;
  let mockPhases: Array<PlanPhase & { tasks: PlanTask[] }>;

  beforeEach(() => {
    // Create mock plan data
    mockPlan = {
      id: 1,
      searchId: 1,
      userId: 1,
      templateId: null,
      title: 'Test Action Plan',
      description: 'A test action plan for export',
      status: 'active',
      originalPlan: {},
      customizations: {},
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-15T00:00:00.000Z',
      completedAt: null,
    };

    mockPhases = [
      {
        id: 1,
        planId: 1,
        name: 'Research Phase',
        description: 'Initial research and validation',
        order: 0,
        estimatedDuration: '2 weeks',
        isCustom: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        tasks: [
          {
            id: 1,
            phaseId: 1,
            planId: 1,
            title: 'Market Research',
            description: 'Conduct comprehensive market research',
            estimatedTime: '4 hours',
            resources: ['https://example.com/resource1'],
            order: 0,
            status: 'completed',
            isCustom: false,
            assigneeId: null,
            completedAt: '2025-01-05T00:00:00.000Z',
            completedBy: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-05T00:00:00.000Z',
          },
          {
            id: 2,
            phaseId: 1,
            planId: 1,
            title: 'Competitor Analysis',
            description: 'Analyze top 5 competitors',
            estimatedTime: '6 hours',
            resources: ['https://example.com/resource2', 'https://example.com/resource3'],
            order: 1,
            status: 'in_progress',
            isCustom: false,
            assigneeId: 2,
            completedAt: null,
            completedBy: null,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-10T00:00:00.000Z',
          },
        ],
      },
      {
        id: 2,
        planId: 1,
        name: 'Development Phase',
        description: 'Build MVP',
        order: 1,
        estimatedDuration: '4 weeks',
        isCustom: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        tasks: [
          {
            id: 3,
            phaseId: 2,
            planId: 1,
            title: 'Setup Development Environment',
            description: null,
            estimatedTime: '2 hours',
            resources: [],
            order: 0,
            status: 'not_started',
            isCustom: false,
            assigneeId: null,
            completedAt: null,
            completedBy: null,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 4,
            phaseId: 2,
            planId: 1,
            title: 'Build Core Features',
            description: 'Implement main functionality',
            estimatedTime: '80 hours',
            resources: [],
            order: 1,
            status: 'skipped',
            isCustom: true,
            assigneeId: null,
            completedAt: null,
            completedBy: null,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-12T00:00:00.000Z',
          },
        ],
      },
    ];
  });

  describe('exportToCSV', () => {
    it('should export plan to CSV format with all tasks', async () => {
      const buffer = await planExportService.exportPlan(mockPlan, mockPhases, {
        format: 'csv',
        includeCompleted: true,
        includeSkipped: true,
      });

      const csvContent = buffer.toString('utf-8');
      
      // Check header
      expect(csvContent).toContain('Phase,Phase Order,Task,Task Order,Description,Status');
      
      // Check data rows
      expect(csvContent).toContain('Research Phase');
      expect(csvContent).toContain('Market Research');
      expect(csvContent).toContain('Competitor Analysis');
      expect(csvContent).toContain('Development Phase');
      expect(csvContent).toContain('Setup Development Environment');
      expect(csvContent).toContain('Build Core Features');
    });

    it('should exclude completed tasks when includeCompleted is false', async () => {
      const buffer = await planExportService.exportPlan(mockPlan, mockPhases, {
        format: 'csv',
        includeCompleted: false,
        includeSkipped: true,
      });

      const csvContent = buffer.toString('utf-8');
      
      // Should not include completed task
      expect(csvContent).not.toContain('Market Research');
      
      // Should include other tasks
      expect(csvContent).toContain('Competitor Analysis');
      expect(csvContent).toContain('Setup Development Environment');
    });

    it('should exclude skipped tasks when includeSkipped is false', async () => {
      const buffer = await planExportService.exportPlan(mockPlan, mockPhases, {
        format: 'csv',
        includeCompleted: true,
        includeSkipped: false,
      });

      const csvContent = buffer.toString('utf-8');
      
      // Should not include skipped task
      expect(csvContent).not.toContain('Build Core Features');
      
      // Should include other tasks
      expect(csvContent).toContain('Market Research');
      expect(csvContent).toContain('Competitor Analysis');
    });

    it('should properly escape CSV cells with special characters', async () => {
      // Add task with special characters
      mockPhases[0].tasks.push({
        id: 5,
        phaseId: 1,
        planId: 1,
        title: 'Task with "quotes" and, commas',
        description: 'Description with\nnewlines',
        estimatedTime: '1 hour',
        resources: [],
        order: 2,
        status: 'not_started',
        isCustom: false,
        assigneeId: null,
        completedAt: null,
        completedBy: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      });

      const buffer = await planExportService.exportPlan(mockPlan, mockPhases, {
        format: 'csv',
      });

      const csvContent = buffer.toString('utf-8');
      
      // Check that special characters are properly escaped
      expect(csvContent).toContain('"Task with ""quotes"" and, commas"');
      expect(csvContent).toContain('"Description with\nnewlines"');
    });
  });

  describe('exportToJSON', () => {
    it('should export plan to JSON format with full structure', async () => {
      const buffer = await planExportService.exportPlan(mockPlan, mockPhases, {
        format: 'json',
        includeCompleted: true,
        includeSkipped: true,
      });

      const jsonContent = buffer.toString('utf-8');
      const data = JSON.parse(jsonContent);
      
      // Check metadata
      expect(data.exportMetadata).toBeDefined();
      expect(data.exportMetadata.exportFormat).toBe('json');
      expect(data.exportMetadata.version).toBe('1.0');
      
      // Check plan data
      expect(data.plan.id).toBe(1);
      expect(data.plan.title).toBe('Test Action Plan');
      expect(data.plan.status).toBe('active');
      
      // Check statistics
      expect(data.statistics.totalPhases).toBe(2);
      expect(data.statistics.totalTasks).toBe(4);
      expect(data.statistics.completedTasks).toBe(1);
      expect(data.statistics.inProgressTasks).toBe(1);
      expect(data.statistics.notStartedTasks).toBe(1);
      expect(data.statistics.skippedTasks).toBe(1);
      expect(data.statistics.completionPercentage).toBe(25);
      
      // Check phases
      expect(data.phases).toHaveLength(2);
      expect(data.phases[0].name).toBe('Research Phase');
      expect(data.phases[0].tasks).toHaveLength(2);
      expect(data.phases[1].name).toBe('Development Phase');
      expect(data.phases[1].tasks).toHaveLength(2);
    });

    it('should filter tasks based on options', async () => {
      const buffer = await planExportService.exportPlan(mockPlan, mockPhases, {
        format: 'json',
        includeCompleted: false,
        includeSkipped: false,
      });

      const jsonContent = buffer.toString('utf-8');
      const data = JSON.parse(jsonContent);
      
      // Should only have 2 tasks (in_progress and not_started)
      const allTasks = data.phases.flatMap((p: any) => p.tasks);
      expect(allTasks).toHaveLength(2);
      expect(allTasks.some((t: any) => t.status === 'completed')).toBe(false);
      expect(allTasks.some((t: any) => t.status === 'skipped')).toBe(false);
    });

    it('should include all task details in JSON export', async () => {
      const buffer = await planExportService.exportPlan(mockPlan, mockPhases, {
        format: 'json',
        includeCompleted: true,
        includeSkipped: true,
      });

      const jsonContent = buffer.toString('utf-8');
      const data = JSON.parse(jsonContent);
      
      const firstTask = data.phases[0].tasks[0];
      expect(firstTask.id).toBe(1);
      expect(firstTask.title).toBe('Market Research');
      expect(firstTask.description).toBe('Conduct comprehensive market research');
      expect(firstTask.estimatedTime).toBe('4 hours');
      expect(firstTask.resources).toEqual(['https://example.com/resource1']);
      expect(firstTask.status).toBe('completed');
      expect(firstTask.isCustom).toBe(false);
      expect(firstTask.completedAt).toBe('2025-01-05T00:00:00.000Z');
    });
  });

  describe('exportToMarkdown', () => {
    it('should export plan to Markdown format with checkboxes', async () => {
      const buffer = await planExportService.exportPlan(mockPlan, mockPhases, {
        format: 'markdown',
        includeCompleted: true,
        includeSkipped: true,
      });

      const mdContent = buffer.toString('utf-8');
      
      // Check title and metadata
      expect(mdContent).toContain('# Test Action Plan');
      expect(mdContent).toContain('A test action plan for export');
      expect(mdContent).toContain('**Status:** active');
      expect(mdContent).toContain('**Progress:** 1/4 tasks completed (25%)');
      
      // Check phases
      expect(mdContent).toContain('## Research Phase');
      expect(mdContent).toContain('## Development Phase');
      
      // Check tasks with checkboxes
      expect(mdContent).toContain('- [x] Market Research'); // completed
      expect(mdContent).toContain('- [ ] Competitor Analysis'); // in_progress
      expect(mdContent).toContain('- [ ] Setup Development Environment'); // not_started
      expect(mdContent).toContain('- [ ] Build Core Features'); // skipped
    });

    it('should include status indicators in Markdown', async () => {
      const buffer = await planExportService.exportPlan(mockPlan, mockPhases, {
        format: 'markdown',
      });

      const mdContent = buffer.toString('utf-8');
      
      // Check status indicators
      expect(mdContent).toContain('🔄'); // in_progress indicator
      expect(mdContent).toContain('⏭️'); // skipped indicator
      expect(mdContent).toContain('✏️'); // custom task indicator
    });

    it('should include task details in Markdown', async () => {
      const buffer = await planExportService.exportPlan(mockPlan, mockPhases, {
        format: 'markdown',
        includeCompleted: true,
        includeSkipped: true,
      });

      const mdContent = buffer.toString('utf-8');
      
      // Check task details
      expect(mdContent).toContain('**Description:** Conduct comprehensive market research');
      expect(mdContent).toContain('**Estimated Time:** 4 hours');
      expect(mdContent).toContain('**Resources:** https://example.com/resource1');
      expect(mdContent).toContain('**Completed:** 1/5/2025');
    });

    it('should include phase progress in Markdown', async () => {
      const buffer = await planExportService.exportPlan(mockPlan, mockPhases, {
        format: 'markdown',
      });

      const mdContent = buffer.toString('utf-8');
      
      // Check phase progress
      expect(mdContent).toContain('**Phase Progress:** 1/2 tasks (50%)'); // Research phase
      expect(mdContent).toContain('**Phase Progress:** 0/2 tasks (0%)'); // Development phase
    });

    it('should filter tasks in Markdown export', async () => {
      const buffer = await planExportService.exportPlan(mockPlan, mockPhases, {
        format: 'markdown',
        includeCompleted: false,
        includeSkipped: true,
      });

      const mdContent = buffer.toString('utf-8');
      
      // Should not include completed task
      expect(mdContent).not.toContain('Market Research');
      
      // Should include other tasks
      expect(mdContent).toContain('Competitor Analysis');
      expect(mdContent).toContain('Build Core Features');
    });
  });

  describe('Export Job Management', () => {
    it('should create export job with unique ID', () => {
      const jobId1 = planExportService.createExportJob(1, 1, 'csv');
      const jobId2 = planExportService.createExportJob(1, 1, 'csv');
      
      expect(jobId1).toBeDefined();
      expect(jobId2).toBeDefined();
      expect(jobId1).not.toBe(jobId2);
    });

    it('should retrieve export job by ID', () => {
      const jobId = planExportService.createExportJob(1, 1, 'json');
      const job = planExportService.getExportJob(jobId);
      
      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.planId).toBe(1);
      expect(job?.userId).toBe(1);
      expect(job?.format).toBe('json');
      expect(job?.status).toBe('pending');
      expect(job?.progress).toBe(0);
    });

    it('should update export job status', () => {
      const jobId = planExportService.createExportJob(1, 1, 'markdown');
      
      planExportService.updateExportJob(jobId, {
        status: 'processing',
        progress: 50,
      });
      
      const job = planExportService.getExportJob(jobId);
      expect(job?.status).toBe('processing');
      expect(job?.progress).toBe(50);
    });

    it('should set completedAt when job is completed', () => {
      const jobId = planExportService.createExportJob(1, 1, 'csv');
      
      planExportService.updateExportJob(jobId, {
        status: 'completed',
        progress: 100,
        downloadUrl: 'https://example.com/download/123',
      });
      
      const job = planExportService.getExportJob(jobId);
      expect(job?.status).toBe('completed');
      expect(job?.completedAt).toBeDefined();
      expect(job?.downloadUrl).toBe('https://example.com/download/123');
    });

    it('should delete export job', () => {
      const jobId = planExportService.createExportJob(1, 1, 'json');
      
      expect(planExportService.getExportJob(jobId)).toBeDefined();
      
      planExportService.deleteExportJob(jobId);
      
      expect(planExportService.getExportJob(jobId)).toBeUndefined();
    });

    it('should throw error when updating non-existent job', () => {
      expect(() => {
        planExportService.updateExportJob('non-existent-id', { status: 'completed' });
      }).toThrow('Export job non-existent-id not found');
    });
  });

  describe('Utility Methods', () => {
    it('should return correct file extension for each format', () => {
      expect(planExportService.getFileExtension('csv')).toBe('csv');
      expect(planExportService.getFileExtension('json')).toBe('json');
      expect(planExportService.getFileExtension('markdown')).toBe('md');
    });

    it('should return correct MIME type for each format', () => {
      expect(planExportService.getMimeType('csv')).toBe('text/csv');
      expect(planExportService.getMimeType('json')).toBe('application/json');
      expect(planExportService.getMimeType('markdown')).toBe('text/markdown');
    });

    it('should generate valid filename', () => {
      const filename = planExportService.generateFilename(mockPlan, 'csv');
      
      expect(filename).toMatch(/^action-plan-test-action-plan-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(filename).toContain('test-action-plan');
      expect(filename).toContain('.csv');
    });

    it('should sanitize plan title in filename', () => {
      const planWithSpecialChars = {
        ...mockPlan,
        title: 'My Plan! With @Special #Characters & Spaces',
      };
      
      const filename = planExportService.generateFilename(planWithSpecialChars, 'json');
      
      // Should only contain lowercase alphanumeric and hyphens
      expect(filename).toMatch(/^action-plan-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.json$/);
      expect(filename).not.toContain('!');
      expect(filename).not.toContain('@');
      expect(filename).not.toContain('#');
      expect(filename).not.toContain('&');
      expect(filename).not.toContain(' ');
    });

    it('should truncate long plan titles in filename', () => {
      const planWithLongTitle = {
        ...mockPlan,
        title: 'A'.repeat(100), // Very long title
      };
      
      const filename = planExportService.generateFilename(planWithLongTitle, 'markdown');
      
      // Filename should not be excessively long
      expect(filename.length).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported export format', async () => {
      await expect(
        planExportService.exportPlan(mockPlan, mockPhases, {
          format: 'xml' as any,
        })
      ).rejects.toThrow('Unsupported export format: xml');
    });
  });
});
