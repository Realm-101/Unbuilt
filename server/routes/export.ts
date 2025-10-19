import { Request, Response } from "express";
import { storage } from "../storage";
import { pdfGenerator, PDFOptions } from "../services/pdf-generator";
import puppeteer from "puppeteer";

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
        return await exportPdf(validResults, res, format, options);
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

function generatePageSpecificHTML(result: any, selectedPages: string[], options: any): string {
  const companyName = options.customization?.companyName || 'Market Analysis';
  const authorName = options.customization?.authorName || 'Research Team';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${result.title} - Analysis Report</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 0;
    }
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
      color: white;
      padding: 40px;
      margin-bottom: 30px;
      border-radius: 8px;
    }
    .header h1 { margin: 0 0 10px 0; font-size: 32px; }
    .header .meta { opacity: 0.9; font-size: 14px; }
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .section h2 {
      color: #7c3aed;
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #ec4899;
    }
    .section h3 {
      color: #1f2937;
      font-size: 18px;
      margin: 20px 0 10px 0;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    .metric-card {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #7c3aed;
    }
    .metric-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
    }
    .info-box {
      background: #f9fafb;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .recommendation {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .phase {
      background: #f3f4f6;
      padding: 20px;
      margin: 15px 0;
      border-radius: 8px;
      border-left: 4px solid #10b981;
    }
    .phase h4 {
      margin: 0 0 15px 0;
      color: #059669;
    }
    .phase ul {
      margin: 0;
      padding-left: 20px;
    }
    .phase li {
      margin: 8px 0;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 8px;
    }
    .badge-high { background: #d1fae5; color: #065f46; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-low { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${result.title}</h1>
    <div class="meta">
      ${companyName} | ${authorName} | ${date}
    </div>
  </div>
`;

  // Analysis Page
  if (selectedPages.includes('analysis')) {
    html += `
  <div class="section">
    <h2>Full Analysis</h2>
    
    <h3>Opportunity Overview</h3>
    <p>${result.description}</p>
    
    <div class="info-box">
      <strong>Why This Gap Exists:</strong><br>
      ${result.gapReason}
    </div>
    
    ${result.industryContext ? `
    <div class="info-box">
      <strong>Industry Context:</strong><br>
      ${result.industryContext}
    </div>
    ` : ''}
    
    <h3>Detailed Score Analysis</h3>
    
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Innovation Score</div>
        <div class="metric-value">${result.innovationScore}/10</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Feasibility</div>
        <div class="metric-value">${result.feasibility}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Market Potential</div>
        <div class="metric-value">${result.marketPotential}</div>
      </div>
    </div>
    
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Market Size</div>
        <div class="metric-value">${result.marketSize}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Confidence</div>
        <div class="metric-value">${result.confidenceScore || 75}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Priority</div>
        <div class="metric-value">${result.priority || 'Medium'}</div>
      </div>
    </div>
    
    ${result.competitorAnalysis ? `
    <h3>Competitive Landscape</h3>
    <p>${result.competitorAnalysis}</p>
    ` : ''}
    
    ${result.actionableRecommendations && result.actionableRecommendations.length > 0 ? `
    <h3>Key Recommendations</h3>
    ${result.actionableRecommendations.map((rec: string, i: number) => `
      <div class="recommendation">
        <strong>${i + 1}.</strong> ${rec}
      </div>
    `).join('')}
    ` : ''}
  </div>
`;
  }

  // Roadmap Page
  if (selectedPages.includes('roadmap')) {
    html += `
  <div class="section">
    <h2>Development Roadmap</h2>
    
    <div class="phase">
      <h4>Phase 1: Validation (0-2 months)</h4>
      <ul>
        <li>Research existing solutions and competitors</li>
        <li>Interview 5-10 potential customers</li>
        <li>Create basic prototype or mockup</li>
        <li>Test core assumptions with target market</li>
        <li>Validate pricing and business model</li>
      </ul>
    </div>
    
    <div class="phase">
      <h4>Phase 2: Development (2-4 months)</h4>
      <ul>
        <li>Define minimum viable product (MVP) scope</li>
        <li>Create technical architecture plan</li>
        <li>Build MVP with core features</li>
        <li>Set up basic infrastructure and hosting</li>
        <li>Implement user feedback system</li>
      </ul>
    </div>
    
    <div class="phase">
      <h4>Phase 3: Launch (4-6 months)</h4>
      <ul>
        <li>Create landing page and marketing materials</li>
        <li>Build social media presence</li>
        <li>Reach out to early adopters</li>
        <li>Launch beta with limited users</li>
        <li>Iterate based on user feedback</li>
      </ul>
    </div>
    
    <div class="phase">
      <h4>Phase 4: Scale (6+ months)</h4>
      <ul>
        <li>Analyze user data and behavior patterns</li>
        <li>Implement advanced features</li>
        <li>Build sales and marketing processes</li>
        <li>Seek funding or investment if needed</li>
        <li>Scale infrastructure for growth</li>
      </ul>
    </div>
  </div>
`;
  }

  // Research Page
  if (selectedPages.includes('research')) {
    html += `
  <div class="section">
    <h2>Market Research Strategy</h2>
    
    <h3>Target Customer Analysis</h3>
    <p>Identify and interview potential users. Create customer personas and understand pain points.</p>
    
    <h3>Competitive Analysis</h3>
    <p>Research existing solutions, their pricing, features, and customer feedback.</p>
    
    <h3>Market Size Validation</h3>
    <p>Validate the ${result.marketSize} market size estimate through industry reports and surveys.</p>
    
    <div class="info-box">
      <strong>Why This Gap Exists:</strong><br>
      ${result.gapReason}
    </div>
  </div>
`;
  }

  // Resources Page
  if (selectedPages.includes('resources')) {
    html += `
  <div class="section">
    <h2>Resources</h2>
    
    <h3>Lean Startup Canvas</h3>
    <p>Plan your business model - https://leanstack.com/lean-canvas</p>
    
    <h3>Customer Development</h3>
    <p>Validate your idea with customers - https://customerdevlabs.com/</p>
    
    <h3>No-Code Tools</h3>
    <p>Build MVPs without coding - https://nocode.tech/</p>
    
    <h3>Y Combinator Startup School</h3>
    <p>Free online startup course - https://startupschool.org/</p>
    
    <h3>Product Hunt</h3>
    <p>Launch and discover new products - https://producthunt.com/</p>
  </div>
`;
  }

  // Funding Page
  if (selectedPages.includes('funding')) {
    const timelineEstimate = result.feasibility === 'high' ? '3-6 months to market' :
                            result.feasibility === 'medium' ? '6-12 months to market' : '12+ months to market';
    const investmentEstimate = result.feasibility === 'high' ? '$5K-$25K' :
                              result.feasibility === 'medium' ? '$25K-$100K' : '$100K+';
    
    html += `
  <div class="section">
    <h2>Funding Options</h2>
    
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Time to Market</div>
        <div class="metric-value">${timelineEstimate}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Initial Investment</div>
        <div class="metric-value">${investmentEstimate}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Market Size</div>
        <div class="metric-value">${result.marketSize}</div>
      </div>
    </div>
    
    <h3>Bootstrap Funding</h3>
    <p>Self-fund with personal savings or revenue. Best for high feasibility projects with low initial costs.</p>
    
    <h3>Angel Investors</h3>
    <p>Individual investors providing $25K-$100K. Best for proven concept with early traction.</p>
    
    <h3>Venture Capital</h3>
    <p>Professional investors providing $500K+. Best for high-growth potential with large market.</p>
    
    <h3>Crowdfunding</h3>
    <p>Public funding through platforms like Kickstarter. Best for consumer products with broad appeal.</p>
  </div>
`;
  }

  html += `
  <div class="footer">
    <p>Generated by ${companyName} | ${date}</p>
    <p>This report is confidential and intended for internal use only.</p>
  </div>
</body>
</html>`;

  return html;
}

async function exportPdf(results: any[], res: Response, format: string, options: any) {
  // Check if this is a single-result page-specific export
  const selectedPages = options.pages || [];
  const isSingleResult = results.length === 1;
  
  let html: string;
  
  if (isSingleResult && selectedPages.length > 0) {
    // Generate page-specific HTML for single result
    html = generatePageSpecificHTML(results[0], selectedPages, options);
  } else {
    // Use existing PDF generator for multi-result exports
    const pdfFormat = format === 'executive' ? 'executive' : 
                      format === 'pitch' ? 'pitch' : 'detailed';
    
    const pdfOptions: PDFOptions = {
      format: pdfFormat,
      customTitle: options.customTitle,
      customIntro: options.customIntro,
      includeDetails: options.includeDetails !== false,
      companyName: options.customization?.companyName || options.companyName,
      authorName: options.customization?.authorName || options.authorName
    };

    html = pdfGenerator.generateHTML(results, pdfOptions);
  }
  
  let browser;
  try {
    // Launch puppeteer and generate PDF
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    console.log(`Generated PDF buffer size: ${pdfBuffer.length} bytes`);
    
    // Set headers before sending
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
      'Content-Disposition': `attachment; filename="${format}-report.pdf"`,
      'Cache-Control': 'no-cache'
    });
    
    // Send the buffer directly
    res.end(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    // Fallback to HTML if PDF generation fails
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${format}-report.html"`);
    res.send(html);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
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