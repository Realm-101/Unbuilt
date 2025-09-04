import axios from 'axios';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  object: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      content: string;
    };
  }>;
}

export interface MarketGap {
  title: string;
  description: string;
  category: string;
  feasibility: 'high' | 'medium' | 'low';
  marketPotential: 'high' | 'medium' | 'low';
  innovationScore: number;
  marketSize: string;
  gapReason: string;
  competitors?: string[];
  targetAudience?: string;
  keyTrends?: string[];
}

export async function discoverMarketGaps(query: string): Promise<MarketGap[]> {
  if (!PERPLEXITY_API_KEY) {
    console.warn('⚠️ Perplexity API key not configured - using fallback data');
    return getFallbackGaps(query);
  }

  const prompt = `You are a market research expert analyzing untapped opportunities and market gaps. Analyze the following query and identify 5-8 specific market gaps or unbuilt opportunities.

Query: "${query}"

For each gap, provide:
1. Title: A specific, actionable product/service name
2. Description: Detailed explanation of what this would be and how it works
3. Category: One of "Tech That's Missing", "Services That Don't Exist", "Products Nobody's Made", or "Business Models"
4. Feasibility: Rate as "high", "medium", or "low" based on current technology and resources
5. Market Potential: Rate as "high", "medium", or "low" based on demand and market size
6. Innovation Score: Rate from 1-10 (10 being most innovative)
7. Market Size: Estimated total addressable market (e.g., "$2.3B", "$890M")
8. Gap Reason: Why doesn't this exist yet?
9. Target Audience: Who would use this?
10. Key Trends: What current trends support this opportunity?

Focus on REAL gaps that don't exist yet but should. Be specific and actionable. Use current market data and trends.

Return ONLY a JSON array with the gaps, no additional text. Format:
[
  {
    "title": "...",
    "description": "...",
    "category": "...",
    "feasibility": "...",
    "marketPotential": "...",
    "innovationScore": 8,
    "marketSize": "...",
    "gapReason": "...",
    "targetAudience": "...",
    "keyTrends": ["...", "..."]
  }
]`;

  try {
    const response = await axios.post<PerplexityResponse>(
      PERPLEXITY_API_URL,
      {
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a market research expert. Always return valid JSON arrays only, no markdown or additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        return_citations: true,
        search_domain_filter: ['perplexity.ai'],
        return_images: false,
        search_recency_filter: 'month',
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in Perplexity response');
    }

    // Parse the JSON response
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const gaps = JSON.parse(cleanContent);
      
      // Validate and clean the data
      return gaps.map((gap: any) => ({
        title: gap.title || 'Untitled Opportunity',
        description: gap.description || 'No description available',
        category: gap.category || 'Tech That\'s Missing',
        feasibility: gap.feasibility || 'medium',
        marketPotential: gap.marketPotential || 'medium',
        innovationScore: Math.min(10, Math.max(1, gap.innovationScore || 5)),
        marketSize: gap.marketSize || 'TBD',
        gapReason: gap.gapReason || 'Market analysis pending',
        targetAudience: gap.targetAudience,
        keyTrends: gap.keyTrends || []
      }));
    } catch (parseError) {
      console.error('Error parsing Perplexity response:', parseError);
      console.error('Raw content:', content);
      return getFallbackGaps(query);
    }
  } catch (error) {
    console.error('Perplexity API error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
    }
    return getFallbackGaps(query);
  }
}

function getFallbackGaps(query: string): MarketGap[] {
  // Enhanced fallback data based on query
  const queryLower = query.toLowerCase();
  
  // Dynamic category selection based on query
  let gaps: MarketGap[] = [];
  
  if (queryLower.includes('health') || queryLower.includes('medical')) {
    gaps.push({
      title: "AI Health Companion for Chronic Conditions",
      description: "24/7 AI-powered health monitoring and support system that tracks symptoms, medication adherence, and provides personalized health insights for chronic disease patients.",
      category: "Tech That's Missing",
      feasibility: "high",
      marketPotential: "high",
      innovationScore: 8,
      marketSize: "$4.2B",
      gapReason: "Privacy concerns and regulatory approval complexities",
      targetAudience: "Chronic disease patients and their caregivers",
      keyTrends: ["Aging population", "AI in healthcare", "Remote patient monitoring"]
    });
  }
  
  if (queryLower.includes('education') || queryLower.includes('learning')) {
    gaps.push({
      title: "Personalized Skill Gap Analyzer",
      description: "AI platform that analyzes your current skills, career goals, and market demand to create personalized learning paths with real-time job market alignment.",
      category: "Services That Don't Exist",
      feasibility: "high",
      marketPotential: "high",
      innovationScore: 7,
      marketSize: "$2.8B",
      gapReason: "Fragmented data sources and lack of industry standardization",
      targetAudience: "Career changers and continuous learners",
      keyTrends: ["Skills-based hiring", "Lifelong learning", "Career pivoting"]
    });
  }
  
  // Add general gaps if specific ones weren't matched
  if (gaps.length === 0) {
    gaps = [
      {
        title: "Neighborhood Resource Sharing Platform",
        description: "Hyper-local platform where neighbors can share tools, equipment, and skills within walking distance, reducing consumption and building community.",
        category: "Business Models",
        feasibility: "high",
        marketPotential: "medium",
        innovationScore: 6,
        marketSize: "$890M",
        gapReason: "Trust and liability concerns in peer-to-peer sharing",
        targetAudience: "Suburban homeowners and urban communities",
        keyTrends: ["Sharing economy", "Sustainability", "Community building"]
      },
      {
        title: "AI-Powered Local Business Discovery",
        description: "Platform that uses AI to match consumers with local businesses based on specific needs, preferences, and real-time availability.",
        category: "Tech That's Missing",
        feasibility: "high",
        marketPotential: "high",
        innovationScore: 7,
        marketSize: "$3.1B",
        gapReason: "Fragmented local business data and integration challenges",
        targetAudience: "Local shoppers and small businesses",
        keyTrends: ["Shop local movement", "AI personalization", "Real-time commerce"]
      }
    ];
  }
  
  // Always add a few more general opportunities
  gaps.push(
    {
      title: "Carbon Footprint Trading for Individuals",
      description: "Personal carbon credit marketplace where individuals can trade, offset, and monetize their carbon-saving actions.",
      category: "Business Models",
      feasibility: "medium",
      marketPotential: "high",
      innovationScore: 8,
      marketSize: "$5.2B",
      gapReason: "Lack of standardized personal carbon tracking methods",
      targetAudience: "Environmentally conscious consumers",
      keyTrends: ["Climate action", "Carbon markets", "Personal sustainability"]
    },
    {
      title: "Virtual Reality Workspace Designer",
      description: "VR platform that lets remote teams design and customize shared virtual offices with spatial audio and presence.",
      category: "Products Nobody's Made",
      feasibility: "medium",
      marketPotential: "high",
      innovationScore: 9,
      marketSize: "$2.7B",
      gapReason: "VR hardware adoption and bandwidth requirements",
      targetAudience: "Remote teams and distributed companies",
      keyTrends: ["Remote work", "Virtual collaboration", "Metaverse"]
    }
  );
  
  return gaps;
}