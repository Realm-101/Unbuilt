import axios from 'axios';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

interface XAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface BusinessPlan {
  executiveSummary: string;
  marketAnalysis: {
    targetMarket: string;
    marketSize: string;
    growthRate: string;
    keyTrends: string[];
    customerSegments: string[];
  };
  competitiveAnalysis: {
    mainCompetitors: string[];
    competitiveAdvantage: string;
    marketPositioning: string;
    barriers: string[];
  };
  businessModel: {
    revenueStreams: string[];
    costStructure: string[];
    keyPartners: string[];
    keyResources: string[];
  };
  marketingStrategy: {
    channels: string[];
    customerAcquisition: string;
    pricing: string;
    branding: string;
  };
  financialProjections: {
    yearOneRevenue: string;
    yearThreeRevenue: string;
    breakEvenTimeline: string;
    fundingNeeded: string;
  };
  actionPlan: {
    phase1: { name: string; duration: string; milestones: string[] };
    phase2: { name: string; duration: string; milestones: string[] };
    phase3: { name: string; duration: string; milestones: string[] };
    phase4: { name: string; duration: string; milestones: string[] };
  };
  risks: {
    topRisks: string[];
    mitigationStrategies: string[];
  };
}

export async function generateBusinessPlan(
  title: string, 
  description: string, 
  category: string,
  marketSize?: string
): Promise<BusinessPlan> {
  if (!XAI_API_KEY) {
    console.warn('⚠️ xAI API key not configured - using fallback business plan');
    return getFallbackBusinessPlan(title, description);
  }

  const prompt = `Generate a comprehensive business plan for the following innovation opportunity:

Title: ${title}
Description: ${description}
Category: ${category}
${marketSize ? `Estimated Market Size: ${marketSize}` : ''}

Create a detailed business plan including:
1. Executive Summary (2-3 paragraphs)
2. Market Analysis (target market, size, growth rate, trends, customer segments)
3. Competitive Analysis (competitors, advantages, positioning, barriers)
4. Business Model (revenue streams, costs, partners, resources)
5. Marketing Strategy (channels, acquisition, pricing, branding)
6. Financial Projections (Y1 revenue, Y3 revenue, break-even, funding needed)
7. 4-Phase Action Plan with specific milestones
8. Risk Assessment and Mitigation

Be specific, data-driven, and realistic. Focus on actionable insights.

Return ONLY a JSON object with the structure matching the BusinessPlan interface, no additional text or markdown.`;

  try {
    const response = await axios.post<XAIResponse>(
      XAI_API_URL,
      {
        model: 'grok-beta', // Updated from grok-2-1212 to latest stable model
        messages: [
          {
            role: 'system',
            content: 'You are a business strategy expert. Always return valid JSON only, no markdown or additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${XAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in xAI response');
    }

    try {
      // Clean the response
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Error parsing xAI response:', parseError);
      return getFallbackBusinessPlan(title, description);
    }
  } catch (error) {
    console.error('xAI API error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
    }
    return getFallbackBusinessPlan(title, description);
  }
}

export async function generateMarketResearch(query: string): Promise<any> {
  if (!XAI_API_KEY) {
    return getFallbackMarketResearch(query);
  }

  const prompt = `Conduct comprehensive market research for: "${query}"

Provide detailed analysis including:
1. Industry Overview and Size
2. Target Customer Profiles
3. Market Trends and Growth Drivers
4. Competitive Landscape
5. Regulatory Environment
6. Technology Requirements
7. Investment Landscape
8. Success Factors and KPIs

Return as structured JSON with detailed insights.`;

  try {
    const response = await axios.post<XAIResponse>(
      XAI_API_URL,
      {
        model: 'grok-beta', // Updated from grok-2-1212 to latest stable model
        messages: [
          {
            role: 'system',
            content: 'You are a market research analyst. Provide comprehensive, data-driven insights in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 3000,
      },
      {
        headers: {
          'Authorization': `Bearer ${XAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0]?.message?.content;
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('xAI market research error:', error);
    return getFallbackMarketResearch(query);
  }
}

function getFallbackBusinessPlan(title: string, description: string): BusinessPlan {
  return {
    executiveSummary: `${title} represents a significant market opportunity in the innovation space. ${description} This venture addresses a clear market gap with strong potential for growth and scalability. With the right execution strategy and funding, this could capture a meaningful share of the target market within 3-5 years.`,
    marketAnalysis: {
      targetMarket: "Early adopters and innovation-focused customers",
      marketSize: "$2.5B",
      growthRate: "23% CAGR",
      keyTrends: [
        "Digital transformation acceleration",
        "Increased demand for innovative solutions",
        "Market consolidation creating opportunities",
        "Shift towards sustainable business models"
      ],
      customerSegments: [
        "Tech-savvy early adopters",
        "Small to medium businesses",
        "Enterprise innovation teams",
        "Individual professionals"
      ]
    },
    competitiveAnalysis: {
      mainCompetitors: [
        "Traditional solutions (indirect)",
        "DIY approaches",
        "Emerging startups in adjacent spaces"
      ],
      competitiveAdvantage: "First-mover advantage with unique value proposition",
      marketPositioning: "Premium solution with superior user experience",
      barriers: [
        "Network effects once established",
        "Proprietary technology and data",
        "Brand recognition and trust",
        "Strategic partnerships"
      ]
    },
    businessModel: {
      revenueStreams: [
        "Subscription (SaaS) - primary",
        "Professional services",
        "API access and integrations",
        "Premium features and add-ons"
      ],
      costStructure: [
        "Technology development and maintenance",
        "Customer acquisition",
        "Operations and support",
        "Marketing and sales"
      ],
      keyPartners: [
        "Technology providers",
        "Distribution partners",
        "Industry associations",
        "Strategic investors"
      ],
      keyResources: [
        "Proprietary technology",
        "Talented team",
        "Customer data and insights",
        "Brand and reputation"
      ]
    },
    marketingStrategy: {
      channels: [
        "Content marketing and SEO",
        "Social media presence",
        "Partnership channels",
        "Direct sales"
      ],
      customerAcquisition: "Freemium model with viral growth loops",
      pricing: "Tiered pricing from $29-$299/month",
      branding: "Innovation-focused, trustworthy, user-centric"
    },
    financialProjections: {
      yearOneRevenue: "$500K",
      yearThreeRevenue: "$5M",
      breakEvenTimeline: "Month 18",
      fundingNeeded: "$1.5M seed round"
    },
    actionPlan: {
      phase1: {
        name: "Discovery & Validation",
        duration: "3 months",
        milestones: [
          "Complete market research",
          "Validate with 100 potential customers",
          "Define MVP features",
          "Secure initial funding"
        ]
      },
      phase2: {
        name: "MVP Development",
        duration: "6 months",
        milestones: [
          "Build core functionality",
          "Launch beta with 50 users",
          "Iterate based on feedback",
          "Achieve product-market fit"
        ]
      },
      phase3: {
        name: "Market Launch",
        duration: "6 months",
        milestones: [
          "Public launch",
          "Acquire first 1,000 customers",
          "Establish marketing channels",
          "Build strategic partnerships"
        ]
      },
      phase4: {
        name: "Scale & Growth",
        duration: "12 months",
        milestones: [
          "Scale to 10,000 customers",
          "Expand feature set",
          "Enter new markets",
          "Raise Series A funding"
        ]
      }
    },
    risks: {
      topRisks: [
        "Market adoption slower than expected",
        "Competition from established players",
        "Technical challenges in scaling",
        "Regulatory changes"
      ],
      mitigationStrategies: [
        "Maintain lean operations for longer runway",
        "Build strong differentiation and moat",
        "Invest in robust technical architecture",
        "Stay informed on regulatory landscape"
      ]
    }
  };
}

function getFallbackMarketResearch(query: string): any {
  return {
    industryOverview: {
      marketSize: "$10B+",
      growthRate: "15-20% annually",
      maturity: "Emerging/Growth stage",
      keyPlayers: ["Various startups and established companies"]
    },
    customerProfiles: [
      {
        segment: "Early Adopters",
        size: "10-15% of market",
        characteristics: ["Tech-savvy", "Innovation-focused", "Higher disposable income"],
        painPoints: ["Lack of integrated solutions", "High costs", "Complexity"]
      }
    ],
    trends: [
      "Digital transformation",
      "AI integration",
      "Sustainability focus",
      "Remote/hybrid solutions"
    ],
    competitiveLandscape: {
      directCompetitors: 3,
      indirectCompetitors: 10,
      marketConcentration: "Fragmented",
      entryBarriers: "Medium"
    },
    regulatory: {
      keyRegulations: ["Data privacy", "Industry-specific compliance"],
      riskLevel: "Medium",
      trends: "Increasing regulation expected"
    },
    technology: {
      requiredStack: ["Cloud infrastructure", "AI/ML", "Modern web technologies"],
      developmentTime: "6-12 months",
      technicalChallenges: ["Scale", "Integration", "Security"]
    },
    investment: {
      typicalSeedRound: "$500K-$2M",
      averageSeriesA: "$5M-$15M",
      investorInterest: "High",
      exitPotential: "Acquisition or IPO in 5-7 years"
    }
  };
}