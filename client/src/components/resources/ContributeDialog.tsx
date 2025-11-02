import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Validation schema matching backend
const contributionSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255, 'Title must be 255 characters or less'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  url: z.string().url('Must be a valid URL'),
  suggestedCategoryId: z.number().int().positive().optional(),
  suggestedTags: z.array(z.string()).optional().default([]),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

interface ContributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ResourceCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  children?: ResourceCategory[];
}

export function ContributeDialog({ open, onOpenChange }: ContributeDialogProps) {
  const { toast } = useToast();
  const [customTagInput, setCustomTagInput] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch categories for selection
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/resources/categories/tree'],
    enabled: open,
  });

  const categories = categoriesData?.categories || [];

  // Flatten categories for select dropdown
  const flattenCategories = (cats: ResourceCategory[], level = 0): Array<{ id: number; name: string; level: number }> => {
    const result: Array<{ id: number; name: string; level: number }> = [];
    for (const cat of cats) {
      result.push({ id: cat.id, name: cat.name, level });
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, level + 1));
      }
    }
    return result;
  };

  const flatCategories = flattenCategories(categories);

  const form = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      title: '',
      description: '',
      url: '',
      suggestedCategoryId: undefined,
      suggestedTags: [],
    },
  });

  const contributionMutation = useMutation({
    mutationFn: async (data: ContributionFormData) => {
      const response = await fetch('/api/resources/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit contribution');
      }

      return response.json();
    },
    onSuccess: () => {
      setShowSuccess(true);
      form.reset();
      
      // Close dialog after showing success message
      setTimeout(() => {
        setShowSuccess(false);
        onOpenChange(false);
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ContributionFormData) => {
    contributionMutation.mutate(data);
  };

  const handleAddTag = () => {
    const tag = customTagInput.trim();
    if (tag && !form.getValues('suggestedTags')?.includes(tag)) {
      const currentTags = form.getValues('suggestedTags') || [];
      form.setValue('suggestedTags', [...currentTags, tag]);
      setCustomTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues('suggestedTags') || [];
    form.setValue('suggestedTags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Success state
  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Contribution Submitted!</h3>
            <p className="text-muted-foreground">
              Thank you for contributing to our resource library. Your submission will be reviewed by our team.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contribute a Resource</DialogTitle>
          <DialogDescription>
            Share a valuable tool, template, or guide with the community. All submissions are reviewed before being added to the library.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Customer Interview Template"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A clear, descriptive title for the resource
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL *</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/resource"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The web address where the resource can be accessed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this resource is, what it helps with, and why it's valuable..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Explain what the resource is and how it can help (minimum 20 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="suggestedCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {flatCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          <span style={{ paddingLeft: `${cat.level * 12}px` }}>
                            {cat.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Help us categorize your resource
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Tags (Optional)</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                    disabled={!customTagInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                {form.watch('suggestedTags')?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.watch('suggestedTags')?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <FormDescription>
                Add relevant tags to help users find this resource
              </FormDescription>
            </FormItem>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={contributionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={contributionMutation.isPending}
              >
                {contributionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Contribution
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
