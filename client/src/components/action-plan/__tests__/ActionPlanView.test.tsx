import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActionPlanView } from '../ActionPlanView';
import * as useActionPlanHook from '@/hooks/useActionPlan';

// Mock the hooks
vi.mock('@/hooks/useActionPlan');

describe('ActionPlanView', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });
  
  const renderComponent = (searchId: number) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ActionPlanView searchId={searchId} />
      </QueryClientProvider>
    );
  };
  
  it('should show loading state initially', () => {
    vi.spyOn(useActionPlanHook, 'useActionPlan').mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);
    
    vi.spyOn(useActionPlanHook, 'useActionPlanProgress').mockReturnValue({
      data: null,
      isLoading: true,
    } as any);
    
    renderComponent(123);
    
    expect(screen.getByText(/loading your action plan/i)).toBeInTheDocument();
  });
  
  it('should show error state with retry button', () => {
    const refetch = vi.fn();
    
    vi.spyOn(useActionPlanHook, 'useActionPlan').mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
      refetch,
    } as any);
    
    vi.spyOn(useActionPlanHook, 'useActionPlanProgress').mockReturnValue({
      data: null,
      isLoading: false,
    } as any);
    
    renderComponent(123);
    
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
  
  it('should show no plan message when plan is null', () => {
    vi.spyOn(useActionPlanHook, 'useActionPlan').mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    
    vi.spyOn(useActionPlanHook, 'useActionPlanProgress').mockReturnValue({
      data: null,
      isLoading: false,
    } as any);
    
    renderComponent(123);
    
    // Text is split across multiple elements, so use a more flexible matcher
    expect(screen.getByText(/doesn't have an action plan yet/i)).toBeInTheDocument();
  });
  
  it('should render plan with progress bar', async () => {
    const mockPlan = {
      id: 1,
      searchId: 123,
      userId: 1,
      title: 'Test Action Plan',
      description: 'Test description',
      status: 'active',
      phases: [
        {
          id: 1,
          planId: 1,
          name: 'Phase 1',
          description: 'First phase',
          order: 1,
          tasks: [],
          isCustom: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      originalPlan: {},
      customizations: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };
    
    const mockProgress = {
      totalTasks: 10,
      completedTasks: 5,
      inProgressTasks: 2,
      notStartedTasks: 3,
      skippedTasks: 0,
      completionPercentage: 50,
      currentPhase: 'Phase 1',
      estimatedCompletion: null,
      velocity: 2,
      averageTaskTime: 4,
    };
    
    vi.spyOn(useActionPlanHook, 'useActionPlan').mockReturnValue({
      data: mockPlan,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    
    vi.spyOn(useActionPlanHook, 'useActionPlanProgress').mockReturnValue({
      data: mockProgress,
      isLoading: false,
    } as any);
    
    renderComponent(123);
    
    await waitFor(() => {
      expect(screen.getByText('Test Action Plan')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText(/50%/)).toBeInTheDocument();
      expect(screen.getByText(/5 of 10 tasks completed/)).toBeInTheDocument();
      expect(screen.getByText('Phase 1')).toBeInTheDocument();
    });
  });
  
  it('should call onComplete when progress reaches 100%', async () => {
    const onComplete = vi.fn();
    
    const mockPlan = {
      id: 1,
      searchId: 123,
      userId: 1,
      title: 'Test Plan',
      description: '',
      status: 'active',
      phases: [],
      originalPlan: {},
      customizations: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };
    
    const mockProgress = {
      totalTasks: 10,
      completedTasks: 10,
      inProgressTasks: 0,
      notStartedTasks: 0,
      skippedTasks: 0,
      completionPercentage: 100,
      currentPhase: null,
      estimatedCompletion: null,
      velocity: 2,
      averageTaskTime: 4,
    };
    
    vi.spyOn(useActionPlanHook, 'useActionPlan').mockReturnValue({
      data: mockPlan,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    
    vi.spyOn(useActionPlanHook, 'useActionPlanProgress').mockReturnValue({
      data: mockProgress,
      isLoading: false,
    } as any);
    
    render(
      <QueryClientProvider client={queryClient}>
        <ActionPlanView searchId={123} onComplete={onComplete} />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
