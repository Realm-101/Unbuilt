/**
 * Toast notification helpers with semantic variants
 * Provides convenient functions for showing success, error, warning, and info toasts
 */

import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import type { ToastActionElement } from "@/components/ui/toast";

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: ToastActionElement;
}

/**
 * Show a success toast notification
 */
export function showSuccess(options: ToastOptions | string) {
  const opts = typeof options === "string" ? { description: options } : options;
  
  return toast({
    variant: "success",
    title: opts.title || "Success",
    description: opts.description,
    duration: opts.duration || 5000,
    action: opts.action,
  });
}

/**
 * Show an error toast notification
 */
export function showError(options: ToastOptions | string) {
  const opts = typeof options === "string" ? { description: options } : options;
  
  return toast({
    variant: "error",
    title: opts.title || "Error",
    description: opts.description,
    duration: opts.duration || 7000, // Errors stay longer
    action: opts.action,
  });
}

/**
 * Show a warning toast notification
 */
export function showWarning(options: ToastOptions | string) {
  const opts = typeof options === "string" ? { description: options } : options;
  
  return toast({
    variant: "warning",
    title: opts.title || "Warning",
    description: opts.description,
    duration: opts.duration || 6000,
    action: opts.action,
  });
}

/**
 * Show an info toast notification
 */
export function showInfo(options: ToastOptions | string) {
  const opts = typeof options === "string" ? { description: options } : options;
  
  return toast({
    variant: "info",
    title: opts.title || "Info",
    description: opts.description,
    duration: opts.duration || 5000,
    action: opts.action,
  });
}

/**
 * Show a loading toast that can be updated
 */
export function showLoading(message: string = "Loading...") {
  return toast({
    variant: "info",
    title: message,
    duration: Infinity, // Don't auto-dismiss
  });
}

/**
 * Show a promise toast that updates based on promise state
 */
export async function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
): Promise<T> {
  const loadingToast = showLoading(messages.loading);

  try {
    const data = await promise;
    loadingToast.dismiss();
    
    const successMessage = typeof messages.success === "function" 
      ? messages.success(data) 
      : messages.success;
    
    showSuccess(successMessage);
    return data;
  } catch (error) {
    loadingToast.dismiss();
    
    const errorMessage = typeof messages.error === "function" 
      ? messages.error(error as Error) 
      : messages.error;
    
    showError(errorMessage);
    throw error;
  }
}
