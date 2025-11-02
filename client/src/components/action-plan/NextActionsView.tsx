import React from 'react';
import { Zap, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TaskItem } from './TaskItem';
import type { ActionPlanWithDetails, PlanTask } from '@/types/action-plan';
import { usePlanDependencies } from '@/hooks/useActionPlan';

interface NextActionsViewProps {
  plan: ActionPlanWithDetails;
  onEditTask?: (task: PlanTask) => void;
  onDeleteTask?: (taskId: number) => void;
}

/**
 * NextActionsView Component
 * 
 * Displays tasks that are ready to start (no incomplete prerequisites)
 * Helps users focus on what they can work on right now
 * 
 * Requirements: 5.7
 */
export function NextActionsView({ plan, onEditTask, onDeleteTask }: NextActionsViewProps) {
  const { data: dependencyMap } = usePlanDependencies(plan.id);
  
  // Get all tasks from all phases
  const allTasks = plan.phases.flatMap(phase => phase.tasks);
  
  // Helper function to check if a task is blocked
  const isTaskBlocked = (taskId: number): boolean => {
    if (!dependencyMap) return false;
    
    const deps = dependencyMap.get(taskId);
    if (!deps || deps.prerequisites.length === 0) return false;
    
    // Check if any prerequisite is not completed
    return deps.prerequisites.some(prereqId => {
      const prereqTask = allTasks.find(t => t.id === prereqId);
      return prereqTask && prereqTask.status !== 'completed';
    });
  };
  
  // Helper function to get prerequisite tasks
  const getPrerequisiteTasks = (taskId: number): PlanTask[] => {
    if (!dependencyMap) return [];
    
    const deps = dependencyMap.get(taskId);
    if (!deps || deps.prerequisites.length === 0) return [];
    
    return deps.prerequisites
      .map(prereqId => allTasks.find(t => t.id === prereqId))
      .filter((t): t is PlanTask => t !== undefined);
  };
  
  // Helper function to get dependent tasks
  const getDependentTasks = (taskId: number): PlanTask[] => {
    if (!dependencyMap) return [];
    
    const deps = dependencyMap.get(taskId);
    if (!deps || deps.dependents.length === 0) return [];
    
    return deps.dependents
      .map(depId => allTasks.find(t => t.id === depId))
      .filter((t): t is PlanTask => t !== undefined);
  };
  
  // Filter tasks that are ready to start
  const readyTasks = allTasks.filter(task => {
    // Only show not started tasks
    if (task.status !== 'not_started') return false;
    
    // Check if task is blocked by dependencies
    return !isTaskBlocked(task.id);
  });
  
  // Get in-progress tasks
  const inProgressTasks = allTasks.filter(task => task.status === 'in_progress');
  
  // Get phase name for a task
  const getPhaseNameForTask = (taskId: number): string => {
    const phase = plan.phases.find(p => p.tasks.some(t => t.id === taskId));
    return phase?.name || 'Unknown Phase';
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Zap className="w-6 h-6 text-yellow-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Next Actions</h2>
          <p className="text-gray-400 text-sm">
            Focus on what you can work on right now
          </p>
        </div>
      </div>
      
      {/* In Progress Tasks */}
      {inProgressTasks.length > 0 && (
        <Card className="flame-card border-orange-500/30">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-400">
              <Clock className="w-5 h-5" />
              <span>In Progress ({inProgressTasks.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inProgressTasks.map(task => (
              <div key={task.id} className="space-y-1">
                <div className="text-xs text-gray-500 font-medium">
                  {getPhaseNameForTask(task.id)}
                </div>
                <TaskItem
                  task={task}
                  isBlocked={false}
                  prerequisiteTasks={getPrerequisiteTasks(task.id)}
                  dependentTasks={getDependentTasks(task.id)}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* Ready to Start Tasks */}
      {readyTasks.length > 0 ? (
        <Card className="flame-card border-emerald-500/30">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span>Ready to Start ({readyTasks.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readyTasks.map(task => (
              <div key={task.id} className="space-y-1">
                <div className="text-xs text-gray-500 font-medium">
                  {getPhaseNameForTask(task.id)}
                </div>
                <TaskItem
                  task={task}
                  isBlocked={false}
                  prerequisiteTasks={getPrerequisiteTasks(task.id)}
                  dependentTasks={getDependentTasks(task.id)}
                  isNewlyAvailable={true}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-white">
            {inProgressTasks.length > 0 
              ? "No new tasks available. Complete your in-progress tasks or check for blocked tasks."
              : "All tasks are either completed, in progress, or blocked by dependencies."}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flame-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">
                {readyTasks.length}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Ready to Start
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flame-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">
                {inProgressTasks.length}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                In Progress
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flame-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">
                {allTasks.filter(t => isTaskBlocked(t.id) && t.status === 'not_started').length}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Blocked
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
