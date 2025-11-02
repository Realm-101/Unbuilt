import React, { useState } from "react";
import { Download, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useTouchFriendly } from "@/hooks/useTouchFriendly";

export interface TemplateGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: number;
  resourceTitle: string;
  analysisId?: number;
  onGenerate?: (format: 'docx' | 'pdf' | 'gdocs') => Promise<void>;
}

/**
 * TemplateGenerationDialog Component
 * 
 * Dialog for generating and downloading templates with pre-filled data
 * 
 * Features:
 * - Show "Generate Template" button on template resources
 * - Display template preview with variables
 * - Show download options (DOCX, PDF, Google Docs)
 * - Track template generation events
 * 
 * Requirements: 2, 3, 4
 */
export const TemplateGenerationDialog: React.FC<TemplateGenerationDialogProps> = ({
  open,
  onOpenChange,
  resourceId,
  resourceTitle,
  analysisId,
  onGenerate,
}) => {
  const { isTouchDevice } = useTouchFriendly();
  const [selectedFormat, setSelectedFormat] = useState<'docx' | 'pdf' | 'gdocs'>('docx');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Format options
  const formatOptions = [
    {
      value: 'docx',
      label: 'Microsoft Word (.docx)',
      description: 'Editable document format',
      icon: FileText,
    },
    {
      value: 'pdf',
      label: 'PDF Document (.pdf)',
      description: 'Read-only, print-ready format',
      icon: FileText,
    },
    {
      value: 'gdocs',
      label: 'Google Docs (HTML)',
      description: 'Import into Google Docs',
      icon: FileText,
    },
  ] as const;

  // Handle template generation
  const handleGenerate = async () => {
    if (!analysisId) {
      setError('No analysis selected. Please select an analysis to generate a template.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedUrl(null);

    try {
      // Call API to generate template
      const response = await fetch(
        `/api/resources/${resourceId}/generate-template?analysisId=${analysisId}&format=${selectedFormat}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate template');
      }

      const data = await response.json();
      
      if (data.success && data.data.template) {
        setGeneratedUrl(data.data.template.url);
        
        // Call parent callback if provided
        if (onGenerate) {
          await onGenerate(selectedFormat);
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Template generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate template');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (generatedUrl) {
      window.open(generatedUrl, '_blank', 'noopener,noreferrer');
      
      // Close dialog after download
      setTimeout(() => {
        onOpenChange(false);
        // Reset state
        setGeneratedUrl(null);
        setError(null);
      }, 500);
    }
  };

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setGeneratedUrl(null);
      setError(null);
      setSelectedFormat('docx');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Generate Template</DialogTitle>
          <DialogDescription className="text-gray-400">
            Generate a pre-filled template using data from your analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template info */}
          <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-purple-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white mb-1">
                  {resourceTitle}
                </h4>
                <p className="text-xs text-gray-400">
                  This template will be pre-filled with information from your gap analysis
                </p>
              </div>
            </div>
          </div>

          {/* Format selection */}
          {!generatedUrl && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-white">
                Select Format
              </Label>
              <RadioGroup
                value={selectedFormat}
                onValueChange={(value) => setSelectedFormat(value as 'docx' | 'pdf' | 'gdocs')}
                className="space-y-2"
              >
                {formatOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      selectedFormat === option.value
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-700 hover:border-gray-600 bg-gray-800/30"
                    )}
                    onClick={() => setSelectedFormat(option.value)}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={option.value}
                        className="text-sm font-medium text-white cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Success message */}
          {generatedUrl && (
            <Alert className="border-green-500/30 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-400">
                Template generated successfully! Click the download button below to save it.
              </AlertDescription>
            </Alert>
          )}

          {/* Error message */}
          {error && (
            <Alert className="border-red-500/30 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Analysis requirement notice */}
          {!analysisId && !error && (
            <Alert className="border-yellow-500/30 bg-yellow-500/10">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-400">
                You need to have an active analysis to generate a template. Please run a gap analysis first.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className={cn(
              "w-full sm:w-auto",
              isTouchDevice && "min-h-[44px]"
            )}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          
          {generatedUrl ? (
            <Button
              onClick={handleDownload}
              className={cn(
                "w-full sm:w-auto bg-green-600 hover:bg-green-700",
                isTouchDevice && "min-h-[44px]"
              )}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !analysisId}
              className={cn(
                "w-full sm:w-auto bg-purple-600 hover:bg-purple-700",
                isTouchDevice && "min-h-[44px]"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Template
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
