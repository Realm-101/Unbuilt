import axios from 'axios';
import type { ValidateIdea } from '@shared/schema';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

export interface AIValidationInsights {
  dimensions: {
    feasibility: {
      score: number;
      analysis: string;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
    };
    marketDemand: {
      score: number;
      analysis: string;
      targetAudienceSize: string;
      growthPotential: string;
      trends: string[];
    };
    innovation: {
      score: number;
      analysis: string;
      uniqueValueProposition: string;
      competitiveAdvantages: string[];
      patentability: string;
    };
    scalability: {
      score: number;
      analysis: string;
      growthFactors: string[];
      bottlenecks: string[];
      expansionOpportunities: string[];
    };
    viability: {
      score: number;
      analysis: string;
      revenueStreams: string[];
      costFactors: string[];
      profitabilityTimeline: string;
    };
  };
  overallAssessment: {
    score: number;
    verdict: 'Highly Promising' | 'Promising' | 'Moderate Potential' | 'Needs Work' | 'High Risk';
    summary: string;
    topStrengths: string[];
    criticalRisks: string[];
    nextSteps: string[];
  };
  competitorAnalysis: {
    directCompetitors: string[];
    indirectCompetitors: string[];
    marketPosition: string;
    differentiators: string[];
  };
  regulatoryConsiderations: {
    requirements: string[];
    challenges: string[];
    timeline: string;
  };
  fundingAdvice: {
    estimatedCapitalNeeded: string;
    fundingSources: string[];
    investorAppeal: string;
    pitchPoints: string[];
  };
}

export async function getAIValidationInsights(idea: ValidateIdea): Promise<AIValidationInsights> {
  if (!XAI_API_KEY) {
    console.warn('⚠️ xAI API key not configured - using fallback validation');
    return getFallbackInsights(idea);
  }

  const prompt = `Analyze this business idea comprehensively and provide detailed validation insights:

Title: ${idea.title}
Description: ${idea.description}
Target Market: ${idea.targetMarket}
Business Model: ${idea.businessModel}
Category: ${idea.category}
${idea.initialInvestment ? `Initial Investment: $${idea.initialInvestment}` : ''}
${idea.monthlyRevenue ? `Projected Monthly Revenue: $${idea.monthlyRevenue}` : ''}

Provide a comprehensive analysis including:

1. FEASIBILITY (0-100 score)
   - Technical feasibility
   - Resource requirements
   - Key strengths and weaknesses
   - Specific recommendations

2. MARKET DEMAND (0-100 score)
   - Target audience size and characteristics
   - Growth potential and market trends
   - Evidence of demand

3. INNOVATION (0-100 score)
   - Unique value proposition
   - Competitive advantages
   - Innovation level and patentability

4. SCALABILITY (0-100 score)
   - Growth factors and potential
   - Bottlenecks and limitations
   - Expansion opportunities

5. VIABILITY (0-100 score)
   - Revenue streams
   - Cost structure
   - Path to profitability

6. OVERALL ASSESSMENT
   - Combined score (0-100)
   - Verdict (Highly Promising/Promising/Moderate Potential/Needs Work/High Risk)
   - Top 3 strengths
   - Top 3 risks
   - Next 3 action steps

7. COMPETITOR ANALYSIS
   - Direct and indirect competitors
   - Market positioning
   - Key differentiators

8. REGULATORY CONSIDERATIONS
   - Requirements and challenges
   - Timeline for compliance

9. FUNDING ADVICE
   - Capital requirements
   - Best funding sources
   - Investor appeal factors

Return ONLY a JSON object matching the AIValidationInsights structure, no additional text.`;

  try {
    const response = await axios.post(
      XAI_API_URL,
      {
        model: 'grok-2-1212',
        messages: [
          {
            role: 'system',
            content: 'You are a business validation expert. Provide thorough, data-driven analysis in JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
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
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Error parsing xAI validation response:', parseError);
      return getFallbackInsights(idea);
    }
  } catch (error) {
    console.error('xAI validation error:', error);
    return getFallbackInsights(idea);
  }
}

function getFallbackInsights(idea: ValidateIdea): AIValidationInsights {
  // Analyze the idea using heuristics
  const hasDetailedDescription = idea.description.length > 100;
  const hasFinancials = !!idea.initialInvestment && !!idea.monthlyRevenue;
  const isTech = idea.category === 'tech' || idea.category === 'saas';
  
  // Base scores on simple analysis
  const feasibilityScore = hasDetailedDescription ? 70 : 50;
  const marketScore = idea.targetMarket.length > 50 ? 75 : 55;
  const innovationScore = isTech ? 80 : 60;
  const scalabilityScore = idea.businessModel.includes('subscription') || idea.businessModel.includes('saas') ? 85 : 65;
  const viabilityScore = hasFinancials ? 70 : 50;
  
  const overallScore = Math.round((feasibilityScore + marketScore + innovationScore + scalabilityScore + viabilityScore) / 5);
  
  let verdict: AIValidationInsights['overallAssessment']['verdict'] = 'Moderate Potential';
  if (overallScore >= 80) verdict = 'Highly Promising';
  else if (overallScore >= 70) verdict = 'Promising';
  else if (overallScore < 50) verdict = 'Needs Work';

  return {
    dimensions: {
      feasibility: {
        score: feasibilityScore,
        analysis: `The ${idea.category} idea shows ${hasDetailedDescription ? 'good' : 'moderate'} feasibility based on the description provided.`,
        strengths: [
          hasDetailedDescription ? 'Well-defined concept' : 'Clear basic concept',
          `Fits within ${idea.category} market`,
          'Achievable with current technology'
        ],
        weaknesses: [
          !hasDetailedDescription ? 'Needs more detailed planning' : 'Implementation complexity',
          'Resource requirements not fully defined',
          'Technical challenges to address'
        ],
        recommendations: [
          'Create detailed technical specifications',
          'Identify key technical partners',
          'Develop proof of concept'
        ]
      },
      marketDemand: {
        score: marketScore,
        analysis: `The target market "${idea.targetMarket}" indicates ${marketScore > 60 ? 'strong' : 'moderate'} potential demand.`,
        targetAudienceSize: 'Medium to Large',
        growthPotential: '15-25% annually',
        trends: [
          'Digital transformation',
          'Increasing market sophistication',
          'Growing demand for innovative solutions'
        ]
      },
      innovation: {
        score: innovationScore,
        analysis: `The concept demonstrates ${innovationScore > 70 ? 'high' : 'moderate'} innovation in the ${idea.category} space.`,
        uniqueValueProposition: `Addresses unmet needs in ${idea.targetMarket}`,
        competitiveAdvantages: [
          'First-mover potential',
          'Unique approach to problem',
          'Technology differentiation'
        ],
        patentability: isTech ? 'Potential for utility patents' : 'Limited patent opportunities'
      },
      scalability: {
        score: scalabilityScore,
        analysis: `The ${idea.businessModel} model offers ${scalabilityScore > 70 ? 'excellent' : 'good'} scalability potential.`,
        growthFactors: [
          'Digital delivery model',
          'Low marginal costs',
          'Network effects potential'
        ],
        bottlenecks: [
          'Customer acquisition costs',
          'Technical infrastructure',
          'Market education needed'
        ],
        expansionOpportunities: [
          'Geographic expansion',
          'Adjacent market entry',
          'Product line extensions'
        ]
      },
      viability: {
        score: viabilityScore,
        analysis: `Financial viability is ${hasFinancials ? 'promising with proper execution' : 'uncertain without detailed projections'}.`,
        revenueStreams: [
          'Primary: Direct sales/subscriptions',
          'Secondary: Premium features',
          'Tertiary: Partnership revenue'
        ],
        costFactors: [
          'Development costs',
          'Marketing and sales',
          'Operations and support'
        ],
        profitabilityTimeline: hasFinancials ? '12-18 months' : '18-24 months'
      }
    },
    overallAssessment: {
      score: overallScore,
      verdict: verdict,
      summary: `This ${idea.category} idea targeting ${idea.targetMarket} shows ${verdict.toLowerCase()} with an overall score of ${overallScore}/100.`,
      topStrengths: [
        innovationScore > 70 ? 'Strong innovation potential' : 'Solid concept foundation',
        scalabilityScore > 70 ? 'Excellent scalability' : 'Good growth potential',
        marketScore > 60 ? 'Clear market need' : 'Defined target market'
      ],
      criticalRisks: [
        'Market adoption uncertainty',
        'Competition from established players',
        'Execution complexity'
      ],
      nextSteps: [
        'Validate with 50+ potential customers',
        'Develop MVP or prototype',
        'Create detailed financial model'
      ]
    },
    competitorAnalysis: {
      directCompetitors: [
        'Existing solutions in market',
        'Traditional alternatives',
        'Emerging startups'
      ],
      indirectCompetitors: [
        'DIY solutions',
        'Manual processes',
        'Adjacent market players'
      ],
      marketPosition: 'Challenger/Innovator position',
      differentiators: [
        'Unique approach',
        'Better user experience',
        'Cost effectiveness'
      ]
    },
    regulatoryConsiderations: {
      requirements: [
        'Business registration',
        'Industry-specific licenses',
        'Data privacy compliance'
      ],
      challenges: [
        'Regulatory complexity',
        'Compliance costs',
        'Ongoing monitoring'
      ],
      timeline: '3-6 months for full compliance'
    },
    fundingAdvice: {
      estimatedCapitalNeeded: idea.initialInvestment ? `$${idea.initialInvestment} - $${idea.initialInvestment * 3}` : '$50,000 - $500,000',
      fundingSources: [
        'Bootstrapping initially',
        'Angel investors',
        'Seed funding',
        'Crowdfunding'
      ],
      investorAppeal: `${overallScore > 70 ? 'High' : 'Moderate'} - ${verdict}`,
      pitchPoints: [
        'Clear problem-solution fit',
        'Scalable business model',
        'Growing market opportunity',
        'Experienced team (if applicable)'
      ]
    }
  };
}

export function combineValidationScores(
  traditionalScores: {
    originalityScore: number;
    credibilityScore: number;
    marketGapScore: number;
    competitionScore: number;
    overallScore: number;
  },
  aiInsights: AIValidationInsights
): {
  finalScore: number;
  confidence: 'Very High' | 'High' | 'Moderate' | 'Low';
  recommendation: string;
} {
  // Combine traditional and AI scores with weights
  const aiScore = aiInsights.overallAssessment.score;
  const traditionalScore = traditionalScores.overallScore;
  
  // 60% AI, 40% traditional for final score
  const finalScore = Math.round(aiScore * 0.6 + traditionalScore * 0.4);
  
  // Determine confidence based on score alignment
  const scoreDifference = Math.abs(aiScore - traditionalScore);
  let confidence: 'Very High' | 'High' | 'Moderate' | 'Low' = 'Moderate';
  
  if (scoreDifference < 10 && finalScore > 75) confidence = 'Very High';
  else if (scoreDifference < 15 && finalScore > 65) confidence = 'High';
  else if (scoreDifference > 30) confidence = 'Low';
  
  // Generate recommendation
  let recommendation = '';
  if (finalScore >= 80) {
    recommendation = 'Highly recommended - This idea shows exceptional promise. Move forward with confidence and focus on rapid validation and development.';
  } else if (finalScore >= 70) {
    recommendation = 'Recommended - This idea has strong potential. Address the identified weaknesses and proceed with customer validation.';
  } else if (finalScore >= 60) {
    recommendation = 'Conditionally recommended - This idea has merit but needs refinement. Focus on strengthening weak areas before major investment.';
  } else if (finalScore >= 50) {
    recommendation = 'Needs improvement - While there\'s potential, significant work is needed. Consider pivoting or major restructuring.';
  } else {
    recommendation = 'Not recommended in current form - The idea faces significant challenges. Consider a different approach or opportunity.';
  }
  
  return {
    finalScore,
    confidence,
    recommendation
  };
}