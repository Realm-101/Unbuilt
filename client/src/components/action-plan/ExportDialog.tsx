import React, { useState } from 'react';
import { Download, FileText, FileJson, FileCode, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ActionPlan } from '@shared/schema';

/**
 * Export format type
 * Supports CSV, JSON, Markdown, and future integrations (Trello, Asana)
 */
export type ExportFormat = 'csv' | 'json' | 'markdown' | 'trello' | 'asana';

/**
 * Export status type
 */
type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

interface ExportDialogProps {
  /** Action plan to export */
  plan: ActionPlan | null;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
}

/**
 * ExportDialog Component
 * 
 * Modal dialog for exporting action plans with:
 * - Format selection (CSV, JSON, Markdown, Trello, Asana)
 * - Option to include/exclude completed tasks
 * - Export progress indicator
 * - Download link when ready
 * - Error handling
 * 
 * Requirements: 7.1, 7.7
 */
export function ExportDialog({
  plan,
  open,
  onOpenChange,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [includeSkipped, setIncludeSkipped] = useState(true);
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setStatus('idle');
      setProgress(0);
      setDownloadUrl(null);
      setError(null);
    }
  }, [open]);

  // Format metadata
  const formatInfo: Record<ExportFormat, { icon: React.ReactNode; label: string; description: string; available: boolean }> = {
    csv: {
      icon: <FileText className="h-4 w-4" />,
      label: 'CSV',
      description: 'Spreadsheet format for Excel, Google Sheets',
      available: true,
    },
    json: {
      icon: <FileJson className="h-4 w-4" />,
      label: 'JSON',
      description: 'Structured data format for developers',
      available: true,
    },
    markdown: {
      icon: <FileCode className="h-4 w-4" />,
      label: 'Markdown',
      description: 'Checklist format for GitHub, Notion, Obsidian',
      available: true,
    },
    trello: {
      icon: <FileText className="h-4 w-4" />,
      label: 'Trello',
      description: 'Export to Trello board (Coming Soon)',
      available: false,
    },
    asana: {
      icon: <FileText className="h-4 w-4" />,
      label: 'Asana',
      description: 'Export to Asana project (Coming Soon)',
      available: false,
    },
  };

  // Handle export
  const handleExport = async () => {
    if (!plan) {
      toast({
        title: 'Export failed',
        description: 'No plan available to export',
        variant: 'destructive',
      });
      return;
    }

    // Check if format is available
    if (!formatInfo[format].available) {
      toast({
        title: 'Format not available',
        description: `${formatInfo[format].label} export is coming soon`,
        variant: 'destructive',
      });
      return;
    }

    setStatus('exporting');
    setProgress(10);
    setError(null);
    setDownloadUrl(null);

    try {
      // Simulate progress
      setProgress(30);

      // Make export request
      const response = await apiRequest('POST', `/api/plans/${plan.id}/export`, {
        format,
        includeCompleted,
        includeSkipped,
      });

      setProgress(60);

      // Check if response is successful
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      setProgress(80);

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download URL
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);

      setProgress(100);
      setStatus('success');

      // Show success toast
      toast({
        title: 'Export successful',
        description: `Your action plan has been exported as ${formatInfo[format].label}`,
      });

      // Auto-download the file
      const filename = getFilename(plan, format);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      setStatus('error');
      setProgress(0);
      
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);

      toast({
        title: 'Export failed',
        description: errorMessage,
        variant: 'destructive',
      });

      console.error('Export error:', err);
    }
  };

  // Generate filename
  const getFilename = (plan: ActionPlan, format: ExportFormat): string => {
    const sanitizedTitle = plan.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

    const timestamp = new Date().toISOString().split('T')[0];
    const extension = format === 'markdown' ? 'md' : format;

    return `action-plan-${sanitizedTitle}-${timestamp}.${extension}`;
  };

  // Handle close
  const handleClose = () => {
    // Clean up download URL
    if (downloadUrl) {
      window.URL.revokeObjectURL(downloadUrl);
    }
    onOpenChange(false);
  };

  // Handle download again
  const handleDownloadAgain = () => {
    if (!downloadUrl || !plan) return;

    const filename = getFilename(plan, format);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Download started',
      description: 'Your file is being downloaded',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[500px]"
        data-testid="export-dialog"
      >
        <DialogHeader>
          <DialogTitle data-testid="export-dialog-title">
            Export Action Plan
          </DialogTitle>
          <DialogDescription>
            Choose a format and options for exporting your action plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="export-format">Export Format</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
              disabled={status === 'exporting'}
            >
              <SelectTrigger 
                id="export-format"
                data-testid="export-format-select"
              >
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(formatInfo).map(([key, info]) => (
                  <SelectItem 
                    key={key} 
                    value={key}
                    disabled={!info.available}
                    data-testid={`export-format-${key}`}
                  >
                    <div className="flex items-center gap-2">
                      {info.icon}
                      <div className="flex flex-col">
                        <span className="font-medium">{info.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {info.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Export Options</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-completed"
                checked={includeCompleted}
                onCheckedChange={(checked) => setIncludeCompleted(checked as boolean)}
                disabled={status === 'exporting'}
                data-testid="include-completed-checkbox"
              />
              <label
                htmlFor="include-completed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Include completed tasks
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-skipped"
                checked={includeSkipped}
                onCheckedChange={(checked) => setIncludeSkipped(checked as boolean)}
                disabled={status === 'exporting'}
                data-testid="include-skipped-checkbox"
              />
              <label
                htmlFor="include-skipped"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Include skipped tasks
              </label>
            </div>
          </div>

          {/* Progress Indicator */}
          {status === 'exporting' && (
            <div className="space-y-2" data-testid="export-progress">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Exporting...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Success Message */}
          {status === 'success' && (
            <Alert data-testid="export-success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Export completed successfully! Your file has been downloaded.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {status === 'error' && error && (
            <Alert variant="destructive" data-testid="export-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={status === 'exporting'}
            data-testid="export-dialog-cancel"
          >
            {status === 'success' ? 'Close' : 'Cancel'}
          </Button>

          {status === 'success' && downloadUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadAgain}
              data-testid="export-download-again"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Again
            </Button>
          )}

          {status !== 'success' && (
            <Button
              type="button"
              onClick={handleExport}
              disabled={status === 'exporting' || !plan}
              data-testid="export-dialog-export"
            >
              {status === 'exporting' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
