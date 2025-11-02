import React, { useEffect, useState } from 'react';
import { Trophy, Calendar, Clock, TrendingUp, CheckCircle2, Archive, Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ProgressMetrics, ActionPlanWithDetails } from '@/types/action-plan';

interface CompletionCelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: ActionPlanWithDetails;
  progress: ProgressMetrics;
  onArchive: () => void;
  onStartNew: () => void;
}

/**
 * CompletionCelebrationModal Component
 * 
 * Displays celebration modal with confetti animation when plan is completed
 * Shows completion summary with metrics and achievements
 * Provides options to archive or start new plan
 */
export function CompletionCelebrationModal({
  open,
  onOpenChange,
  plan,
  progress,
  onArchive,
  onStartNew,
}: CompletionCelebrationModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Trigger confetti animation when modal opens
  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);
  
  // Calculate completion metrics
  const totalTime = plan.completedAt && plan.createdAt
    ? Math.ceil((new Date(plan.completedAt).getTime() - new Date(plan.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const milestones = plan.phases.length;
  const achievements = [
    `Completed ${progress.totalTasks} tasks`,
    `Finished ${milestones} phases`,
    progress.velocity && progress.velocity > 0 
      ? `Maintained ${progress.velocity.toFixed(1)} tasks/week velocity`
      : null,
    progress.averageTaskTime && progress.averageTaskTime > 0
      ? `Average ${progress.averageTaskTime}h per task`
      : null,
  ].filter(Boolean);
  
  return (
    <>
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[100]">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#3b82f6'][
                    Math.floor(Math.random() * 5)
                  ],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl flame-card border-green-500/50">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-16 h-16 text-yellow-400 animate-bounce" />
            </div>
            <DialogTitle className="text-3xl text-center text-green-400">
              🎉 Action Plan Complete!
            </DialogTitle>
            <DialogDescription className="text-center text-lg text-gray-300">
              Congratulations! You've successfully completed your entire action plan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Completion Summary */}
            <Card className="flame-card border-purple-500/30">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                  Completion Summary
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Total Time */}
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="text-sm">Total Time</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {totalTime} {totalTime === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                  
                  {/* Tasks Completed */}
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-400">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      <span className="text-sm">Tasks Completed</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {progress.totalTasks}
                    </p>
                  </div>
                  
                  {/* Average Task Time */}
                  {progress.averageTaskTime && progress.averageTaskTime > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-400">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="text-sm">Avg. Task Time</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {progress.averageTaskTime}h
                      </p>
                    </div>
                  )}
                  
                  {/* Velocity */}
                  {progress.velocity && progress.velocity > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-400">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        <span className="text-sm">Velocity</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {progress.velocity.toFixed(1)} tasks/week
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Milestones & Achievements */}
            <Card className="flame-card border-purple-500/30">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                  Achievements
                </h3>
                
                <ul className="space-y-3">
                  {achievements.map((achievement, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 mr-3 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{achievement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            
            {/* Plan Details */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">{plan.title}</h4>
              {plan.description && (
                <p className="text-sm text-gray-400">{plan.description}</p>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={onArchive}
              variant="outline"
              className="w-full sm:w-auto border-gray-600 hover:bg-gray-800"
            >
              <Archive className="w-4 h-4 mr-2" />
              Archive Plan
            </Button>
            <Button
              onClick={onStartNew}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Start New Plan
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </>
  );
}
