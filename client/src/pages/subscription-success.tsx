import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function SubscriptionSuccess() {
  const [location, setLocation] = useLocation();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get session_id from URL
    const params = new URLSearchParams(location.split('?')[1]);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setError('No session ID found');
      setVerifying(false);
      return;
    }

    // Verify the session (optional - webhook will handle the actual update)
    const verifySession = async () => {
      try {
        // Give webhook time to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        setVerifying(false);
      } catch (err) {
        console.error('Verification error:', err);
        setError('Failed to verify subscription');
        setVerifying(false);
      }
    };

    verifySession();
  }, [location]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg">Verifying your subscription...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Verification Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/pricing')} className="w-full">
              Return to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Subscription Successful!</CardTitle>
          <CardDescription>
            Thank you for subscribing. Your account has been upgraded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">What's Next?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Access all premium features immediately</li>
              <li>• Check your email for a receipt</li>
              <li>• Manage your subscription in account settings</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setLocation('/home')} className="flex-1">
              Start Searching
            </Button>
            <Button onClick={() => setLocation('/account')} variant="outline" className="flex-1">
              View Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
