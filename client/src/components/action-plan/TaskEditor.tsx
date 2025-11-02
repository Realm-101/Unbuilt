import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ChevronsUpDown, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { 
  useCreateTask, 
  useUpdateTask, 
  useTaskDependencies,
  useValidateDependency,
} from '@/hooks/useActionPlan';
import type { PlanTask, ActionPlanWithDetails } from '@/types/action-plan';
import { cn } from '@/lib/utils';

/**
 * Task Editor Form Schema
 * 
 * Validation rules based on database schema:
 * - title: Required, max 200 characters
 * - description: Optional, text
 * - estimatedTime: Optional, max 50 characters
 * - resources: Optional array of URLs
 * - dependencies: Optional array of task IDs
 */
const taskFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .or(z.literal('')),
  estimatedTime: z
    .string()
    .max(50, 'Estimated time must be 50 characters or less')
    .optional()
    .or(z.literal('')),
  resources: z
    .string()
    .optional()
    .or(z.literal('')),
  dependencies: z
    .array(z.number())
    .optional()
    .default([]),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskEditorProps {
  /** Task to edit (undefined for creating new task) */
  task?: PlanTask;
  /** Phase ID for new tasks */
  phaseId: number;
  /** Plan ID for creating tasks */
  planId: number;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Current number of tasks in the phase (for calculating order) */
  currentTaskCount?: number;
  /** Optional callback to save task (if not provided, uses mutation hook) */
  onSave?: (task: Partial<PlanTask>) => Promise<void>;
  /** Full plan data for dependency selection */
  plan?: ActionPlanWithDetails;
}

/**
 * TaskEditor Component
 * 
 * Modal dialog for creating and editing tasks with:
 * - React Hook Form for form management
 * - Zod validation for input validation
 * - Fields: title, description, estimated time, resources, dependencies
 * - Save and cancel actions
 * - Loading states during save operations
 * - Dependency selection with circular dependency validation
 * 
 * Requirements: 2.1, 2.2, 2.4, 5.1
 */
export function TaskEditor({
  task,
  phaseId,
  planId,
  open,
  onOpenChange,
  currentTaskCount = 0,
  onSave,
  plan,
}: TaskEditorProps) {
  const isEditing = !!task;
  const [isSaving, setIsSaving] = useState(false);
  const [dependencyPopoverOpen, setDependencyPopoverOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [enableAutoSave, setEnableAutoSave] = useState(false);
  const { toast } = useToast();
  
  // Handle Escape key to close modal
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dependencyPopoverOpen) {
        e.preventDefault();
        handleCancel();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, dependencyPopoverOpen]);
  
  // Mutation hooks
  const createTaskMutation = useCreateTask(planId);
  const updateTaskMutation = useUpdateTask();
  
  // Dependency hooks
  const { data: existingDependencies } = useTaskDependencies(task?.id || null);
  const validateDependencyMutation = useValidateDependency(task?.id || 0);
  
  // Note: Dependencies are managed separately through the dependency API
  // For new tasks, we'll need to add dependencies after creation
  // For existing tasks, we'll update dependencies by comparing with existing ones

  // Initialize form with React Hook Form and Zod validation
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      estimatedTime: task?.estimatedTime || '',
      resources: Array.isArray(task?.resources) 
        ? task.resources.join('\n') 
        : '',
      dependencies: existingDependencies?.prerequisites || [],
    },
  });

  // Watch form values for auto-save
  const formValues = form.watch();
  
  // Auto-save handler for editing existing tasks
  const handleAutoSave = async (values: TaskFormValues) => {
    if (!isEditing || !task) return;
    
    // Parse resources from newline-separated string to array
    const resourcesArray = values.resources
      ? values.resources
          .split('\n')
          .map(r => r.trim())
          .filter(r => r.length > 0)
      : [];

    // Prepare task data (excluding dependencies - they're managed separately)
    const taskData: any = {
      id: task.id,
      title: values.title,
      description: values.description || '',
      estimatedTime: values.estimatedTime || '',
      resources: resourcesArray,
    };

    if (onSave) {
      await onSave(taskData);
    } else {
      await updateTaskMutation.mutateAsync(taskData);
    }
  };
  
  // Auto-save hook - only enabled for editing existing tasks
  const autoSave = useAutoSave({
    data: formValues,
    onSave: handleAutoSave,
    delay: 500,
    enabled: isEditing && enableAutoSave && open,
    maxRetries: 3,
    retryDelay: 1000,
    onSuccess: () => {
      // Silent success - status indicator will show
    },
    onError: (error) => {
      toast({
        title: 'Auto-save failed',
        description: error.message || 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Reset form when task changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        title: task?.title || '',
        description: task?.description || '',
        estimatedTime: task?.estimatedTime || '',
        resources: Array.isArray(task?.resources) 
          ? task.resources.join('\n') 
          : '',
        dependencies: existingDependencies?.prerequisites || [],
      });
      setValidationError(null);
      autoSave.reset();
      
      // Enable auto-save after a short delay to avoid saving initial values
      setTimeout(() => {
        setEnableAutoSave(true);
      }, 100);
    } else {
      setEnableAutoSave(false);
    }
  }, [task, open, form, existingDependencies]);

  // Get all available tasks for dependency selection (exclude self and tasks from other plans)
  const availableTasks = React.useMemo(() => {
    if (!plan) return [];
    
    const allTasks: Array<PlanTask & { phaseName: string }> = [];
    
    plan.phases.forEach(phase => {
      phase.tasks.forEach(t => {
        // Exclude the current task being edited
        if (task && t.id === task.id) return;
        
        allTasks.push({
          ...t,
          phaseName: phase.name,
        });
      });
    });
    
    return allTasks;
  }, [plan, task]);

  // Handle adding a dependency
  const handleAddDependency = async (taskId: number) => {
    const currentDeps = form.getValues('dependencies') || [];
    
    // Check if already added
    if (currentDeps.includes(taskId)) {
      return;
    }
    
    // Validate for circular dependencies (only for existing tasks)
    if (isEditing && task) {
      setValidationError(null);
      try {
        const validation = await validateDependencyMutation.mutateAsync(taskId);
        
        if (!validation?.isValid) {
          const errorMsg = validation?.errors?.[0] || 'This dependency would create a circular reference';
          setValidationError(errorMsg);
          toast({
            title: 'Invalid dependency',
            description: errorMsg,
            variant: 'destructive',
          });
          return;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to validate dependency';
        setValidationError(errorMsg);
        toast({
          title: 'Validation failed',
          description: errorMsg,
          variant: 'destructive',
        });
        return;
      }
    }
    
    // Add the dependency
    form.setValue('dependencies', [...currentDeps, taskId]);
    setValidationError(null);
  };

  // Handle removing a dependency
  const handleRemoveDependency = (taskId: number) => {
    const currentDeps = form.getValues('dependencies') || [];
    form.setValue('dependencies', currentDeps.filter(id => id !== taskId));
    setValidationError(null);
  };

  // Get task by ID
  const getTaskById = (taskId: number) => {
    return availableTasks.find(t => t.id === taskId);
  };

  // Handle form submission
  const onSubmit = async (values: TaskFormValues) => {
    setIsSaving(true);
    
    try {
      // Parse resources from newline-separated string to array
      const resourcesArray = values.resources
        ? values.resources
            .split('\n')
            .map(r => r.trim())
            .filter(r => r.length > 0)
        : [];

      // Prepare task data (excluding dependencies - they're managed separately)
      const taskData: any = {
        title: values.title,
        description: values.description || '',
        estimatedTime: values.estimatedTime || '',
        resources: resourcesArray,
      };

      if (isEditing) {
        // For editing, if auto-save is enabled, the changes are already saved
        // Just close the dialog and show confirmation
        if (enableAutoSave && !autoSave.isError) {
          // Ensure any pending auto-save is complete
          if (autoSave.isSaving) {
            // Wait a bit for auto-save to complete
            await new Promise(resolve => setTimeout(resolve, 600));
          }
          
          toast({
            title: 'Task updated',
            description: values.dependencies && values.dependencies.length > 0
              ? 'Task updated. Dependencies will be saved separately.'
              : 'Your changes have been saved successfully.',
          });
        } else {
          // Manual save if auto-save is disabled or failed
          if (onSave) {
            // Use custom save callback if provided
            taskData.id = task.id;
            await onSave(taskData);
          } else {
            // Use mutation hook
            await updateTaskMutation.mutateAsync({
              id: task.id,
              ...taskData,
            });
          }
          
          toast({
            title: 'Task updated',
            description: values.dependencies && values.dependencies.length > 0
              ? 'Task updated. Dependencies will be saved separately.'
              : 'Your changes have been saved successfully.',
          });
        }
        
        // Note: Dependencies are managed through the dependency API endpoints
        // The parent component (ActionPlanView) should handle dependency updates
        // by comparing values.dependencies with existingDependencies
      } else {
        // Creating new task
        // Calculate order (add to end of phase)
        const order = currentTaskCount;
        
        if (onSave) {
          // Use custom save callback if provided
          taskData.phaseId = phaseId;
          taskData.order = order;
          await onSave(taskData);
        } else {
          // Use mutation hook
          await createTaskMutation.mutateAsync({
            phaseId,
            ...taskData,
            order,
          });
        }
        
        // Note: For new tasks, dependencies cannot be added until the task is created
        // The parent component should handle adding dependencies after task creation
        
        toast({
          title: 'Task created',
          description: values.dependencies && values.dependencies.length > 0
            ? 'Task created. Dependencies will be added separately.'
            : 'New task has been added to your action plan.',
        });
      }

      // Close dialog on success
      onOpenChange(false);
      
      // Reset form
      form.reset();
    } catch (error) {
      // Show error toast
      toast({
        title: isEditing ? 'Failed to update task' : 'Failed to create task',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
      console.error('Failed to save task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        data-testid="task-editor-dialog"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle data-testid="task-editor-title">
              {isEditing ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
            
            {/* Auto-save status indicator */}
            {isEditing && (
              <div 
                className="flex items-center gap-2 text-sm"
                data-testid="auto-save-status"
              >
                {autoSave.isSaving && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Saving...</span>
                  </>
                )}
                {autoSave.isSaved && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">All changes saved</span>
                  </>
                )}
                {autoSave.isError && (
                  <>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">Save failed</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <DialogDescription>
            {isEditing 
              ? 'Update the task details below. Your changes will be saved automatically.'
              : 'Add a new task to your action plan. Fill in the details below.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title Field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Title <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Conduct user interviews"
                      data-testid="task-title-input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A clear, concise title for the task (max 200 characters)
                  </FormDescription>
                  <FormMessage data-testid="task-title-error" />
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what needs to be done, any specific requirements, or helpful context..."
                      className="min-h-[120px] resize-y"
                      data-testid="task-description-input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Detailed description of the task (optional, max 2000 characters)
                  </FormDescription>
                  <FormMessage data-testid="task-description-error" />
                </FormItem>
              )}
            />

            {/* Estimated Time Field */}
            <FormField
              control={form.control}
              name="estimatedTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Time</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 2 hours, 3 days, 1 week"
                      data-testid="task-estimated-time-input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    How long you expect this task to take (optional, max 50 characters)
                  </FormDescription>
                  <FormMessage data-testid="task-estimated-time-error" />
                </FormItem>
              )}
            />

            {/* Resources Field */}
            <FormField
              control={form.control}
              name="resources"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resources</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="https://example.com/guide&#10;https://docs.example.com&#10;One URL per line"
                      className="min-h-[100px] resize-y font-mono text-sm"
                      data-testid="task-resources-input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Helpful links or resources (one per line, optional)
                  </FormDescription>
                  <FormMessage data-testid="task-resources-error" />
                </FormItem>
              )}
            />

            {/* Dependencies Field */}
            <FormField
              control={form.control}
              name="dependencies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dependencies</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Popover open={dependencyPopoverOpen} onOpenChange={setDependencyPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={dependencyPopoverOpen}
                            className="w-full justify-between"
                            type="button"
                            data-testid="task-dependencies-trigger"
                          >
                            <span className="text-muted-foreground">
                              {field.value && field.value.length > 0
                                ? `${field.value.length} prerequisite${field.value.length > 1 ? 's' : ''} selected`
                                : 'Select prerequisite tasks...'}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search tasks..." />
                            <CommandList>
                              <CommandEmpty>No tasks found.</CommandEmpty>
                              <CommandGroup>
                                {availableTasks.map((availableTask) => {
                                  const isSelected = field.value?.includes(availableTask.id);
                                  return (
                                    <CommandItem
                                      key={availableTask.id}
                                      value={`${availableTask.title}-${availableTask.id}`}
                                      onSelect={() => {
                                        if (isSelected) {
                                          handleRemoveDependency(availableTask.id);
                                        } else {
                                          handleAddDependency(availableTask.id);
                                        }
                                      }}
                                      data-testid={`dependency-option-${availableTask.id}`}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          isSelected ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{availableTask.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {availableTask.phaseName}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {/* Display selected dependencies */}
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2" data-testid="selected-dependencies">
                          {field.value.map((depId) => {
                            const depTask = getTaskById(depId);
                            if (!depTask) return null;
                            
                            return (
                              <Badge
                                key={depId}
                                variant="secondary"
                                className="gap-1 pr-1"
                                data-testid={`dependency-badge-${depId}`}
                              >
                                <span className="max-w-[200px] truncate">
                                  {depTask.title}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDependency(depId)}
                                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                                  data-testid={`remove-dependency-${depId}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      {/* Validation error display */}
                      {validationError && (
                        <Alert variant="destructive" data-testid="dependency-validation-error">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{validationError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Tasks that must be completed before this task can start (optional)
                  </FormDescription>
                  <FormMessage data-testid="task-dependencies-error" />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                data-testid="task-editor-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                loading={isSaving}
                loadingText={isEditing ? 'Saving...' : 'Creating...'}
                data-testid="task-editor-save"
              >
                {isEditing ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
