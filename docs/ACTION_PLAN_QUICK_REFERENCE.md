# Action Plan Customization - Quick Reference

**Last Updated:** November 2, 2025  
**Feature Status:** ✅ Production Ready

---

## Overview

Action Plan Customization allows you to transform AI-generated roadmaps into personalized execution plans. Add custom tasks, set dependencies, track progress, and export to your favorite tools.

---

## Quick Actions

### Creating a Plan
```
1. Complete a gap analysis search
2. Navigate to the action plan tab
3. Plan is automatically generated
4. Optionally apply a template
```

### Adding a Task
```
1. Click "Add Task" in any phase
2. Fill in: Title, Description, Time, Resources
3. Click "Create Task"
```

### Editing a Task
```
1. Click on any task
2. Click the edit icon (pencil)
3. Modify fields
4. Changes auto-save
```

### Marking Complete
```
- Click checkbox next to task
- Or open task and change status
- Progress updates automatically
```

### Reordering Tasks
```
- Drag and drop using handle (⋮⋮)
- Or use Ctrl/Cmd + ↑/↓ arrows
```

### Setting Dependencies
```
1. Click on a task
2. Click "Add Dependency"
3. Select prerequisite task(s)
4. Save
```

### Exporting
```
1. Click "Export" button
2. Choose format (CSV, JSON, Markdown, Trello, Asana)
3. Select options
4. Download or send to tool
```

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle task completion | `Space` |
| Edit selected task | `Enter` |
| Delete selected task | `Delete` |
| Add new task | `Ctrl/Cmd + N` |
| Move task up | `Ctrl/Cmd + ↑` |
| Move task down | `Ctrl/Cmd + ↓` |
| Next task | `Tab` |
| Previous task | `Shift + Tab` |
| Jump to phase 1-4 | `Ctrl/Cmd + 1-4` |
| Export plan | `Ctrl/Cmd + E` |
| Show shortcuts | `?` |

---

## Task Statuses

| Status | Icon | Description |
|--------|------|-------------|
| Not Started | ⚪ | Haven't begun yet |
| In Progress | 🔵 | Currently working on it |
| Completed | ✅ | Finished successfully |
| Skipped | ⏭️ | Not applicable or decided not to do |

---

## Plan Templates

| Template | Best For |
|----------|----------|
| Software Startup | SaaS products, web applications |
| Physical Product | Hardware, consumer goods |
| Service Business | Consulting, professional services |
| Content Platform | Media, publishing, content creation |
| Marketplace | Two-sided platforms |
| Mobile App | iOS and Android applications |

---

## Export Formats

| Format | Use Case | Features |
|--------|----------|----------|
| CSV | Excel, Google Sheets | Spreadsheet-compatible |
| JSON | Programmatic use | Raw data structure |
| Markdown | GitHub, Notion, Obsidian | Text-based checklist |
| Trello | Project management | Creates board with lists/cards |
| Asana | Task management | Creates project with sections |

---

## API Endpoints

### Plans
- `POST /api/plans` - Create plan
- `GET /api/plans/search/:searchId` - Get plan by search
- `PATCH /api/plans/:planId` - Update plan
- `GET /api/plans/:planId/tasks` - Get all tasks
- `POST /api/plans/:planId/export` - Export plan

### Tasks
- `POST /api/plans/:planId/tasks` - Create task
- `PATCH /api/tasks/:taskId` - Update task
- `DELETE /api/tasks/:taskId` - Delete task
- `POST /api/plans/:planId/tasks/reorder` - Reorder tasks

### Dependencies
- `GET /api/tasks/:taskId/dependencies` - Get dependencies
- `POST /api/tasks/:taskId/dependencies` - Add dependency
- `DELETE /api/dependencies/:dependencyId` - Remove dependency
- `GET /api/plans/:planId/dependencies` - Get all plan dependencies

### Progress
- `GET /api/plans/:planId/progress/history` - Get progress history
- `GET /api/plans/users/:userId/progress/summary` - Get user summary

### Recommendations
- `GET /api/plans/:planId/recommendations` - Get smart recommendations
- `POST /api/plans/:planId/recommendations/:id/dismiss` - Dismiss recommendation

---

## Common Patterns

### Creating a Custom Task
```typescript
const response = await fetch('/api/plans/456/tasks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phaseId: 1,
    title: 'Research competitor pricing',
    description: 'Analyze top 5 competitors',
    estimatedTime: '1 week',
    resources: ['Competitor analysis template'],
    order: 3
  })
});
```

### Updating Task Status
```typescript
const response = await fetch('/api/tasks/125', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'completed'
  })
});
```

### Adding a Dependency
```typescript
const response = await fetch('/api/tasks/125/dependencies', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prerequisiteTaskId: 101
  })
});
```

### Exporting to CSV
```typescript
const response = await fetch('/api/plans/456/export', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    format: 'csv',
    includeCompleted: true,
    includeSkipped: false
  })
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'action-plan.csv';
a.click();
```

---

## Troubleshooting

### Tasks won't reorder
- Ensure you're dragging by the handle (⋮⋮)
- Check edit permissions
- Try refreshing the page

### Progress not saving
- Check internet connection
- Verify you're logged in
- Disable interfering browser extensions
- Clear cache and reload

### Can't add dependencies
- Verify both tasks are in same plan
- Check for circular dependencies
- Ensure prerequisite task exists

### Export not working
- Check browser download settings
- Disable popup blockers
- Try different export format
- Contact support if persists

---

## Best Practices

### Task Management
✅ Break large tasks into smaller steps  
✅ Set realistic time estimates  
✅ Update status regularly  
✅ Use dependencies for logical order  
✅ Add resources for each task  

❌ Don't create too many tasks  
❌ Don't skip status updates  
❌ Don't ignore dependencies  
❌ Don't forget to celebrate milestones  

### Progress Tracking
✅ Check off tasks immediately  
✅ Review progress weekly  
✅ Adjust estimates based on actuals  
✅ Celebrate phase completions  

❌ Don't let tasks go stale  
❌ Don't ignore velocity trends  
❌ Don't skip progress reviews  

### Customization
✅ Start with a template  
✅ Customize gradually  
✅ Preserve original plan  
✅ Export regularly  

❌ Don't over-customize initially  
❌ Don't delete original tasks hastily  
❌ Don't forget to save exports  

---

## Resources

- **Full Documentation:** [User Guide](./USER_GUIDE.md#action-plans--progress-tracking)
- **API Documentation:** [API.md](./API.md#action-plans--task-management)
- **FAQ:** [FAQ.md](./FAQ.md)
- **Video Tutorials:** Coming soon
- **Support:** support@unbuilt.one

---

## Feature Highlights

### ✨ What Makes It Special

1. **AI-Generated + Customizable** - Best of both worlds
2. **Real-time Collaboration** - WebSocket-powered updates
3. **Smart Recommendations** - Context-aware suggestions
4. **Flexible Export** - Multiple formats and integrations
5. **Progress Celebrations** - Gamified milestone tracking
6. **Dependency Management** - Enforce logical task order
7. **Template Library** - Pre-built for different project types
8. **Keyboard Shortcuts** - Power user productivity

### 📊 By the Numbers

- **4 Phases** - Research, Development, Testing, Launch
- **24+ Tasks** - Average per AI-generated plan
- **5 Export Formats** - CSV, JSON, Markdown, Trello, Asana
- **6 Templates** - Different project types
- **10+ Shortcuts** - Keyboard productivity
- **Real-time** - WebSocket synchronization

---

**Need Help?** Check the [User Guide](./USER_GUIDE.md) or contact support@unbuilt.one
