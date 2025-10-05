import ExcelJS from 'exceljs';
import { SearchResult } from '@shared/schema';

export interface ExcelOptions {
  includeCharts?: boolean;
  includeFormulas?: boolean;
  companyName?: string;
  authorName?: string;
}

export class ExcelGenerator {
  async generateWorkbook(results: SearchResult[], options: ExcelOptions = {}): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = options.authorName || 'UNBUILT';
    workbook.created = new Date();
    workbook.company = options.companyName || 'UNBUILT';
    
    // Add sheets
    this.addSummarySheet(workbook, results, options);
    this.addOpportunitiesSheet(workbook, results, options);
    this.addCategoryAnalysisSheet(workbook, results, options);
    this.addMetricsSheet(workbook, results, options);
    
    return workbook;
  }

  private addSummarySheet(workbook: ExcelJS.Workbook, results: SearchResult[], options: ExcelOptions) {
    const sheet = workbook.addWorksheet('Summary', {
      properties: { tabColor: { argb: 'FFF97316' } }
    });
    
    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Market Gap Analysis Report';
    titleCell.font = { size: 20, bold: true, color: { argb: 'FF111827' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 40;
    
    // Metadata
    sheet.getCell('A3').value = 'Generated:';
    sheet.getCell('B3').value = new Date().toLocaleDateString();
    sheet.getCell('A4').value = 'Total Opportunities:';
    sheet.getCell('B4').value = results.length;
    
    if (options.authorName) {
      sheet.getCell('A5').value = 'Prepared by:';
      sheet.getCell('B5').value = options.authorName;
    }
    
    // Key Metrics
    sheet.getCell('A7').value = 'Key Metrics';
    sheet.getCell('A7').font = { size: 14, bold: true };
    
    const stats = this.calculateStatistics(results);
    
    const metricsData = [
      ['Metric', 'Value'],
      ['Total Opportunities', results.length],
      ['Average Innovation Score', stats.avgInnovation],
      ['High Feasibility Count', stats.highFeasibility],
      ['High Potential Count', stats.highPotential],
      ['Combined Market Size', stats.totalMarketSize],
    ];
    
    sheet.addTable({
      name: 'KeyMetrics',
      ref: 'A8',
      headerRow: true,
      style: {
        theme: 'TableStyleMedium2',
        showRowStripes: true,
      },
      columns: [
        { name: 'Metric', filterButton: false },
        { name: 'Value', filterButton: false },
      ],
      rows: metricsData.slice(1),
    });
    
    // Category Breakdown
    sheet.getCell('D7').value = 'Category Breakdown';
    sheet.getCell('D7').font = { size: 14, bold: true };
    
    const categoryData = Object.entries(stats.categories).map(([category, count]) => [category, count]);
    
    sheet.addTable({
      name: 'CategoryBreakdown',
      ref: 'D8',
      headerRow: true,
      style: {
        theme: 'TableStyleMedium2',
        showRowStripes: true,
      },
      columns: [
        { name: 'Category', filterButton: false },
        { name: 'Count', filterButton: false },
      ],
      rows: categoryData,
    });
    
    // Column widths
    sheet.getColumn('A').width = 25;
    sheet.getColumn('B').width = 20;
    sheet.getColumn('D').width = 25;
    sheet.getColumn('E').width = 15;
  }

  private addOpportunitiesSheet(workbook: ExcelJS.Workbook, results: SearchResult[], options: ExcelOptions) {
    const sheet = workbook.addWorksheet('Opportunities', {
      properties: { tabColor: { argb: 'FF3B82F6' } }
    });
    
    // Headers
    const headers = [
      'Rank',
      'Title',
      'Category',
      'Description',
      'Market Size',
      'Feasibility',
      'Market Potential',
      'Innovation Score',
      'Gap Reason'
    ];
    
    sheet.addRow(headers);
    
    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' }
    };
    headerRow.height = 25;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add data rows
    results.forEach((result, index) => {
      const row = sheet.addRow([
        index + 1,
        result.title,
        result.category,
        result.description,
        result.marketSize,
        result.feasibility,
        result.marketPotential,
        result.innovationScore,
        result.gapReason
      ]);
      
      // Color code feasibility
      const feasibilityCell = row.getCell(6);
      feasibilityCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: this.getFeasibilityColor(result.feasibility) }
      };
      
      // Color code market potential
      const potentialCell = row.getCell(7);
      potentialCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: this.getPotentialColor(result.marketPotential) }
      };
      
      // Format innovation score
      const scoreCell = row.getCell(8);
      scoreCell.numFmt = '0.0';
      if (result.innovationScore >= 8) {
        scoreCell.font = { bold: true, color: { argb: 'FF059669' } };
      }
    });
    
    // Add filters
    sheet.autoFilter = {
      from: 'A1',
      to: `I${results.length + 1}`
    };
    
    // Column widths
    sheet.getColumn(1).width = 8;  // Rank
    sheet.getColumn(2).width = 35; // Title
    sheet.getColumn(3).width = 20; // Category
    sheet.getColumn(4).width = 50; // Description
    sheet.getColumn(5).width = 15; // Market Size
    sheet.getColumn(6).width = 15; // Feasibility
    sheet.getColumn(7).width = 18; // Market Potential
    sheet.getColumn(8).width = 18; // Innovation Score
    sheet.getColumn(9).width = 50; // Gap Reason
    
    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  private addCategoryAnalysisSheet(workbook: ExcelJS.Workbook, results: SearchResult[], options: ExcelOptions) {
    const sheet = workbook.addWorksheet('Category Analysis', {
      properties: { tabColor: { argb: 'FF10B981' } }
    });
    
    // Group by category
    const byCategory: Record<string, SearchResult[]> = {};
    results.forEach(r => {
      if (!byCategory[r.category]) byCategory[r.category] = [];
      byCategory[r.category].push(r);
    });
    
    // Headers
    sheet.addRow(['Category', 'Count', 'Avg Innovation', 'High Feasibility %', 'Total Market Size']);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' }
    };
    headerRow.height = 25;
    
    // Add category data
    let rowIndex = 2;
    for (const [category, items] of Object.entries(byCategory)) {
      const avgInnovation = items.reduce((acc, r) => acc + r.innovationScore, 0) / items.length;
      const highFeasibility = items.filter(r => r.feasibility === 'high').length;
      const highFeasibilityPct = (highFeasibility / items.length) * 100;
      const totalMarketSize = items.reduce((acc, r) => acc + this.parseMarketSize(r.marketSize), 0);
      
      const row = sheet.addRow([
        category,
        items.length,
        avgInnovation,
        highFeasibilityPct,
        this.formatMarketSize(totalMarketSize)
      ]);
      
      // Format numbers
      row.getCell(3).numFmt = '0.0';
      row.getCell(4).numFmt = '0.0"%"';
      
      rowIndex++;
    }
    
    // Column widths
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 12;
    sheet.getColumn(3).width = 18;
    sheet.getColumn(4).width = 20;
    sheet.getColumn(5).width = 20;
    
    // Add formulas if enabled
    if (options.includeFormulas) {
      const totalRow = sheet.addRow([
        'TOTAL',
        { formula: `SUM(B2:B${rowIndex})` },
        { formula: `AVERAGE(C2:C${rowIndex})` },
        { formula: `AVERAGE(D2:D${rowIndex})` },
        ''
      ]);
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };
    }
  }

  private addMetricsSheet(workbook: ExcelJS.Workbook, results: SearchResult[], options: ExcelOptions) {
    const sheet = workbook.addWorksheet('Detailed Metrics', {
      properties: { tabColor: { argb: 'FFEF4444' } }
    });
    
    // Feasibility Distribution
    sheet.getCell('A1').value = 'Feasibility Distribution';
    sheet.getCell('A1').font = { size: 14, bold: true };
    
    const feasibilityCount = {
      high: results.filter(r => r.feasibility === 'high').length,
      medium: results.filter(r => r.feasibility === 'medium').length,
      low: results.filter(r => r.feasibility === 'low').length,
    };
    
    sheet.addRow(['Feasibility', 'Count', 'Percentage']);
    sheet.addRow(['High', feasibilityCount.high, feasibilityCount.high / results.length]);
    sheet.addRow(['Medium', feasibilityCount.medium, feasibilityCount.medium / results.length]);
    sheet.addRow(['Low', feasibilityCount.low, feasibilityCount.low / results.length]);
    
    // Format percentages
    sheet.getColumn(3).numFmt = '0.0%';
    
    // Market Potential Distribution
    sheet.getCell('A7').value = 'Market Potential Distribution';
    sheet.getCell('A7').font = { size: 14, bold: true };
    
    const potentialCount = {
      high: results.filter(r => r.marketPotential === 'high').length,
      medium: results.filter(r => r.marketPotential === 'medium').length,
      low: results.filter(r => r.marketPotential === 'low').length,
    };
    
    sheet.addRow(['Market Potential', 'Count', 'Percentage']);
    sheet.addRow(['High', potentialCount.high, potentialCount.high / results.length]);
    sheet.addRow(['Medium', potentialCount.medium, potentialCount.medium / results.length]);
    sheet.addRow(['Low', potentialCount.low, potentialCount.low / results.length]);
    
    // Innovation Score Distribution
    sheet.getCell('A13').value = 'Innovation Score Distribution';
    sheet.getCell('A13').font = { size: 14, bold: true };
    
    const scoreRanges = {
      '9-10': results.filter(r => r.innovationScore >= 9).length,
      '7-8': results.filter(r => r.innovationScore >= 7 && r.innovationScore < 9).length,
      '5-6': results.filter(r => r.innovationScore >= 5 && r.innovationScore < 7).length,
      '0-4': results.filter(r => r.innovationScore < 5).length,
    };
    
    sheet.addRow(['Score Range', 'Count', 'Percentage']);
    Object.entries(scoreRanges).forEach(([range, count]) => {
      sheet.addRow([range, count, count / results.length]);
    });
    
    // Column widths
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 12;
    sheet.getColumn(3).width = 15;
  }

  private calculateStatistics(results: SearchResult[]) {
    const avgInnovation = results.reduce((acc, r) => acc + r.innovationScore, 0) / results.length;
    const highFeasibility = results.filter(r => r.feasibility === 'high').length;
    const highPotential = results.filter(r => r.marketPotential === 'high').length;
    
    const totalMarketSize = results.reduce((acc, r) => {
      const size = this.parseMarketSize(r.marketSize);
      return acc + size;
    }, 0);

    const categories: Record<string, number> = {};
    results.forEach(r => {
      categories[r.category] = (categories[r.category] || 0) + 1;
    });

    return {
      totalOpportunities: results.length,
      avgInnovation: avgInnovation.toFixed(1),
      highFeasibility,
      highPotential,
      totalMarketSize: this.formatMarketSize(totalMarketSize),
      categories
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

  private getFeasibilityColor(feasibility: string): string {
    switch (feasibility) {
      case 'high': return 'FFD1FAE5'; // Light green
      case 'medium': return 'FFFEF3C7'; // Light yellow
      case 'low': return 'FFFECACA'; // Light red
      default: return 'FFFFFFFF';
    }
  }

  private getPotentialColor(potential: string): string {
    switch (potential) {
      case 'high': return 'FFDBEAFE'; // Light blue
      case 'medium': return 'FFE0E7FF'; // Light indigo
      case 'low': return 'FFF3F4F6'; // Light gray
      default: return 'FFFFFFFF';
    }
  }
}

export const excelGenerator = new ExcelGenerator();
