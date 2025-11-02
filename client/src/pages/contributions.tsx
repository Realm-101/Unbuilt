import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContributeDialog } from '@/components/resources';
import {
  ArrowLeft,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface ResourceContribution {
  id: number;
  title: string;
  description: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
  reviewedAt?: string;
  category?: {
    id: number;
    name: string;
  };
  suggestedTags: string[];
}

export default function ContributionsPage() {
  const [contributeDialogOpen, setContributeDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery<{ contributions: ResourceContribution[] }>({
    queryKey: ['/api/resources/contributions/mine'],
  });

  const contributions = data?.contributions || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'approved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Contributions</h1>
            <p className="text-muted-foreground">
              Track your resource submissions and their review status
            </p>
          </div>
          <Button onClick={() => setContributeDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Contribution
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load contributions. Please try again later.
          </AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && !error && contributions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No contributions yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Share valuable resources with the community. Your contributions help other entrepreneurs succeed.
            </p>
            <Button onClick={() => setContributeDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Submit Your First Contribution
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Contributions List */}
      {!isLoading && !error && contributions.length > 0 && (
        <div className="space-y-4">
          {contributions.map((contribution) => (
            <Card key={contribution.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{contribution.title}</CardTitle>
                      <Badge
                        variant="outline"
                        className={getStatusColor(contribution.status)}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(contribution.status)}
                          {contribution.status.charAt(0).toUpperCase() + contribution.status.slice(1)}
                        </span>
                      </Badge>
                    </div>
                    <CardDescription>
                      Submitted on {formatDate(contribution.createdAt)}
                      {contribution.reviewedAt && (
                        <> • Reviewed on {formatDate(contribution.reviewedAt)}</>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Description */}
                <div>
                  <p className="text-sm text-muted-foreground">
                    {contribution.description}
                  </p>
                </div>

                {/* URL */}
                <div className="flex items-center gap-2">
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

                {/* Category and Tags */}
                <div className="flex flex-wrap gap-2">
                  {contribution.category && (
                    <Badge variant="secondary">
                      {contribution.category.name}
                    </Badge>
                  )}
                  {contribution.suggestedTags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Admin Feedback for Rejected Contributions */}
                {contribution.status === 'rejected' && contribution.adminNotes && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Admin Feedback:</strong> {contribution.adminNotes}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Success Message for Approved Contributions */}
                {contribution.status === 'approved' && (
                  <Alert className="bg-green-500/10 border-green-500/20">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-500">
                      Your contribution has been approved and added to the resource library!
                    </AlertDescription>
                  </Alert>
                )}

                {/* Pending Message */}
                {contribution.status === 'pending' && (
                  <Alert className="bg-yellow-500/10 border-yellow-500/20">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-500">
                      Your contribution is being reviewed by our team. This typically takes 1-2 business days.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Contribute Dialog */}
      <ContributeDialog
        open={contributeDialogOpen}
        onOpenChange={setContributeDialogOpen}
      />
    </div>
  );
}
