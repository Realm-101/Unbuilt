import type { ValidateIdea, FinancialProjection } from '@shared/schema';

// Scoring weights for each dimension (total = 100%)
const SCORING_WEIGHTS = {
  originality: 0.25,
  credibility: 0.30,
  marketGap: 0.25,
  competition: 0.20
};

// Keywords that increase/decrease scores for different categories
const SCORING_KEYWORDS = {
  originality: {
    positive: ['innovative', 'novel', 'unique', 'revolutionary', 'breakthrough', 'disruptive', 'unprecedented', 'cutting-edge'],
    negative: ['similar', 'existing', 'traditional', 'conventional', 'standard', 'typical']
  },
  credibility: {
    positive: ['proven', 'validated', 'tested', 'experienced', 'established', 'research', 'data', 'evidence', 'pilot'],
    negative: ['untested', 'experimental', 'theoretical', 'speculative', 'unproven']
  },
  marketGap: {
    positive: ['unmet need', 'gap', 'underserved', 'lacking', 'missing', 'demand', 'opportunity', 'void'],
    negative: ['saturated', 'crowded', 'competitive', 'dominated', 'established players']
  },
  competition: {
    positive: ['first mover', 'no competition', 'blue ocean', 'differentiated', 'competitive advantage'],
    negative: ['many competitors', 'saturated market', 'commoditized', 'price war', 'dominated']
  }
};

export interface ScoringResult {
  originalityScore: number;
  credibilityScore: number;
  marketGapScore: number;
  competitionScore: number;
  overallScore: number;
  breakdown: {
    originality: { score: number; reasons: string[] };
    credibility: { score: number; reasons: string[] };
    marketGap: { score: number; reasons: string[] };
    competition: { score: number; reasons: string[] };
  };
}

export function calculateIdeaScore(idea: ValidateIdea): ScoringResult {
  const fullText = `${idea.title} ${idea.description} ${idea.targetMarket} ${idea.businessModel}`.toLowerCase();
  
  const breakdown = {
    originality: calculateDimensionScore(fullText, 'originality', idea),
    credibility: calculateDimensionScore(fullText, 'credibility', idea),
    marketGap: calculateDimensionScore(fullText, 'marketGap', idea),
    competition: calculateDimensionScore(fullText, 'competition', idea)
  };

  // Calculate individual scores
  const originalityScore = breakdown.originality.score;
  const credibilityScore = breakdown.credibility.score;
  const marketGapScore = breakdown.marketGap.score;
  const competitionScore = breakdown.competition.score;

  // Calculate weighted overall score
  const overallScore = Math.round(
    originalityScore * SCORING_WEIGHTS.originality +
    credibilityScore * SCORING_WEIGHTS.credibility +
    marketGapScore * SCORING_WEIGHTS.marketGap +
    competitionScore * SCORING_WEIGHTS.competition
  );

  return {
    originalityScore,
    credibilityScore,
    marketGapScore,
    competitionScore,
    overallScore,
    breakdown
  };
}

function calculateDimensionScore(
  text: string, 
  dimension: keyof typeof SCORING_KEYWORDS,
  idea: ValidateIdea
): { score: number; reasons: string[] } {
  const keywords = SCORING_KEYWORDS[dimension];
  let score = 50; // Base score
  const reasons: string[] = [];

  // Keyword-based scoring
  let positiveMatches = 0;
  let negativeMatches = 0;

  keywords.positive.forEach(keyword => {
    if (text.includes(keyword)) {
      positiveMatches++;
      reasons.push(`Contains "${keyword}"`);
    }
  });

  keywords.negative.forEach(keyword => {
    if (text.includes(keyword)) {
      negativeMatches++;
      reasons.push(`Contains "${keyword}" (negative)`);
    }
  });

  // Adjust score based on keyword matches
  score += (positiveMatches * 8) - (negativeMatches * 6);

  // Length and detail considerations
  const descriptionLength = idea.description.length;
  if (descriptionLength > 200) {
    score += 5;
    reasons.push('Detailed description');
  }
  if (descriptionLength < 50) {
    score -= 10;
    reasons.push('Description too brief');
  }

  // Category-specific adjustments
  if (dimension === 'originality') {
    if (idea.category === 'tech' || idea.category === 'saas') {
      score += 5; // Tech tends to be more innovative
      reasons.push('Technology category bonus');
    }
  }

  if (dimension === 'credibility') {
    if (idea.initialInvestment && idea.initialInvestment > 0) {
      score += 5;
      reasons.push('Investment planning shows preparation');
    }
    if (idea.monthlyRevenue && idea.monthlyRevenue > 0) {
      score += 8;
      reasons.push('Revenue projections show market validation');
    }
  }

  if (dimension === 'marketGap') {
    if (idea.targetMarket.length > 50) {
      score += 5;
      reasons.push('Well-defined target market');
    }
  }

  // Market size implications from financial projections
  if (dimension === 'competition' && idea.monthlyRevenue) {
    if (idea.monthlyRevenue > 50000) {
      score -= 5; // Higher revenue targets suggest more competition
      reasons.push('High revenue targets may indicate competitive market');
    } else if (idea.monthlyRevenue < 10000) {
      score += 3; // Lower targets might indicate niche/less competitive
      reasons.push('Modest revenue targets suggest niche market');
    }
  }

  // Ensure score stays within bounds
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons: reasons.slice(0, 3) // Limit to top 3 reasons
  };
}

// Business model scoring multipliers
const BUSINESS_MODEL_MULTIPLIERS: Record<string, number> = {
  'subscription': 1.1,
  'saas': 1.15,
  'marketplace': 1.05,
  'freemium': 1.0,
  'one-time': 0.95,
  'advertising': 0.9,
  'commission': 1.0
};

export function getBusinessModelMultiplier(businessModel: string): number {
  const model = businessModel.toLowerCase();
  
  for (const [key, multiplier] of Object.entries(BUSINESS_MODEL_MULTIPLIERS)) {
    if (model.includes(key)) {
      return multiplier;
    }
  }
  
  return 1.0; // Default multiplier
}

// Risk assessment based on financial projections
export function assessRisk(idea: ValidateIdea): { level: 'low' | 'medium' | 'high'; factors: string[] } {
  const factors: string[] = [];
  let riskScore = 0;

  // Investment risk
  if (idea.initialInvestment) {
    if (idea.initialInvestment > 100000) {
      riskScore += 2;
      factors.push('High initial investment required');
    } else if (idea.initialInvestment < 10000) {
      riskScore -= 1;
      factors.push('Low capital requirement');
    }
  }

  // Revenue vs expenses ratio
  if (idea.monthlyRevenue && idea.monthlyExpenses) {
    const ratio = idea.monthlyRevenue / idea.monthlyExpenses;
    if (ratio < 1.2) {
      riskScore += 2;
      factors.push('Tight profit margins');
    } else if (ratio > 3) {
      riskScore -= 1;
      factors.push('Healthy profit margins projected');
    }
  }

  // Category-based risk
  const highRiskCategories = ['tech', 'fintech', 'healthcare'];
  const lowRiskCategories = ['education', 'ecommerce'];
  
  if (highRiskCategories.includes(idea.category)) {
    riskScore += 1;
    factors.push('Higher-risk industry category');
  } else if (lowRiskCategories.includes(idea.category)) {
    riskScore -= 1;
    factors.push('Lower-risk industry category');
  }

  // Description complexity (too simple might indicate lack of planning)
  if (idea.description.length < 100) {
    riskScore += 1;
    factors.push('Limited detail in business description');
  }

  const level = riskScore <= 0 ? 'low' : riskScore <= 2 ? 'medium' : 'high';
  
  return { level, factors: factors.slice(0, 4) };
}