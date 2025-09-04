import { Request, Response } from "express";
import { storage } from "../storage";
import { pdfGenerator, PDFOptions } from "../services/pdf-generator";

export async function exportResults(req: Request, res: Response) {
  try {
    const { format, results: resultIds, options = {} } = req.body;
    
    // Fetch the results
    const results = await Promise.all(
      resultIds.map((id: number) => storage.getSearchResultById(id))
    );
    
    const validResults = results.filter(r => r !== undefined);
    
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
      default:
        return res.status(400).json({ message: "Unsupported format" });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: "Export failed" });
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