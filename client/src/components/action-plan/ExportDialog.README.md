# ExportDialog Component

## Overview

The `ExportDialog` component provides a modal interface for exporting action plans to various formats. It supports CSV, JSON, and Markdown exports with options to include/exclude completed and skipped tasks.

## Features

- **Format Selection**: Choose from CSV, JSON, or Markdown formats
- **Export Options**: Toggle inclusion of completed and skipped tasks
- **Progress Indicator**: Visual feedback during export process
- **Success/Error Handling**: Clear messaging for export results
- **Auto-Download**: Automatically downloads the exported file
- **Download Again**: Option to re-download after successful export

## Usage

```tsx
import { ExportDialog } from '@/components/action-plan';
import type { ActionPlan } from '@shared/schema';

function MyComponent() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const plan: ActionPlan = { /* ... */ };

  return (
    <>
      <Button onClick={() => setExportDialogOpen(true)}>
        Export Plan
      </Button>

      <ExportDialog
        plan={plan}
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `plan` | `ActionPlan \| null` | Yes | The action plan to export |
| `open` | `boolean` | Yes | Whether the dialog is open |
| `onOpenChange` | `(open: boolean) => void` | Yes | Callback when dialog should close |

## Export Formats

### CSV
- Spreadsheet format compatible with Excel and Google Sheets
- Includes columns: Phase, Task, Status, Estimated Time, etc.
- Proper escaping for special characters

### JSON
- Structured data format for developers
- Includes full plan structure with metadata
- Contains statistics (completion percentage, task counts)

### Markdown
- Checklist format compatible with GitHub, Notion, Obsidian
- Uses checkbox syntax (`- [ ]` and `- [x]`)
- Includes progress indicators and task details

### Future Formats (Coming Soon)
- **Trello**: Export to Trello board with lists and cards
- **Asana**: Export to Asana project with sections and tasks

## Export Options

### Include Completed Tasks
When enabled, completed tasks are included in the export. When disabled, only incomplete tasks are exported.

### Include Skipped Tasks
When enabled, skipped tasks are included in the export. When disabled, skipped tasks are excluded.

## API Integration

The component integrates with the backend export API:

```typescript
POST /api/plans/:planId/export
{
  format: 'csv' | 'json' | 'markdown',
  includeCompleted: boolean,
  includeSkipped: boolean
}
```

The API returns a file blob that is automatically downloaded by the browser.

## Error Handling

The component handles various error scenarios:

- **No Plan**: Export button is disabled when no plan is provided
- **API Errors**: Displays error message from server
- **Network Errors**: Shows generic error message
- **Unavailable Formats**: Prevents export of formats not yet implemented

## Accessibility

- Proper ARIA labels for dialog and controls
- Keyboard navigation support
- Focus management
- Screen reader friendly
- Disabled state for controls during export

## Testing

The component includes comprehensive tests covering:

- Rendering and UI elements
- Format selection
- Export options toggling
- Export functionality
- Progress indication
- Success/error states
- Download functionality
- Dialog close behavior
- Accessibility features

Run tests with:

```bash
npm test -- --config client/vitest.config.ts client/src/components/action-plan/__tests__/ExportDialog.test.tsx --run
```

## Requirements

This component fulfills the following requirements:

- **7.1**: Export action plans to CSV, JSON, and Markdown formats
- **7.7**: Include option to export only incomplete tasks or full plan with history

## Related Components

- `ActionPlanView`: Main action plan display component
- `TaskItem`: Individual task component
- `ProgressDashboard`: Progress metrics display

## Future Enhancements

1. **Trello Integration** (Task 29): Export to Trello boards
2. **Asana Integration** (Task 30): Export to Asana projects
3. **Custom Templates**: Allow users to customize export format
4. **Scheduled Exports**: Automatic periodic exports
5. **Email Export**: Send exported file via email
