import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';

const resourceSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  url: z.string().url('Must be a valid URL'),
  resourceType: z.enum(['tool', 'template', 'guide', 'video', 'article']),
  categoryId: z.number().int().positive().optional(),
  phaseRelevance: z.array(z.enum(['research', 'validation', 'development', 'launch'])).optional(),
  ideaTypes: z.array(z.enum(['software', 'physical_product', 'service', 'marketplace'])).optional(),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedTimeMinutes: z.number().int().positive().optional(),
  isPremium: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

interface ResourceEditorProps {
  resourceId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Tag {
  id: number;
  name: string;
}

export function ResourceEditor({ resourceId, open, onOpenChange, onSuccess }: ResourceEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [metadataJson, setMetadataJson] = useState('{}');

  const isEditing = !!resourceId;

  // Fetch categories
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['resource-categories'],
    queryFn: async () => {
      const response = await fetch('/api/resources/categories', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const result = await response.json();
      return result.data;
    }
  });

  // Fetch tags
  const { data: tags } = useQuery<Tag[]>({
    queryKey: ['resource-tags'],
    queryFn: async () => {
      const response = await fetch('/api/resources/tags', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch tags');
      const result = await response.json();
      return result.data;
    }
  });

  // Fetch existing resource if editing
  const { data: existingResource } = useQuery({
    queryKey: ['resource', resourceId],
    queryFn: async () => {
      const response = await fetch(`/api/resources/${resourceId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch resource');
      const result = await response.json();
      return result.data;
    },
    enabled: isEditing && open
  });

  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: '',
      description: '',
      url: '',
      resourceType: 'tool',
      phaseRelevance: [],
      ideaTypes: [],
      isPremium: false,
      metadata: {}
    }
  });

  // Update form when existing resource loads
  useEffect(() => {
    if (existingResource) {
      form.reset({
        title: existingResource.title,
        description: existingResource.description,
        url: existingResource.url,
        resourceType: existingResource.resourceType,
        categoryId: existingResource.categoryId || undefined,
        phaseRelevance: existingResource.phaseRelevance || [],
        ideaTypes: existingResource.ideaTypes || [],
        difficultyLevel: existingResource.difficultyLevel || undefined,
        estimatedTimeMinutes: existingResource.estimatedTimeMinutes || undefined,
        isPremium: existingResource.isPremium || false,
        metadata: existingResource.metadata || {}
      });
      
      if (existingResource.tags) {
        setSelectedTags(existingResource.tags.map((t: Tag) => t.id));
      }
      
      setMetadataJson(JSON.stringify(existingResource.metadata || {}, null, 2));
    }
  }, [existingResource, form]);

  const createMutation = useMutation({
    mutationFn: async (data: ResourceFormData & { tagIds?: number[] }) => {
      const response = await fetch('/api/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create resource');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'resource-stats'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({
        title: 'Success',
        description: 'Resource created successfully'
      });
      onOpenChange(false);
      form.reset();
      setSelectedTags([]);
      setMetadataJson('{}');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ResourceFormData> & { tagIds?: number[] }) => {
      const response = await fetch(`/api/admin/resources/${resourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update resource');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'resource-stats'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource', resourceId] });
      toast({
        title: 'Success',
        description: 'Resource updated successfully'
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const onSubmit = (data: ResourceFormData) => {
    try {
      // Parse metadata JSON
      const metadata = JSON.parse(metadataJson);
      
      const payload = {
        ...data,
        metadata,
        tagIds: selectedTags
      };

      if (isEditing) {
        updateMutation.mutate(payload);
      } else {
        createMutation.mutate(payload);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Invalid metadata JSON',
        variant: 'destructive'
      });
    }
  };

  const phases = ['research', 'validation', 'development', 'launch'] as const;
  const ideaTypeOptions = ['software', 'physical_product', 'service', 'marketplace'] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Resource' : 'Create New Resource'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the resource details below'
              : 'Add a new resource to the library'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Resource title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the resource and its benefits"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="resourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tool">Tool</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                        <SelectItem value="guide">Guide</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="article">Article</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phaseRelevance"
              render={() => (
                <FormItem>
                  <FormLabel>Phase Relevance</FormLabel>
                  <FormDescription>
                    Select which phases this resource is relevant for
                  </FormDescription>
                  <div className="flex flex-wrap gap-2">
                    {phases.map((phase) => (
                      <FormField
                        key={phase}
                        control={form.control}
                        name="phaseRelevance"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(phase)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, phase]);
                                  } else {
                                    field.onChange(current.filter((p) => p !== phase));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal capitalize cursor-pointer">
                              {phase}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ideaTypes"
              render={() => (
                <FormItem>
                  <FormLabel>Idea Types</FormLabel>
                  <FormDescription>
                    Select which idea types this resource is suitable for
                  </FormDescription>
                  <div className="flex flex-wrap gap-2">
                    {ideaTypeOptions.map((type) => (
                      <FormField
                        key={type}
                        control={form.control}
                        name="ideaTypes"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(type)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, type]);
                                  } else {
                                    field.onChange(current.filter((t) => t !== type));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal capitalize cursor-pointer">
                              {type.replace('_', ' ')}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="difficultyLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedTimeMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Time (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormDescription>
                Select tags for this resource
              </FormDescription>
              <div className="flex flex-wrap gap-2">
                {tags?.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedTags((prev) =>
                        prev.includes(tag.id)
                          ? prev.filter((id) => id !== tag.id)
                          : [...prev, tag.id]
                      );
                    }}
                  >
                    {tag.name}
                    {selectedTags.includes(tag.id) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </FormItem>

            <FormField
              control={form.control}
              name="isPremium"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Premium resource (requires Pro/Enterprise plan)
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Metadata (JSON)</FormLabel>
              <FormDescription>
                Additional metadata in JSON format
              </FormDescription>
              <Textarea
                value={metadataJson}
                onChange={(e) => setMetadataJson(e.target.value)}
                placeholder='{"key": "value"}'
                rows={4}
                className="font-mono text-sm"
              />
            </FormItem>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Update' : 'Create'} Resource
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
