import type { ValidateIdea, FinancialProjection } from '@shared/schema';

export interface FinancialModel {
  projections: FinancialProjection[];
  summary: {
    totalInvestment: number;
    breakEvenMonth: number;
    fiveYearROI: number;
    maxCashFlow: number;
    totalProfit: number;
    averageGrowthRate: number;
  };
  keyMetrics: {
    monthlyBurnRate: number;
    customerAcquisitionCost: number;
    averageRevenuePerUser: number;
    paybackPeriod: number;
  };
  riskFactors: string[];
}

export function generateFinancialModel(idea: ValidateIdea): FinancialModel {
  const projections = generateProjections(idea);
  const summary = calculateSummary(projections, idea);
  const keyMetrics = calculateKeyMetrics(idea, projections);
  const riskFactors = identifyRiskFactors(idea, projections);

  return {
    projections,
    summary,
    keyMetrics,
    riskFactors
  };
}

function generateProjections(idea: ValidateIdea): FinancialProjection[] {
  const projections: FinancialProjection[] = [];
  
  // Base values from user input
  const initialRevenue = idea.monthlyRevenue || 0;
  const initialExpenses = idea.monthlyExpenses || 0;
  const initialInvestment = idea.initialInvestment || 0;

  // Growth assumptions based on business category
  const growthRates = getGrowthRates(idea.category);
  const expenseGrowthRate = 0.05; // 5% annual expense inflation

  let cumulativeCashFlow = -initialInvestment;
  let previousYearRevenue = initialRevenue * 12;
  let previousYearExpenses = initialExpenses * 12;

  for (let year = 1; year <= 5; year++) {
    // Calculate revenue growth (decreasing growth rate over time)
    const yearGrowthRate = growthRates.initial * Math.pow(growthRates.decay, year - 1);
    const revenue = Math.round(previousYearRevenue * (1 + yearGrowthRate));
    
    // Calculate expenses (slower growth than revenue)
    const expenses = Math.round(previousYearExpenses * (1 + expenseGrowthRate));
    
    const profit = revenue - expenses;
    cumulativeCashFlow += profit;
    
    // Estimate customer growth for SaaS/subscription models
    let customers: number | undefined;
    if (idea.businessModel.toLowerCase().includes('subscription') || 
        idea.businessModel.toLowerCase().includes('saas')) {
      customers = Math.round(revenue / (initialRevenue * 12 || 1000) * 100);
    }

    // Market share estimation (very rough)
    const marketShare = estimateMarketShare(idea, revenue, year);

    projections.push({
      year,
      revenue,
      expenses,
      profit,
      cashFlow: cumulativeCashFlow,
      customers,
      marketShare
    });

    previousYearRevenue = revenue;
    previousYearExpenses = expenses;
  }

  return projections;
}

function getGrowthRates(category: string): { initial: number; decay: number } {
  const categoryRates: Record<string, { initial: number; decay: number }> = {
    'tech': { initial: 0.8, decay: 0.7 }, // High initial growth, fast decay
    'saas': { initial: 0.6, decay: 0.8 }, // Sustainable growth
    'fintech': { initial: 0.5, decay: 0.75 },
    'ecommerce': { initial: 0.4, decay: 0.85 },
    'healthcare': { initial: 0.3, decay: 0.9 }, // Slower but steady
    'education': { initial: 0.25, decay: 0.9 },
    'marketplace': { initial: 0.7, decay: 0.65 }, // Network effects
    'sustainability': { initial: 0.35, decay: 0.88 },
    'other': { initial: 0.3, decay: 0.85 }
  };

  return categoryRates[category] || categoryRates['other'];
}

function estimateMarketShare(idea: ValidateIdea, revenue: number, year: number): number | undefined {
  // Very rough market size estimates by category (in millions)
  const marketSizes: Record<string, number> = {
    'tech': 1000000,
    'saas': 500000,
    'fintech': 300000,
    'ecommerce': 800000,
    'healthcare': 400000,
    'education': 200000,
    'marketplace': 600000,
    'sustainability': 150000,
    'other': 100000
  };

  const estimatedMarketSize = marketSizes[idea.category] || marketSizes['other'];
  return Math.min(99.9, (revenue / (estimatedMarketSize * 1000000)) * 100);
}

function calculateSummary(projections: FinancialProjection[], idea: ValidateIdea) {
  const totalInvestment = idea.initialInvestment || 0;
  const lastProjection = projections[projections.length - 1];
  const firstProfitableYear = projections.find(p => p.profit > 0);
  
  const totalProfit = projections.reduce((sum, p) => sum + p.profit, 0);
  const fiveYearROI = totalInvestment > 0 ? ((totalProfit - totalInvestment) / totalInvestment) * 100 : 0;
  
  // Calculate break-even month
  let breakEvenMonth = 0;
  let cumulativeProfit = -totalInvestment;
  const monthlyProfit = (firstProfitableYear?.profit || 0) / 12;
  
  if (monthlyProfit > 0) {
    breakEvenMonth = Math.ceil(Math.abs(cumulativeProfit) / monthlyProfit);
  }

  // Average growth rate calculation
  const revenues = projections.map(p => p.revenue);
  const growthRates = revenues.slice(1).map((rev, i) => (rev - revenues[i]) / revenues[i]);
  const averageGrowthRate = growthRates.length > 0 
    ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length * 100 
    : 0;

  return {
    totalInvestment,
    breakEvenMonth,
    fiveYearROI: Math.round(fiveYearROI),
    maxCashFlow: lastProjection?.cashFlow || 0,
    totalProfit: Math.round(totalProfit),
    averageGrowthRate: Math.round(averageGrowthRate)
  };
}

function calculateKeyMetrics(idea: ValidateIdea, projections: FinancialProjection[]) {
  const monthlyExpenses = idea.monthlyExpenses || 0;
  const monthlyRevenue = idea.monthlyRevenue || 0;
  
  // Customer acquisition assumptions
  const estimatedCustomers = projections[0]?.customers || 100;
  const customerAcquisitionCost = monthlyExpenses > 0 && estimatedCustomers > 0 
    ? Math.round((monthlyExpenses * 0.3) / (estimatedCustomers / 100)) // 30% of expenses on acquisition
    : 50;

  const averageRevenuePerUser = estimatedCustomers > 0 
    ? Math.round((monthlyRevenue * 12) / estimatedCustomers)
    : monthlyRevenue;

  const paybackPeriod = customerAcquisitionCost > 0 && averageRevenuePerUser > 0
    ? Math.round(customerAcquisitionCost / (averageRevenuePerUser / 12))
    : 0;

  return {
    monthlyBurnRate: monthlyExpenses,
    customerAcquisitionCost,
    averageRevenuePerUser,
    paybackPeriod
  };
}

function identifyRiskFactors(idea: ValidateIdea, projections: FinancialProjection[]): string[] {
  const risks: string[] = [];
  
  // High investment risk
  if (idea.initialInvestment && idea.initialInvestment > 100000) {
    risks.push('High initial capital requirement increases financial risk');
  }

  // Profitability concerns
  const profitableYears = projections.filter(p => p.profit > 0).length;
  if (profitableYears < 3) {
    risks.push('Extended time to profitability increases business risk');
  }

  // Cash flow risks
  const negativeCashFlowYears = projections.filter(p => p.cashFlow < 0).length;
  if (negativeCashFlowYears > 2) {
    risks.push('Negative cash flow for multiple years may require additional funding');
  }

  // Market risks by category
  const highRiskCategories = ['tech', 'fintech'];
  if (highRiskCategories.includes(idea.category)) {
    risks.push('High competition and rapid innovation in this sector');
  }

  // Revenue concentration risk
  if (idea.monthlyRevenue && idea.monthlyRevenue > 50000) {
    risks.push('High revenue targets may indicate dependence on large contracts');
  }

  // Growth sustainability
  const lastYear = projections[projections.length - 1];
  const secondLastYear = projections[projections.length - 2];
  if (lastYear && secondLastYear && lastYear.revenue < secondLastYear.revenue) {
    risks.push('Projected revenue decline in later years suggests market saturation');
  }

  return risks.slice(0, 5); // Limit to top 5 risks
}

export function calculateBreakEvenAnalysis(idea: ValidateIdea) {
  const monthlyRevenue = idea.monthlyRevenue || 0;
  const monthlyExpenses = idea.monthlyExpenses || 0;
  const initialInvestment = idea.initialInvestment || 0;
  
  if (monthlyRevenue <= monthlyExpenses) {
    return {
      breakEvenMonth: null,
      breakEvenRevenue: monthlyExpenses,
      monthsToROI: null,
      message: 'Revenue must exceed expenses to break even'
    };
  }

  const monthlyProfit = monthlyRevenue - monthlyExpenses;
  const breakEvenMonth = Math.ceil(initialInvestment / monthlyProfit);
  const monthsToROI = Math.ceil((initialInvestment * 1.2) / monthlyProfit); // 20% ROI target

  return {
    breakEvenMonth,
    breakEvenRevenue: monthlyRevenue,
    monthsToROI,
    monthlyProfit,
    message: `Break even after ${breakEvenMonth} months with ${monthlyProfit.toLocaleString()} monthly profit`
  };
}

export function generateScenarioAnalysis(idea: ValidateIdea) {
  const baseCase = generateFinancialModel(idea);
  
  // Optimistic scenario (+50% revenue, +20% expenses)
  const optimisticIdea = {
    ...idea,
    monthlyRevenue: (idea.monthlyRevenue || 0) * 1.5,
    monthlyExpenses: (idea.monthlyExpenses || 0) * 1.2
  };
  
  // Pessimistic scenario (-30% revenue, +10% expenses)
  const pessimisticIdea = {
    ...idea,
    monthlyRevenue: (idea.monthlyRevenue || 0) * 0.7,
    monthlyExpenses: (idea.monthlyExpenses || 0) * 1.1
  };

  return {
    baseCase,
    optimistic: generateFinancialModel(optimisticIdea),
    pessimistic: generateFinancialModel(pessimisticIdea)
  };
}