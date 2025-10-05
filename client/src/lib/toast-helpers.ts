import { toast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

/**
 * Toast Helper Functions
 * 
 * Provides convenient methods for showing common toast notifications
 * with consistent styling and icons.
 */

/**
 * Show a success toast notification
 * 
 * @param title - Toast title
 * @param description - Optional description
 * 
 * @example
 * ```tsx
 * showSuccessToast('Saved!', 'Your changes have been saved successfully.');
 * ```
 */
export function showSuccessToast(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: 'default',
    className: 'border-green-500 bg-green-50 dark:bg-green-950',
  });
}

/**
 * Show an error toast notification
 * 
 * @param title - Toast title
 * @param description - Optional description
 * 
 * @example
 * ```tsx
 * showErrorToast('Error', 'Failed to save changes. Please try again.');
 * ```
 */
export function showErrorToast(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: 'destructive',
  });
}

/**
 * Show a warning toast notification
 * 
 * @param title - Toast title
 * @param description - Optional description
 * 
 * @example
 * ```tsx
 * showWarningToast('Warning', 'This action cannot be undone.');
 * ```
 */
export function showWarningToast(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: 'default',
    className: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
  });
}

/**
 * Show an info toast notification
 * 
 * @param title - Toast title
 * @param description - Optional description
 * 
 * @example
 * ```tsx
 * showInfoToast('Info', 'New features are available.');
 * ```
 */
export function showInfoToast(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: 'default',
    className: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
  });
}

/**
 * Show a loading toast notification
 * 
 * @param title - Toast title
 * @param description - Optional description
 * @returns Toast instance with dismiss method
 * 
 * @example
 * ```tsx
 * const loadingToast = showLoadingToast('Processing...', 'Please wait');
 * // Later...
 * loadingToast.dismiss();
 * ```
 */
export function showLoadingToast(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: 'default',
    duration: Infinity, // Don't auto-dismiss
  });
}

/**
 * Show a promise toast that updates based on promise state
 * 
 * @param promise - Promise to track
 * @param messages - Messages for different states
 * 
 * @example
 * ```tsx
 * showPromiseToast(
 *   saveData(),
 *   {
 *     loading: 'Saving...',
 *     success: 'Saved successfully!',
 *     error: 'Failed to save'
 *   }
 * );
 * ```
 */
export async function showPromiseToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<T> {
  const loadingToast = showLoadingToast(messages.loading);

  try {
    const result = await promise;
    loadingToast.dismiss();
    showSuccessToast(messages.success);
    return result;
  } catch (error) {
    loadingToast.dismiss();
    showErrorToast(messages.error);
    throw error;
  }
}

/**
 * Show a confirmation action toast with undo capability
 * 
 * @param title - Toast title
 * @param description - Optional description
 * @param onUndo - Callback when undo is clicked
 * 
 * @example
 * ```tsx
 * showConfirmationToast(
 *   'Item deleted',
 *   'The item has been removed',
 *   () => restoreItem()
 * );
 * ```
 */
export function showConfirmationToast(
  title: string,
  description?: string,
  onUndo?: () => void
) {
  return toast({
    title,
    description,
    variant: 'default',
    action: onUndo ? {
      altText: 'Undo',
      onClick: onUndo,
    } as any : undefined,
  });
}

/**
 * Show a network error toast
 * 
 * @example
 * ```tsx
 * showNetworkErrorToast();
 * ```
 */
export function showNetworkErrorToast() {
  return showErrorToast(
    'Connection Error',
    'Unable to connect to the server. Please check your internet connection.'
  );
}

/**
 * Show an authentication error toast
 * 
 * @example
 * ```tsx
 * showAuthErrorToast();
 * ```
 */
export function showAuthErrorToast() {
  return showErrorToast(
    'Session Expired',
    'Your session has expired. Please log in again.'
  );
}

/**
 * Show a validation error toast
 * 
 * @param errors - Array of validation error messages
 * 
 * @example
 * ```tsx
 * showValidationErrorToast(['Email is required', 'Password is too short']);
 * ```
 */
export function showValidationErrorToast(errors: string[]) {
  const description = errors.length === 1 
    ? errors[0] 
    : errors.join(', ');
  
  return showErrorToast('Validation Error', description);
}
