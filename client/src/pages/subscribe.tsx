import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
if (!stripePublicKey) {
  console.warn('Stripe public key not configured - payment features disabled');
}
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

const SubscribeForm = ({ plan }: { plan: 'pro' | 'enterprise' }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: `Welcome to Unbuilt ${plan === 'pro' ? 'Pro' : 'Enterprise'}!`,
      });
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isLoading}
        size="lg"
      >
        {isLoading ? "Processing..." : `Subscribe to ${plan === 'pro' ? 'Pro' : 'Enterprise'}`}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>('pro');
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLocation("/auth/login");
      return;
    }

    // Create subscription as soon as the page loads
    apiRequest("POST", "/api/create-subscription", { plan: selectedPlan })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error creating subscription:", error);
        setIsLoading(false);
      });
  }, [user, selectedPlan, setLocation]);

  const plans = [
    {
      id: 'pro' as const,
      name: 'Pro',
      price: '$29',
      period: '/month',
      description: 'Perfect for entrepreneurs and small teams',
      features: [
        'Unlimited gap analysis searches',
        'Advanced AI insights',
        'Export to PDF/CSV',
        'Email support',
        'Priority processing'
      ],
      popular: true
    },
    {
      id: 'enterprise' as const,
      name: 'Enterprise',
      price: '$299',
      period: '/month',
      description: 'For large teams and organizations',
      features: [
        'Everything in Pro',
        'Team collaboration tools',
        'Custom integrations',
        'Dedicated account manager',
        'Advanced analytics',
        'White-label options'
      ],
      popular: false
    }
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Unbuilt</span>
          </div>
          <Button variant="ghost" onClick={() => setLocation("/")}>
            Back to Home
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600">
              Unlock unlimited market gap discovery and start building your next big idea
            </p>
          </div>

          {!clientSecret ? (
            <>
              {/* Plan Selection */}
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                {plans.map((plan) => (
                  <Card 
                    key={plan.id}
                    className={`relative cursor-pointer transition-all duration-200 ${
                      selectedPlan === plan.id 
                        ? 'ring-2 ring-blue-500 border-blue-500' 
                        : 'hover:border-blue-300'
                    } ${plan.popular ? 'border-blue-200' : ''}`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                        Most Popular
                      </Badge>
                    )}
                    <CardHeader>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                      <div className="flex items-baseline mt-4">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-gray-500 ml-2">{plan.period}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                            <span className="text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="text-center">
                <Button 
                  size="lg" 
                  onClick={() => {
                    setIsLoading(true);
                    // Trigger subscription creation
                    apiRequest("POST", "/api/create-subscription", { plan: selectedPlan })
                      .then((res) => res.json())
                      .then((data) => {
                        setClientSecret(data.clientSecret);
                        setIsLoading(false);
                      })
                      .catch((error) => {
                        console.error("Error creating subscription:", error);
                        setIsLoading(false);
                      });
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? "Setting up..." : `Continue with ${selectedPlan === 'pro' ? 'Pro' : 'Enterprise'}`}
                </Button>
              </div>
            </>
          ) : (
            /* Payment Form */
            <div className="max-w-md mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Complete Your Subscription</CardTitle>
                  <CardDescription>
                    You're subscribing to Unbuilt {selectedPlan === 'pro' ? 'Pro' : 'Enterprise'} 
                    for {selectedPlan === 'pro' ? '$29' : '$299'}/month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <SubscribeForm plan={selectedPlan} />
                  </Elements>
                </CardContent>
              </Card>
            </div>
          )}

          {isLoading && !clientSecret && (
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-500 mt-4">Setting up your subscription...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}