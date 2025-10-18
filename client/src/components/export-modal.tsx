import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Download, Mail, FileText, Presentation, Database, Crown, FileSpreadsheet, FileJson } from "lucide-react";
import { SearchResult } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ExportModalProps {
  isOpen: boolean;
  results: SearchResult[];
  onClose: () => void;
}

export default function ExportModal({ isOpen, results, onClose }: ExportModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState("pdf");
  const [includeDetails, setIncludeDetails] = useState(true);
  const [customTitle, setCustomTitle] = useState("");
  const [customIntro, setCustomIntro] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [authorName, setAuthorName] = useState(user?.name || user?.email || "");
  const [theme, setTheme] = useState("professional");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState("");
  const [exportId, setExportId] = useState<string | null>(null);

  const isPro = user?.plan === 'pro' || user?.plan === 'enterprise';

  // Poll for export progress
  useEffect(() => {
    if (!exportId || !isExporting) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await apiRequest("GET", `/api/export/progress/${exportId}`);
        const data = await response.json();
        
        setExportProgress(data.progress);
        setExportMessage(data.message);

        if (data.status === 'complete' || data.status === 'error') {
          clearInterval(pollInterval);
          setIsExporting(false);
          
          if (data.status === 'error') {
            toast({
              title: "Export Failed",
              description: data.error || "Failed to generate export",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        clearInterval(pollInterval);
        setIsExporting(false);
      }
    }, 500);

    return () => clearInterval(pollInterval);
  }, [exportId, isExporting, toast]);

  const exportFormats = [
    {
      id: "pdf",
      name: "PDF Report",
      description: "Professional report with charts and analysis",
      icon: FileText,
      premium: false,
      extension: "pdf"
    },
    {
      id: "excel",
      name: "Excel Workbook",
      description: "Structured data with multiple sheets and formulas",
      icon: FileSpreadsheet,
      premium: false,
      extension: "xlsx"
    },
    {
      id: "pptx",
      name: "PowerPoint Presentation",
      description: "Ready-to-present slides with key insights",
      icon: Presentation,
      premium: true,
      extension: "pptx"
    },
    {
      id: "json",
      name: "JSON Data",
      description: "Raw structured data for API integration",
      icon: FileJson,
      premium: false,
      extension: "json"
    }
  ];

  const handleExport = async () => {
    const selectedFormat = exportFormats.find(f => f.id === exportFormat);
    
    if (!isPro && selectedFormat?.premium) {
      toast({
        title: "Pro Feature Required",
        description: "Upgrade to Pro to export premium formats",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportMessage("Preparing export...");
    
    // Generate unique export ID
    const newExportId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setExportId(newExportId);

    try {
      const response = await apiRequest("POST", "/api/export", {
        exportId: newExportId,
        format: exportFormat,
        results: results,
        options: {
          customization: {
            companyName: companyName || undefined,
            authorName: authorName || undefined,
            theme: theme,
            includeCharts: true,
            includeFormulas: true
          },
          emailTo: emailRecipient || undefined
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `market-analysis-${Date.now()}.${selectedFormat?.extension || 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Complete",
        description: emailRecipient 
          ? `Report downloaded and sent to ${emailRecipient}`
          : "Your report has been downloaded",
      });
      
      // Reset and close after a short delay
      setTimeout(() => {
        setExportProgress(0);
        setExportMessage("");
        setExportId(null);
        onClose();
      }, 1000);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
      setIsExporting(false);
      setExportProgress(0);
      setExportMessage("");
      setExportId(null);
    }
  };

  const handleSendEmail = async () => {
    if (!emailRecipient) {
      toast({
        title: "Email Required",
        description: "Please enter a recipient email address",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      await apiRequest("POST", "/api/send-report", {
        email: emailRecipient,
        results: results.map(r => r.id),
        options: {
          includeDetails,
          customTitle: customTitle || "Market Gap Analysis Report",
          customIntro
        }
      });

      toast({
        title: "Email Sent",
        description: `Report sent to ${emailRecipient}`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-card-foreground">
            <Download className="w-5 h-5" />
            <span>Export Results</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Export {results.length} results as a professional report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={setExportFormat}>
              <div className="space-y-3">
                {exportFormats.map((format) => (
                  <div key={format.id} className="flex items-center space-x-3">
                    <RadioGroupItem 
                      value={format.id} 
                      id={format.id}
                      disabled={format.premium && !isPro}
                    />
                    <Label 
                      htmlFor={format.id} 
                      className={`flex-1 cursor-pointer ${format.premium && !isPro ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center space-x-3">
                          <format.icon className="w-5 h-5" />
                          <div>
                            <div className="font-medium flex items-center space-x-2">
                              <span>{format.name}</span>
                              {format.premium && <Crown className="w-4 h-4 text-yellow-500" />}
                            </div>
                            <div className="text-sm text-muted-foreground">{format.description}</div>
                          </div>
                        </div>
                        {format.premium && !isPro && (
                          <Badge className="bg-yellow-100 text-yellow-800">Pro</Badge>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Customization Options */}
          {isPro && (
            <>
              <Separator />
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span>Pro Customization</span>
                </Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your Company"
                    />
                  </div>

                  <div>
                    <Label htmlFor="authorName">Author Name</Label>
                    <Input
                      id="authorName"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Your Name"
                    />
                  </div>
                </div>

                {exportFormat === 'pptx' && (
                  <div>
                    <Label htmlFor="theme">Presentation Theme</Label>
                    <RadioGroup value={theme} onValueChange={setTheme}>
                      <div className="flex space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="professional" id="professional" />
                          <Label htmlFor="professional">Professional</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="modern" id="modern" />
                          <Label htmlFor="modern">Modern</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="minimal" id="minimal" />
                          <Label htmlFor="minimal">Minimal</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Email Option */}
          <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>Email Report</span>
            </Label>
            
            <div className="flex space-x-2">
              <Input
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="recipient@company.com"
                type="email"
              />
              <Button 
                onClick={handleSendEmail} 
                disabled={isExporting || !emailRecipient}
                variant="outline"
              >
                <Mail className="w-4 h-4 mr-1" />
                Send
              </Button>
            </div>
          </div>

          {/* Progress Indicator */}
          {isExporting && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{exportMessage}</span>
                  <span className="font-medium">{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} className="h-2" />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-gray-500">
              {results.length} result{results.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose} disabled={isExporting}>
                Cancel
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="min-w-[120px]"
              >
                {isExporting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </div>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}