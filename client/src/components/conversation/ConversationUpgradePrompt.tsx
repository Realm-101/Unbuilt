import { AlertCircle, Zap, TrendingUp, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Link } from 'wouter';

interface ConversationUpgradePromptProps {
  remaining: number;
  limit: number;
  tier: 'free' | 'pro' | 'enterprise';
  variant?: 'inline' | 'modal' | 'banner';
}

/**
 * Upgrade prompt for conversation rate limits
 * Shows remaining questions and encourages upgrade when limit is approached
 */
export function ConversationUpgradePrompt({
  remaining,
  limit,
  tier,
  variant = 'inline',
}: ConversationUpgradePromptProps) {

  // Don't show for pro/enterprise users
  if (tier !== 'free') {
    return null;
  }

  const percentageUsed = ((limit - remaining) / limit) * 100;
  const isApproachingLimit = remaining <= 2;
  const isAtLimit = remaining === 0;

  // Banner variant (compact, shown at top of conversation)
  if (variant === 'banner') {
    if (isAtLimit) {
      return (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-destructive mb-1">
                Question Limit Reached
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                You've used all {limit} questions for this analysis. Upgrade to Pro for unlimited questions.
              </p>
              <Link href="/pricing">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    if (isApproachingLimit) {
      return (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-sm font-medium">
                {remaining} {remaining === 1 ? 'question' : 'questions'} remaining
              </span>
            </div>
            <Link href="/pricing">
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0"
              >
                Upgrade
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return null;
  }

  // Inline variant (shown in conversation input area)
  if (variant === 'inline') {
    if (isAtLimit) {
      return (
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-3">
            <MessageSquare className="h-6 w-6 text-destructive" />
          </div>
          <h4 className="font-semibold mb-2">You've reached your question limit</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Free users get {limit} questions per analysis. Upgrade to Pro for unlimited questions and deeper insights.
          </p>
          <Link href="/pricing">
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
          </Link>
        </div>
      );
    }

    if (isApproachingLimit) {
      return (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">
                {remaining} {remaining === 1 ? 'question' : 'questions'} remaining
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Upgrade to Pro for unlimited questions
              </p>
              <Link href="/pricing">
                <Button
                  size="sm"
                  variant="outline"
                >
                  View Plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Show progress indicator when not approaching limit
    return (
      <div className="text-xs text-muted-foreground mb-2">
        <div className="flex items-center justify-between mb-1">
          <span>
            {remaining} of {limit} questions remaining
          </span>
          <Link href="/pricing">
            <button className="text-primary hover:underline">
              Upgrade
            </button>
          </Link>
        </div>
        <Progress value={percentageUsed} className="h-1" />
      </div>
    );
  }

  // Modal variant (full card for modal display)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>
              {isAtLimit ? 'Upgrade to Continue' : 'Approaching Your Limit'}
            </CardTitle>
            <CardDescription>
              {isAtLimit
                ? `You've used all ${limit} questions for this analysis`
                : `${remaining} of ${limit} questions remaining`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAtLimit && (
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Questions used</span>
              <span className="font-medium">
                {limit - remaining} / {limit}
              </span>
            </div>
            <Progress value={percentageUsed} className="h-2" />
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Upgrade to Pro for:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Unlimited questions per analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Longer messages (1000 characters)</span>
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Advanced analysis features</span>
            </li>
          </ul>
        </div>

        <Link href="/pricing" className="w-full">
          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            View Upgrade Options
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Remaining questions indicator
 * Shows a subtle indicator of remaining questions
 */
export function RemainingQuestionsIndicator({
  remaining,
  limit,
  tier,
}: {
  remaining: number;
  limit: number;
  tier: 'free' | 'pro' | 'enterprise';
}) {

  // Don't show for pro/enterprise users
  if (tier !== 'free') {
    return null;
  }

  const percentageRemaining = (remaining / limit) * 100;
  const isLow = percentageRemaining <= 40;
  const isCritical = percentageRemaining <= 20;

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5">
        <MessageSquare className={`h-3.5 w-3.5 ${isCritical ? 'text-destructive' : isLow ? 'text-amber-600' : 'text-muted-foreground'}`} />
        <span className={isCritical ? 'text-destructive font-medium' : isLow ? 'text-amber-600' : 'text-muted-foreground'}>
          {remaining}/{limit}
        </span>
      </div>
      {isLow && (
        <Link href="/pricing">
          <button className="text-primary hover:underline font-medium">
            Upgrade
          </button>
        </Link>
      )}
    </div>
  );
}
