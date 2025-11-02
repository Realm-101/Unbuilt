import * as React from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  HelpCircle, 
  Play, 
  RotateCcw, 
  Sparkles,
  BookOpen,
  Lightbulb,
  TrendingUp
} from "lucide-react";
import { useUserPreferencesStore } from "@/stores/userPreferencesStore";
import { 
  dashboardTourSteps,
  searchFlowTourSteps,
  actionPlanTourSteps,
  getRoleSpecificTourSteps,
  quickTourSteps
} from "./tourSteps";
import { InteractiveTour, TourStep } from "./InteractiveTour";
import { useTour } from "@/hooks/useTour";

/**
 * TourControls component for help menu integration
 * 
 * Features:
 * - Resume Tour option in help menu
 * - Advanced tips after initial tour completion
 * - Quick access to different tour types
 * 
 * Requirements: 2.4, 2.5
 */
export const TourControls: React.FC = () => {
  const { role, onboardingCompleted, tourProgress } = useUserPreferencesStore();
  const [activeTour, setActiveTour] = React.useState<{
    id: string;
    steps: TourStep[];
  } | null>(null);

  // Check which tours have been completed
  const isDashboardTourCompleted = tourProgress.some(
    step => step.id === 'dashboard-tour-completed' && step.completed
  );
  const isSearchTourCompleted = tourProgress.some(
    step => step.id === 'search-flow-tour-completed' && step.completed
  );
  const isActionPlanTourCompleted = tourProgress.some(
    step => step.id === 'action-plan-tour-completed' && step.completed
  );

  const allToursCompleted = 
    isDashboardTourCompleted && 
    isSearchTourCompleted && 
    isActionPlanTourCompleted;

  const handleStartTour = (tourId: string, steps: TourStep[]) => {
    setActiveTour({ id: tourId, steps });
  };

  const handleTourComplete = () => {
    setActiveTour(null);
  };

  const handleTourDismiss = () => {
    setActiveTour(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-white/10"
            data-tour="help-button"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-64 bg-gray-900 border-gray-700"
        >
          <DropdownMenuLabel className="text-gray-300">
            Help & Tours
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />

          {/* Quick Tour */}
          {onboardingCompleted && (
            <DropdownMenuItem
              onClick={() => handleStartTour('quick-tour', quickTourSteps)}
              className="text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <Play className="w-4 h-4 mr-2" />
              Quick Tour
            </DropdownMenuItem>
          )}

          {/* Dashboard Tour */}
          <DropdownMenuItem
            onClick={() => handleStartTour('dashboard-tour', dashboardTourSteps)}
            className="text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Dashboard Tour
            {!isDashboardTourCompleted && (
              <span className="ml-auto text-xs text-purple-400">New</span>
            )}
          </DropdownMenuItem>

          {/* Search Flow Tour */}
          <DropdownMenuItem
            onClick={() => handleStartTour('search-flow-tour', searchFlowTourSteps)}
            className="text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Search & Analysis Tour
            {!isSearchTourCompleted && (
              <span className="ml-auto text-xs text-purple-400">New</span>
            )}
          </DropdownMenuItem>

          {/* Action Plan Tour */}
          <DropdownMenuItem
            onClick={() => handleStartTour('action-plan-tour', actionPlanTourSteps)}
            className="text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Action Plan Tour
            {!isActionPlanTourCompleted && (
              <span className="ml-auto text-xs text-purple-400">New</span>
            )}
          </DropdownMenuItem>

          {/* Role-Specific Tour */}
          {role && (
            <>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem
                onClick={() => handleStartTour('role-tour', getRoleSpecificTourSteps(role))}
                className="text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Tips for {role === 'exploring' ? 'Explorers' : `${role}s`}
              </DropdownMenuItem>
            </>
          )}

          {/* Advanced Tips (shown after all tours completed) */}
          {allToursCompleted && (
            <>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem
                className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Advanced Tips
              </DropdownMenuItem>
            </>
          )}

          {/* Restart All Tours */}
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem
            onClick={() => {
              // Reset all tour progress
              if (confirm('This will reset all tour progress. Continue?')) {
                // This would call a reset function
                console.log('Resetting all tours');
              }
            }}
            className="text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restart All Tours
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Tour */}
      {activeTour && (
        <InteractiveTour
          steps={activeTour.steps}
          onComplete={handleTourComplete}
          onDismiss={handleTourDismiss}
        />
      )}
    </>
  );
};

/**
 * Advanced Tips component shown after tour completion
 */
export const AdvancedTips: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { role } = useUserPreferencesStore();

  const tips = React.useMemo(() => {
    const baseTips = [
      {
        title: 'Keyboard Shortcuts',
        description: 'Press Ctrl+K (Cmd+K on Mac) for quick search, ? for shortcuts reference',
        icon: Sparkles
      },
      {
        title: 'Export Options',
        description: 'Generate professional PDF reports or CSV exports for presentations',
        icon: BookOpen
      },
      {
        title: 'Organize with Projects',
        description: 'Group related analyses into projects to track multiple opportunities',
        icon: Lightbulb
      }
    ];

    // Add role-specific tips
    const roleTips: Record<string, typeof baseTips> = {
      entrepreneur: [
        {
          title: 'Validate Before Building',
          description: 'Use market size and feasibility ratings to prioritize which ideas to pursue',
          icon: Lightbulb
        }
      ],
      investor: [
        {
          title: 'Track Emerging Trends',
          description: 'Save promising gaps as favorites to monitor market evolution over time',
          icon: TrendingUp
        }
      ],
      product_manager: [
        {
          title: 'Feature Prioritization',
          description: 'Compare innovation scores across gaps to build your product roadmap',
          icon: Lightbulb
        }
      ]
    };

    return [...baseTips, ...(role ? roleTips[role] || [] : [])];
  }, [role]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border border-purple-500/20 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <h3 className="text-xl font-bold text-white">Advanced Tips</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </Button>
        </div>

        <div className="space-y-3">
          {tips.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <div
                key={index}
                className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">{tip.title}</h4>
                    <p className="text-sm text-gray-400">{tip.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          onClick={onClose}
          className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
        >
          Got it!
        </Button>
      </div>
    </div>
  );
};
