import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Download, Mail, FileText, Presentation, Database, Crown } from "lucide-react";
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
  const [isExporting, setIsExporting] = useState(false);

  const isPro = user?.plan === 'pro' || user?.plan === 'enterprise';

  const exportFormats = [
    {
      id: "pdf",
      name: "PDF Report",
      description: "Professional report with charts and analysis",
      icon: FileText,
      premium: false
    },
    {
      id: "csv", 
      name: "CSV Data",
      description: "Raw data for spreadsheet analysis",
      icon: Database,
      premium: false
    },
    {
      id: "pitch",
      name: "Investor Pitch Deck",
      description: "Ready-to-present PowerPoint with market analysis",
      icon: Presentation,
      premium: true
    },
    {
      id: "executive",
      name: "Executive Summary",
      description: "C-level focused strategic overview",
      icon: FileText,
      premium: true
    }
  ];

  const handleExport = async () => {
    if (!isPro && exportFormats.find(f => f.id === exportFormat)?.premium) {
      toast({
        title: "Pro Feature Required",
        description: "Upgrade to Pro to export premium formats",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await apiRequest("POST", "/api/export", {
        format: exportFormat,
        results: results.map(r => r.id),
        options: {
          includeDetails,
          customTitle: customTitle || "Market Gap Analysis Report",
          customIntro,
          branding: isPro
        }
      });

      if (exportFormat === "email") {
        toast({
          title: "Email Sent",
          description: `Report sent to ${emailRecipient}`,
        });
      } else {
        // Trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `market-analysis-${Date.now()}.${exportFormat === 'csv' ? 'csv' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Complete",
          description: "Your report has been downloaded",
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
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
          <div className="space-y-4">
            <Label className="text-base font-semibold">Customization</Label>
            
            <div>
              <Label htmlFor="title">Report Title</Label>
              <Input
                id="title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Market Gap Analysis Report"
              />
            </div>

            <div>
              <Label htmlFor="intro">Executive Summary</Label>
              <Textarea
                id="intro"
                value={customIntro}
                onChange={(e) => setCustomIntro(e.target.value)}
                placeholder="Add a custom introduction or executive summary..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="details"
                checked={includeDetails}
                onChange={(e) => setIncludeDetails(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="details">Include detailed analysis and recommendations</Label>
            </div>
          </div>

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

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-gray-500">
              {results.length} result{results.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
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