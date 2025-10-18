import { SearchResult } from '@shared/schema';
import { pdfGenerator, PDFOptions } from './pdf-generator';
import { excelGenerator, ExcelOptions } from './excel-generator';
import { pptxGenerator, PPTXOptions } from './pptx-generator';
import puppeteer from 'puppeteer';
// @ts-ignore - Optional dependency for email functionality
import nodemailer from 'nodemailer';

export type ExportFormat = 'pdf' | 'excel' | 'pptx' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  emailTo?: string;
  customization?: {
    companyName?: string;
    authorName?: string;
    theme?: string;
    includeCharts?: boolean;
    includeFormulas?: boolean;
  };
}

export interface ExportProgress {
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  downloadUrl?: string;
  error?: string;
}

export class ExportService {
  private progressTrackers: Map<string, ExportProgress> = new Map();

  async exportResults(
    results: SearchResult[],
    options: ExportOptions,
    exportId: string
  ): Promise<Buffer> {
    this.updateProgress(exportId, {
      status: 'processing',
      progress: 10,
      message: 'Preparing export...'
    });

    try {
      let buffer: Buffer;

      switch (options.format) {
        case 'pdf':
          buffer = await this.exportToPDF(results, options, exportId);
          break;
        case 'excel':
          buffer = await this.exportToExcel(results, options, exportId);
          break;
        case 'pptx':
          buffer = await this.exportToPPTX(results, options, exportId);
          break;
        case 'json':
          buffer = await this.exportToJSON(results, exportId);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      this.updateProgress(exportId, {
        status: 'complete',
        progress: 100,
        message: 'Export complete!'
      });

      // Send email if requested
      if (options.emailTo) {
        await this.sendEmailWithAttachment(
          options.emailTo,
          buffer,
          options.format,
          exportId
        );
      }

      return buffer;
    } catch (error) {
      this.updateProgress(exportId, {
        status: 'error',
        progress: 0,
        message: 'Export failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async exportToPDF(
    results: SearchResult[],
    options: ExportOptions,
    exportId: string
  ): Promise<Buffer> {
    this.updateProgress(exportId, {
      status: 'processing',
      progress: 30,
      message: 'Generating PDF...'
    });

    const pdfOptions: PDFOptions = {
      format: 'detailed',
      companyName: options.customization?.companyName,
      authorName: options.customization?.authorName,
      includeDetails: true
    };

    const html = pdfGenerator.generateHTML(results, pdfOptions);

    this.updateProgress(exportId, {
      status: 'processing',
      progress: 60,
      message: 'Rendering PDF...'
    });

    // Use puppeteer to convert HTML to PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private async exportToExcel(
    results: SearchResult[],
    options: ExportOptions,
    exportId: string
  ): Promise<Buffer> {
    this.updateProgress(exportId, {
      status: 'processing',
      progress: 40,
      message: 'Creating Excel workbook...'
    });

    const excelOptions: ExcelOptions = {
      includeCharts: options.customization?.includeCharts ?? true,
      includeFormulas: options.customization?.includeFormulas ?? true,
      companyName: options.customization?.companyName,
      authorName: options.customization?.authorName
    };

    const workbook = await excelGenerator.generateWorkbook(results, excelOptions);

    this.updateProgress(exportId, {
      status: 'processing',
      progress: 80,
      message: 'Finalizing Excel file...'
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async exportToPPTX(
    results: SearchResult[],
    options: ExportOptions,
    exportId: string
  ): Promise<Buffer> {
    this.updateProgress(exportId, {
      status: 'processing',
      progress: 40,
      message: 'Creating PowerPoint presentation...'
    });

    const pptxOptions: PPTXOptions = {
      theme: (options.customization?.theme as any) || 'professional',
      includeCharts: options.customization?.includeCharts ?? true,
      companyName: options.customization?.companyName,
      authorName: options.customization?.authorName
    };

    const presentation = await pptxGenerator.generatePresentation(results, pptxOptions);

    this.updateProgress(exportId, {
      status: 'processing',
      progress: 80,
      message: 'Finalizing PowerPoint file...'
    });

    const buffer = await presentation.write({ outputType: 'nodebuffer' });
    return buffer as Buffer;
  }

  private async exportToJSON(
    results: SearchResult[],
    exportId: string
  ): Promise<Buffer> {
    this.updateProgress(exportId, {
      status: 'processing',
      progress: 50,
      message: 'Formatting JSON...'
    });

    const jsonData = {
      exportDate: new Date().toISOString(),
      totalResults: results.length,
      results: results,
      metadata: {
        avgInnovationScore: results.reduce((acc, r) => acc + r.innovationScore, 0) / results.length,
        categories: [...new Set(results.map(r => r.category))],
        feasibilityDistribution: {
          high: results.filter(r => r.feasibility === 'high').length,
          medium: results.filter(r => r.feasibility === 'medium').length,
          low: results.filter(r => r.feasibility === 'low').length
        }
      }
    };

    return Buffer.from(JSON.stringify(jsonData, null, 2), 'utf-8');
  }

  private async sendEmailWithAttachment(
    emailTo: string,
    attachment: Buffer,
    format: ExportFormat,
    exportId: string
  ): Promise<void> {
    this.updateProgress(exportId, {
      status: 'processing',
      progress: 90,
      message: 'Sending email...'
    });

    // Configure email transporter (using environment variables)
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const fileExtensions = {
      pdf: 'pdf',
      excel: 'xlsx',
      pptx: 'pptx',
      json: 'json'
    };

    const fileName = `market-gap-analysis-${Date.now()}.${fileExtensions[format]}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@unbuilt.app',
      to: emailTo,
      subject: 'Your Market Gap Analysis Export',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F97316;">Your Export is Ready!</h2>
          <p>Your market gap analysis export has been generated successfully.</p>
          <p><strong>Format:</strong> ${format.toUpperCase()}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p>Please find your export attached to this email.</p>
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px;">
            This email was sent by UNBUILT - AI-Powered Market Gap Analysis Platform
          </p>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: attachment
        }
      ]
    });
  }

  getProgress(exportId: string): ExportProgress | undefined {
    return this.progressTrackers.get(exportId);
  }

  private updateProgress(exportId: string, progress: Partial<ExportProgress>) {
    const current = this.progressTrackers.get(exportId) || {
      status: 'pending' as const,
      progress: 0,
      message: ''
    };

    this.progressTrackers.set(exportId, {
      ...current,
      ...progress
    });
  }

  clearProgress(exportId: string) {
    this.progressTrackers.delete(exportId);
  }

  // Cleanup old progress trackers (call periodically)
  cleanupOldTrackers(maxAgeMs: number = 3600000) { // 1 hour default
    const now = Date.now();
    for (const [id, progress] of this.progressTrackers.entries()) {
      if (progress.status === 'complete' || progress.status === 'error') {
        // Remove completed/errored trackers older than maxAge
        this.progressTrackers.delete(id);
      }
    }
  }
}

export const exportService = new ExportService();
