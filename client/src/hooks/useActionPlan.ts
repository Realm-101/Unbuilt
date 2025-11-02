import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ActionPlanWithDetails, ProgressMetrics, TaskUpdate } from '@/types';
import type { ApiResponse } from '@shared/types';

/**
 * Hook for fetching action plan data
 */
export function useActionPlan(searchId: number | null) {
  return useQuery<ActionPlanWithDetails | null>({
    queryKey: ['/api/plans', searchId],
    queryFn: async () => {
      if (!searchId) return null;
      
      const response = await apiRequest('GET', `/api/plans/${searchId}`);
      const data: ApiResponse<ActionPlanWithDetails> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch action plan');
      }
      
      return data.data || null;
    },
    enabled: !!searchId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching progress metrics
 */
export function useActionPlanProgress(planId: number | null) {
  return useQuery<ProgressMetrics | null>({
    queryKey: ['/api/plans', planId, 'progress'],
    queryFn: async () => {
      if (!planId) return null;
      
      const response = await apiRequest('GET', `/api/plans/${planId}/progress`);
      const data: ApiResponse<ProgressMetrics> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch progress metrics');
      }
      
      return data.data || null;
    },
    enabled: !!planId,
    staleTime: 10 * 1000, // 10 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for updating task status
 */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (update: TaskUpdate) => {
      const response = await apiRequest('PATCH', `/api/tasks/${update.id}`, update);
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update task');
      }
      
      return data.data;
    },
    onMutate: async (update: TaskUpdate) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/plans'] });
      
      // Snapshot previous value
      const previousPlan = queryClient.getQueryData(['/api/plans']);
      
      // Optimistically update the task
      queryClient.setQueriesData(
        { queryKey: ['/api/plans'] },
        (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            phases: old.phases?.map((phase: any) => ({
              ...phase,
              tasks: phase.tasks?.map((task: any) =>
                task.id === update.id
                  ? { ...task, ...update, updatedAt: new Date().toISOString() }
                  : task
              ),
            })),
          };
        }
      );
      
      return { previousPlan };
    },
    onError: (err, update, context) => {
      // Rollback on error
      if (context?.previousPlan) {
        queryClient.setQueryData(['/api/plans'], context.previousPlan);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plans', undefined, 'progress'] });
    },
  });
}

/**
 * Hook for creating a new task
 */
export function useCreateTask(planId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskData: {
      phaseId: number;
      title: string;
      description?: string;
      estimatedTime?: string;
      resources?: string[];
      order: number;
    }) => {
      const response = await apiRequest('POST', `/api/plans/${planId}/tasks`, taskData);
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create task');
      }
      
      return data.data;
    },
    onMutate: async (taskData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/plans'] });
      
      // Snapshot previous value
      const previousPlan = queryClient.getQueryData(['/api/plans']);
      
      // Create temporary task for optimistic update
      const tempTask = {
        id: Date.now(), // Temporary ID
        ...taskData,
        status: 'not_started' as const,
        isCustom: true,
        assigneeId: null,
        completedAt: null,
        completedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        planId,
      };
      
      // Optimistically add the task
      queryClient.setQueriesData(
        { queryKey: ['/api/plans'] },
        (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            phases: old.phases?.map((phase: any) =>
              phase.id === taskData.phaseId
                ? {
                    ...phase,
                    tasks: [...(phase.tasks || []), tempTask].sort((a, b) => a.order - b.order),
                  }
                : phase
            ),
          };
        }
      );
      
      return { previousPlan };
    },
    onError: (_err, _taskData, context) => {
      // Rollback on error
      if (context?.previousPlan) {
        queryClient.setQueryData(['/api/plans'], context.previousPlan);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plans', undefined, 'progress'] });
    },
  });
}

/**
 * Hook for updating a task (full update, not just status)
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (update: TaskUpdate) => {
      const response = await apiRequest('PATCH', `/api/tasks/${update.id}`, update);
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update task');
      }
      
      return data.data;
    },
    onMutate: async (update: TaskUpdate) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/plans'] });
      
      // Snapshot previous value
      const previousPlan = queryClient.getQueryData(['/api/plans']);
      
      // Optimistically update the task
      queryClient.setQueriesData(
        { queryKey: ['/api/plans'] },
        (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            phases: old.phases?.map((phase: any) => ({
              ...phase,
              tasks: phase.tasks?.map((task: any) =>
                task.id === update.id
                  ? { ...task, ...update, updatedAt: new Date().toISOString() }
                  : task
              ),
            })),
          };
        }
      );
      
      return { previousPlan };
    },
    onError: (_err, _update, context) => {
      // Rollback on error
      if (context?.previousPlan) {
        queryClient.setQueryData(['/api/plans'], context.previousPlan);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plans', undefined, 'progress'] });
    },
  });
}

/**
 * Hook for deleting a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest('DELETE', `/api/tasks/${taskId}`);
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete task');
      }
      
      return data.data;
    },
    onMutate: async (taskId: number) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/plans'] });
      
      // Snapshot previous value
      const previousPlan = queryClient.getQueryData(['/api/plans']);
      
      // Optimistically remove the task
      queryClient.setQueriesData(
        { queryKey: ['/api/plans'] },
        (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            phases: old.phases?.map((phase: any) => ({
              ...phase,
              tasks: phase.tasks?.filter((task: any) => task.id !== taskId),
            })),
          };
        }
      );
      
      return { previousPlan };
    },
    onError: (_err, _taskId, context) => {
      // Rollback on error
      if (context?.previousPlan) {
        queryClient.setQueryData(['/api/plans'], context.previousPlan);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plans', undefined, 'progress'] });
    },
  });
}

/**
 * Hook for reordering tasks within a phase
 */
export function useReorderTasks(planId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ phaseId, taskIds }: { phaseId: number; taskIds: number[] }) => {
      const response = await apiRequest('POST', `/api/plans/${planId}/tasks/reorder`, {
        phaseId,
        taskIds,
      });
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to reorder tasks');
      }
      
      return data.data;
    },
    onMutate: async ({ phaseId, taskIds }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/plans'] });
      
      // Snapshot previous value
      const previousPlan = queryClient.getQueryData(['/api/plans']);
      
      // Optimistically reorder tasks
      queryClient.setQueriesData(
        { queryKey: ['/api/plans'] },
        (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            phases: old.phases?.map((phase: any) => {
              if (phase.id !== phaseId) return phase;
              
              // Create a map of task IDs to tasks
              const taskMap = new Map(phase.tasks?.map((task: any) => [task.id, task]));
              
              // Reorder tasks based on taskIds array
              const reorderedTasks = taskIds
                .map((id, index) => {
                  const task = taskMap.get(id);
                  return task ? { ...task, order: index } : null;
                })
                .filter(Boolean);
              
              return {
                ...phase,
                tasks: reorderedTasks,
              };
            }),
          };
        }
      );
      
      return { previousPlan };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousPlan) {
        queryClient.setQueryData(['/api/plans'], context.previousPlan);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/plans'] });
    },
  });
}

/**
 * Hook for applying a template to an existing plan
 */
export function useApplyTemplate(planId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest('POST', `/api/plans/${planId}/apply-template`, {
        templateId,
      });
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to apply template');
      }
      
      return data.data;
    },
    onSuccess: () => {
      // Invalidate all plan-related queries to force refetch
      queryClient.invalidateQueries({ queryKey: ['/api/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plans', planId, 'progress'] });
    },
  });
}

/**
 * Hook for fetching progress history
 */
export function useProgressHistory(planId: number | null, limit: number = 30) {
  return useQuery({
    queryKey: ['/api/plans', planId, 'progress', 'history', limit],
    queryFn: async () => {
      if (!planId) return [];
      
      const response = await apiRequest('GET', `/api/plans/${planId}/progress/history?limit=${limit}`);
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch progress history');
      }
      
      return data.data || [];
    },
    enabled: !!planId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for updating plan status
 */
export function useUpdatePlanStatus(planId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (status: 'active' | 'completed' | 'archived') => {
      const response = await apiRequest('PATCH', `/api/plans/${planId}`, { status });
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update plan status');
      }
      
      return data.data;
    },
    onSuccess: () => {
      // Invalidate all plan-related queries to force refetch
      queryClient.invalidateQueries({ queryKey: ['/api/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plans', planId, 'progress'] });
    },
  });
}

/**
 * Hook for fetching task dependencies
 */
export function useTaskDependencies(taskId: number | null) {
  return useQuery({
    queryKey: ['/api/tasks', taskId, 'dependencies'],
    queryFn: async () => {
      if (!taskId) return { prerequisites: [], dependents: [] };
      
      const response = await apiRequest('GET', `/api/tasks/${taskId}/dependencies`);
      const data: ApiResponse<{ prerequisites: number[]; dependents: number[] }> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch dependencies');
      }
      
      return data.data || { prerequisites: [], dependents: [] };
    },
    enabled: !!taskId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for adding a task dependency
 */
export function useAddDependency(taskId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (prerequisiteTaskId: number) => {
      const response = await apiRequest('POST', `/api/tasks/${taskId}/dependencies`, {
        prerequisiteTaskId,
      });
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to add dependency');
      }
      
      return data.data;
    },
    onSuccess: () => {
      // Invalidate dependencies query
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'dependencies'] });
      // Also invalidate plan to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/plans'] });
    },
  });
}

/**
 * Hook for removing a task dependency
 */
export function useRemoveDependency() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (dependencyId: number) => {
      const response = await apiRequest('DELETE', `/api/dependencies/${dependencyId}`);
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to remove dependency');
      }
      
      return data.data;
    },
    onSuccess: () => {
      // Invalidate all dependencies queries
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      // Also invalidate plan to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/plans'] });
    },
  });
}

/**
 * Hook for validating a potential dependency
 */
export function useValidateDependency(taskId: number) {
  return useMutation({
    mutationFn: async (prerequisiteTaskId: number) => {
      const response = await apiRequest('POST', `/api/tasks/${taskId}/dependencies/validate`, {
        prerequisiteTaskId,
      });
      const data: ApiResponse<{ isValid: boolean; errors: string[]; circularDependencies: string[][] }> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to validate dependency');
      }
      
      return data.data;
    },
  });
}

/**
 * Hook for fetching all dependencies for a plan
 */
export function usePlanDependencies(planId: number | null) {
  return useQuery({
    queryKey: ['/api/plans', planId, 'dependencies'],
    queryFn: async () => {
      if (!planId) return new Map();
      
      const response = await apiRequest('GET', `/api/plans/${planId}/dependencies`);
      const data: ApiResponse<Record<string, { prerequisites: number[]; dependents: number[] }>> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch plan dependencies');
      }
      
      // Convert the object to a Map
      const dependencyMap = new Map<number, { prerequisites: number[]; dependents: number[] }>();
      if (data.data) {
        Object.entries(data.data).forEach(([taskId, deps]) => {
          dependencyMap.set(Number(taskId), deps);
        });
      }
      
      return dependencyMap;
    },
    enabled: !!planId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching incomplete prerequisites for a task
 * Used for displaying dependency warnings
 * 
 * Requirements: 5.5
 */
export function useIncompletePrerequisites(taskId: number | null) {
  return useQuery({
    queryKey: ['/api/tasks', taskId, 'incomplete-prerequisites'],
    queryFn: async () => {
      if (!taskId) return [];
      
      const response = await apiRequest('GET', `/api/tasks/${taskId}/incomplete-prerequisites`);
      const data: ApiResponse<any[]> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch incomplete prerequisites');
      }
      
      return data.data || [];
    },
    enabled: !!taskId,
    staleTime: 10 * 1000, // 10 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching recommendations for a plan
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export function useRecommendations(planId: number | null) {
  return useQuery({
    queryKey: ['/api/plans', planId, 'recommendations'],
    queryFn: async () => {
      if (!planId) return [];
      
      const response = await apiRequest('GET', `/api/plans/${planId}/recommendations`);
      const data: ApiResponse<any[]> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch recommendations');
      }
      
      return data.data || [];
    },
    enabled: !!planId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for dismissing a recommendation
 * 
 * Requirements: 8.5
 */
export function useDismissRecommendation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ planId, recommendationId }: { planId: number; recommendationId: string }) => {
      const response = await apiRequest('POST', `/api/plans/${planId}/recommendations/${recommendationId}/dismiss`);
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to dismiss recommendation');
      }
      
      return data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate recommendations query to refetch
      queryClient.invalidateQueries({ 
        queryKey: ['/api/plans', variables.planId, 'recommendations'] 
      });
    },
  });
}
