import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowUpCircle, Sparkles, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TierComparisonModal } from './TierComparisonModal';

interface UpgradePromptProps {
  reason: 'search-limit' | 'premium-feature' | 'export-limit' | 'collaboration';
  featureName?: string;
  onDismiss?: () => void;
  className?: string;
}

const promptConfig = {
  'search-limit': {
    icon: ArrowUpCircle,
    title: "You're running low on searches",
    description: 'Upgrade to Pro for unlimited searches and never hit a limit again',
    color: 'orange',
    highlightTier: 'pro' as const,
  },
  'premium-feature': {
    icon: Lock,
    title: 'This is a Pro feature',
    description: 'Upgrade to unlock advanced analytics and premium features',
    color: 'purple',
    highlightTier: 'pro' as const,
  },
  'export-limit': {
    icon: Sparkles,
    title: 'Export limit reached',
    description: 'Upgrade to Pro for unlimited exports in multiple formats',
    color: 'blue',
    highlightTier: 'pro' as const,
  },
  'collaboration': {
    icon: Lock,
    title: 'Collaboration requires Pro',
    description: 'Upgrade to share analyses and collaborate with your team',
    color: 'purple',
    highlightTier: 'pro' as const,
  },
};

const COOLDOWN_KEY_PREFIX = 'upgrade-prompt-dismissed-';
const COOLDOWN_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function UpgradePrompt({
  reason,
  featureName,
  onDismiss,
  className = '',
}: UpgradePromptProps) {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const config = promptConfig[reason];
  const Icon = config.icon;
  
  type ColorKey = 'orange' | 'purple' | 'blue';

  // Check if prompt was recently dismissed
  useEffect(() => {
    const cooldownKey = `${COOLDOWN_KEY_PREFIX}${reason}`;
    const dismissedAt = localStorage.getItem(cooldownKey);
    
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      
      if (now - dismissedTime < COOLDOWN_DURATION) {
        setIsDismissed(true);
      } else {
        // Cooldown expired, remove the key
        localStorage.removeItem(cooldownKey);
      }
    }
  }, [reason]);

  // Don't show if user is not on free tier
  if (!user || (user as any).plan !== 'free') {
    return null;
  }

  // Don't show if dismissed within cooldown period
  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    const cooldownKey = `${COOLDOWN_KEY_PREFIX}${reason}`;
    localStorage.setItem(cooldownKey, Date.now().toString());
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleUpgrade = () => {
    setIsModalOpen(true);
  };

  const colorClasses = {
    orange: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      text: 'text-orange-300',
      subtext: 'text-orange-400',
      button: 'bg-orange-600 hover:bg-orange-700',
      icon: 'text-orange-400',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-300',
      subtext: 'text-purple-400',
      button: 'bg-purple-600 hover:bg-purple-700',
      icon: 'text-purple-400',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-300',
      subtext: 'text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700',
      icon: 'text-blue-400',
    },
  };

  const colors = colorClasses[config.color as ColorKey];

  return (
    <>
      <Card
        className={`${colors.bg} border ${colors.border} ${className}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Icon className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className={`font-semibold ${colors.text}`}>
                  {config.title}
                  {featureName && `: ${featureName}`}
                </h4>
                <button
                  onClick={handleDismiss}
                  className="text-gray-500 hover:text-gray-400 transition-colors flex-shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className={`text-sm ${colors.subtext} mb-3`}>
                {config.description}
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleUpgrade}
                  className={colors.button}
                >
                  View Plans
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-300"
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TierComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        highlightTier={config.highlightTier}
      />
    </>
  );
}

// Inline upgrade prompt for use within other components
interface InlineUpgradePromptProps {
  reason: 'search-limit' | 'premium-feature' | 'export-limit' | 'collaboration';
  featureName?: string;
  compact?: boolean;
}

export function InlineUpgradePrompt({
  reason,
  featureName,
  compact = false,
}: InlineUpgradePromptProps) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const config = promptConfig[reason];
  const Icon = config.icon;

  // Don't show if user is not on free tier
  if (!user || (user as any).plan !== 'free') {
    return null;
  }

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2 text-sm text-purple-400">
          <Lock className="w-4 h-4" />
          <span>Pro feature</span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="underline hover:text-purple-300"
          >
            Upgrade
          </button>
        </div>
        <TierComparisonModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          highlightTier={config.highlightTier}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <Icon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-purple-300 font-medium">
            {config.title}
            {featureName && `: ${featureName}`}
          </p>
          <p className="text-xs text-purple-400 mt-1">
            {config.description}
          </p>
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="mt-2 bg-purple-600 hover:bg-purple-700"
          >
            View Plans
          </Button>
        </div>
      </div>
      <TierComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        highlightTier={config.highlightTier}
      />
    </>
  );
}
