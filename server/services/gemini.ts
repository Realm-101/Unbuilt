import { GoogleGenAI } from "@google/genai";
import { config } from "../config";
import { aiCache } from "./ai-cache";
import { discoverMarketGaps, type MarketGap } from "./perplexity";

// Use Gemini 2.0 Flash for better performance and lower cost
const hasApiKey = !!config.geminiApiKey;
const ai = hasApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey! }) : null;

// Helper function to calculate priority based on market potential and feasibility
function calculatePriority(
  marketPotential: "high" | "medium" | "low",
  feasibility: "high" | "medium" | "low"
): "high" | "medium" | "low" {
  if (marketPotential === "high" && feasibility === "high") return "high";
  if (marketPotential === "high" || feasibility === "high") return "medium";
  if (marketPotential === "low" && feasibility === "low") return "low";
  return "medium";
}

// Helper function to map old category format to structured categories
function mapToStructuredCategory(oldCategory: string): "market" | "technology" | "ux" | "business_model" {
  const categoryMap: Record<string, "market" | "technology" | "ux" | "business_model"> = {
    "Tech That's Missing": "technology",
    "Services That Don't Exist": "market",
    "Products Nobody's Made": "market",
    "Business Models": "business_model",
    "User Experience": "ux"
  };
  return categoryMap[oldCategory] || "market";
}

// Helper function to generate actionable recommendations
function generateRecommendations(gap: MarketGap): string[] {
  const recommendations: string[] = [];
  
  // Add feasibility-based recommendations
  if (gap.feasibility === "high") {
    recommendations.push("Start with MVP development to validate core assumptions");
    recommendations.push("Conduct user interviews with target audience");
  } else if (gap.feasibility === "medium") {
    recommendations.push("Research technical requirements and potential partnerships");
    recommendations.push("Create detailed feasibility study before proceeding");
  } else {
    recommendations.push("Explore alternative approaches to reduce complexity");
    recommendations.push("Consider phased implementation strategy");
  }
  
  // Add market potential-based recommendations
  if (gap.marketPotential === "high") {
    recommendations.push("Develop go-to-market strategy for rapid scaling");
    recommendations.push("Identify early adopter segments for initial launch");
  }
  
  // Add innovation-based recommendations
  if (gap.innovationScore >= 8) {
    recommendations.push("Consider patent protection for novel approaches");
    recommendations.push("Build strong brand positioning as market innovator");
  }
  
  return recommendations.slice(0, 4); // Return top 4 recommendations
}

export interface GapAnalysisResult {
  title: string;
  description: string;
  category: "market" | "technology" | "ux" | "business_model";
  feasibility: "high" | "medium" | "low";
  marketPotential: "high" | "medium" | "low";
  innovationScore: number;
  marketSize: string;
  gapReason: string;
  targetAudience?: string;
  keyTrends?: string[];
  // Enhanced fields for Phase 3
  confidenceScore: number; // 0-100 confidence in this gap analysis
  priority: "high" | "medium" | "low"; // Based on market potential + feasibility
  actionableRecommendations: string[]; // Specific next steps
  competitorAnalysis?: string; // Brief competitive landscape
  industryContext?: string; // Industry-specific insights
}

export async function analyzeGaps(query: string): Promise<GapAnalysisResult[]> {
  console.log(`🚀 analyzeGaps called with query: "${query}"`);
  
  // Check cache first
  const cachedResults = aiCache.get(query);
  if (cachedResults) {
    console.log(`✅ Found ${cachedResults.length} cached results`);
    return cachedResults;
  }
  
  console.log(`⏳ No cache, proceeding with API calls`);
  
  try {
    // Try Perplexity first for real-time web search capabilities
    console.log(`🔍 Using Perplexity AI for market gap discovery: ${query}`);
    const perplexityResults = await discoverMarketGaps(query);
    console.log(`✅ Perplexity returned ${perplexityResults.length} results`);
    
    // Convert MarketGap to GapAnalysisResult format with enhanced fields
    const results: GapAnalysisResult[] = perplexityResults.map((gap: MarketGap) => {
      // Calculate priority based on market potential and feasibility
      const priority = calculatePriority(gap.marketPotential, gap.feasibility);
      
      // Map old category format to new structured categories
      const category = mapToStructuredCategory(gap.category);
      
      return {
        title: gap.title,
        description: gap.description,
        category,
        feasibility: gap.feasibility,
        marketPotential: gap.marketPotential,
        innovationScore: gap.innovationScore,
        marketSize: gap.marketSize,
        gapReason: gap.gapReason,
        targetAudience: gap.targetAudience,
        keyTrends: gap.keyTrends,
        // Enhanced Phase 3 fields
        confidenceScore: 85, // Perplexity has high confidence due to real-time data
        priority,
        actionableRecommendations: generateRecommendations(gap),
        competitorAnalysis: `Based on current market research for ${gap.title}`,
        industryContext: gap.category
      };
    });
    
    // Cache the results
    if (results.length > 0) {
      aiCache.set(query, results);
      console.log(`💾 Cached ${results.length} Perplexity results`);
    } else {
      console.warn(`⚠️ No results to cache from Perplexity`);
    }
    
    console.log(`✅ Returning ${results.length} results from Perplexity`);
    return results;
  } catch (perplexityError) {
    console.error('❌ Perplexity API failed, trying Gemini fallback:', perplexityError);
    
    // Fallback to Gemini if Perplexity fails
    if (!ai || !hasApiKey) {
      console.log(`⚠️ No AI APIs configured - returning demo data for query: ${query}`);
      // Return demo data for development/testing
      // Return comprehensive demo data for better testing experience
      return [
      {
        title: "AI-Powered Market Gap Analyzer",
        description: "An intelligent platform that continuously scans market trends, patent databases, and consumer complaints to identify unaddressed needs and business opportunities in real-time.",
        category: "technology" as const,
        feasibility: "high",
        marketPotential: "high",
        innovationScore: 8,
        marketSize: "$2.3B",
        gapReason: "Complex data integration and lack of unified market intelligence APIs",
        confidenceScore: 75,
        priority: "high",
        actionableRecommendations: [
          "Start with MVP focusing on single industry vertical",
          "Partner with existing data providers for initial data sources",
          "Conduct user interviews with market researchers and VCs",
          "Build API-first architecture for easy integration"
        ],
        competitorAnalysis: "Limited direct competitors; CB Insights and Crunchbase offer partial solutions",
        industryContext: "Market intelligence and business analytics"
      },
      {
        title: "Virtual Reality Therapy Sessions",
        description: "Immersive VR therapy platform that provides accessible mental health support with AI therapists and realistic environments for treating phobias, PTSD, and anxiety disorders.",
        category: "market" as const,
        feasibility: "medium",
        marketPotential: "high",
        innovationScore: 9,
        marketSize: "$4.5B",
        gapReason: "Regulatory hurdles and need for clinical validation studies",
        confidenceScore: 70,
        priority: "medium",
        actionableRecommendations: [
          "Research regulatory requirements and clinical trial pathways",
          "Partner with licensed therapists for content development",
          "Start with anxiety treatment as initial use case",
          "Develop pilot program with mental health clinics"
        ],
        competitorAnalysis: "Some VR therapy apps exist but lack AI personalization and clinical validation",
        industryContext: "Mental health and digital therapeutics"
      },
      {
        title: "Smart Urban Farming Pods",
        description: "Automated vertical farming units for urban apartments that use AI to optimize growing conditions and provide fresh produce year-round with minimal effort.",
        category: "market" as const,
        feasibility: "high",
        marketPotential: "medium",
        innovationScore: 7,
        marketSize: "$890M",
        gapReason: "High initial cost and consumer education needed",
        confidenceScore: 80,
        priority: "medium",
        actionableRecommendations: [
          "Develop prototype with 3-5 popular vegetables",
          "Target urban millennials and health-conscious consumers",
          "Create subscription model for seeds and nutrients",
          "Partner with smart home platforms for integration"
        ],
        competitorAnalysis: "AeroGarden and Click & Grow exist but lack AI optimization",
        industryContext: "Urban agriculture and smart home technology"
      },
      {
        title: "Subscription-Based Car Sharing for Suburbs",
        description: "Neighborhood-based car sharing service specifically designed for suburban communities where residents share costs and access to vehicles within walking distance.",
        category: "business_model" as const,
        feasibility: "high",
        marketPotential: "medium",
        innovationScore: 6,
        marketSize: "$1.2B",
        gapReason: "Insurance complexity and community coordination challenges",
        confidenceScore: 65,
        priority: "medium",
        actionableRecommendations: [
          "Start with pilot in single suburban neighborhood",
          "Partner with insurance companies for group coverage",
          "Develop community management platform",
          "Create clear usage rules and conflict resolution process"
        ],
        competitorAnalysis: "Zipcar and Turo focus on urban areas; suburban market underserved",
        industryContext: "Shared mobility and community services"
      },
      {
        title: "Personal Carbon Offset Marketplace",
        description: "Platform that automatically calculates your carbon footprint from purchases and travel, then matches you with verified local offset projects you can support.",
        category: "technology" as const,
        feasibility: "high",
        marketPotential: "high",
        innovationScore: 8,
        marketSize: "$3.1B",
        gapReason: "Lack of standardized carbon tracking and verification systems",
        confidenceScore: 78,
        priority: "high",
        actionableRecommendations: [
          "Integrate with credit card APIs for purchase tracking",
          "Partner with verified carbon offset organizations",
          "Start with travel and transportation tracking",
          "Build mobile app for easy carbon footprint monitoring"
        ],
        competitorAnalysis: "Wren and Offset exist but lack automatic tracking and local projects",
        industryContext: "Climate tech and sustainability"
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
6. Industry Context: Provide specific industry insights and trends
7. Actionable Strategy: Deliver concrete next steps and recommendations

Guidelines:
- Focus on ACTIONABLE opportunities that entrepreneurs can realistically pursue in the next 2-3 years
- Prioritize gaps with clear value propositions and identifiable target markets
- Consider regulatory, technical, and market barriers realistically
- Provide specific, measurable market data when possible
- Ensure diversity across different industries and business models
- Include confidence scores based on data availability and market clarity
- Categorize gaps into: market, technology, ux (user experience), or business_model
- Provide 3-5 specific actionable recommendations for each gap

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
3. Category: Choose ONE of these structured categories:
   - "market" - Market gaps and unmet customer needs
   - "technology" - Technology solutions not yet built
   - "ux" - User experience improvements and design gaps
   - "business_model" - New ways to monetize or deliver value
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
9. Confidence Score: 0-100 rating based on:
   - Data availability and quality
   - Market clarity and validation
   - Competitive landscape understanding
   - Industry expertise level
10. Priority: Calculate as "high", "medium", or "low" based on:
    - High: High market potential + High feasibility
    - Medium: Mixed potential and feasibility
    - Low: Low market potential or Low feasibility
11. Actionable Recommendations: Provide 3-5 specific next steps such as:
    - MVP development approach
    - Target customer segments
    - Partnership opportunities
    - Go-to-market strategies
    - Risk mitigation tactics
12. Competitor Analysis: Brief overview of existing solutions and competitive landscape
13. Industry Context: Specific industry trends, regulations, and dynamics

Ensure variety across different approaches and industries. Prioritize quality over quantity - each gap should be genuinely valuable and well-researched.

Return the results as a JSON object with the exact structure:
{
  "gaps": [
    {
      "title": "string",
      "description": "string", 
      "category": "market" | "technology" | "ux" | "business_model",
      "feasibility": "high" | "medium" | "low",
      "marketPotential": "high" | "medium" | "low",
      "innovationScore": number (1-10),
      "marketSize": "string",
      "gapReason": "string",
      "confidenceScore": number (0-100),
      "priority": "high" | "medium" | "low",
      "actionableRecommendations": ["string", "string", ...],
      "competitorAnalysis": "string",
      "industryContext": "string"
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro-latest",  // Updated from deprecated gemini-2.0-flash-exp for better reasoning
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
                  category: { 
                    type: "string",
                    enum: ["market", "technology", "ux", "business_model"]
                  },
                  feasibility: { 
                    type: "string",
                    enum: ["high", "medium", "low"]
                  },
                  marketPotential: { 
                    type: "string",
                    enum: ["high", "medium", "low"]
                  },
                  innovationScore: { type: "number" },
                  marketSize: { type: "string" },
                  gapReason: { type: "string" },
                  confidenceScore: { type: "number" },
                  priority: { 
                    type: "string",
                    enum: ["high", "medium", "low"]
                  },
                  actionableRecommendations: {
                    type: "array",
                    items: { type: "string" }
                  },
                  competitorAnalysis: { type: "string" },
                  industryContext: { type: "string" }
                },
                required: [
                  "title", "description", "category", "feasibility", "marketPotential", 
                  "innovationScore", "marketSize", "gapReason", "confidenceScore", 
                  "priority", "actionableRecommendations", "competitorAnalysis", "industryContext"
                ]
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
          category: "technology" as const,
          feasibility: "medium",
          marketPotential: "medium",
          innovationScore: 6,
          marketSize: "$100M",
          gapReason: "Demonstration data path for local development.",
          confidenceScore: 50,
          priority: "medium",
          actionableRecommendations: [
            "Configure GEMINI_API_KEY or PERPLEXITY_API_KEY for real analysis",
            "Review API documentation for setup instructions",
            "Test with sample queries once configured"
          ],
          competitorAnalysis: "Demo data - configure API keys for real analysis",
          industryContext: "Demo mode"
        }
      ];
    }
    throw new Error('Failed to analyze gaps: ' + (error as Error).message);
  }
  }  // End of outer catch for Perplexity failure
}
