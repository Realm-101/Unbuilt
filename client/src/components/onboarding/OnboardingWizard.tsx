import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Lightbulb, 
  Search,
  X,
  ArrowRight,
  ArrowLeft,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUserPreferencesStore, UserRole } from "@/stores/userPreferencesStore";
import { cn } from "@/lib/utils";

export interface OnboardingWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

interface RoleOption {
  id: UserRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
}

const roleOptions: RoleOption[] = [
  {
    id: 'entrepreneur',
    label: 'Entrepreneur',
    description: 'Building a startup or launching a new business',
    icon: Lightbulb,
    features: [
      'Discover untapped market opportunities',
      'Validate business ideas with data',
      'Get actionable 4-phase launch plans',
      'Access market size estimates'
    ]
  },
  {
    id: 'investor',
    label: 'Investor',
    description: 'Evaluating opportunities and market trends',
    icon: TrendingUp,
    features: [
      'Identify emerging market gaps',
      'Analyze competitive landscapes',
      'Assess innovation potential',
      'Generate investment theses'
    ]
  },
  {
    id: 'product_manager',
    label: 'Product Manager',
    description: 'Developing products and features',
    icon: Users,
    features: [
      'Find product-market fit opportunities',
      'Discover feature gaps in existing markets',
      'Validate product concepts',
      'Prioritize development roadmaps'
    ]
  },
  {
    id: 'researcher',
    label: 'Researcher',
    description: 'Conducting market research and analysis',
    icon: Search,
    features: [
      'Comprehensive market intelligence',
      'Competitive analysis reports',
      'Trend identification and forecasting',
      'Export data for presentations'
    ]
  },
  {
    id: 'exploring',
    label: 'Just Exploring',
    description: 'Learning about innovation opportunities',
    icon: Sparkles,
    features: [
      'Explore market gaps across industries',
      'Learn about innovation analysis',
      'Discover new business ideas',
      'Get inspired by opportunities'
    ]
  }
];

interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<StepComponentProps>;
}

interface StepComponentProps {
  selectedRole: UserRole | null;
  onRoleSelect: (role: UserRole) => void;
}

const RoleSelectionStep: React.FC<StepComponentProps> = ({ selectedRole, onRoleSelect }) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          What brings you to Unbuilt?
        </h2>
        <p className="text-gray-300">
          Help us personalize your experience
        </p>
      </div>

      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
        {roleOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedRole === option.id;
          
          return (
            <motion.button
              key={option.id}
              onClick={() => onRoleSelect(option.id)}
              className={cn(
                "relative p-4 rounded-lg border-2 text-left transition-all",
                "hover:border-purple-400 hover:bg-purple-900/20",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900",
                isSelected
                  ? "border-purple-500 bg-purple-900/30"
                  : "border-gray-700 bg-gray-800/50"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                  isSelected
                    ? "bg-gradient-to-r from-purple-500 to-pink-500"
                    : "bg-gray-700"
                )}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-white">{option.label}</h3>
                    {isSelected && (
                      <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{option.description}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

const RoleFeatures: React.FC<StepComponentProps> = ({ selectedRole }) => {
  const roleData = roleOptions.find(r => r.id === selectedRole);
  
  if (!roleData) return null;
  
  const Icon = roleData.icon;
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Perfect for {roleData.label}s
        </h2>
        <p className="text-gray-300">
          Here's how Unbuilt helps you succeed
        </p>
      </div>

      <div className="space-y-3">
        {roleData.features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
              <Check className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-gray-200">{feature}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20">
        <p className="text-sm text-gray-300 text-center">
          You can always change your role preferences in settings
        </p>
      </div>
    </div>
  );
};

const wizardSteps: WizardStep[] = [
  {
    id: 'role-selection',
    title: 'Choose Your Role',
    description: 'Select the option that best describes you',
    component: RoleSelectionStep
  },
  {
    id: 'role-features',
    title: 'Your Personalized Experience',
    description: 'Features tailored to your needs',
    component: RoleFeatures
  }
];

/**
 * OnboardingWizard component with multi-step flow and role selection
 * 
 * Features:
 * - Multi-step wizard with progress indicator
 * - Role selection with 5 role options
 * - Role-specific content screens
 * - Skip button with confirmation dialog
 * - Completion handler that updates preferences
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [selectedRole, setSelectedRole] = React.useState<UserRole | null>(null);
  const [showSkipDialog, setShowSkipDialog] = React.useState(false);
  
  const { setRole, completeOnboarding } = useUserPreferencesStore();
  
  const currentStepData = wizardSteps[currentStep];
  const StepComponent = currentStepData.component;
  const progress = ((currentStep + 1) / wizardSteps.length) * 100;
  
  const canGoNext = currentStep === 0 ? selectedRole !== null : true;
  const canGoPrevious = currentStep > 0;
  const isLastStep = currentStep === wizardSteps.length - 1;

  const handleNext = () => {
    if (canGoNext && currentStep < wizardSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    if (selectedRole) {
      setRole(selectedRole);
      completeOnboarding();
    }
    onComplete?.();
  };

  const handleSkipClick = () => {
    setShowSkipDialog(true);
  };

  const handleSkipConfirm = () => {
    setShowSkipDialog(false);
    onSkip?.();
  };

  const handleSkipCancel = () => {
    setShowSkipDialog(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="w-full max-w-2xl bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border-purple-500/20 shadow-2xl">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Welcome to Unbuilt</h2>
                    <p className="text-sm text-gray-400">
                      Step {currentStep + 1} of {wizardSteps.length}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipClick}
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <Progress value={progress} className="h-2" />
              </div>

              {/* Step Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="min-h-[400px]"
                >
                  <StepComponent
                    selectedRole={selectedRole}
                    onRoleSelect={setSelectedRole}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className="text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                {isLastStep ? (
                  <Button
                    onClick={handleComplete}
                    disabled={!selectedRole}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    Get Started
                    <Check className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!canGoNext}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Skip Confirmation Dialog */}
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Skip Onboarding?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              You can always restart the onboarding tour from your account settings.
              Are you sure you want to skip?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleSkipCancel}
              className="bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border-gray-700"
            >
              Continue Tour
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSkipConfirm}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              Skip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
