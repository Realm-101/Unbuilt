import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, User as UserIcon, Settings, Lock, Edit } from 'lucide-react';
import { useLocation } from 'wouter';
import type { User } from '@shared/schema';

interface ProfileData {
  name?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  company?: string;
}

export default function Account() {
  const { user: authUser } = useAuth();
  const user = authUser as User | undefined;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile/me', {
        credentials: 'include',
      });

      if (!response.ok) return;

      const { data } = await response.json();
      setProfileData(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Customer Portal
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: 'Error',
        description: 'Failed to open subscription management. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionBadge = () => {
    const tier = user?.subscriptionTier || 'free';
    const status = user?.subscriptionStatus || 'inactive';

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      free: 'secondary',
      pro: 'default',
      business: 'default',
      enterprise: 'default',
    };

    return (
      <Badge variant={variants[tier] || 'secondary'} className="text-sm">
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
        {status === 'active' && ' (Active)'}
        {status === 'canceled' && ' (Canceled)'}
        {status === 'past_due' && ' (Past Due)'}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and subscription
          </p>
        </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/profile-edit')}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Picture */}
            {profileData?.profileImageUrl && (
              <div className="flex items-center gap-4 pb-4 border-b">
                <img
                  src={profileData.profileImageUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">{profileData.name || user.email}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-lg">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Display Name</label>
                <p className="text-lg">{profileData?.name || user.name || 'Not set'}</p>
              </div>
              {(profileData?.firstName || profileData?.lastName) && (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">First Name</label>
                    <p className="text-lg">{profileData.firstName || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                    <p className="text-lg">{profileData.lastName || 'Not set'}</p>
                  </div>
                </>
              )}
              {profileData?.company && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p className="text-lg">{profileData.company}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                <p className="text-lg">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                <p className="text-lg">{user.isActive ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Subscription</CardTitle>
            </div>
            <CardDescription>Manage your subscription plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Plan</label>
                <div className="flex items-center gap-2 mt-1">
                  {getSubscriptionBadge()}
                </div>
              </div>
              {user.subscriptionTier !== 'free' && (
                <Button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Manage Subscription'
                  )}
                </Button>
              )}
            </div>

            {user.subscriptionTier === 'free' && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm mb-3">
                  Upgrade to unlock premium features and unlimited searches.
                </p>
                <Button onClick={() => setLocation('/pricing')}>
                  View Plans
                </Button>
              </div>
            )}

            {user.subscriptionPeriodEnd && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {user.subscriptionStatus === 'canceled' ? 'Access Until' : 'Next Billing Date'}
                </label>
                <p className="text-lg">{formatDate(user.subscriptionPeriodEnd)}</p>
              </div>
            )}

            {/* Usage Stats */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Usage This Month</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Searches Used</p>
                  <p className="text-2xl font-bold">{user.searchCount || 0}</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Plan Limit</p>
                  <p className="text-2xl font-bold">
                    {user.subscriptionTier === 'free' ? '5' : 
                     user.subscriptionTier === 'pro' ? '100' :
                     user.subscriptionTier === 'business' ? '500' : 'Unlimited'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLocation('/change-password')}
            >
              <Lock className="h-4 w-4 mr-2" />
              Change Password
            </Button>
            {user.lastPasswordChange && (
              <p className="text-xs text-muted-foreground">
                Last changed: {formatDate(user.lastPasswordChange)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Additional Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Additional Settings</CardTitle>
            </div>
            <CardDescription>Other account preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => setLocation('/search-history')}>
              View Search History
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setLocation('/saved-results')}>
              View Saved Results
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
