import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Calendar,
  Eye,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analysisId: number;
  analysisTitle?: string;
}

interface ShareLink {
  id: number;
  searchId: number;
  token: string;
  expiresAt: string | null;
  viewCount: number;
  active: boolean;
  createdAt: string;
  lastAccessedAt: string | null;
  searchQuery: string;
  shareUrl: string;
  isValid: boolean;
}

export default function ShareDialog({
  isOpen,
  onClose,
  analysisId,
  analysisTitle,
}: ShareDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null);
  const [expirationDate, setExpirationDate] = useState<string>("");

  // Fetch existing share links
  const { data: shareLinks, isLoading } = useQuery<ShareLink[]>({
    queryKey: ["shareLinks", analysisId],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/share/links");
      const data = await response.json();
      // Filter to only show links for this analysis
      return data.filter((link: ShareLink) => link.searchId === analysisId);
    },
    enabled: isOpen,
  });

  // Create share link mutation
  const createShareLinkMutation = useMutation({
    mutationFn: async (expiresAt?: string) => {
      const response = await apiRequest(
        "POST",
        `/api/share/${analysisId}`,
        expiresAt ? { expiresAt } : {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareLinks", analysisId] });
      toast({
        title: "Share link created",
        description: "Your share link has been generated successfully",
      });
      setExpirationDate("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create share link",
        variant: "destructive",
      });
    },
  });

  // Revoke share link mutation
  const revokeShareLinkMutation = useMutation({
    mutationFn: async (linkId: number) => {
      const response = await apiRequest("DELETE", `/api/share/links/${linkId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareLinks", analysisId] });
      toast({
        title: "Link revoked",
        description: "The share link has been revoked successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revoke share link",
        variant: "destructive",
      });
    },
  });

  // Update share link mutation
  const updateShareLinkMutation = useMutation({
    mutationFn: async ({
      linkId,
      expiresAt,
    }: {
      linkId: number;
      expiresAt: string | null;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/share/links/${linkId}`,
        { expiresAt }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareLinks", analysisId] });
      toast({
        title: "Link updated",
        description: "The share link has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update share link",
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = (shareUrl: string, linkId: number) => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLinkId(linkId);
    toast({
      title: "Link copied",
      description: "The share link has been copied to your clipboard",
    });
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleCreateLink = () => {
    if (expirationDate) {
      // Convert to ISO string for API
      const expiresAt = new Date(expirationDate).toISOString();
      createShareLinkMutation.mutate(expiresAt);
    } else {
      createShareLinkMutation.mutate(undefined);
    }
  };

  const handleRevokeLink = (linkId: number) => {
    if (window.confirm("Are you sure you want to revoke this share link?")) {
      revokeShareLinkMutation.mutate(linkId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Analysis</DialogTitle>
          <DialogDescription>
            {analysisTitle
              ? `Share "${analysisTitle}" with others`
              : "Create a secure link to share this analysis"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Create New Share Link Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Create New Share Link</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="expiration">
                  Expiration Date (Optional)
                </Label>
                <Input
                  id="expiration"
                  type="datetime-local"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for a link that never expires
                </p>
              </div>

              <Button
                onClick={handleCreateLink}
                disabled={createShareLinkMutation.isPending}
                className="w-full"
              >
                {createShareLinkMutation.isPending
                  ? "Creating..."
                  : "Generate Share Link"}
              </Button>
            </div>
          </div>

          {/* Existing Share Links Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Active Share Links</h3>
              {shareLinks && shareLinks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {shareLinks.length} link{shareLinks.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading share links...
              </div>
            ) : shareLinks && shareLinks.length > 0 ? (
              <div className="space-y-3">
                {shareLinks.map((link) => (
                  <div
                    key={link.id}
                    className={`border rounded-lg p-4 space-y-3 ${
                      !link.isValid
                        ? "border-destructive/50 bg-destructive/5"
                        : "border-border"
                    }`}
                  >
                    {/* Link Status */}
                    {!link.isValid && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          This link has expired or been deactivated
                        </span>
                      </div>
                    )}

                    {/* Share URL */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={link.shareUrl}
                        readOnly
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(link.shareUrl, link.id)}
                        disabled={!link.isValid}
                      >
                        {copiedLinkId === link.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(link.shareUrl, "_blank")}
                        disabled={!link.isValid}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Link Metadata */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Eye className="w-4 h-4" />
                        <span>
                          {link.viewCount} view{link.viewCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Created {format(new Date(link.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>

                    {/* Expiration Info */}
                    {link.expiresAt && (
                      <div className="text-sm text-muted-foreground">
                        Expires: {format(new Date(link.expiresAt), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    )}

                    {/* Last Accessed */}
                    {link.lastAccessedAt && (
                      <div className="text-sm text-muted-foreground">
                        Last accessed:{" "}
                        {format(new Date(link.lastAccessedAt), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRevokeLink(link.id)}
                        disabled={revokeShareLinkMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Revoke Access
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No share links created yet. Generate one above to get started.
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-medium">About Share Links</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Anyone with the link can view the analysis</li>
              <li>No account required to view shared analyses</li>
              <li>You can revoke access at any time</li>
              <li>Set expiration dates for temporary sharing</li>
              <li>Track how many times your link has been viewed</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
