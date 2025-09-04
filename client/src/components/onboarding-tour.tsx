import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Sparkles, Target, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";


interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTrial: () => void;
}

const tourSteps = [
  {
    id: 'welcome',
    title: 'Welcome to Unbuilt',
    description: 'Discover untapped market opportunities with AI-powered gap analysis. Let us show you how it works.',
    icon: Sparkles,
    highlight: null,
  },
  {
    id: 'search',
    title: 'AI-Powered Search',
    description: 'Simply describe any industry or market. Our AI analyzes thousands of data points to find what\'s missing.',
    icon: Target,
    highlight: 'search-input',
    example: 'Try: "sustainable fashion for Gen Z"'
  },
  {
    id: 'results',
    title: 'Detailed Opportunities',
    description: 'Get 6+ detailed market gaps with innovation scores, market sizes, and feasibility ratings.',
    icon: TrendingUp,
    highlight: 'results-preview',
    features: [
      'Market size estimates ($500M - $5B+)',
      'Innovation scores (1-10 rating)',
      'Feasibility analysis (High/Medium/Low)',
      'Gap reasoning and market context'
    ]
  },
  {
    id: 'export',
    title: 'Professional Exports',
    description: 'Export findings as PDF reports, CSV data, or investor pitch decks. Perfect for presentations.',
    icon: Download,
    highlight: 'export-options',
    proFeature: true
  }
];

export default function OnboardingTour({ isOpen, onClose, onStartTrial }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Highlight elements when tour opens
      const highlightElement = (elementId: string) => {
        const element = document.getElementById(elementId);
        if (element) {
          element.classList.add('tour-highlight');
        }
      };

      const currentHighlight = tourSteps[currentStep]?.highlight;
      if (currentHighlight) {
        setTimeout(() => highlightElement(currentHighlight), 100);
      }
    }

    return () => {
      // Remove all highlights when component unmounts
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
      });
    };
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const currentStepData = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStartTrial = () => {
    onStartTrial();
    onClose();
  };

  return (
    <div>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-gradient-to-br from-purple-900/95 via-pink-900/95 to-orange-900/95 border-purple-500/20 shadow-2xl">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <currentStepData.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{currentStepData.title}</h3>
                  <p className="text-sm text-purple-200">Step {currentStep + 1} of {tourSteps.length}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-6">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
              />
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-gray-100 text-lg leading-relaxed mb-4">
                {currentStepData.description}
              </p>

              {currentStepData.example && (
                <div className="bg-black/30 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-purple-300 mb-1">Example:</p>
                  <p className="text-white italic">"{currentStepData.example}"</p>
                </div>
              )}

              {currentStepData.features && (
                <div className="space-y-2">
                  {currentStepData.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full" />
                      <span className="text-gray-200 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              )}

              {currentStepData.proFeature && (
                <div className="mt-4 p-4 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-lg border border-yellow-500/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-300">Pro Feature</span>
                  </div>
                  <p className="text-sm text-gray-200">
                    Unlock professional exports and advanced features with a Pro subscription.
                  </p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={prevStep} 
                disabled={isFirstStep}
                className="text-white hover:bg-white/10 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {isLastStep ? (
                <div className="space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    Maybe Later
                  </Button>
                  <Button 
                    onClick={handleStartTrial}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={nextStep}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tour highlight styles */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 60;
          box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3);
          border-radius: 8px;
          animation: pulse-highlight 2s infinite;
        }

        @keyframes pulse-highlight {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(168, 85, 247, 0.3), 0 0 30px rgba(168, 85, 247, 0.5);
          }
        }
      `}</style>
    </div>
  );
}