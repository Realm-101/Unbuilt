import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  User, 
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface Contribution {
  id: number;
  title: string;
  description: string;
  url: string;
  suggestedCategoryId: number | null;
  suggestedTags: string[];
  status: 'pending' | 'approved' | 'rejected';
  adminNotes: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string | null;
    email: string;
  };
  category?: {
    id: number;
    name: string;
  } | null;
}

export function ContributionReviewQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: contributions, isLoading, error } = useQuery<Contribution[]>({
    queryKey: ['admin', 'contributions', 'pending'],
    queryFn: async () => {
      const response = await fetch('/api/admin/resources/contributions/pending', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending contributions');
      }
      
      const result = await response.json();
      return result.data.contributions;
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, resourceData, adminNotes }: { 
      id: number; 
      resourceData?: any; 
      adminNotes?: string;
    }) => {
      const response = await fetch(`/api/admin/resources/contributions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resourceData, adminNotes })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve contribution');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contributions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'resource-stats'] });
      toast({
        title: 'Success',
        description: 'Contribution approved and resource created'
      });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await fetch(`/api/admin/resources/contributions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject contribution');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contributions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'resource-stats'] });
      toast({
        title: 'Success',
        description: 'Contribution rejected'
      });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const openReviewDialog = (contribution: Contribution, action: 'approve' | 'reject') => {
    setSelectedContribution(contribution);
    setReviewAction(action);
    setAdminNotes('');
  };

  const closeDialog = () => {
    setSelectedContribution(null);
    setReviewAction(null);
    setAdminNotes('');
  };

  const handleReview = () => {
    if (!selectedContribution || !reviewAction) return;

    if (reviewAction === 'approve') {
      approveMutation.mutate({
        id: selectedContribution.id,
        adminNotes: adminNotes || undefined
      });
    } else {
      if (!adminNotes.trim()) {
        toast({
          title: 'Error',
          description: 'Please provide a reason for rejection',
          variant: 'destructive'
        });
        return;
      }
      rejectMutation.mutate({
        id: selectedContribution.id,
        reason: adminNotes
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Contributions
          </CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!contributions || contributions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Pending Contributions</CardTitle>
          <CardDescription>
            All contributions have been reviewed
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {contributions.map((contribution) => (
          <Card key={contribution.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{contribution.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {contribution.user?.name || contribution.user?.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(contribution.createdAt), 'MMM d, yyyy')}
                    </span>
                  </CardDescription>
                </div>
                <Badge variant="secondary">Pending Review</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{contribution.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">URL:</h4>
                <a
                  href={contribution.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {contribution.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {contribution.category && (
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">Category:</h4>
                  <Badge variant="outline">{contribution.category.name}</Badge>
                </div>
              )}

              {contribution.suggestedTags && contribution.suggestedTags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Suggested Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {contribution.suggestedTags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => openReviewDialog(contribution, 'approve')}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openReviewDialog(contribution, 'reject')}
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedContribution} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Contribution
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve'
                ? 'This will create a new resource from this contribution.'
                : 'Please provide a reason for rejecting this contribution. The contributor will be notified.'}
            </DialogDescription>
          </DialogHeader>

          {selectedContribution && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">{selectedContribution.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedContribution.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-notes">
                  {reviewAction === 'approve' ? 'Admin Notes (Optional)' : 'Rejection Reason *'}
                </Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'approve'
                      ? 'Add any notes about this approval...'
                      : 'Explain why this contribution is being rejected...'
                  }
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              variant={reviewAction === 'reject' ? 'destructive' : 'default'}
            >
              {(approveMutation.isPending || rejectMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {reviewAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
