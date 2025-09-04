import { SearchResult } from '@shared/schema';

export interface PDFOptions {
  format: 'executive' | 'pitch' | 'detailed';
  customTitle?: string;
  customIntro?: string;
  includeDetails?: boolean;
  companyName?: string;
  authorName?: string;
}

export class PDFGenerator {
  generateHTML(results: SearchResult[], options: PDFOptions): string {
    const title = options.customTitle || this.getDefaultTitle(options.format);
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Calculate statistics
    const stats = this.calculateStatistics(results);
    
    let html = this.getHTMLHeader(title, options.companyName);
    html += this.getReportHeader(title, date, options.authorName);
    
    if (options.customIntro) {
      html += this.getIntroSection(options.customIntro);
    }

    // Add format-specific content
    switch (options.format) {
      case 'executive':
        html += this.getExecutiveSummary(results, stats);
        html += this.getStrategicOpportunities(results);
        break;
      case 'pitch':
        html += this.getPitchIntro(stats);
        html += this.getTopOpportunities(results);
        html += this.getCallToAction();
        break;
      default:
        html += this.getDetailedAnalysis(results, stats);
    }

    html += this.getHTMLFooter();
    return html;
  }

  private getDefaultTitle(format: string): string {
    switch (format) {
      case 'executive':
        return 'Executive Market Gap Analysis Report';
      case 'pitch':
        return 'Innovation Opportunity Pitch Deck';
      default:
        return 'Market Gap Analysis Report';
    }
  }

  private calculateStatistics(results: SearchResult[]) {
    const avgInnovation = results.reduce((acc, r) => acc + r.innovationScore, 0) / results.length;
    const highFeasibility = results.filter(r => r.feasibility === 'high').length;
    const highPotential = results.filter(r => r.marketPotential === 'high').length;
    
    const totalMarketSize = results.reduce((acc, r) => {
      const size = this.parseMarketSize(r.marketSize);
      return acc + size;
    }, 0);

    return {
      totalOpportunities: results.length,
      avgInnovation: avgInnovation.toFixed(1),
      highFeasibility,
      highPotential,
      highFeasibilityPct: Math.round(highFeasibility / results.length * 100),
      highPotentialPct: Math.round(highPotential / results.length * 100),
      totalMarketSize: this.formatMarketSize(totalMarketSize),
      categories: this.categorizeResults(results)
    };
  }

  private parseMarketSize(marketSize: string): number {
    const match = marketSize.match(/\$?([\d.]+)([BMK])?/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2]?.toUpperCase();
    
    switch (unit) {
      case 'B': return value * 1000000000;
      case 'M': return value * 1000000;
      case 'K': return value * 1000;
      default: return value;
    }
  }

  private formatMarketSize(size: number): string {
    if (size >= 1000000000) {
      return `$${(size / 1000000000).toFixed(1)}B`;
    } else if (size >= 1000000) {
      return `$${(size / 1000000).toFixed(0)}M`;
    } else if (size >= 1000) {
      return `$${(size / 1000).toFixed(0)}K`;
    }
    return `$${size}`;
  }

  private categorizeResults(results: SearchResult[]) {
    const categories: Record<string, number> = {};
    results.forEach(r => {
      categories[r.category] = (categories[r.category] || 0) + 1;
    });
    return categories;
  }

  private getHTMLHeader(title: string, companyName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 40px;
            line-height: 1.6;
            color: #1f2937;
            background: #ffffff;
          }

          .report-header {
            text-align: center;
            margin-bottom: 50px;
            padding-bottom: 30px;
            border-bottom: 3px solid #f97316;
          }

          .logo {
            font-size: 32px;
            font-weight: 700;
            background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
          }

          .report-title {
            font-size: 28px;
            font-weight: 700;
            color: #111827;
            margin: 20px 0;
          }

          .report-meta {
            color: #6b7280;
            font-size: 14px;
          }

          .intro-section {
            background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
            padding: 25px;
            border-radius: 12px;
            margin: 30px 0;
            border-left: 4px solid #f97316;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }

          .stat-card {
            background: #f9fafb;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid #e5e7eb;
            transition: transform 0.2s;
          }

          .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          }

          .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: #f97316;
            display: block;
            margin-bottom: 5px;
          }

          .stat-label {
            font-size: 12px;
            text-transform: uppercase;
            color: #6b7280;
            font-weight: 600;
          }

          .opportunity-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 25px;
            margin: 20px 0;
            page-break-inside: avoid;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }

          .opportunity-title {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 10px;
          }

          .opportunity-category {
            display: inline-block;
            background: #f3f4f6;
            color: #6b7280;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 15px;
          }

          .opportunity-description {
            color: #4b5563;
            margin-bottom: 20px;
            line-height: 1.7;
          }

          .metrics-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 15px;
            margin: 20px 0;
          }

          .metric-item {
            background: #fafafa;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
          }

          .metric-label {
            font-size: 11px;
            text-transform: uppercase;
            color: #9ca3af;
            display: block;
            margin-bottom: 4px;
            font-weight: 600;
          }

          .metric-value {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
          }

          .high { color: #059669; }
          .medium { color: #d97706; }
          .low { color: #dc2626; }

          .gap-reason {
            background: #fffbeb;
            border: 1px solid #fcd34d;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
          }

          .gap-reason-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 5px;
            font-size: 14px;
          }

          .footer {
            text-align: center;
            margin-top: 60px;
            padding-top: 30px;
            border-top: 1px solid #e5e7eb;
            color: #9ca3af;
            font-size: 12px;
          }

          .page-break {
            page-break-after: always;
          }

          @media print {
            body { margin: 20px; padding: 0; }
            .opportunity-card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>`;
  }

  private getReportHeader(title: string, date: string, authorName?: string): string {
    return `
      <div class="report-header">
        <div class="logo">UNBUILT</div>
        <div class="report-title">${title}</div>
        <div class="report-meta">
          ${authorName ? `Prepared by: ${authorName}<br>` : ''}
          Generated: ${date}
        </div>
      </div>`;
  }

  private getIntroSection(intro: string): string {
    return `
      <div class="intro-section">
        <strong>Executive Summary</strong><br>
        ${intro}
      </div>`;
  }

  private getExecutiveSummary(results: SearchResult[], stats: any): string {
    let html = `
      <h2 style="color: #111827; margin-top: 40px;">Market Analysis Overview</h2>
      
      <div class="summary-grid">
        <div class="stat-card">
          <span class="stat-value">${stats.totalOpportunities}</span>
          <span class="stat-label">Total Opportunities</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${stats.totalMarketSize}</span>
          <span class="stat-label">Combined Market Size</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${stats.avgInnovation}/10</span>
          <span class="stat-label">Avg Innovation Score</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${stats.highFeasibilityPct}%</span>
          <span class="stat-label">High Feasibility</span>
        </div>
      </div>

      <h2 style="color: #111827; margin-top: 40px;">Strategic Opportunities</h2>`;

    results.forEach((result, index) => {
      html += this.getOpportunityCard(result, index + 1);
    });

    return html;
  }

  private getStrategicOpportunities(results: SearchResult[]): string {
    // Group by category
    const byCategory: Record<string, SearchResult[]> = {};
    results.forEach(r => {
      if (!byCategory[r.category]) byCategory[r.category] = [];
      byCategory[r.category].push(r);
    });

    let html = '<div class="page-break"></div><h2>Opportunities by Category</h2>';
    
    for (const [category, items] of Object.entries(byCategory)) {
      html += `<h3 style="color: #374151; margin-top: 30px;">${category}</h3>`;
      items.forEach(item => {
        html += `<div style="margin-left: 20px; margin-bottom: 10px;">
          <strong>${item.title}</strong> - ${item.marketSize}
          <span class="${item.feasibility}" style="margin-left: 10px;">
            ${item.feasibility} feasibility
          </span>
        </div>`;
      });
    }

    return html;
  }

  private getPitchIntro(stats: any): string {
    return `
      <div style="text-align: center; margin: 50px 0;">
        <h1 style="font-size: 36px; color: #111827; margin-bottom: 20px;">
          ${stats.totalMarketSize} Market Opportunity
        </h1>
        <p style="font-size: 20px; color: #6b7280;">
          ${stats.totalOpportunities} untapped opportunities identified<br>
          with ${stats.highPotentialPct}% showing high market potential
        </p>
      </div>`;
  }

  private getTopOpportunities(results: SearchResult[]): string {
    const top = results
      .sort((a, b) => b.innovationScore - a.innovationScore)
      .slice(0, 3);

    let html = '<h2 style="text-align: center; margin-top: 40px;">Top Innovation Opportunities</h2>';
    
    top.forEach((result, index) => {
      html += this.getOpportunityCard(result, index + 1, true);
    });

    return html;
  }

  private getCallToAction(): string {
    return `
      <div style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); 
                  color: white; padding: 40px; border-radius: 12px; 
                  text-align: center; margin-top: 50px;">
        <h2 style="color: white; margin-bottom: 20px;">Ready to Innovate?</h2>
        <p style="font-size: 18px; margin-bottom: 30px;">
          Transform these market gaps into your next successful venture
        </p>
        <div style="background: white; color: #f97316; padding: 15px 30px; 
                    display: inline-block; border-radius: 8px; font-weight: 600;">
          Let's Build the Future Together
        </div>
      </div>`;
  }

  private getDetailedAnalysis(results: SearchResult[], stats: any): string {
    let html = this.getExecutiveSummary(results, stats);
    html += this.getStrategicOpportunities(results);
    return html;
  }

  private getOpportunityCard(result: SearchResult, index: number, highlight = false): string {
    const style = highlight ? 'border: 2px solid #f97316;' : '';
    
    return `
      <div class="opportunity-card" style="${style}">
        <div class="opportunity-title">
          ${index}. ${result.title}
        </div>
        <span class="opportunity-category">${result.category}</span>
        
        <div class="opportunity-description">
          ${result.description}
        </div>
        
        <div class="metrics-row">
          <div class="metric-item">
            <span class="metric-label">Market Size</span>
            <span class="metric-value">${result.marketSize}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Feasibility</span>
            <span class="metric-value ${result.feasibility}">${result.feasibility}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Market Potential</span>
            <span class="metric-value ${result.marketPotential}">${result.marketPotential}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Innovation</span>
            <span class="metric-value">${result.innovationScore}/10</span>
          </div>
        </div>
        
        <div class="gap-reason">
          <div class="gap-reason-title">Why This Gap Exists:</div>
          ${result.gapReason}
        </div>
      </div>`;
  }

  private getHTMLFooter(): string {
    return `
        <div class="footer">
          <p>Generated by UNBUILT - AI-Powered Market Gap Analysis Platform</p>
          <p>© ${new Date().getFullYear()} UNBUILT. All rights reserved.</p>
        </div>
      </body>
      </html>`;
  }
}

export const pdfGenerator = new PDFGenerator();