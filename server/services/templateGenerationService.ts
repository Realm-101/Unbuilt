import { db } from '../db';
import { searches, searchResults, resources } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Template variable data extracted from analysis
 */
export interface TemplateVariables {
  ideaTitle: string;
  innovationScore: number;
  targetMarket: string;
  topCompetitors: string[];
  keyFeatures: string[];
  actionPlanSummary: string;
  marketSize: string;
  feasibility: string;
  marketPotential: string;
  gapReason: string;
  category: string;
  confidenceScore: number;
  priority: string;
  actionableRecommendations: string[];
  competitorAnalysis?: string;
  industryContext?: string;
  targetAudience?: string;
  keyTrends: string[];
}

/**
 * Generated template with download information
 */
export interface GeneratedTemplate {
  url: string;
  filename: string;
  format: 'docx' | 'pdf' | 'gdocs';
  expiresAt: Date;
  variables: TemplateVariables;
}

/**
 * Template format options
 */
export type TemplateFormat = 'docx' | 'pdf' | 'gdocs';

/**
 * Template Generation Service
 * Generates pre-filled templates from gap analysis data
 */
export class TemplateGenerationService {
  private readonly TEMPLATE_EXPIRY_HOURS = 24;
  private readonly tempStorage = new Map<string, GeneratedTemplate>();

  /**
   * Extract template variables from analysis
   */
  async extractVariables(analysisId: number): Promise<TemplateVariables | null> {
    // Get the search/analysis
    const [search] = await db
      .select()
      .from(searches)
      .where(eq(searches.id, analysisId))
      .limit(1);

    if (!search) {
      return null;
    }

    // Get the search results (gap opportunities)
    const results = await db
      .select()
      .from(searchResults)
      .where(eq(searchResults.searchId, analysisId))
      .orderBy(searchResults.innovationScore);

    if (results.length === 0) {
      return null;
    }

    // Use the top result as the primary opportunity
    const topResult = results[0];

    // Extract competitors from competitor analysis
    const competitors = this.extractCompetitors(topResult.competitorAnalysis || '');

    // Extract features from actionable recommendations
    const features = Array.isArray(topResult.actionableRecommendations)
      ? topResult.actionableRecommendations
      : [];

    // Build action plan summary from all results
    const actionPlanSummary = this.buildActionPlanSummary(results);

    // Extract key trends
    const keyTrends = Array.isArray(topResult.keyTrends)
      ? topResult.keyTrends
      : [];

    return {
      ideaTitle: topResult.title,
      innovationScore: topResult.innovationScore,
      targetMarket: topResult.targetAudience || topResult.marketSize,
      topCompetitors: competitors,
      keyFeatures: features,
      actionPlanSummary,
      marketSize: topResult.marketSize,
      feasibility: topResult.feasibility,
      marketPotential: topResult.marketPotential,
      gapReason: topResult.gapReason,
      category: topResult.category,
      confidenceScore: topResult.confidenceScore,
      priority: topResult.priority,
      actionableRecommendations: features,
      competitorAnalysis: topResult.competitorAnalysis || undefined,
      industryContext: topResult.industryContext || undefined,
      targetAudience: topResult.targetAudience || undefined,
      keyTrends,
    };
  }

  /**
   * Generate a template document with pre-filled data
   */
  async generateTemplate(
    templateId: number,
    analysisId: number,
    format: TemplateFormat = 'docx'
  ): Promise<GeneratedTemplate | null> {
    // Get the template resource
    const [template] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, templateId))
      .limit(1);

    if (!template || template.resourceType !== 'template') {
      return null;
    }

    // Extract variables from analysis
    const variables = await this.extractVariables(analysisId);

    if (!variables) {
      return null;
    }

    // Render the template with variables
    const renderedContent = this.renderTemplate(template, variables, format);

    // Generate temporary download URL
    const token = crypto.randomBytes(32).toString('hex');
    const filename = this.generateFilename(template.title, format);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TEMPLATE_EXPIRY_HOURS);

    const generatedTemplate: GeneratedTemplate = {
      url: `/api/resources/templates/download/${token}`,
      filename,
      format,
      expiresAt,
      variables,
    };

    // Store in temporary storage (in production, use Redis or S3)
    // Store rendered content separately
    const templateWithContent = {
      ...generatedTemplate,
      renderedContent,
    };
    
    this.tempStorage.set(token, templateWithContent as any);

    // Clean up expired templates
    this.cleanupExpiredTemplates();

    return generatedTemplate;
  }

  /**
   * Render template with variables
   */
  private renderTemplate(
    template: any,
    variables: TemplateVariables,
    format: TemplateFormat
  ): string {
    // Get template content from metadata or URL
    const templateContent = template.metadata?.templateContent || this.getDefaultTemplate(template.title);

    // Replace template variables
    let rendered = templateContent;

    // Replace all variable placeholders
    rendered = rendered.replace(/\{\{idea_title\}\}/g, variables.ideaTitle);
    rendered = rendered.replace(/\{\{innovation_score\}\}/g, variables.innovationScore.toString());
    rendered = rendered.replace(/\{\{target_market\}\}/g, variables.targetMarket);
    rendered = rendered.replace(/\{\{market_size\}\}/g, variables.marketSize);
    rendered = rendered.replace(/\{\{feasibility\}\}/g, variables.feasibility);
    rendered = rendered.replace(/\{\{market_potential\}\}/g, variables.marketPotential);
    rendered = rendered.replace(/\{\{gap_reason\}\}/g, variables.gapReason);
    rendered = rendered.replace(/\{\{category\}\}/g, variables.category);
    rendered = rendered.replace(/\{\{confidence_score\}\}/g, variables.confidenceScore.toString());
    rendered = rendered.replace(/\{\{priority\}\}/g, variables.priority);
    rendered = rendered.replace(/\{\{action_plan_summary\}\}/g, variables.actionPlanSummary);

    // Replace list variables
    rendered = rendered.replace(
      /\{\{top_competitors\}\}/g,
      this.formatList(variables.topCompetitors)
    );
    rendered = rendered.replace(
      /\{\{key_features\}\}/g,
      this.formatList(variables.keyFeatures)
    );
    rendered = rendered.replace(
      /\{\{actionable_recommendations\}\}/g,
      this.formatList(variables.actionableRecommendations)
    );
    rendered = rendered.replace(
      /\{\{key_trends\}\}/g,
      this.formatList(variables.keyTrends)
    );

    // Replace optional variables
    if (variables.competitorAnalysis) {
      rendered = rendered.replace(/\{\{competitor_analysis\}\}/g, variables.competitorAnalysis);
    }
    if (variables.industryContext) {
      rendered = rendered.replace(/\{\{industry_context\}\}/g, variables.industryContext);
    }
    if (variables.targetAudience) {
      rendered = rendered.replace(/\{\{target_audience\}\}/g, variables.targetAudience);
    }

    // Format based on output format
    if (format === 'docx') {
      return this.formatAsDocx(rendered);
    } else if (format === 'pdf') {
      return this.formatAsPdf(rendered);
    } else {
      // Google Docs format (HTML)
      return this.formatAsHtml(rendered);
    }
  }

  /**
   * Get template by token
   */
  getTemplateByToken(token: string): GeneratedTemplate | null {
    const template = this.tempStorage.get(token);

    if (!template) {
      return null;
    }

    // Check if expired
    if (new Date() > template.expiresAt) {
      this.tempStorage.delete(token);
      return null;
    }

    return template;
  }

  /**
   * Extract competitors from competitor analysis text
   */
  private extractCompetitors(competitorAnalysis: string): string[] {
    if (!competitorAnalysis) {
      return [];
    }

    // Simple extraction - look for company names (capitalized words)
    const matches = competitorAnalysis.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    
    // Remove duplicates and common words
    const commonWords = new Set(['The', 'This', 'That', 'These', 'Those', 'However', 'Therefore']);
    const competitors = [...new Set(matches)]
      .filter(word => !commonWords.has(word))
      .slice(0, 5); // Limit to top 5

    return competitors;
  }

  /**
   * Build action plan summary from search results
   */
  private buildActionPlanSummary(results: any[]): string {
    const phases = ['Research', 'Validation', 'Development', 'Launch'];
    const summary = phases.map((phase, index) => {
      const phaseResults = results.slice(index * 2, (index + 1) * 2);
      if (phaseResults.length === 0) {
        return `${phase}: Define strategy and execute key initiatives`;
      }
      const actions = phaseResults
        .flatMap(r => Array.isArray(r.actionableRecommendations) ? r.actionableRecommendations : [])
        .slice(0, 2);
      return `${phase}: ${actions.join(', ') || 'Execute key initiatives'}`;
    });

    return summary.join('\n');
  }

  /**
   * Format list for template
   */
  private formatList(items: string[]): string {
    if (items.length === 0) {
      return 'N/A';
    }
    return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
  }

  /**
   * Generate filename for template
   */
  private generateFilename(templateTitle: string, format: TemplateFormat): string {
    const sanitized = templateTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const timestamp = Date.now();
    return `${sanitized}-${timestamp}.${format}`;
  }

  /**
   * Get default template content
   */
  private getDefaultTemplate(title: string): string {
    return `
# ${title}

## Opportunity Overview
**Title:** {{idea_title}}
**Innovation Score:** {{innovation_score}}/100
**Confidence Score:** {{confidence_score}}%
**Priority:** {{priority}}

## Market Analysis
**Target Market:** {{target_market}}
**Market Size:** {{market_size}}
**Market Potential:** {{market_potential}}

## Gap Analysis
**Category:** {{category}}
**Feasibility:** {{feasibility}}
**Gap Reason:** {{gap_reason}}

## Competitive Landscape
{{competitor_analysis}}

**Top Competitors:**
{{top_competitors}}

## Recommended Features
{{key_features}}

## Action Plan
{{action_plan_summary}}

## Key Trends
{{key_trends}}

## Next Steps
{{actionable_recommendations}}
    `.trim();
  }

  /**
   * Format content as DOCX (simplified - in production use docx library)
   */
  private formatAsDocx(content: string): string {
    // In production, use the 'docx' npm package to generate proper DOCX files
    // For now, return markdown that can be converted
    return content;
  }

  /**
   * Format content as PDF (simplified - in production use pdf library)
   */
  private formatAsPdf(content: string): string {
    // In production, use 'pdfkit' or 'puppeteer' to generate PDF
    // For now, return markdown that can be converted
    return content;
  }

  /**
   * Format content as HTML for Google Docs
   */
  private formatAsHtml(content: string): string {
    // Convert markdown-style content to HTML
    let html = content
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Template</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #666; }
    h2 { color: #555; margin-top: 20px; }
    h3 { color: #777; }
  </style>
</head>
<body>
  <p>${html}</p>
</body>
</html>`;
  }

  /**
   * Clean up expired templates from storage
   */
  private cleanupExpiredTemplates(): void {
    const now = new Date();
    for (const [token, template] of this.tempStorage.entries()) {
      if (now > template.expiresAt) {
        this.tempStorage.delete(token);
      }
    }
  }

  /**
   * Get available templates for an analysis
   */
  async getAvailableTemplates(analysisId: number): Promise<any[]> {
    // Get the analysis to determine relevant templates
    const [search] = await db
      .select()
      .from(searches)
      .where(eq(searches.id, analysisId))
      .limit(1);

    if (!search) {
      return [];
    }

    // Get template resources
    const templates = await db
      .select()
      .from(resources)
      .where(eq(resources.resourceType, 'template'))
      .limit(20);

    return templates.map(template => ({
      id: template.id,
      title: template.title,
      description: template.description,
      estimatedTimeMinutes: template.estimatedTimeMinutes,
      formats: ['docx', 'pdf', 'gdocs'],
    }));
  }
}

// Export singleton instance
export const templateGenerationService = new TemplateGenerationService();
