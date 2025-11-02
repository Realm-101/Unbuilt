import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Crown, Zap, Building2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

interface TierComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightTier?: 'free' | 'pro' | 'enterprise';
}

interface TierFeature {
  name: string;
  included: boolean;
  description?: string;
}

interface TierDetails {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  price: string;
  priceDetail: string;
  description: string;
  features: TierFeature[];
  cta: string;
  popular?: boolean;
}

const tierDetails: Record<'free' | 'pro' | 'enterprise', TierDetails> = {
  free: {
    name: 'Free',
    icon: Zap,
    color: 'text-gray-400',
    bgColor: 'bg-gray-700',
    price: '$0',
    priceDetail: 'Forever free',
    description: 'Perfect for exploring and testing the platform',
    features: [
      { name: '5 searches per month', included: true },
      { name: 'Basic gap analysis', included: true },
      { name: 'Export to PDF', included: true },
      { name: 'Community support', included: true },
      { name: 'Search history (30 days)', included: true },
      { name: 'Unlimited searches', included: false },
      { name: 'Advanced analytics', included: false },
      { name: 'Priority support', included: false },
      { name: 'Collaboration features', included: false },
      { name: 'Custom reports', included: false },
      { name: 'API access', included: false },
    ],
    cta: 'Current Plan',
  },
  pro: {
    name: 'Pro',
    icon: Crown,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-600',
    price: '$29',
    priceDetail: 'per month',
    description: 'For professionals and growing businesses',
    popular: true,
    features: [
      { name: '5 searches per month', included: true },
      { name: 'Basic gap analysis', included: true },
      { name: 'Export to PDF', included: true },
      { name: 'Community support', included: true },
      { name: 'Search history (unlimited)', included: true },
      { name: 'Unlimited searches', included: true, description: 'No monthly limits' },
      { name: 'Advanced analytics', included: true, description: 'Deep market insights' },
      { name: 'Priority support', included: true, description: '24/7 email support' },
      { name: 'Collaboration features', included: true, description: 'Share with team' },
      { name: 'Custom reports', included: true, description: 'Branded exports' },
      { name: 'API access', included: false },
    ],
    cta: 'Upgrade to Pro',
  },
  enterprise: {
    name: 'Enterprise',
    icon: Building2,
    color: 'text-purple-400',
    bgColor: 'bg-purple-600',
    price: 'Custom',
    priceDetail: 'Contact us',
    description: 'For large teams and organizations',
    features: [
      { name: '5 searches per month', included: true },
      { name: 'Basic gap analysis', included: true },
      { name: 'Export to PDF', included: true },
      { name: 'Community support', included: true },
      { name: 'Search history (unlimited)', included: true },
      { name: 'Unlimited searches', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Priority support', included: true, description: 'Dedicated account manager' },
      { name: 'Collaboration features', included: true, description: 'Team management' },
      { name: 'Custom reports', included: true, description: 'White-label options' },
      { name: 'API access', included: true, description: 'Full REST API' },
    ],
    cta: 'Contact Sales',
  },
};

export function TierComparisonModal({
  isOpen,
  onClose,
  highlightTier,
}: TierComparisonModalProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const currentTier = ((user as any)?.plan || 'free') as 'free' | 'pro' | 'enterprise';

  const handleUpgrade = (tier: 'free' | 'pro' | 'enterprise') => {
    onClose();
    if (tier === 'enterprise') {
      setLocation('/contact');
    } else {
      setLocation('/pricing');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-white text-center">
            Choose the Perfect Plan for You
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-center text-lg mt-2">
            Unlock more features and discover unlimited opportunities
          </DialogDescription>
        </DialogHeader>

        {/* Mobile View - Stacked Cards */}
        <div className="grid grid-cols-1 md:hidden gap-6 mt-8">
          {Object.entries(tierDetails).map(([key, details]) => {
            const TierIcon = details.icon;
            const isCurrentTier = key === currentTier;
            const isHighlighted = key === highlightTier;

            return (
              <Card
                key={key}
                className={`relative overflow-hidden ${
                  isHighlighted
                    ? 'border-2 border-purple-500 shadow-lg shadow-purple-500/20'
                    : isCurrentTier
                    ? 'border-2 border-blue-500'
                    : 'border border-gray-700'
                } bg-gray-800/50`}
              >
                {details.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    MOST POPULAR
                  </div>
                )}
                
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <TierIcon className={`w-12 h-12 ${details.color} mx-auto mb-3`} />
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {details.name}
                    </h3>
                    {isCurrentTier && (
                      <Badge className="bg-blue-600 text-white mb-2">
                        Current Plan
                      </Badge>
                    )}
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-white">
                        {details.price}
                      </span>
                      <span className="text-gray-400 ml-2">{details.priceDetail}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">{details.description}</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {details.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <span
                            className={`text-sm ${
                              feature.included ? 'text-gray-200' : 'text-gray-500'
                            }`}
                          >
                            {feature.name}
                          </span>
                          {feature.description && feature.included && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {feature.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!isCurrentTier && (
                    <Button
                      className={`w-full ${
                        details.popular
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                      onClick={() => handleUpgrade(key as 'free' | 'pro' | 'enterprise')}
                    >
                      {details.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop View - Side by Side */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 mt-8">
          {Object.entries(tierDetails).map(([key, details]) => {
            const TierIcon = details.icon;
            const isCurrentTier = key === currentTier;
            const isHighlighted = key === highlightTier;

            return (
              <Card
                key={key}
                className={`relative overflow-hidden ${
                  isHighlighted
                    ? 'border-2 border-purple-500 shadow-lg shadow-purple-500/20 scale-105'
                    : isCurrentTier
                    ? 'border-2 border-blue-500'
                    : 'border border-gray-700'
                } bg-gray-800/50 transition-transform`}
              >
                {details.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    POPULAR
                  </div>
                )}
                
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <TierIcon className={`w-10 h-10 ${details.color} mx-auto mb-3`} />
                    <h3 className="text-xl font-bold text-white mb-2">
                      {details.name}
                    </h3>
                    {isCurrentTier && (
                      <Badge className="bg-blue-600 text-white mb-2">
                        Current Plan
                      </Badge>
                    )}
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-white">
                        {details.price}
                      </span>
                      <span className="text-gray-400 text-sm ml-2">
                        {details.priceDetail}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{details.description}</p>
                  </div>

                  <div className="space-y-2.5 mb-6 min-h-[400px]">
                    {details.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <span
                            className={`text-xs ${
                              feature.included ? 'text-gray-200' : 'text-gray-500'
                            }`}
                          >
                            {feature.name}
                          </span>
                          {feature.description && feature.included && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {feature.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!isCurrentTier && (
                    <Button
                      className={`w-full ${
                        details.popular
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                      onClick={() => handleUpgrade(key as 'free' | 'pro' | 'enterprise')}
                    >
                      {details.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 p-6 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-white mb-2">
              Need a custom solution?
            </h4>
            <p className="text-sm text-gray-400 mb-4">
              We offer tailored plans for large organizations with specific requirements
            </p>
            <Button
              variant="outline"
              className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
              onClick={() => {
                onClose();
                setLocation('/contact');
              }}
            >
              Contact Sales Team
            </Button>
          </div>
        </div>

        {/* Money-back guarantee */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            All plans include a 14-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
