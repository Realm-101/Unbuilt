// TODO: Update to use the correct @google/genai API once package is properly configured
// For now, this service provides fallback comparison logic

/**
 * Variant Comparison Service
 * Generates comparative analysis between original and variant analyses
 */

export interface ComparisonResult {
  summary: string;
  keyDifferences: Array<{
    aspect: string;
    original: string;
    variant: string;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  recommendations: string[];
  preferredVariant?: 'original' | 'variant' | 'both';
  reasoning: string;
}

export interface AnalysisVariant {
  query: string;
  innovationScore?: number;
  feasibilityRating?: string;
  topGaps?: Array<{
    title: string;
    category: string;
    description?: string;
  }>;
  marketSize?: string;
  competitiveLandscape?: string;
  parameters?: Record<string, string>;
}

/**
 * Generate a comparative analysis between two analysis variants
 */
export async function compareAnalysisVariants(
  original: AnalysisVariant,
  variant: AnalysisVariant
): Promise<ComparisonResult> {
  try {
    // TODO: Implement AI-powered comparison once @google/genai API is properly configured
    // For now, use fallback comparison logic
    console.log('Using fallback comparison (AI comparison not yet configured)');
    
    return generateFallbackComparison(original, variant);
  } catch (error) {
    console.error('Error comparing analysis variants:', error);
    
    // Return fallback comparison
    return generateFallbackComparison(original, variant);
  }
}

/**
 * Build the prompt for variant comparison
 */
function buildComparisonPrompt(
  original: AnalysisVariant,
  variant: AnalysisVariant
): string {
  return `You are an AI assistant that compares two gap analysis variants to help users understand the differences and make informed decisions.

ORIGINAL ANALYSIS:
- Query: "${original.query}"
- Innovation Score: ${original.innovationScore || 'N/A'}
- Feasibility: ${original.feasibilityRating || 'N/A'}
- Top Gaps: ${original.topGaps?.map(g => g.title).join(', ') || 'N/A'}
- Market Size: ${original.marketSize || 'N/A'}
- Parameters: ${JSON.stringify(original.parameters || {})}

VARIANT ANALYSIS:
- Query: "${variant.query}"
- Innovation Score: ${variant.innovationScore || 'N/A'}
- Feasibility: ${variant.feasibilityRating || 'N/A'}
- Top Gaps: ${variant.topGaps?.map(g => g.title).join(', ') || 'N/A'}
- Market Size: ${variant.marketSize || 'N/A'}
- Parameters: ${JSON.stringify(variant.parameters || {})}

TASK:
Provide a comprehensive comparison that helps the user understand:
1. What changed between the two analyses
2. How those changes impact the opportunity
3. Which variant might be more promising and why

RESPOND WITH VALID JSON ONLY (no markdown, no code blocks):
{
  "summary": "2-3 sentence overview of the key differences",
  "keyDifferences": [
    {
      "aspect": "Innovation Score" | "Market Size" | "Target Audience" | "Competition" | "Feasibility" | etc,
      "original": "value or description from original",
      "variant": "value or description from variant",
      "impact": "positive" | "negative" | "neutral"
    }
  ],
  "recommendations": [
    "actionable recommendation based on comparison",
    "another recommendation"
  ],
  "preferredVariant": "original" | "variant" | "both",
  "reasoning": "explanation of why one variant might be preferred, or why both are valuable"
}

GUIDELINES:
- Focus on meaningful differences that impact decision-making
- Explain the business implications of each difference
- Be objective but provide clear guidance
- Consider innovation potential, market size, feasibility, and competitive landscape
- If both variants have merit, explain when to use each
- Return ONLY the JSON object, no other text`;
}

/**
 * Parse the AI response into a ComparisonResult object
 */
function parseComparisonResponse(response: string): ComparisonResult {
  try {
    // Remove markdown code blocks if present
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/```\n?/g, '');
    }
    
    const parsed = JSON.parse(cleanResponse);
    
    // Validate and structure the response
    const comparison: ComparisonResult = {
      summary: parsed.summary || 'Comparison analysis completed',
      keyDifferences: Array.isArray(parsed.keyDifferences) 
        ? parsed.keyDifferences.map((diff: any) => ({
            aspect: String(diff.aspect || 'Unknown'),
            original: String(diff.original || 'N/A'),
            variant: String(diff.variant || 'N/A'),
            impact: ['positive', 'negative', 'neutral'].includes(diff.impact) 
              ? diff.impact 
              : 'neutral',
          }))
        : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map((rec: any) => String(rec))
        : [],
      preferredVariant: ['original', 'variant', 'both'].includes(parsed.preferredVariant)
        ? parsed.preferredVariant
        : undefined,
      reasoning: parsed.reasoning || 'Both variants offer unique opportunities',
    };
    
    return comparison;
  } catch (error) {
    console.error('Error parsing comparison response:', error);
    console.error('Response was:', response);
    
    throw error; // Let the caller handle with fallback
  }
}

/**
 * Generate a fallback comparison when AI fails
 */
function generateFallbackComparison(
  original: AnalysisVariant,
  variant: AnalysisVariant
): ComparisonResult {
  const differences: ComparisonResult['keyDifferences'] = [];
  
  // Compare innovation scores
  if (original.innovationScore !== undefined && variant.innovationScore !== undefined) {
    const scoreDiff = variant.innovationScore - original.innovationScore;
    differences.push({
      aspect: 'Innovation Score',
      original: `${original.innovationScore}/100`,
      variant: `${variant.innovationScore}/100`,
      impact: scoreDiff > 0 ? 'positive' : scoreDiff < 0 ? 'negative' : 'neutral',
    });
  }
  
  // Compare feasibility
  if (original.feasibilityRating && variant.feasibilityRating) {
    differences.push({
      aspect: 'Feasibility',
      original: original.feasibilityRating,
      variant: variant.feasibilityRating,
      impact: 'neutral',
    });
  }
  
  // Compare parameters
  if (original.parameters && variant.parameters) {
    for (const [key, value] of Object.entries(variant.parameters)) {
      if (original.parameters[key] !== value) {
        differences.push({
          aspect: key.replace(/([A-Z])/g, ' $1').trim(),
          original: original.parameters[key] || 'Not specified',
          variant: value,
          impact: 'neutral',
        });
      }
    }
  }
  
  return {
    summary: 'The variant analysis explores the opportunity with modified parameters. Review the key differences below to understand how these changes impact the analysis.',
    keyDifferences: differences,
    recommendations: [
      'Review the innovation scores and feasibility ratings to assess which variant aligns better with your goals',
      'Consider the market size and competitive landscape differences',
      'Evaluate which parameter set matches your resources and capabilities',
    ],
    reasoning: 'Both analyses provide valuable insights. The choice depends on your specific goals, resources, and market positioning.',
  };
}

/**
 * Generate a user-friendly comparison summary for display
 */
export function formatComparisonForDisplay(comparison: ComparisonResult): string {
  let output = `## Comparison Summary\n\n${comparison.summary}\n\n`;
  
  if (comparison.keyDifferences.length > 0) {
    output += `### Key Differences\n\n`;
    for (const diff of comparison.keyDifferences) {
      const impactIcon = diff.impact === 'positive' ? '📈' : diff.impact === 'negative' ? '📉' : '➡️';
      output += `**${diff.aspect}** ${impactIcon}\n`;
      output += `- Original: ${diff.original}\n`;
      output += `- Variant: ${diff.variant}\n\n`;
    }
  }
  
  if (comparison.recommendations.length > 0) {
    output += `### Recommendations\n\n`;
    for (const rec of comparison.recommendations) {
      output += `- ${rec}\n`;
    }
    output += '\n';
  }
  
  if (comparison.preferredVariant) {
    const variantLabel = comparison.preferredVariant === 'original' 
      ? 'Original Analysis' 
      : comparison.preferredVariant === 'variant'
      ? 'Variant Analysis'
      : 'Both Analyses';
    output += `### Recommendation: ${variantLabel}\n\n${comparison.reasoning}\n`;
  }
  
  return output;
}
