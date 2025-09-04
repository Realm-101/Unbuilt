import React, { useState, useEffect } from "react";
import { 
  MessageCircle, Send, ThumbsUp, Heart, Star, 
  Reply, MoreVertical, Share2, Clock, UserCircle 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: number;
  ideaId: number;
  userId: string;
  userEmail: string;
  content: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  isResolved: boolean;
  reactions: Record<string, string[]>;
  replies?: Comment[];
}

interface CommentsSectionProps {
  ideaId: number;
  ideaTitle?: string;
  onShareClick?: () => void;
}

export default function CommentsSection({ ideaId, ideaTitle, onShareClick }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  useEffect(() => {
    loadComments();
  }, [ideaId]);

  const loadComments = async () => {
    try {
      setIsLoadingComments(true);
      const response = await apiRequest("GET", `/api/ideas/${ideaId}/comments`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", `/api/ideas/${ideaId}/comments`, {
        content: newComment,
        parentId: null
      });
      const comment = await response.json();
      setComments(prev => [comment, ...prev]);
      setNewComment("");
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = async (parentId: number) => {
    if (!replyContent.trim()) return;

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", `/api/ideas/${ideaId}/comments`, {
        content: replyContent,
        parentId
      });
      const reply = await response.json();
      
      // Reload comments to get proper hierarchy
      await loadComments();
      setReplyingTo(null);
      setReplyContent("");
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReaction = async (commentId: number, reaction: string) => {
    try {
      const response = await apiRequest("POST", `/api/comments/${commentId}/reactions`, {
        reaction
      });
      const updated = await response.json();
      
      // Update the comment in state
      const updateComment = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return { ...comment, reactions: updated.reactions };
          }
          if (comment.replies) {
            return { ...comment, replies: updateComment(comment.replies) };
          }
          return comment;
        });
      };
      
      setComments(prev => updateComment(prev));
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const userId = (user as any)?.id?.toString() || (user as any)?.sub || "";
    const userReactions = Object.entries(comment.reactions || {})
      .filter(([_, users]) => (users as string[]).includes(userId))
      .map(([reaction]) => reaction);

    return (
      <div key={comment.id} className={`${isReply ? 'ml-12' : ''} mb-4`}>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <UserCircle className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-white font-medium">{comment.userEmail}</p>
                <p className="text-xs text-gray-400 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Delete</DropdownMenuItem>
                <DropdownMenuItem>Mark as resolved</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-gray-200 mb-3">{comment.content}</p>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className={`p-1 ${userReactions.includes('👍') ? 'text-purple-400' : 'text-gray-400'}`}
                onClick={() => toggleReaction(comment.id, '👍')}
              >
                <ThumbsUp className="w-4 h-4" />
                <span className="ml-1 text-xs">{comment.reactions['👍']?.length || 0}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`p-1 ${userReactions.includes('❤️') ? 'text-red-400' : 'text-gray-400'}`}
                onClick={() => toggleReaction(comment.id, '❤️')}
              >
                <Heart className="w-4 h-4" />
                <span className="ml-1 text-xs">{comment.reactions['❤️']?.length || 0}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`p-1 ${userReactions.includes('⭐') ? 'text-yellow-400' : 'text-gray-400'}`}
                onClick={() => toggleReaction(comment.id, '⭐')}
              >
                <Star className="w-4 h-4" />
                <span className="ml-1 text-xs">{comment.reactions['⭐']?.length || 0}</span>
              </Button>
            </div>

            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400"
                onClick={() => setReplyingTo(comment.id)}
              >
                <Reply className="w-4 h-4 mr-1" />
                Reply
              </Button>
            )}
          </div>

          {replyingTo === comment.id && (
            <div className="mt-3 flex space-x-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 bg-gray-900 border-gray-700 text-white"
                rows={2}
              />
              <div className="flex flex-col space-y-2">
                <Button
                  size="sm"
                  className="btn-flame"
                  onClick={() => handleReply(comment.id)}
                  disabled={isLoading}
                >
                  Send
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-700 text-gray-300"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="flame-card">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Discussion ({comments.length})
          </CardTitle>
          {onShareClick && (
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300"
              onClick={onShareClick}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Add new comment */}
        <div className="mb-6">
          <div className="flex space-x-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={`Share your thoughts about "${ideaTitle || 'this idea'}"...`}
              className="flex-1 bg-gray-800 border-gray-700 text-white"
              rows={3}
            />
            <Button
              className="btn-flame"
              onClick={handleAddComment}
              disabled={isLoading || !newComment.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Comments list */}
        <div className="space-y-4">
          {isLoadingComments ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.filter(c => !c.parentId).map(comment => renderComment(comment))
          )}
        </div>
      </CardContent>
    </Card>
  );
}