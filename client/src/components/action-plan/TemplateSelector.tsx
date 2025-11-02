import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Check, Code, Package, Briefcase, Globe, ShoppingCart, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PlanTemplate } from '@shared/schema';

interface TemplateSelectorProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect: (templateId: number, templateName: string) => void;
  currentTemplateId?: number;
  onCancel?: () => void;
}

// Icon mapping for template categories
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  code: Code,
  package: Package,
  briefcase: Briefcase,
  globe: Globe,
  'shopping-cart': ShoppingCart,
  sparkles: Sparkles,
};

/**
 * TemplateSelector Component
 * 
 * Displays available plan templates with:
 * - Template cards with previews
 * - Category filtering
 * - Template selection handler
 * - Default template indication
 * 
 * Requirements: 3.1, 3.2, 3.5, 3.7
 */
export function TemplateSelector({ 
  open = true,
  onOpenChange,
  onSelect, 
  currentTemplateId,
  onCancel 
}: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    currentTemplateId || null
  );

  // Fetch templates
  const {
    data: templates,
    isLoading,
    error,
  } = useQuery<PlanTemplate[]>({
    queryKey: ['templates', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === 'all' 
        ? '/api/templates'
        : `/api/templates?category=${selectedCategory}`;
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const result = await response.json();
      return result.data;
    },
  });

  // Extract unique categories from templates
  const categories = React.useMemo(() => {
    if (!templates) return [];
    const uniqueCategories = Array.from(new Set(templates.map(t => t.category)));
    return uniqueCategories.sort();
  }, [templates]);

  // Handle template selection
  const handleSelectTemplate = (templateId: number) => {
    setSelectedTemplateId(templateId);
  };

  // Handle confirm selection
  const handleConfirm = () => {
    if (selectedTemplateId && templates) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        onSelect(selectedTemplateId, template.name);
      }
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else if (onCancel) {
      onCancel();
    }
  };

  // Get icon component for template
  const getTemplateIcon = (iconName: string | null) => {
    if (!iconName) return Sparkles;
    return categoryIcons[iconName] || Sparkles;
  };

  // Render template preview
  const renderTemplatePreview = (template: PlanTemplate) => {
    const phases = template.phases as any[];
    const Icon = getTemplateIcon(template.icon);
    const isSelected = selectedTemplateId === template.id;
    const isDefault = template.isDefault;

    return (
      <Card
        key={template.id}
        className={`
          flame-card cursor-pointer transition-all duration-200 hover:scale-[1.02]
          ${isSelected ? 'ring-2 ring-purple-500 border-purple-500' : ''}
        `}
        onClick={() => handleSelectTemplate(template.id)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`
                p-2 rounded-lg
                ${isSelected ? 'bg-purple-500/20' : 'bg-gray-800'}
              `}>
                <Icon className={`
                  w-6 h-6
                  ${isSelected ? 'text-purple-400' : 'text-gray-400'}
                `} />
              </div>
              <div>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  {template.name}
                  {isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm text-gray-400 mt-1">
                  {template.description}
                </CardDescription>
              </div>
            </div>
            {isSelected && (
              <div className="flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">
                Phases ({phases.length})
              </h4>
              <div className="space-y-2">
                {phases.slice(0, 3).map((phase: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2 text-sm"
                  >
                    <Badge variant="outline" className="text-xs">
                      {index + 1}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-gray-300 font-medium">{phase.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {phase.tasks?.length || 0} tasks
                        {phase.estimatedDuration && ` • ${phase.estimatedDuration}`}
                      </p>
                    </div>
                  </div>
                ))}
                {phases.length > 3 && (
                  <p className="text-xs text-gray-500 pl-8">
                    +{phases.length - 3} more phases
                  </p>
                )}
              </div>
            </div>
            
            {/* Key tasks preview */}
            {phases[0]?.tasks && phases[0].tasks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">
                  Sample Tasks
                </h4>
                <ul className="space-y-1">
                  {phases[0].tasks.slice(0, 2).map((task: any, index: number) => (
                    <li key={index} className="text-xs text-gray-400 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{task.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto" />
          <p className="text-gray-400">Loading templates...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load templates. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  // No templates found
  if (!templates || templates.length === 0) {
    return (
      <Alert>
        <AlertDescription className="text-white">
          No templates available at this time.
        </AlertDescription>
      </Alert>
    );
  }

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Choose a Template
        </h2>
        <p className="text-gray-400">
          Select a template optimized for your project type. You can customize it later.
        </p>
      </div>

      {/* Category Filters */}
      {categories.length > 1 && (
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="bg-gray-900/50">
            <TabsTrigger value="all">All Templates</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {category.replace('_', ' ')}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Templates Grid */}
      <ScrollArea className="h-[500px] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => renderTemplatePreview(template))}
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
        <div className="text-sm text-gray-400">
          {selectedTemplateId ? (
            <>
              Selected:{' '}
              <span className="text-white font-medium">
                {templates.find(t => t.id === selectedTemplateId)?.name}
              </span>
            </>
          ) : (
            'Select a template to continue'
          )}
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTemplateId}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Use Template
          </Button>
        </div>
      </div>
    </div>
  );
  
  // If open and onOpenChange are provided, wrap in Dialog
  if (onOpenChange !== undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flame-card max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">Choose a Template</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a template optimized for your project type. You can customize it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Category Filters */}
            {categories.length > 1 && (
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="bg-gray-900/50">
                  <TabsTrigger value="all">All Templates</TabsTrigger>
                  {categories.map((category) => (
                    <TabsTrigger key={category} value={category} className="capitalize">
                      {category.replace('_', ' ')}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {/* Templates Grid */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => renderTemplatePreview(template))}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
              <div className="text-sm text-gray-400">
                {selectedTemplateId ? (
                  <>
                    Selected:{' '}
                    <span className="text-white font-medium">
                      {templates.find(t => t.id === selectedTemplateId)?.name}
                    </span>
                  </>
                ) : (
                  'Select a template to continue'
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!selectedTemplateId}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Use Template
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Otherwise, render content directly
  return content;
}
