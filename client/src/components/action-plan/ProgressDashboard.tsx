import React from 'react';
import {
  TrendingUp,
  Clock,
  Target,
  Zap,
  CheckCircle2,
  Calendar,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ProgressMetrics, PlanPhaseWithTasks } from '@/types/action-plan';
import type { ProgressSnapshot } from '@shared/schema';

interface ProgressDashboardProps {
  progress: ProgressMetrics;
  phases: PlanPhaseWithTasks[];
  progressHistory?: ProgressSnapshot[];
}

/**
 * ProgressDashboard Component
 * 
 * Displays comprehensive progress analytics including:
 * - Key metrics cards (total tasks, completion %, velocity)
 * - Progress chart over time
 * - Phase-by-phase breakdown
 * - Completion timeline with milestones
 * - Average time metrics
 */
export function ProgressDashboard({
  progress,
  phases,
  progressHistory = [],
}: ProgressDashboardProps) {
  // Prepare chart data from progress history
  const chartData = progressHistory
    .slice()
    .reverse()
    .map((snapshot) => ({
      date: new Date(snapshot.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      completed: snapshot.completedTasks,
      total: snapshot.totalTasks,
      percentage: snapshot.completionPercentage,
    }));

  // Calculate phase progress
  const phaseProgress = phases.map((phase) => {
    const totalTasks = phase.tasks.length;
    const completedTasks = phase.tasks.filter(
      (t) => t.status === 'completed'
    ).length;
    const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      name: phase.name,
      completed: completedTasks,
      total: totalTasks,
      percentage: Math.round(percentage),
    };
  });

  // Get completed tasks timeline
  const completedTasksTimeline = phases
    .flatMap((phase) =>
      phase.tasks
        .filter((t) => t.status === 'completed' && t.completedAt)
        .map((task) => ({
          title: task.title,
          phase: phase.name,
          completedAt: new Date(task.completedAt!),
        }))
    )
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, 10); // Show last 10 completed tasks

  // Format estimated completion date
  const estimatedCompletionDate = progress.estimatedCompletion
    ? new Date(progress.estimatedCompletion).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not available';

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <Card className="flame-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Tasks
            </CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {progress.totalTasks}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {progress.completedTasks} completed
            </p>
          </CardContent>
        </Card>

        {/* Completion Percentage */}
        <Card className="flame-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Completion
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {progress.completionPercentage}%
            </div>
            <Progress
              value={progress.completionPercentage}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        {/* Velocity */}
        <Card className="flame-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Velocity
            </CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {progress.velocity ? progress.velocity.toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">tasks per week</p>
          </CardContent>
        </Card>

        {/* Average Time */}
        <Card className="flame-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Avg. Time
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {progress.averageTaskTime || 0}h
            </div>
            <p className="text-xs text-gray-500 mt-1">per task</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart */}
      {chartData.length > 0 && (
        <Card className="flame-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span>Progress Over Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'completed') return [value, 'Completed Tasks'];
                    if (name === 'percentage') return [`${value}%`, 'Progress'];
                    return [value, name];
                  }}
                />
                <Legend
                  wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                  formatter={(value) => {
                    if (value === 'completed') return 'Completed Tasks';
                    if (value === 'percentage') return 'Progress %';
                    return value;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#a855f7"
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Phase-by-Phase Breakdown */}
      <Card className="flame-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-purple-500" />
            <span>Phase Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {phaseProgress.map((phase, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white">
                      {phase.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {phase.completed} of {phase.total} tasks completed
                    </p>
                  </div>
                  <span className="text-lg font-bold text-white ml-4">
                    {phase.percentage}%
                  </span>
                </div>
                <Progress value={phase.percentage} className="h-2" />
              </div>
            ))}
          </div>

          {/* Phase Progress Bar Chart */}
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={phaseProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  style={{ fontSize: '11px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'completed') return [value, 'Completed'];
                    if (name === 'total') return [value, 'Total'];
                    return [value, name];
                  }}
                />
                <Legend
                  wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                  formatter={(value) => {
                    if (value === 'completed') return 'Completed';
                    if (value === 'total') return 'Total';
                    return value;
                  }}
                />
                <Bar dataKey="completed" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total" fill="#374151" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Completion Timeline */}
      <Card className="flame-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            <span>Recent Completions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedTasksTimeline.length > 0 ? (
            <div className="space-y-4">
              {completedTasksTimeline.map((task, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 pb-4 border-b border-gray-800 last:border-0 last:pb-0"
                >
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-500">{task.phase}</p>
                  </div>
                  <div className="flex-shrink-0 text-xs text-gray-500">
                    {task.completedAt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No completed tasks yet. Start checking off tasks to see your
              progress!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Phase */}
        <Card className="flame-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-400">
              Current Phase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-white">
              {progress.currentPhase || 'Not started'}
            </p>
          </CardContent>
        </Card>

        {/* Estimated Completion */}
        <Card className="flame-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-400">
              Estimated Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-white">
              {estimatedCompletionDate}
            </p>
            {progress.estimatedCompletion && (
              <p className="text-xs text-gray-500 mt-1">
                Based on current velocity
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
