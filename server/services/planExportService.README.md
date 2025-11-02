# Plan Export Service

## Overview

The `PlanExportService` provides functionality to export action plans to various formats (CSV, JSON, Markdown) with proper formatting, escaping, and filtering options.

## Features

### Export Formats

1. **CSV Export**
   - Proper CSV escaping for special characters (quotes, commas, newlines)
   - Includes all task and phase metadata
   - Compatible with Excel, Google Sheets, and other spreadsheet applications

2. **JSON Export**
   - Full plan structure with metadata
   - Statistics and progress metrics
   - Structured data for programmatic access

3. **Markdown Export**
   - Checklist-style format with checkboxes
   - Compatible with GitHub, Notion, Obsidian
   - Visual indicators for task status (🔄 In Progress, ⏭️ Skipped, ✏️ Custom)
   - Phase progress tracking

### Export Options

- `includeCompleted`: Include or exclude completed tasks (default: true)
- `includeSkipped`: Include or exclude skipped tasks (default: true)

### Export Job Management

- Async export job tracking
- Job status monitoring (pending, processing, completed, failed)
- Progress tracking (0-100%)
- Automatic cleanup of old jobs

## Usage

### Basic Export

```typescript
import { planExportService } from './services/planExportService';

// Export to CSV
const csvBuffer = await planExportService.exportPlan(plan, phases, {
  format: 'csv',
  includeCompleted: true,
  includeSkipped: true,
});

// Export to JSON
const jsonBuffer = await planExportService.exportPlan(plan, phases, {
  format: 'json',
});

// Export to Markdown
const mdBuffer = await planExportService.exportPlan(plan, phases, {
  format: 'markdown',
  includeCompleted: false, // Only show incomplete tasks
});
```

### Export Job Management

```typescript
// Create export job
const jobId = planExportService.createExportJob(planId, userId, 'csv');

// Update job status
planExportService.updateExportJob(jobId, {
  status: 'processing',
  progress: 50,
});

// Get job status
const job = planExportService.getExportJob(jobId);
console.log(job.status, job.progress);

// Complete job
planExportService.updateExportJob(jobId, {
  status: 'completed',
  progress: 100,
  downloadUrl: 'https://example.com/download/123',
});

// Delete job after download
planExportService.deleteExportJob(jobId);
```

### Utility Methods

```typescript
// Get file extension
const ext = planExportService.getFileExtension('csv'); // 'csv'

// Get MIME type
const mime = planExportService.getMimeType('json'); // 'application/json'

// Generate filename
const filename = planExportService.generateFilename(plan, 'markdown');
// Returns: 'action-plan-my-plan-2025-01-15.md'
```

### Cleanup

```typescript
// Cleanup old jobs (default: 1 hour)
planExportService.cleanupOldJobs();

// Custom cleanup interval (30 minutes)
planExportService.cleanupOldJobs(1800000);
```

## CSV Format

```csv
Phase,Phase Order,Task,Task Order,Description,Status,Estimated Time,Resources,Assignee ID,Completed At,Completed By,Is Custom
Research Phase,0,Market Research,0,Conduct market research,completed,4 hours,https://example.com,1,2025-01-05T00:00:00.000Z,1,No
Research Phase,0,Competitor Analysis,1,Analyze competitors,in_progress,6 hours,,2,,,No
```

## JSON Format

```json
{
  "exportMetadata": {
    "exportDate": "2025-01-15T00:00:00.000Z",
    "exportFormat": "json",
    "version": "1.0",
    "includeCompleted": true,
    "includeSkipped": true
  },
  "plan": {
    "id": 1,
    "title": "My Action Plan",
    "description": "Plan description",
    "status": "active",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T00:00:00.000Z",
    "completedAt": null
  },
  "statistics": {
    "totalPhases": 2,
    "totalTasks": 10,
    "completedTasks": 3,
    "inProgressTasks": 2,
    "notStartedTasks": 4,
    "skippedTasks": 1,
    "completionPercentage": 30
  },
  "phases": [
    {
      "id": 1,
      "name": "Research Phase",
      "description": "Initial research",
      "order": 0,
      "estimatedDuration": "2 weeks",
      "isCustom": false,
      "tasks": [...]
    }
  ]
}
```

## Markdown Format

```markdown
# My Action Plan

Plan description

**Status:** active
**Progress:** 3/10 tasks completed (30%)
**Created:** 1/1/2025
**Last Updated:** 1/15/2025

---

## Research Phase

Initial research

**Estimated Duration:** 2 weeks

**Phase Progress:** 2/5 tasks (40%)

- [x] Market Research
  - **Description:** Conduct market research
  - **Estimated Time:** 4 hours
  - **Resources:** https://example.com
  - **Completed:** 1/5/2025

- [ ] Competitor Analysis 🔄
  - **Description:** Analyze competitors
  - **Estimated Time:** 6 hours

---

*Exported from Unbuilt on 1/15/2025*
*Legend: 🔄 In Progress | ⏭️ Skipped | ✏️ Custom Task*
```

## Requirements Covered

- **7.1**: Export formats (CSV, JSON, Markdown)
- **7.2**: CSV export with proper escaping
- **7.5**: Markdown export with checkboxes
- **7.7**: Export job tracking for async operations

## Testing

The service includes comprehensive unit tests covering:
- CSV export with proper escaping
- JSON export with full structure
- Markdown export with checkboxes and indicators
- Task filtering based on status
- Export job management
- Utility methods
- Error handling

Run tests:
```bash
npm test server/services/__tests__/planExportService.test.ts -- --run
```

## Future Enhancements

The following features are planned for future implementation:
- Trello integration (Requirement 7.3)
- Asana integration (Requirement 7.4)
- Bidirectional sync with external platforms (Requirement 7.6)
