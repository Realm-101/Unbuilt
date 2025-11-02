/**
 * SuggestedQuestions Component
 * 
 * Displays 3-5 categorized question chips that users can click to submit.
 * Includes loading skeleton and responsive mobile layout.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.7
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lightbulb, 
  Target, 
  Rocket, 
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { SuggestedQuestionsProps, QuestionCategory } from '@/types';

// Category metadata
const categoryConfig: Record<QuestionCategory, { 
  label: string; 
  icon: typeof Lightbulb;
  color: string;
}> = {
  market_validation: {
    label: 'Market Validation',
    icon: Target,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  competitive_analysis: {
    label: 'Competitive Analysis',
    icon: Lightbulb,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  },
  execution_strategy: {
    label: 'Execution Strategy',
    icon: Rocket,
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
  risk_assessment: {
    label: 'Risk Assessment',
    icon: AlertTriangle,
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  },
};

export function SuggestedQuestions({ 
  questions, 
  onQuestionClick, 
  loading = false 
}: SuggestedQuestionsProps) {
  const [usedQuestions, setUsedQuestions] = useState<Set<number>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter out used questions
  const availableQuestions = questions.filter(q => !q.used && !usedQuestions.has(q.id));

  // Sort by priority
  const sortedQuestions = [...availableQuestions].sort((a, b) => b.priority - a.priority);

  // Take top 5
  const displayQuestions = sortedQuestions.slice(0, 5);

  const handleQuestionClick = (questionId: number, questionText: string) => {
    setUsedQuestions(prev => new Set(prev).add(questionId));
    onQuestionClick(questionText);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const gridCols = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
    const totalQuestions = displayQuestions.length;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        if (index < totalQuestions - 1) {
          setFocusedIndex(index + 1);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (index > 0) {
          setFocusedIndex(index - 1);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (index + gridCols < totalQuestions) {
          setFocusedIndex(index + gridCols);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (index - gridCols >= 0) {
          setFocusedIndex(index - gridCols);
        }
        break;
    }
  };

  // Focus management
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < buttonRefs.current.length) {
      buttonRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-44" />
        </div>
      </div>
    );
  }

  // No questions available
  if (displayQuestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Suggested Questions</h4>
          <Badge variant="secondary" className="text-xs">
            {displayQuestions.length}
          </Badge>
        </div>
        
        {/* Mobile Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="md:hidden h-7 w-7 p-0"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Questions Grid */}
      {isExpanded && (
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
          role="group"
          aria-label="Suggested questions"
        >
          {displayQuestions.map((question, index) => {
            const config = categoryConfig[question.category];
            const Icon = config.icon;

            return (
              <Button
                key={question.id}
                ref={(el) => (buttonRefs.current[index] = el)}
                variant="outline"
                onClick={() => handleQuestionClick(question.id, question.text)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                data-suggestion="true"
                className={`
                  h-auto min-h-[60px] p-3 justify-start text-left 
                  hover:bg-accent/50 transition-all duration-200
                  animate-in fade-in slide-in-from-bottom-2
                  ${usedQuestions.has(question.id) ? 'opacity-50' : ''}
                `}
                disabled={usedQuestions.has(question.id)}
                aria-label={`${config.label}: ${question.text}`}
              >
                <div className="flex flex-col gap-2 w-full">
                  {/* Category Badge */}
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${config.color}`}
                    >
                      {config.label}
                    </Badge>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm leading-snug">
                    {question.text}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
      )}

      {/* Mobile Collapsed State */}
      {!isExpanded && (
        <p className="text-xs text-muted-foreground md:hidden">
          Tap to view {displayQuestions.length} suggested questions
        </p>
      )}
    </div>
  );
}
