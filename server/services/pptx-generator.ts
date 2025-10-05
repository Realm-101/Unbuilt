import pptxgen from 'pptxgenjs';
import { SearchResult } from '@shared/schema';

export interface PPTXOptions {
  theme?: 'professional' | 'modern' | 'minimal';
  includeCharts?: boolean;
  companyName?: string;
  authorName?: string;
}

export class PPTXGenerator {
  async generatePresentation(results: SearchResult[], options: PPTXOptions = {}): Promise<pptxgen> {
    const pptx = new pptxgen();
    
    // Set presentation properties
    pptx.author = options.authorName || 'UNBUILT';
    pptx.company = options.companyName || 'UNBUILT';
    pptx.title = 'Market Gap Analysis';
    pptx.subject = 'Innovation Opportunities';
    
    // Define theme colors
    const theme = this.getThemeColors(options.theme || 'professional');
    
    // Add slides
    this.addTitleSlide(pptx, theme, options);
    this.addExecutiveSummarySlide(pptx, results, theme);
    this.addKeyMetricsSlide(pptx, results, theme);
    
    // Add top opportunities (max 5)
    const topOpportunities = results
      .sort((a, b) => b.innovationScore - a.innovationScore)
      .slice(0, 5);
    
    topOpportunities.forEach((result, index) => {
      this.addOpportunitySlide(pptx, result, index + 1, theme);
    });
    
    this.addCategoryBreakdownSlide(pptx, results, theme);
    this.addCallToActionSlide(pptx, theme, options);
    
    return pptx;
  }

  private getThemeColors(theme: string) {
    const themes = {
      professional: {
        primary: 'F97316',
        secondary: '1F2937',
        accent: '3B82F6',
        background: 'FFFFFF',
        text: '111827',
        lightBg: 'F9FAFB'
      },
      modern: {
        primary: '8B5CF6',
        secondary: '06B6D4',
        accent: 'EC4899',
        background: 'FFFFFF',
        text: '0F172A',
        lightBg: 'F1F5F9'
      },
      minimal: {
        primary: '000000',
        secondary: '6B7280',
        accent: 'F59E0B',
        background: 'FFFFFF',
        text: '1F2937',
        lightBg: 'F3F4F6'
      }
    };
    
    return themes[theme as keyof typeof themes] || themes.professional;
  }

  private addTitleSlide(pptx: pptxgen, theme: any, options: PPTXOptions) {
    const slide = pptx.addSlide();
    
    // Background gradient
    slide.background = { fill: theme.background };
    
    // Add decorative shape
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: '100%',
      h: 1.5,
      fill: { color: theme.primary }
    });
    
    // Logo/Brand
    slide.addText('UNBUILT', {
      x: 0.5,
      y: 0.4,
      w: 9,
      h: 0.6,
      fontSize: 48,
      bold: true,
      color: 'FFFFFF',
      align: 'center'
    });
    
    // Title
    slide.addText('Market Gap Analysis', {
      x: 1,
      y: 2.5,
      w: 8,
      h: 1,
      fontSize: 44,
      bold: true,
      color: theme.text,
      align: 'center'
    });
    
    // Subtitle
    slide.addText('Innovation Opportunities Report', {
      x: 1,
      y: 3.6,
      w: 8,
      h: 0.5,
      fontSize: 24,
      color: theme.secondary,
      align: 'center'
    });
    
    // Date and author
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    slide.addText(date, {
      x: 1,
      y: 4.8,
      w: 8,
      h: 0.3,
      fontSize: 14,
      color: theme.secondary,
      align: 'center'
    });
    
    if (options.authorName) {
      slide.addText(`Prepared by: ${options.authorName}`, {
        x: 1,
        y: 5.2,
        w: 8,
        h: 0.3,
        fontSize: 14,
        color: theme.secondary,
        align: 'center'
      });
    }
  }

  private addExecutiveSummarySlide(pptx: pptxgen, results: SearchResult[], theme: any) {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.background };
    
    // Header
    this.addSlideHeader(slide, 'Executive Summary', theme);
    
    const stats = this.calculateStatistics(results);
    
    // Key findings
    const findings = [
      `Identified ${stats.totalOpportunities} market opportunities`,
      `Combined market size of ${stats.totalMarketSize}`,
      `Average innovation score: ${stats.avgInnovation}/10`,
      `${stats.highFeasibilityPct}% of opportunities have high feasibility`,
      `${stats.highPotentialPct}% show high market potential`
    ];
    
    slide.addText('Key Findings:', {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: theme.text
    });
    
    findings.forEach((finding, index) => {
      slide.addText(`• ${finding}`, {
        x: 0.8,
        y: 2.1 + (index * 0.5),
        w: 8.5,
        h: 0.4,
        fontSize: 16,
        color: theme.text
      });
    });
    
    // Bottom highlight box
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 5,
      w: 9,
      h: 0.8,
      fill: { color: theme.lightBg },
      line: { color: theme.primary, width: 2 }
    });
    
    slide.addText('These opportunities represent significant potential for innovation and market disruption', {
      x: 0.7,
      y: 5.2,
      w: 8.6,
      h: 0.4,
      fontSize: 14,
      color: theme.text,
      align: 'center',
      italic: true
    });
  }

  private addKeyMetricsSlide(pptx: pptxgen, results: SearchResult[], theme: any) {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.background };
    
    this.addSlideHeader(slide, 'Key Metrics', theme);
    
    const stats = this.calculateStatistics(results);
    
    // Create metric cards
    const metrics = [
      { label: 'Total Opportunities', value: stats.totalOpportunities.toString() },
      { label: 'Market Size', value: stats.totalMarketSize },
      { label: 'Avg Innovation', value: `${stats.avgInnovation}/10` },
      { label: 'High Feasibility', value: `${stats.highFeasibilityPct}%` }
    ];
    
    metrics.forEach((metric, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 0.5 + (col * 4.75);
      const y = 2 + (row * 2);
      
      // Card background
      slide.addShape(pptx.ShapeType.rect, {
        x,
        y,
        w: 4.25,
        h: 1.5,
        fill: { color: theme.lightBg },
        line: { color: theme.primary, width: 1 }
      });
      
      // Value
      slide.addText(metric.value, {
        x,
        y: y + 0.2,
        w: 4.25,
        h: 0.6,
        fontSize: 36,
        bold: true,
        color: theme.primary,
        align: 'center'
      });
      
      // Label
      slide.addText(metric.label, {
        x,
        y: y + 0.9,
        w: 4.25,
        h: 0.4,
        fontSize: 14,
        color: theme.secondary,
        align: 'center'
      });
    });
  }

  private addOpportunitySlide(pptx: pptxgen, result: SearchResult, index: number, theme: any) {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.background };
    
    this.addSlideHeader(slide, `Opportunity #${index}: ${result.title}`, theme);
    
    // Category badge
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 1.5,
      w: 2,
      h: 0.4,
      fill: { color: theme.accent },
      line: { width: 0 }
    });
    
    slide.addText(result.category, {
      x: 0.5,
      y: 1.55,
      w: 2,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: 'FFFFFF',
      align: 'center'
    });
    
    // Description
    slide.addText(result.description, {
      x: 0.5,
      y: 2.1,
      w: 9,
      h: 1.2,
      fontSize: 14,
      color: theme.text,
      valign: 'top'
    });
    
    // Metrics grid
    const metrics = [
      { label: 'Market Size', value: result.marketSize },
      { label: 'Feasibility', value: result.feasibility },
      { label: 'Market Potential', value: result.marketPotential },
      { label: 'Innovation Score', value: `${result.innovationScore}/10` }
    ];
    
    metrics.forEach((metric, idx) => {
      const x = 0.5 + (idx * 2.3);
      const y = 3.5;
      
      slide.addShape(pptx.ShapeType.rect, {
        x,
        y,
        w: 2.1,
        h: 1,
        fill: { color: theme.lightBg },
        line: { color: theme.secondary, width: 1 }
      });
      
      slide.addText(metric.value, {
        x,
        y: y + 0.15,
        w: 2.1,
        h: 0.4,
        fontSize: 18,
        bold: true,
        color: theme.primary,
        align: 'center'
      });
      
      slide.addText(metric.label, {
        x,
        y: y + 0.6,
        w: 2.1,
        h: 0.3,
        fontSize: 11,
        color: theme.secondary,
        align: 'center'
      });
    });
    
    // Gap reason
    slide.addText('Why This Gap Exists:', {
      x: 0.5,
      y: 4.8,
      w: 9,
      h: 0.3,
      fontSize: 14,
      bold: true,
      color: theme.text
    });
    
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 5.2,
      w: 9,
      h: 1,
      fill: { color: 'FEF3C7' },
      line: { color: 'F59E0B', width: 1 }
    });
    
    slide.addText(result.gapReason, {
      x: 0.7,
      y: 5.3,
      w: 8.6,
      h: 0.8,
      fontSize: 12,
      color: theme.text,
      valign: 'top'
    });
  }

  private addCategoryBreakdownSlide(pptx: pptxgen, results: SearchResult[], theme: any) {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.background };
    
    this.addSlideHeader(slide, 'Opportunities by Category', theme);
    
    // Calculate category distribution
    const categories: Record<string, number> = {};
    results.forEach(r => {
      categories[r.category] = (categories[r.category] || 0) + 1;
    });
    
    const categoryData = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Top 8 categories
    
    // Create bar chart data
    const chartData = categoryData.map(([category, count]) => ({
      name: category,
      labels: [category],
      values: [count]
    }));
    
    slide.addChart(pptx.ChartType.bar, chartData, {
      x: 1,
      y: 1.8,
      w: 8,
      h: 4,
      barDir: 'bar',
      chartColors: [theme.primary],
      showTitle: false,
      showLegend: false,
      valAxisMaxVal: Math.max(...categoryData.map(([, count]) => count)) + 2,
      catAxisLabelFontSize: 12,
      valAxisLabelFontSize: 12,
      dataLabelFontSize: 14,
      showValue: true
    });
  }

  private addCallToActionSlide(pptx: pptxgen, theme: any, options: PPTXOptions) {
    const slide = pptx.addSlide();
    
    // Full background with gradient effect
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      fill: { color: theme.primary }
    });
    
    // Main message
    slide.addText('Ready to Transform These Opportunities?', {
      x: 0.5,
      y: 2,
      w: 9,
      h: 1,
      fontSize: 36,
      bold: true,
      color: 'FFFFFF',
      align: 'center'
    });
    
    slide.addText('Let\'s turn market gaps into your competitive advantage', {
      x: 1,
      y: 3.2,
      w: 8,
      h: 0.6,
      fontSize: 20,
      color: 'FFFFFF',
      align: 'center'
    });
    
    // Contact box
    slide.addShape(pptx.ShapeType.rect, {
      x: 2.5,
      y: 4.5,
      w: 5,
      h: 1,
      fill: { color: 'FFFFFF' },
      line: { width: 0 }
    });
    
    slide.addText('Get Started with UNBUILT', {
      x: 2.5,
      y: 4.7,
      w: 5,
      h: 0.6,
      fontSize: 20,
      bold: true,
      color: theme.primary,
      align: 'center'
    });
    
    // Footer
    slide.addText('© ' + new Date().getFullYear() + ' UNBUILT. All rights reserved.', {
      x: 0,
      y: 6.8,
      w: 10,
      h: 0.3,
      fontSize: 10,
      color: 'FFFFFF',
      align: 'center'
    });
  }

  private addSlideHeader(slide: any, title: string, theme: any) {
    // Header bar
    slide.addShape('rect' as any, {
      x: 0,
      y: 0,
      w: '100%',
      h: 0.8,
      fill: { color: theme.primary }
    });
    
    // Title
    slide.addText(title, {
      x: 0.5,
      y: 0.2,
      w: 9,
      h: 0.4,
      fontSize: 24,
      bold: true,
      color: 'FFFFFF'
    });
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
      totalMarketSize: this.formatMarketSize(totalMarketSize)
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
}

export const pptxGenerator = new PPTXGenerator();
