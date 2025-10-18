import { X, Twitter, Linkedin, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { SearchResult } from "@shared/schema";

interface ShareModalProps {
  isOpen: boolean;
  result: SearchResult | null;
  onClose: () => void;
}

export default function ShareModal({ isOpen, result, onClose }: ShareModalProps) {
  const { toast } = useToast();

  if (!isOpen || !result) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/result/${result.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "The link has been copied to your clipboard",
    });
  };

  const handleTwitterShare = () => {
    const text = `Check out this innovation gap: ${result.title}`;
    const url = `${window.location.origin}/result/${result.id}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const handleLinkedInShare = () => {
    const url = `${window.location.origin}/result/${result.id}`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Share This Gap</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2 text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center py-3 bg-gray-900 border-gray-700 text-white hover:bg-gray-700"
            onClick={handleTwitterShare}
          >
            <Twitter className="w-4 h-4 mr-2 text-blue-400" />
            Share on Twitter
          </Button>
          <Button
            variant="outline"
            className="w-full flex items-center justify-center py-3 bg-gray-900 border-gray-700 text-white hover:bg-gray-700"
            onClick={handleLinkedInShare}
          >
            <Linkedin className="w-4 h-4 mr-2 text-blue-600" />
            Share on LinkedIn
          </Button>
          <Button
            variant="outline"
            className="w-full flex items-center justify-center py-3 bg-gray-900 border-gray-700 text-white hover:bg-gray-700"
            onClick={handleCopyLink}
          >
            <Link className="w-4 h-4 mr-2 text-gray-400" />
            Copy Link
          </Button>
        </div>
        <p className="mt-4 text-xs text-gray-400 text-center">
          Note: Direct links work best when deployed. Local links may not be accessible to others.
        </p>
      </div>
    </div>
  );
}
