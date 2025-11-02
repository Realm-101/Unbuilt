/**
 * ConversationExportDialog Component
 * 
 * Dialog for exporting conversations in multiple formats.
 * Supports PDF, Markdown, and JSON formats with option to include/exclude conversation.
 * 
 * Requirements: 5.5
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, FileJson, FileCode, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConversationExportDialogProps {
  conversationId: number;
  trigger?: React.ReactNode;
}

type ExportFormat = 'pdf' | 'markdown' | 'json';

export function ConversationExportDialog({
  conversationId,
  trigger,
}: ConversationExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [includeConversation, setIncludeConversation] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const formatOptions = [
    {
      value: 'markdown',
      label: 'Markdown',
      description: 'Plain text format with formatting',
      icon: FileText,
    },
    {
      value: 'json',
      label: 'JSON',
      description: 'Structured data format',
      icon: FileJson,
    },
    {
      value: 'pdf',
      label: 'PDF',
      description: 'Portable document format (coming soon)',
      icon: FileCode,
      disabled: true,
    },
  ];

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          format,
          includeConversation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export conversation');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `conversation-export.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Get content
      const content = await response.text();

      // Create download link
      const blob = new Blob([content], { 
        type: response.headers.get('Content-Type') || 'text/plain' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `Conversation exported as ${format.toUpperCase()}`,
      });

      setOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export conversation';
      setError(errorMessage);
      toast({
        title: 'Export failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Conversation</DialogTitle>
          <DialogDescription>
            Choose a format and options for exporting your analysis and conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              {formatOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.value}
                    className={`flex items-start space-x-3 rounded-lg border p-4 ${
                      option.disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      disabled={option.disabled}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <Label
                          htmlFor={option.value}
                          className={`font-medium ${
                            option.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          {option.label}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Include Conversation Option */}
          <div className="flex items-start space-x-3 rounded-lg border p-4">
            <Checkbox
              id="include-conversation"
              checked={includeConversation}
              onCheckedChange={(checked) => setIncludeConversation(checked as boolean)}
            />
            <div className="flex-1">
              <Label
                htmlFor="include-conversation"
                className="font-medium cursor-pointer"
              >
                Include conversation history
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Export both the analysis and your conversation with the AI. Uncheck to export only
                the analysis results.
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info */}
          <Alert>
            <AlertDescription className="text-sm">
              The exported file will include your analysis results
              {includeConversation && ' and the complete conversation history'}.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
