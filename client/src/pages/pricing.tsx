import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@shared/schema';

// Stripe Price IDs - Replace with your actual Stripe price IDs
const STRIPE_PRICES = {
  pro_monthly: 'price_pro_monthly',
  pro_yearly: 'price_pro_yearly',
  business_monthly: 'price_business_monthly',
  business_yearly: 'price_business_yearly',
  enterprise_monthly: 'price_enterprise_monthly',
  enterprise_yearly: 'price_enterprise_yearly',
};

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for trying out GapFinder',
    features: [
      '5 searches per month',
      '3 exports per month',
      'Basic gap analysis',
      'Email support',
    ],
    cta: 'Current Plan',
    tier: 'free',
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For serious entrepreneurs and researchers',
    features: [
      '100 searches per month',
      '50 exports per month',
      'Advanced AI analysis',
      'PDF, Excel, PowerPoint exports',
      'Priority email support',
      'Search history & favorites',
    ],
    cta: 'Upgrade to Pro',
    tier: 'pro',
    priceId: STRIPE_PRICES.pro_monthly,
    popular: true,
  },
  {
    name: 'Business',
    price: '$99',
    period: '/month',
    description: 'For teams and growing businesses',
    features: [
      '500 searches per month',
      '200 exports per month',
      'Everything in Pro',
      'Team collaboration',
      'Shared workspaces',
      'Priority support',
      'Custom branding',
    ],
    cta: 'Upgrade to Business',
    tier: 'business',
    priceId: STRIPE_PRICES.business_monthly,
  },
  {
    name: 'Enterprise',
    price: '$299',
    period: '/month',
    description: 'For large organizations',
    features: [
      'Unlimited searches',
      'Unlimited exports',
      'Everything in Business',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'Advanced analytics',
    ],
    cta: 'Contact Sales',
    tier: 'enterprise',
    priceId: STRIPE_PRICES.enterprise_monthly,
  },
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const user = authUser as User | undefined;
  const [, setLocation] = useLocation();

  const handleSubscribe = async (priceId: string, tier: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to subscribe',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    setLoading(tier);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          priceId,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: 'Subscription Error',
        description: 'Failed to start checkout process. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleContactSales = () => {
    // Navigate to contact page or open email
    window.location.href = 'mailto:sales@gapfinder.com?subject=Enterprise Plan Inquiry';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start finding market gaps today. Upgrade anytime as your needs grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.tier}
              className={`relative flex flex-col ${
                plan.popular ? 'border-primary shadow-lg scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  disabled={
                    plan.tier === 'free' ||
                    loading === plan.tier ||
                    (user?.subscriptionTier === plan.tier && user?.subscriptionStatus === 'active')
                  }
                  onClick={() => {
                    if (plan.tier === 'enterprise') {
                      handleContactSales();
                    } else if (plan.priceId) {
                      handleSubscribe(plan.priceId, plan.tier);
                    }
                  }}
                >
                  {loading === plan.tier
                    ? 'Processing...'
                    : user?.subscriptionTier === plan.tier && user?.subscriptionStatus === 'active'
                    ? 'Current Plan'
                    : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Can I change plans later?</h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time from your account settings.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground">
                We accept all major credit cards through our secure payment processor, Stripe.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-muted-foreground">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                We offer a 30-day money-back guarantee for all paid plans. Contact support if you're not satisfied.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
