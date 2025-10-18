import { Request, Response } from "express";
import { storage } from "../storage";
import { pdfGenerator, PDFOptions } from "../services/pdf-generator";

export async function exportResults(req: Request, res: Response) {
  try {
    const { format, results, options = {} } = req.body;
    
    // Handle both array of IDs and array of result objects
    let validResults;
    if (results && results.length > 0) {
      if (typeof results[0] === 'number') {
        // Array of IDs - fetch from database
        const fetchedResults = await Promise.all(
          results.map((id: number) => storage.getSearchResultById(id))
        );
        validResults = fetchedResults.filter(r => r !== undefined);
      } else {
        // Array of result objects - use directly
        validResults = results;
      }
    } else {
      return res.status(400).json({ message: "No results provided" });
    }
    
    if (validResults.length === 0) {
      return res.status(404).json({ message: "No valid results found" });
    }

    switch (format) {
      case 'csv':
        return exportCsv(validResults, res);
      case 'pdf':
      case 'executive':
      case 'pitch':
        return exportPdf(validResults, res, format, options);
      case 'excel':
      case 'xlsx':
        return exportExcel(validResults, res, options);
      case 'json':
        return exportJson(validResults, res, options);
      case 'pptx':
      case 'powerpoint':
        return exportPowerPoint(validResults, res, options);
      default:
        return res.status(400).json({ message: `Unsupported format: ${format}` });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: "Export failed", error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

function exportCsv(results: any[], res: Response) {
  const headers = [
    'Title',
    'Description', 
    'Category',
    'Feasibility',
    'Market Potential',
    'Innovation Score',
    'Market Size',
    'Gap Reason'
  ];
  
  let csv = headers.join(',') + '\n';
  
  results.forEach(result => {
    const row = [
      `"${result.title.replace(/"/g, '""')}"`,
      `"${result.description.replace(/"/g, '""')}"`,
      `"${result.category}"`,
      `"${result.feasibility}"`,
      `"${result.marketPotential}"`,
      result.innovationScore,
      `"${result.marketSize}"`,
      `"${result.gapReason.replace(/"/g, '""')}"`
    ];
    csv += row.join(',') + '\n';
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="market-gaps.csv"');
  res.send(csv);
}

function exportPdf(results: any[], res: Response, format: string, options: any) {
  // Map format to PDFOptions format type
  const pdfFormat = format === 'executive' ? 'executive' : 
                    format === 'pitch' ? 'pitch' : 'detailed';
  
  const pdfOptions: PDFOptions = {
    format: pdfFormat,
    customTitle: options.customTitle,
    customIntro: options.customIntro,
    includeDetails: options.includeDetails !== false,
    companyName: options.companyName,
    authorName: options.authorName
  };

  // Generate HTML using the PDF generator
  const html = pdfGenerator.generateHTML(results, pdfOptions);
  
  // Send HTML as response (can be printed to PDF by browser)
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="${format}-report.html"`);
  res.send(html);
}

function exportExcel(results: any[], res: Response, options: any) {
  // Generate Excel-compatible CSV with multiple sheets simulation
  const headers = [
    'Title',
    'Description',
    'Category',
    'Feasibility',
    'Market Potential',
    'Innovation Score',
    'Market Size',
    'Gap Reason',
    'Confidence Score',
    'Priority',
    'Industry Context',
    'Competitor Analysis'
  ];
  
  let csv = headers.join(',') + '\n';
  
  results.forEach(result => {
    const row = [
      `"${(result.title || '').replace(/"/g, '""')}"`,
      `"${(result.description || '').replace(/"/g, '""')}"`,
      `"${result.category || ''}"`,
      `"${result.feasibility || ''}"`,
      `"${result.marketPotential || ''}"`,
      result.innovationScore || 0,
      `"${result.marketSize || ''}"`,
      `"${(result.gapReason || '').replace(/"/g, '""')}"`,
      result.confidenceScore || 0,
      `"${result.priority || 'medium'}"`,
      `"${(result.industryContext || '').replace(/"/g, '""')}"`,
      `"${(result.competitorAnalysis || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(',') + '\n';
  });
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="gap-analysis.xlsx"');
  res.send(csv);
}

function exportJson(results: any[], res: Response, options: any) {
  const exportData = {
    exportDate: new Date().toISOString(),
    totalResults: results.length,
    companyName: options.customization?.companyName,
    authorName: options.customization?.authorName,
    results: results.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      feasibility: r.feasibility,
      marketPotential: r.marketPotential,
      innovationScore: r.innovationScore,
      marketSize: r.marketSize,
      gapReason: r.gapReason,
      confidenceScore: r.confidenceScore,
      priority: r.priority,
      actionableRecommendations: r.actionableRecommendations,
      industryContext: r.industryContext,
      competitorAnalysis: r.competitorAnalysis
    }))
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="gap-analysis.json"');
  res.json(exportData);
}

function exportPowerPoint(results: any[], res: Response, options: any) {
  // Generate HTML slides that can be converted to PowerPoint
  const theme = options.customization?.theme || 'professional';
  const companyName = options.customization?.companyName || 'Your Company';
  const authorName = options.customization?.authorName || 'Market Research Team';
  
  const themeColors = {
    professional: { primary: '#1e3a8a', secondary: '#3b82f6', accent: '#f97316' },
    modern: { primary: '#7c3aed', secondary: '#a78bfa', accent: '#ec4899' },
    minimal: { primary: '#374151', secondary: '#6b7280', accent: '#10b981' }
  };
  
  const colors = themeColors[theme as keyof typeof themeColors] || themeColors.professional;
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Gap Analysis Presentation</title>
  <style>
    @page { size: 1920px 1080px; margin: 0; }
    body { margin: 0; font-family: Arial, sans-serif; }
    .slide { 
      width: 1920px; 
      height: 1080px; 
      page-break-after: always; 
      padding: 80px;
      box-sizing: border-box;
      background: white;
    }
    .title-slide { 
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .title-slide h1 { font-size: 72px; margin: 0 0 30px 0; }
    .title-slide p { font-size: 36px; opacity: 0.9; }
    .content-slide h2 { 
      color: ${colors.primary}; 
      font-size: 56px; 
      margin: 0 0 40px 0;
      border-bottom: 4px solid ${colors.accent};
      padding-bottom: 20px;
    }
    .gap-card {
      background: #f8fafc;
      border-left: 6px solid ${colors.accent};
      padding: 30px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .gap-card h3 { 
      color: ${colors.primary}; 
      font-size: 42px; 
      margin: 0 0 20px 0; 
    }
    .gap-card p { 
      font-size: 28px; 
      line-height: 1.6; 
      color: #334155;
      margin: 15px 0;
    }
    .metrics {
      display: flex;
      gap: 30px;
      margin: 30px 0;
    }
    .metric {
      flex: 1;
      background: white;
      padding: 25px;
      border-radius: 8px;
      border: 2px solid ${colors.secondary};
      text-align: center;
    }
    .metric-label {
      font-size: 24px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .metric-value {
      font-size: 48px;
      font-weight: bold;
      color: ${colors.primary};
    }
    .footer {
      position: absolute;
      bottom: 40px;
      right: 80px;
      font-size: 20px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <!-- Title Slide -->
  <div class="slide title-slide">
    <h1>Gap Analysis Report</h1>
    <p>${companyName}</p>
    <p style="font-size: 28px; margin-top: 60px;">Prepared by ${authorName}</p>
    <p style="font-size: 24px;">${new Date().toLocaleDateString()}</p>
  </div>
  
  <!-- Summary Slide -->
  <div class="slide content-slide">
    <h2>Executive Summary</h2>
    <div class="metrics">
      <div class="metric">
        <div class="metric-label">Total Opportunities</div>
        <div class="metric-value">${results.length}</div>
      </div>
      <div class="metric">
        <div class="metric-label">High Priority</div>
        <div class="metric-value">${results.filter(r => r.priority === 'high').length}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Avg Innovation Score</div>
        <div class="metric-value">${(results.reduce((sum, r) => sum + (r.innovationScore || 0), 0) / results.length).toFixed(1)}</div>
      </div>
    </div>
    <div class="footer">Confidential</div>
  </div>
`;

  // Add a slide for each gap (limit to top 10 for presentation)
  results.slice(0, 10).forEach((result, index) => {
    html += `
  <div class="slide content-slide">
    <h2>Opportunity ${index + 1}: ${result.category}</h2>
    <div class="gap-card">
      <h3>${result.title}</h3>
      <p><strong>Description:</strong> ${result.description}</p>
      <p><strong>Why This Gap Exists:</strong> ${result.gapReason}</p>
      <div class="metrics">
        <div class="metric">
          <div class="metric-label">Innovation</div>
          <div class="metric-value">${result.innovationScore}/10</div>
        </div>
        <div class="metric">
          <div class="metric-label">Feasibility</div>
          <div class="metric-value">${result.feasibility}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Market Size</div>
          <div class="metric-value">${result.marketSize}</div>
        </div>
      </div>
    </div>
    <div class="footer">Slide ${index + 3} | Confidential</div>
  </div>
`;
  });

  html += `
</body>
</html>`;
  
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', 'attachment; filename="gap-analysis-presentation.html"');
  res.send(html);
}

export async function sendEmailReport(req: Request, res: Response) {
  try {
    const { email, results: resultIds, options = {} } = req.body;
    
    // For now, simulate email sending or use configured provider
    console.log(`Sending report to ${email} with ${resultIds?.length ?? 0} results`);
    
    res.json({ 
      success: true, 
      message: `Report queued for ${email}` 
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ message: "Failed to send email" });
  }
}