# Toast Notification System

## Overview

The toast notification system provides accessible, user-friendly notifications with multiple variants, configurable durations, and action buttons. Built on Radix UI Toast primitives with full ARIA support.

## Features

- ✅ Multiple variants (success, error, warning, info, default, destructive)
- ✅ Auto-dismiss with configurable duration
- ✅ Action buttons support
- ✅ Stack multiple toasts (up to 5)
- ✅ ARIA live regions for screen readers
- ✅ Swipe to dismiss on mobile
- ✅ Keyboard accessible
- ✅ Respects reduced motion preferences

## Usage

### Basic Usage

```typescript
import { toast } from "@/hooks/use-toast";

// Simple toast
toast({
  title: "Success",
  description: "Your changes have been saved.",
});

// With variant
toast({
  variant: "success",
  title: "Success",
  description: "Your changes have been saved.",
});
```

### Using Helper Functions

```typescript
import { showSuccess, showError, showWarning, showInfo } from "@/lib/toast-helpers";

// Success toast
showSuccess("Profile updated successfully!");

// Error toast
showError("Failed to save changes. Please try again.");

// Warning toast
showWarning("You have unsaved changes.");

// Info toast
showInfo("New features are available!");

// With options
showSuccess({
  title: "Success",
  description: "Your profile has been updated.",
  duration: 3000,
});
```

### With Action Buttons

```typescript
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

toast({
  variant: "warning",
  title: "Unsaved Changes",
  description: "You have unsaved changes. Do you want to save them?",
  action: (
    <ToastAction altText="Save changes" onClick={handleSave}>
      Save
    </ToastAction>
  ),
});
```

### Loading States

```typescript
import { showLoading, showPromise } from "@/lib/toast-helpers";

// Manual loading toast
const loadingToast = showLoading("Saving changes...");
// ... do async work
loadingToast.dismiss();
showSuccess("Changes saved!");

// Promise-based loading
await showPromise(
  saveProfile(data),
  {
    loading: "Saving profile...",
    success: "Profile saved successfully!",
    error: "Failed to save profile.",
  }
);
```

### Programmatic Control

```typescript
import { toast } from "@/hooks/use-toast";

// Get toast instance for control
const myToast = toast({
  title: "Processing...",
  duration: Infinity, // Don't auto-dismiss
});

// Update the toast
myToast.update({
  title: "Almost done...",
  description: "Just a few more seconds.",
});

// Dismiss manually
myToast.dismiss();
```

## Variants

### Success
- **Color:** Green
- **Icon:** CheckCircle2
- **Use for:** Successful operations, confirmations
- **Default duration:** 5 seconds

### Error
- **Color:** Red
- **Icon:** XCircle
- **Use for:** Failed operations, critical errors
- **Default duration:** 7 seconds
- **ARIA:** assertive (interrupts screen readers)

### Warning
- **Color:** Yellow
- **Icon:** AlertTriangle
- **Use for:** Warnings, cautions, unsaved changes
- **Default duration:** 6 seconds

### Info
- **Color:** Blue
- **Icon:** Info
- **Use for:** Informational messages, tips
- **Default duration:** 5 seconds

### Default
- **Color:** Theme default
- **Icon:** None
- **Use for:** General notifications

### Destructive
- **Color:** Red (similar to error)
- **Icon:** XCircle
- **Use for:** Destructive actions, deletions
- **ARIA:** assertive

## Accessibility

### ARIA Live Regions
- Error and destructive toasts use `aria-live="assertive"` to interrupt screen readers
- Other variants use `aria-live="polite"` to announce when convenient
- All toasts have `aria-atomic="true"` to read the entire message
- Appropriate `role` attributes (alert for errors, status for others)

### Keyboard Navigation
- Focus management for action buttons
- Close button accessible via keyboard
- Escape key dismisses focused toast

### Visual Accessibility
- High contrast colors meeting WCAG AA standards
- Icons provide visual reinforcement (not sole indicator)
- Clear text descriptions
- Visible focus indicators

### Reduced Motion
- Respects `prefers-reduced-motion` preference
- Animations disabled when user prefers reduced motion

## Configuration

### Duration
```typescript
// Custom duration (in milliseconds)
toast({
  title: "Quick message",
  duration: 2000, // 2 seconds
});

// Never auto-dismiss
toast({
  title: "Important",
  duration: Infinity,
});
```

### Maximum Toasts
The system displays up to 5 toasts at once. Older toasts are automatically removed when the limit is reached.

To change the limit, modify `TOAST_LIMIT` in `client/src/hooks/use-toast.ts`.

### Default Duration
Default durations are set in `client/src/lib/toast-helpers.ts`:
- Success: 5 seconds
- Error: 7 seconds
- Warning: 6 seconds
- Info: 5 seconds

## Best Practices

### Do's
✅ Use appropriate variants for the message type
✅ Keep messages concise and actionable
✅ Provide action buttons for recoverable errors
✅ Use loading toasts for long operations
✅ Dismiss loading toasts when operation completes

### Don'ts
❌ Don't use toasts for critical information that must be read
❌ Don't stack too many toasts (system limits to 5)
❌ Don't use very long durations for non-critical messages
❌ Don't rely solely on color to convey meaning
❌ Don't use toasts for complex forms or multi-step processes

## Examples

### Form Submission
```typescript
async function handleSubmit(data: FormData) {
  try {
    await showPromise(
      submitForm(data),
      {
        loading: "Submitting form...",
        success: "Form submitted successfully!",
        error: (error) => `Failed to submit: ${error.message}`,
      }
    );
    
    // Navigate or update UI
  } catch (error) {
    // Error toast already shown
  }
}
```

### Undo Action
```typescript
import { ToastAction } from "@/components/ui/toast";

function handleDelete(itemId: string) {
  // Optimistically delete
  deleteItem(itemId);
  
  toast({
    variant: "warning",
    title: "Item deleted",
    description: "The item has been removed.",
    action: (
      <ToastAction altText="Undo deletion" onClick={() => restoreItem(itemId)}>
        Undo
      </ToastAction>
    ),
  });
}
```

### Multi-step Process
```typescript
async function handleMultiStepProcess() {
  const toast1 = showLoading("Step 1: Validating data...");
  await validateData();
  toast1.update({ title: "Step 2: Processing..." });
  await processData();
  toast1.update({ title: "Step 3: Saving..." });
  await saveData();
  toast1.dismiss();
  showSuccess("Process completed successfully!");
}
```

## Integration with App

The `Toaster` component should be included once in your app root:

```typescript
// In App.tsx or layout component
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <>
      {/* Your app content */}
      <Toaster />
    </>
  );
}
```

## Testing

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

test("shows success toast", async () => {
  render(<Toaster />);
  
  toast({
    variant: "success",
    title: "Success",
    description: "Operation completed",
  });
  
  await waitFor(() => {
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Operation completed")).toBeInTheDocument();
  });
});
```
