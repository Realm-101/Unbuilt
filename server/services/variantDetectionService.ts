import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Variant Detection Service
 * Detects when a user wants to refine/modify their analysis and extracts parameters
 */

export interface ReanalysisDetection {
  isReanalysisRequest: boolean;
  confidence: number; // 0-100
  modifiedParameters?: {
    market?: string;
    targetAudience?: string;
    businessModel?: string;
    geography?: string;
    timeframe?: string;
    budget?: string;
    [key: string]: string | undefined;
  };
  confirmationPrompt?: string;
  reasoning?: string;
}

export interface AnalysisContext {
  query: string;
  innovationScore?: number;
  feasibilityRating?: string;
  topGaps?: Array<{
    title: string;
    category: string;
  }>;
}

/**
 * Detect if a user message is requesting a re-analysis with modified parameters
 */
export async function detectReanalysisIntent(
  userMessage: string,
  analysisContext: AnalysisContext
): Promise<ReanalysisDetection> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = buildDetectionPrompt(userMessage, analysisContext);
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse the JSON response
    const detection = parseDetectionResponse(response);
    
    // Generate confirmation prompt if it's a re-analysis request
    if (detection.isReanalysisRequest && detection.modifiedParameters) {
      detection.confirmationPrompt = generateConfirmationPrompt(
        analysisContext,
        detection.modifiedParameters
      );
    }
    
    return detection;
  } catch (error) {
    console.error('Error detecting re-analysis intent:', error);
    
    // Return safe default
    return {
      isReanalysisRequest: false,
      confidence: 0,
      reasoning: 'Error occurred during detection',
    };
  }
}

/**
 * Build the prompt for re-analysis detection
 */
function buildDetectionPrompt(
  userMessage: string,
  analysisContext: AnalysisContext
): string {
  return `You are an AI assistant that detects when a user wants to refine or modify their gap analysis with different parameters.

ORIGINAL ANALYSIS CONTEXT:
- Query: "${analysisContext.query}"
- Innovation Score: ${analysisContext.innovationScore || 'N/A'}
- Feasibility: ${analysisContext.feasibilityRating || 'N/A'}
- Top Gaps: ${analysisContext.topGaps?.map(g => g.title).join(', ') || 'N/A'}

USER MESSAGE:
"${userMessage}"

TASK:
Analyze if the user is requesting a re-analysis with modified parameters. Look for phrases like:
- "What if I target [different market]?"
- "How would this change if [different parameter]?"
- "Can you analyze this for [different audience]?"
- "What about [different geography/timeframe/budget]?"
- "Re-analyze with [different business model]"

RESPOND WITH VALID JSON ONLY (no markdown, no code blocks):
{
  "isReanalysisRequest": boolean,
  "confidence": number (0-100),
  "modifiedParameters": {
    "market": "extracted market if mentioned",
    "targetAudience": "extracted audience if mentioned",
    "businessModel": "extracted business model if mentioned",
    "geography": "extracted geography if mentioned",
    "timeframe": "extracted timeframe if mentioned",
    "budget": "extracted budget if mentioned"
  },
  "reasoning": "brief explanation of your decision"
}

IMPORTANT:
- Only set isReanalysisRequest to true if the user is clearly asking for a modified analysis
- Extract only the parameters that are explicitly mentioned or strongly implied
- Omit parameters that aren't mentioned
- Confidence should reflect how certain you are (>80 = very certain, 50-80 = somewhat certain, <50 = uncertain)
- Return ONLY the JSON object, no other text`;
}

/**
 * Parse the AI response into a ReanalysisDetection object
 */
function parseDetectionResponse(response: string): ReanalysisDetection {
  try {
    // Remove markdown code blocks if present
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/```\n?/g, '');
    }
    
    const parsed = JSON.parse(cleanResponse);
    
    // Validate and clean up the response
    const detection: ReanalysisDetection = {
      isReanalysisRequest: Boolean(parsed.isReanalysisRequest),
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
      reasoning: parsed.reasoning || '',
    };
    
    // Only include modifiedParameters if it's a re-analysis request
    if (detection.isReanalysisRequest && parsed.modifiedParameters) {
      // Filter out empty/undefined values
      const cleanedParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed.modifiedParameters)) {
        if (value && typeof value === 'string' && value.trim()) {
          cleanedParams[key] = String(value).trim();
        }
      }
      
      if (Object.keys(cleanedParams).length > 0) {
        detection.modifiedParameters = cleanedParams;
      }
    }
    
    return detection;
  } catch (error) {
    console.error('Error parsing detection response:', error);
    console.error('Response was:', response);
    
    // Return safe default
    return {
      isReanalysisRequest: false,
      confidence: 0,
      reasoning: 'Failed to parse AI response',
    };
  }
}

/**
 * Generate a confirmation prompt for the user
 */
function generateConfirmationPrompt(
  originalContext: AnalysisContext,
  modifiedParameters: Record<string, string>
): string {
  const changes: string[] = [];
  
  for (const [key, value] of Object.entries(modifiedParameters)) {
    const label = key.replace(/([A-Z])/g, ' $1').toLowerCase();
    changes.push(`**${label}**: ${value}`);
  }
  
  return `I detected that you want to create a variant analysis with these modifications:

${changes.join('\n')}

This will create a new analysis based on your original query "${originalContext.query}" but with these updated parameters. The original analysis will be preserved for comparison.

Would you like me to proceed with this re-analysis?`;
}

/**
 * Extract search query modifications from parameters
 */
export function buildModifiedQuery(
  originalQuery: string,
  modifiedParameters: Record<string, string>
): string {
  let modifiedQuery = originalQuery;
  
  // Append modifications to the query
  const modifications: string[] = [];
  
  if (modifiedParameters.market) {
    modifications.push(`targeting ${modifiedParameters.market} market`);
  }
  
  if (modifiedParameters.targetAudience) {
    modifications.push(`for ${modifiedParameters.targetAudience}`);
  }
  
  if (modifiedParameters.businessModel) {
    modifications.push(`using ${modifiedParameters.businessModel} business model`);
  }
  
  if (modifiedParameters.geography) {
    modifications.push(`in ${modifiedParameters.geography}`);
  }
  
  if (modifiedParameters.timeframe) {
    modifications.push(`with ${modifiedParameters.timeframe} timeframe`);
  }
  
  if (modifiedParameters.budget) {
    modifications.push(`with ${modifiedParameters.budget} budget`);
  }
  
  if (modifications.length > 0) {
    modifiedQuery = `${originalQuery} (${modifications.join(', ')})`;
  }
  
  return modifiedQuery;
}
