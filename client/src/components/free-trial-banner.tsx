import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Zap, Clock, Star } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface FreeTrialBannerProps {
  onStartTrial: () => void;
}

export default function FreeTrialBanner({ onStartTrial }: FreeTrialBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const { user } = useAuth();

  if (!user || user.plan !== 'free' || isDismissed) {
    return null;
  }

  return (
    <Card className="premium-card border-purple-500/30 mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <Badge className="bg-gradient-to-r from-purple-500 to-blue-500">
                Free Trial
              </Badge>
            </div>
            
            <div className="hidden sm:block">
              <p className="text-sm font-medium">
                Unlock Pro features with your 7-day free trial
              </p>
              <p className="text-xs text-muted-foreground">
                Action plans, competitive analysis, market intelligence & more
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>7 days free</span>
            </div>
            
            <Button onClick={onStartTrial} size="sm" className="btn-premium">
              <Star className="w-4 h-4 mr-1" />
              Start Trial
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDismissed(true)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}