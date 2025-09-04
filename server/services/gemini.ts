import { GoogleGenAI } from "@google/genai";
import { config } from "../config";
import { aiCache } from "./ai-cache";
import { discoverMarketGaps, type MarketGap } from "./perplexity";

// Use Gemini 2.0 Flash for better performance and lower cost
const hasApiKey = !!config.geminiApiKey;
const ai = hasApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey! }) : null;

export interface GapAnalysisResult {
  title: string;
  description: string;
  category: string;
  feasibility: "high" | "medium" | "low";
  marketPotential: "high" | "medium" | "low";
  innovationScore: number;
  marketSize: string;
  gapReason: string;
  targetAudience?: string;
  keyTrends?: string[];
}

export async function analyzeGaps(query: string): Promise<GapAnalysisResult[]> {
  // Check cache first
  const cachedResults = aiCache.get(query);
  if (cachedResults) {
    return cachedResults;
  }
  
  try {
    // Try Perplexity first for real-time web search capabilities
    console.log(`🔍 Using Perplexity AI for market gap discovery: ${query}`);
    const perplexityResults = await discoverMarketGaps(query);
    
    // Convert MarketGap to GapAnalysisResult format
    const results: GapAnalysisResult[] = perplexityResults.map((gap: MarketGap) => ({
      title: gap.title,
      description: gap.description,
      category: gap.category,
      feasibility: gap.feasibility,
      marketPotential: gap.marketPotential,
      innovationScore: gap.innovationScore,
      marketSize: gap.marketSize,
      gapReason: gap.gapReason,
      targetAudience: gap.targetAudience,
      keyTrends: gap.keyTrends
    }));
    
    // Cache the results
    if (results.length > 0) {
      aiCache.set(query, results);
    }
    
    return results;
  } catch (perplexityError) {
    console.error('Perplexity API failed, trying Gemini fallback:', perplexityError);
    
    // Fallback to Gemini if Perplexity fails
    if (!ai || !hasApiKey) {
      console.log(`⚠️ No AI APIs configured - returning demo data for query: ${query}`);
      // Return demo data for development/testing
      // Return comprehensive demo data for better testing experience
      return [
      {
        title: "AI-Powered Market Gap Analyzer",
        description: "An intelligent platform that continuously scans market trends, patent databases, and consumer complaints to identify unaddressed needs and business opportunities in real-time.",
        category: "Tech That's Missing",
        feasibility: "high",
        marketPotential: "high",
        innovationScore: 8,
        marketSize: "$2.3B",
        gapReason: "Complex data integration and lack of unified market intelligence APIs"
      },
      {
        title: "Virtual Reality Therapy Sessions",
        description: "Immersive VR therapy platform that provides accessible mental health support with AI therapists and realistic environments for treating phobias, PTSD, and anxiety disorders.",
        category: "Services That Don't Exist",
        feasibility: "medium",
        marketPotential: "high",
        innovationScore: 9,
        marketSize: "$4.5B",
        gapReason: "Regulatory hurdles and need for clinical validation studies"
      },
      {
        title: "Smart Urban Farming Pods",
        description: "Automated vertical farming units for urban apartments that use AI to optimize growing conditions and provide fresh produce year-round with minimal effort.",
        category: "Products Nobody's Made",
        feasibility: "high",
        marketPotential: "medium",
        innovationScore: 7,
        marketSize: "$890M",
        gapReason: "High initial cost and consumer education needed"
      },
      {
        title: "Subscription-Based Car Sharing for Suburbs",
        description: "Neighborhood-based car sharing service specifically designed for suburban communities where residents share costs and access to vehicles within walking distance.",
        category: "Business Models",
        feasibility: "high",
        marketPotential: "medium",
        innovationScore: 6,
        marketSize: "$1.2B",
        gapReason: "Insurance complexity and community coordination challenges"
      },
      {
        title: "Personal Carbon Offset Marketplace",
        description: "Platform that automatically calculates your carbon footprint from purchases and travel, then matches you with verified local offset projects you can support.",
        category: "Tech That's Missing",
        feasibility: "high",
        marketPotential: "high",
        innovationScore: 8,
        marketSize: "$3.1B",
        gapReason: "Lack of standardized carbon tracking and verification systems"
      }
    ];
    }
    
    // If we have Gemini API key, try that as fallback
    const systemPrompt = `You are an elite innovation strategist and market gap analyst with deep expertise in identifying untapped business opportunities. 

Your analysis framework:
1. Market Dynamics: Understand current trends, pain points, and unmet needs
2. Technology Assessment: Evaluate technical feasibility with current and emerging tech
3. Economic Viability: Assess market size, growth potential, and monetization models
4. Competitive Landscape: Identify why these gaps exist and barriers to entry
5. Innovation Impact: Measure true innovation potential and market disruption capability

Guidelines:
- Focus on ACTIONABLE opportunities that entrepreneurs can realistically pursue in the next 2-3 years
- Prioritize gaps with clear value propositions and identifiable target markets
- Consider regulatory, technical, and market barriers realistically
- Provide specific, measurable market data when possible
- Ensure diversity across different industries and business models

Always respond with valid JSON in the exact format specified.`;

  const prompt = `Analyze this market research query: "${query}"

Context: The user is an entrepreneur or innovator looking for untapped business opportunities. They need specific, actionable market gaps they could potentially address.

Your task: Identify 6-8 significant market gaps related to the query. These should be opportunities that:
- Don't currently exist in the market (or exist poorly)
- Have clear demand signals (complaints, workarounds, high friction)
- Could be realistically built/launched within 2-3 years
- Have identifiable early adopters and growth potential

For each gap, provide:
1. Title: A clear, memorable name for the solution (e.g., "AI-Powered Legal Document Reviewer")
2. Description: Comprehensive explanation including:
   - What problem it solves
   - How it works
   - Target users and use cases
   - Key differentiators from existing alternatives
3. Category: Choose the most fitting:
   - "Tech That's Missing" - Technology solutions not yet built
   - "Services That Don't Exist" - Service businesses with unmet demand
   - "Products Nobody's Made" - Physical or digital products needed
   - "Business Models" - New ways to monetize or deliver value
4. Feasibility: Rate as "high", "medium", or "low" considering:
   - Technical complexity
   - Resource requirements
   - Regulatory hurdles
   - Time to market
5. Market Potential: Rate as "high", "medium", or "low" based on:
   - Total addressable market
   - Growth trajectory
   - Customer willingness to pay
   - Competitive dynamics
6. Innovation Score: 1-10 scale where:
   - 1-3: Incremental improvements
   - 4-6: Notable innovations
   - 7-8: Breakthrough solutions
   - 9-10: Paradigm-shifting innovations
7. Market Size: Provide realistic TAM estimate (e.g., "$2.3B global market", "$450M in North America")
8. Gap Reason: Explain specifically why this doesn't exist yet:
   - Technical barriers
   - Regulatory challenges
   - Economic factors
   - Market timing issues

Ensure variety across different approaches and industries. Prioritize quality over quantity - each gap should be genuinely valuable and well-researched.

Return the results as a JSON object with the exact structure:
{
  "gaps": [
    {
      "title": "string",
      "description": "string", 
      "category": "string",
      "feasibility": "string",
      "marketPotential": "string",
      "innovationScore": number,
      "marketSize": "string",
      "gapReason": "string"
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",  // Faster and cheaper than 2.5-pro
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  feasibility: { type: "string" },
                  marketPotential: { type: "string" },
                  innovationScore: { type: "number" },
                  marketSize: { type: "string" },
                  gapReason: { type: "string" }
                },
                required: ["title", "description", "category", "feasibility", "marketPotential", "innovationScore", "marketSize", "gapReason"]
              }
            }
          },
          required: ["gaps"]
        }
      },
      contents: prompt,
    });

    const rawJson = response.text;
    
    if (rawJson) {
      const result = JSON.parse(rawJson);
      const gaps = result.gaps || [];
      
      // Cache the results for future use
      if (gaps.length > 0) {
        aiCache.set(query, gaps);
      }
      
      return gaps;
    } else {
      throw new Error("Empty response from Gemini");
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    // Fallback basic results to keep UX flowing in development without API key
    if (process.env.NODE_ENV !== 'production') {
      return [
        {
          title: `Starter opportunity: ${query}`,
          description: "Example gap result because the AI provider is unavailable. Configure GEMINI_API_KEY to get real insights.",
          category: "Tech That's Missing",
          feasibility: "medium",
          marketPotential: "medium",
          innovationScore: 6,
          marketSize: "$100M",
          gapReason: "Demonstration data path for local development."
        }
      ];
    }
    throw new Error('Failed to analyze gaps: ' + (error as Error).message);
  }
  }  // End of outer catch for Perplexity failure
}
