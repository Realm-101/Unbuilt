import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Star, Clock, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import Layout from '@/components/layout';

export default function FreeTrial() {
  const [, setLocation] = useLocation();
  const [isActivating, setIsActivating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Redirect if already on Pro plan  
  if ((user as any)?.plan === 'pro') {
    setLocation('/');
    return null;
  }

  const handleActivateTrial = async () => {
    setIsActivating(true);
    try {
      const response = await apiRequest('POST', '/api/activate-trial');
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Free Trial Activated!",
          description: "You now have 7 days of Pro features. Enjoy unlimited searches and premium tools!",
        });
        
        // Redirect to home page
        setLocation('/');
      } else {
        throw new Error(data.error || 'Failed to activate trial');
      }
    } catch (error) {
      console.error('Trial activation error:', error);
      toast({
        title: "Trial Activation Failed",
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="flame-card text-white border-purple-500/30">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <Star className="w-12 h-12 text-yellow-400" />
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </div>
              
              <CardTitle className="text-3xl neon-glow mb-2">
                Start Your Free Trial
              </CardTitle>
              
              <CardDescription className="text-lg">
                Get full access to Pro features for 7 days, completely free
              </CardDescription>
              
              <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4">
                No Credit Card Required
              </Badge>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-6 border border-purple-500/20">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  What You'll Get
                </h3>
                
                <div className="grid gap-3">
                  {[
                    'Unlimited AI-powered market gap searches',
                    'Action Plan Generator with 4-phase development roadmaps',
                    'Competitive Analysis with market positioning insights',
                    'Market Intelligence with demographics & growth data',
                    'Professional Export System (PDF reports, CSV data, pitch decks)',
                    'Advanced sharing and collaboration features'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>7 days free trial • Cancel anytime • No hidden fees</span>
              </div>

              <div className="text-center space-y-4">
                <Button 
                  onClick={handleActivateTrial}
                  disabled={isActivating}
                  size="lg"
                  className="w-full btn-premium text-lg py-6"
                >
                  {isActivating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Activating Trial...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Activate Free Trial
                    </div>
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  By starting your trial, you agree to our{' '}
                  <button 
                    onClick={() => setLocation('/terms')}
                    className="text-purple-400 hover:underline"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button 
                    onClick={() => setLocation('/privacy')}
                    className="text-purple-400 hover:underline"
                  >
                    Privacy Policy
                  </button>
                </p>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setLocation('/')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Maybe later, take me back
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}