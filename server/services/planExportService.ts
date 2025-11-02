import type { ActionPlan, PlanPhase, PlanTask } from '@shared/schema';

/**
 * Plan Export Service
 * Handles exporting action plans to various formats (CSV, JSON, Markdown)
 * 
 * Requirements: 7.1, 7.2, 7.5, 7.7
 */

export type ExportFormat = 'csv' | 'json' | 'markdown';

export interface ExportOptions {
  format: ExportFormat;
  includeCompleted?: boolean; // Include completed tasks (default: true)
  includeSkipped?: boolean; // Include skipped tasks (default: true)
}

export interface ExportJob {
  id: string;
  planId: number;
  userId: number;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Plan Export Service
 * Generates exports in CSV, JSON, and Markdown formats
 */
export class PlanExportService {
  private exportJobs: Map<string, ExportJob> = new Map();

  /**
   * Export action plan to specified format
   * Returns the exported content as a Buffer
   */
  async exportPlan(
    plan: ActionPlan,
    phases: Array<PlanPhase & { tasks: PlanTask[] }>,
    options: ExportOptions
  ): Promise<Buffer> {
    switch (options.format) {
      case 'csv':
        return this.exportToCSV(plan, phases, options);
      case 'json':
        return this.exportToJSON(plan, phases, options);
      case 'markdown':
        return this.exportToMarkdown(plan, phases, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export to CSV format
   * Includes proper escaping for special characters
   * 
   * Requirements: 7.1, 7.2
   */
  private async exportToCSV(
    plan: ActionPlan,
    phases: Array<PlanPhase & { tasks: PlanTask[] }>,
    options: ExportOptions
  ): Promise<Buffer> {
    const rows: string[][] = [];

    // Header row
    rows.push([
      'Phase',
      'Phase Order',
      'Task',
      'Task Order',
      'Description',
      'Status',
      'Estimated Time',
      'Resources',
      'Assignee ID',
      'Completed At',
      'Completed By',
      'Is Custom'
    ]);

    // Data rows
    for (const phase of phases) {
      for (const task of phase.tasks) {
        // Filter based on options
        if (!options.includeCompleted && task.status === 'completed') {
          continue;
        }
        if (!options.includeSkipped && task.status === 'skipped') {
          continue;
        }

        rows.push([
          phase.name,
          phase.order.toString(),
          task.title,
          task.order.toString(),
          task.description || '',
          task.status,
          task.estimatedTime || '',
          Array.isArray(task.resources) ? task.resources.join('; ') : '',
          task.assigneeId?.toString() || '',
          task.completedAt || '',
          task.completedBy?.toString() || '',
          task.isCustom ? 'Yes' : 'No'
        ]);
      }
    }

    // Convert to CSV with proper escaping
    const csvContent = rows
      .map(row => 
        row.map(cell => this.escapeCsvCell(cell)).join(',')
      )
      .join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Export to JSON format
   * Includes full plan structure with metadata
   * 
   * Requirements: 7.1, 7.5
   */
  private async exportToJSON(
    plan: ActionPlan,
    phases: Array<PlanPhase & { tasks: PlanTask[] }>,
    options: ExportOptions
  ): Promise<Buffer> {
    // Filter tasks based on options
    const filteredPhases = phases.map(phase => ({
      ...phase,
      tasks: phase.tasks.filter(task => {
        if (!options.includeCompleted && task.status === 'completed') {
          return false;
        }
        if (!options.includeSkipped && task.status === 'skipped') {
          return false;
        }
        return true;
      })
    }));

    // Calculate statistics
    const allTasks = filteredPhases.flatMap(p => p.tasks);
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length;
    const notStartedTasks = allTasks.filter(t => t.status === 'not_started').length;
    const skippedTasks = allTasks.filter(t => t.status === 'skipped').length;

    const exportData = {
      exportMetadata: {
        exportDate: new Date().toISOString(),
        exportFormat: 'json',
        version: '1.0',
        includeCompleted: options.includeCompleted ?? true,
        includeSkipped: options.includeSkipped ?? true,
      },
      plan: {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        status: plan.status,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        completedAt: plan.completedAt,
      },
      statistics: {
        totalPhases: filteredPhases.length,
        totalTasks: allTasks.length,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        skippedTasks,
        completionPercentage: allTasks.length > 0 
          ? Math.round((completedTasks / allTasks.length) * 100)
          : 0,
      },
      phases: filteredPhases.map(phase => ({
        id: phase.id,
        name: phase.name,
        description: phase.description,
        order: phase.order,
        estimatedDuration: phase.estimatedDuration,
        isCustom: phase.isCustom,
        tasks: phase.tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          order: task.order,
          status: task.status,
          estimatedTime: task.estimatedTime,
          resources: task.resources,
          isCustom: task.isCustom,
          assigneeId: task.assigneeId,
          completedAt: task.completedAt,
          completedBy: task.completedBy,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        })),
      })),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    return Buffer.from(jsonContent, 'utf-8');
  }

  /**
   * Export to Markdown format
   * Creates a checklist-style document compatible with GitHub, Notion, Obsidian
   * 
   * Requirements: 7.1, 7.5
   */
  private async exportToMarkdown(
    plan: ActionPlan,
    phases: Array<PlanPhase & { tasks: PlanTask[] }>,
    options: ExportOptions
  ): Promise<Buffer> {
    let markdown = '';

    // Title and metadata
    markdown += `# ${plan.title}\n\n`;
    
    if (plan.description) {
      markdown += `${plan.description}\n\n`;
    }

    // Statistics
    const allTasks = phases.flatMap(p => p.tasks);
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const totalTasks = allTasks.length;
    const completionPercentage = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    markdown += `**Status:** ${plan.status}\n`;
    markdown += `**Progress:** ${completedTasks}/${totalTasks} tasks completed (${completionPercentage}%)\n`;
    markdown += `**Created:** ${new Date(plan.createdAt).toLocaleDateString()}\n`;
    markdown += `**Last Updated:** ${new Date(plan.updatedAt).toLocaleDateString()}\n\n`;

    markdown += `---\n\n`;

    // Phases and tasks
    for (const phase of phases) {
      markdown += `## ${phase.name}\n\n`;
      
      if (phase.description) {
        markdown += `${phase.description}\n\n`;
      }

      if (phase.estimatedDuration) {
        markdown += `**Estimated Duration:** ${phase.estimatedDuration}\n\n`;
      }

      // Calculate phase progress
      const phaseTasks = phase.tasks;
      const phaseCompleted = phaseTasks.filter(t => t.status === 'completed').length;
      const phaseTotal = phaseTasks.length;
      const phasePercentage = phaseTotal > 0 
        ? Math.round((phaseCompleted / phaseTotal) * 100)
        : 0;

      markdown += `**Phase Progress:** ${phaseCompleted}/${phaseTotal} tasks (${phasePercentage}%)\n\n`;

      // Tasks
      for (const task of phase.tasks) {
        // Filter based on options
        if (!options.includeCompleted && task.status === 'completed') {
          continue;
        }
        if (!options.includeSkipped && task.status === 'skipped') {
          continue;
        }

        // Checkbox based on status
        const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
        
        // Task title with status indicator
        let taskLine = `- ${checkbox} ${task.title}`;
        
        // Add status badge for non-completed tasks
        if (task.status === 'in_progress') {
          taskLine += ' 🔄';
        } else if (task.status === 'skipped') {
          taskLine += ' ⏭️';
        }

        // Add custom indicator
        if (task.isCustom) {
          taskLine += ' ✏️';
        }

        markdown += `${taskLine}\n`;

        // Task details (indented)
        if (task.description) {
          markdown += `  - **Description:** ${task.description}\n`;
        }

        if (task.estimatedTime) {
          markdown += `  - **Estimated Time:** ${task.estimatedTime}\n`;
        }

        if (task.resources && Array.isArray(task.resources) && task.resources.length > 0) {
          markdown += `  - **Resources:** ${task.resources.join(', ')}\n`;
        }

        if (task.completedAt) {
          markdown += `  - **Completed:** ${new Date(task.completedAt).toLocaleDateString()}\n`;
        }

        markdown += '\n';
      }

      markdown += '\n';
    }

    // Footer
    markdown += `---\n\n`;
    markdown += `*Exported from Unbuilt on ${new Date().toLocaleDateString()}*\n`;
    markdown += `*Legend: 🔄 In Progress | ⏭️ Skipped | ✏️ Custom Task*\n`;

    return Buffer.from(markdown, 'utf-8');
  }

  /**
   * Escape CSV cell content
   * Handles quotes, commas, and newlines
   */
  private escapeCsvCell(cell: string): string {
    // Convert to string if not already
    const str = String(cell);

    // If cell contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Create export job for async processing
   * Returns job ID for tracking
   */
  createExportJob(
    planId: number,
    userId: number,
    format: ExportFormat
  ): string {
    const jobId = `export_${planId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: ExportJob = {
      id: jobId,
      planId,
      userId,
      format,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };

    this.exportJobs.set(jobId, job);

    return jobId;
  }

  /**
   * Update export job status
   */
  updateExportJob(
    jobId: string,
    updates: Partial<ExportJob>
  ): void {
    const job = this.exportJobs.get(jobId);
    if (!job) {
      throw new Error(`Export job ${jobId} not found`);
    }

    Object.assign(job, updates);

    if (updates.status === 'completed' || updates.status === 'failed') {
      job.completedAt = new Date();
    }
  }

  /**
   * Get export job status
   */
  getExportJob(jobId: string): ExportJob | undefined {
    return this.exportJobs.get(jobId);
  }

  /**
   * Delete export job
   * Should be called after download or after expiration
   */
  deleteExportJob(jobId: string): void {
    this.exportJobs.delete(jobId);
  }

  /**
   * Cleanup old export jobs
   * Remove jobs older than maxAgeMs (default: 1 hour)
   */
  cleanupOldJobs(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    
    for (const [jobId, job] of this.exportJobs.entries()) {
      const jobAge = now - job.createdAt.getTime();
      
      // Remove completed/failed jobs older than maxAge
      if ((job.status === 'completed' || job.status === 'failed') && jobAge > maxAgeMs) {
        this.exportJobs.delete(jobId);
      }
      
      // Remove pending jobs older than 10 minutes (likely stuck)
      if (job.status === 'pending' && jobAge > 600000) {
        this.exportJobs.delete(jobId);
      }
    }
  }

  /**
   * Get file extension for format
   */
  getFileExtension(format: ExportFormat): string {
    switch (format) {
      case 'csv':
        return 'csv';
      case 'json':
        return 'json';
      case 'markdown':
        return 'md';
      default:
        return 'txt';
    }
  }

  /**
   * Get MIME type for format
   */
  getMimeType(format: ExportFormat): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      case 'markdown':
        return 'text/markdown';
      default:
        return 'text/plain';
    }
  }

  /**
   * Generate filename for export
   */
  generateFilename(plan: ActionPlan, format: ExportFormat): string {
    // Sanitize plan title for filename
    const sanitizedTitle = plan.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

    const timestamp = new Date().toISOString().split('T')[0];
    const extension = this.getFileExtension(format);

    return `action-plan-${sanitizedTitle}-${timestamp}.${extension}`;
  }
}

// Export singleton instance
export const planExportService = new PlanExportService();
