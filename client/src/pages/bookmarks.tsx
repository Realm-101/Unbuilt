import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Search, Filter, X, Edit2, Save, Trash2, ExternalLink, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookmarkButton } from "@/components/resources";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { UserBookmark, Resource } from "@shared/schema";

interface BookmarkWithResource extends UserBookmark {
  resource?: Resource & {
    category?: {
      id: number;
      name: string;
      icon?: string;
    };
    tags?: Array<{
      id: number;
      name: string;
    }>;
  };
}

/**
 * Bookmarks Page
 * 
 * Features:
 * - Display user's bookmarked resources
 * - Support filtering by category and tags
 * - Allow adding/editing notes
 * - Allow custom tagging
 * - Implement search within bookmarks
 * 
 * Requirements: 7
 */
export default function BookmarksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [editingBookmark, setEditingBookmark] = useState<BookmarkWithResource | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  // Fetch bookmarks
  const { data: bookmarksData, isLoading } = useQuery<{ bookmarks: BookmarkWithResource[] }>({
    queryKey: ["/api/resources/bookmarks"],
  });
  
  const bookmarks = bookmarksData?.bookmarks || [];
  
  // Extract unique categories and tags
  const categories = useMemo(() => {
    const cats = new Set<string>();
    bookmarks.forEach(b => {
      if (b.resource?.category?.name) {
        cats.add(b.resource.category.name);
      }
    });
    return Array.from(cats).sort();
  }, [bookmarks]);
  
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    bookmarks.forEach(b => {
      // Resource tags
      b.resource?.tags?.forEach(t => tags.add(t.name));
      // Custom tags
      if (Array.isArray(b.customTags)) {
        b.customTags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [bookmarks]);
  
  // Filter bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter(bookmark => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = bookmark.resource?.title.toLowerCase().includes(query);
        const matchesDescription = bookmark.resource?.description.toLowerCase().includes(query);
        const matchesNotes = bookmark.notes?.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesDescription && !matchesNotes) {
          return false;
        }
      }
      
      // Category filter
      if (selectedCategory !== "all") {
        if (bookmark.resource?.category?.name !== selectedCategory) {
          return false;
        }
      }
      
      // Tag filter
      if (selectedTag !== "all") {
        const resourceTags = bookmark.resource?.tags?.map(t => t.name) || [];
        const customTags = Array.isArray(bookmark.customTags) ? bookmark.customTags : [];
        const allBookmarkTags = [...resourceTags, ...customTags];
        
        if (!allBookmarkTags.includes(selectedTag)) {
          return false;
        }
      }
      
      return true;
    });
  }, [bookmarks, searchQuery, selectedCategory, selectedTag]);
  
  // Update bookmark mutation
  const updateBookmarkMutation = useMutation({
    mutationFn: async ({ id, notes, customTags }: { id: number; notes?: string; customTags?: string[] }) => {
      const response = await fetch(`/api/resources/bookmarks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes, customTags }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update bookmark");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources/bookmarks"] });
      toast({
        title: "Bookmark updated",
        description: "Your changes have been saved",
      });
      setEditingBookmark(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive",
      });
    },
  });
  
  // Delete bookmark mutation
  const deleteBookmarkMutation = useMutation({
    mutationFn: async (resourceId: number) => {
      const response = await fetch(`/api/resources/${resourceId}/bookmark`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete bookmark");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources/bookmarks"] });
      toast({
        title: "Bookmark removed",
        description: "Resource removed from your bookmarks",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive",
      });
    },
  });
  
  // Handle edit bookmark
  const handleEditBookmark = (bookmark: BookmarkWithResource) => {
    setEditingBookmark(bookmark);
    setEditNotes(bookmark.notes || "");
    setEditTags(Array.isArray(bookmark.customTags) ? bookmark.customTags : []);
  };
  
  // Handle save bookmark
  const handleSaveBookmark = () => {
    if (!editingBookmark) return;
    
    updateBookmarkMutation.mutate({
      id: editingBookmark.id,
      notes: editNotes,
      customTags: editTags,
    });
  };
  
  // Handle add tag
  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag("");
    }
  };
  
  // Handle remove tag
  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag));
  };
  
  // Handle delete bookmark
  const handleDeleteBookmark = async (resourceId: number) => {
    if (confirm("Are you sure you want to remove this bookmark?")) {
      deleteBookmarkMutation.mutate(resourceId);
    }
  };
  
  // Handle toggle bookmark (for BookmarkButton)
  const handleToggleBookmark = async (resourceId: number, isBookmarked: boolean) => {
    if (!isBookmarked) {
      // Remove bookmark
      await deleteBookmarkMutation.mutateAsync(resourceId);
    }
  };
  
  // Handle view resource
  const handleViewResource = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };
  
  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedTag("all");
  };
  
  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedTag !== "all";
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bookmark className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              My Bookmarks
            </h1>
          </div>
          <p className="text-gray-400">
            Manage your saved resources and add personal notes
          </p>
        </div>
        
        {/* Filters */}
        <Card className="mb-6 bg-gray-900/50 border-gray-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search bookmarks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              
              {/* Category filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Tag filter */}
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Active filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-4">
                <span className="text-sm text-gray-400">Active filters:</span>
                {searchQuery && (
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    Search: {searchQuery}
                  </Badge>
                )}
                {selectedCategory !== "all" && (
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Category: {selectedCategory}
                  </Badge>
                )}
                {selectedTag !== "all" && (
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                    Tag: {selectedTag}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Results count */}
        <div className="mb-4 text-sm text-gray-400">
          Showing {filteredBookmarks.length} of {bookmarks.length} bookmarks
        </div>
        
        {/* Bookmarks grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-gray-400">Loading bookmarks...</p>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="py-12 text-center">
              <Bookmark className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {bookmarks.length === 0 ? "No bookmarks yet" : "No matching bookmarks"}
              </h3>
              <p className="text-gray-400 mb-4">
                {bookmarks.length === 0 
                  ? "Start bookmarking resources to build your collection"
                  : "Try adjusting your filters or search query"
                }
              </p>
              {hasActiveFilters && (
                <Button onClick={handleClearFilters} variant="outline">
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredBookmarks.map(bookmark => (
              <Card 
                key={bookmark.id}
                className="bg-gray-900/50 border-gray-800 hover:border-purple-500/50 transition-all"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg text-white line-clamp-2">
                        {bookmark.resource?.title}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {bookmark.resource?.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <BookmarkButton
                        resourceId={bookmark.resourceId}
                        isBookmarked={true}
                        onToggle={handleToggleBookmark}
                        size="sm"
                      />
                    </div>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {bookmark.resource?.category && (
                      <Badge variant="outline" className="bg-gray-800/50 text-gray-400 border-gray-600">
                        {bookmark.resource.category.name}
                      </Badge>
                    )}
                    {bookmark.resource?.resourceType && (
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {bookmark.resource.resourceType}
                      </Badge>
                    )}
                    {bookmark.resource?.tags?.slice(0, 2).map(tag => (
                      <Badge key={tag.id} variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                        {tag.name}
                      </Badge>
                    ))}
                    {Array.isArray(bookmark.customTags) && bookmark.customTags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {/* Notes */}
                  {bookmark.notes && (
                    <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <p className="text-sm text-gray-300 italic">
                        "{bookmark.notes}"
                      </p>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bookmark.resource && handleViewResource(bookmark.resource.url)}
                      className="flex-1"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Resource
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditBookmark(bookmark)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBookmark(bookmark.resourceId)}
                      className="text-red-400 hover:text-red-300 hover:border-red-500/50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Edit bookmark dialog */}
        <Dialog open={!!editingBookmark} onOpenChange={(open) => !open && setEditingBookmark(null)}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Bookmark</DialogTitle>
              <DialogDescription className="text-gray-400">
                Add notes and custom tags to organize your bookmarks
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Resource title */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-1">Resource</h4>
                <p className="text-white">{editingBookmark?.resource?.title}</p>
              </div>
              
              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">
                  Personal Notes
                </label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add your thoughts, reminders, or context..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editNotes.length}/1000 characters
                </p>
              </div>
              
              {/* Custom tags */}
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">
                  Custom Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                    placeholder="Add a tag..."
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <Button onClick={handleAddTag} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editTags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="bg-purple-500/20 text-purple-400 border-purple-500/30"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 hover:text-purple-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingBookmark(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBookmark}
                disabled={updateBookmarkMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
