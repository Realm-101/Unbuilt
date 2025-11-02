/**
 * Question Prioritization Service
 * 
 * Calculates priority scores for suggested questions based on:
 * - Relevance to analysis (40%)
 * - User concerns from conversation (30%)
 * - Knowledge gaps (20%)
 * - Actionability (10%)
 * 
 * Requirements: 4.2, 4.6
 */

import type { ConversationMessage } from '@shared/schema';
import type { AnalysisData, GeneratedQuestion, QuestionCategory } from './questionGeneratorService';

/**
 * Priority calculation weights
 */
const PRIORITY_WEIGHTS = {
  relevance: 0.40,      // 40% - How relevant to the analysis
  userConcerns: 0.30,   // 30% - Addresses user's expressed concerns
  knowledgeGaps: 0.20,  // 20% - Fills gaps in understanding
  actionability: 0.10,  // 10% - How actionable the question is
};

/**
 * Priority score breakdown
 */
export interface PriorityScore {
  total: number;
  relevance: number;
  userConcerns: number;
  knowledgeGaps: number;
  actionability: number;
}

/**
 * Calculate comprehensive priority score for a question
 * 
 * @param question - The generated question
 * @param analysis - Analysis data
 * @param conversationHistory - Previous messages
 * @returns Priority score breakdown
 */
export function calculatePriorityScore(
  question: GeneratedQuestion,
  analysis: AnalysisData,
  conversationHistory: ConversationMessage[]
): PriorityScore {
  const relevance = calculateRelevanceScore(question, analysis);
  const userConcerns = calculateUserConcernsScore(question, conversationHistory);
  const knowledgeGaps = calculateKnowledgeGapsScore(question, conversationHistory, analysis);
  const actionability = calculateActionabilityScore(question);
  
  const total = 
    relevance * PRIORITY_WEIGHTS.relevance +
    userConcerns * PRIORITY_WEIGHTS.userConcerns +
    knowledgeGaps * PRIORITY_WEIGHTS.knowledgeGaps +
    actionability * PRIORITY_WEIGHTS.actionability;
  
  return {
    total: Math.round(total),
    relevance: Math.round(relevance),
    userConcerns: Math.round(userConcerns),
    knowledgeGaps: Math.round(knowledgeGaps),
    actionability: Math.round(actionability),
  };
}

/**
 * Calculate relevance score (40% weight)
 * 
 * Based on:
 * - How well the question relates to top gaps
 * - Innovation score alignment
 * - Feasibility rating alignment
 * - Category importance
 */
function calculateRelevanceScore(
  question: GeneratedQuestion,
  analysis: AnalysisData
): number {
  let score = 50; // Base score
  
  // Category-specific relevance
  const categoryRelevance = getCategoryRelevance(question.category, analysis);
  score += categoryRelevance * 0.3;
  
  // Innovation score alignment
  if (analysis.innovationScore) {
    if (question.category === 'market_validation' && analysis.innovationScore > 80) {
      score += 15; // High innovation = validate market demand
    }
    if (question.category === 'competitive_analysis' && analysis.innovationScore > 70) {
      score += 10; // High innovation = understand competition
    }
  }
  
  // Feasibility alignment
  if (analysis.feasibilityRating) {
    if (question.category === 'execution_strategy' && analysis.feasibilityRating === 'high') {
      score += 15; // High feasibility = focus on execution
    }
    if (question.category === 'risk_assessment' && analysis.feasibilityRating === 'low') {
      score += 20; // Low feasibility = understand risks
    }
  }
  
  // Top gap relevance
  const topGap = analysis.topGaps[0];
  if (topGap) {
    const gapKeywords = extractKeywords(topGap.title);
    const questionKeywords = extractKeywords(question.text);
    const overlap = gapKeywords.filter(k => questionKeywords.includes(k)).length;
    score += overlap * 5;
  }
  
  return Math.min(100, score);
}

/**
 * Calculate user concerns score (30% weight)
 * 
 * Based on:
 * - Topics the user has asked about
 * - Concerns expressed in messages
 * - Questions the user has asked
 * - Sentiment analysis
 */
function calculateUserConcernsScore(
  question: GeneratedQuestion,
  conversationHistory: ConversationMessage[]
): number {
  if (conversationHistory.length === 0) {
    return 50; // Default score for new conversations
  }
  
  let score = 40; // Base score
  
  // Extract user messages
  const userMessages = conversationHistory.filter(m => m.role === 'user');
  
  // Analyze user concerns
  const concerns = extractUserConcerns(userMessages);
  
  // Check if question addresses user concerns
  const questionKeywords = extractKeywords(question.text.toLowerCase());
  
  for (const concern of concerns) {
    const concernKeywords = extractKeywords(concern.toLowerCase());
    const overlap = concernKeywords.filter(k => questionKeywords.includes(k)).length;
    
    if (overlap > 0) {
      score += overlap * 10; // Boost for addressing concerns
    }
  }
  
  // Check if question category aligns with user's focus
  const categoryFocus = analyzeCategoryFocus(userMessages);
  if (categoryFocus[question.category] > 0) {
    score += categoryFocus[question.category] * 5;
  }
  
  // Boost if user asked similar questions
  const askedSimilar = userMessages.some(m => {
    const similarity = calculateTextSimilarity(m.content, question.text);
    return similarity > 0.3;
  });
  
  if (askedSimilar) {
    score += 20; // User is interested in this topic
  }
  
  return Math.min(100, score);
}

/**
 * Calculate knowledge gaps score (20% weight)
 * 
 * Based on:
 * - Topics not yet discussed
 * - Incomplete understanding indicators
 * - Missing information
 * - Unanswered aspects
 */
function calculateKnowledgeGapsScore(
  question: GeneratedQuestion,
  conversationHistory: ConversationMessage[],
  analysis: AnalysisData
): number {
  let score = 50; // Base score
  
  // Identify discussed topics
  const discussedTopics = identifyDiscussedTopics(conversationHistory);
  
  // Check if question addresses undiscussed topics
  const questionTopics = extractTopics(question.text);
  const undiscussedTopics = questionTopics.filter(t => !discussedTopics.includes(t));
  
  score += undiscussedTopics.length * 15; // Boost for new topics
  
  // Check category coverage
  const categoryCoverage = analyzeCategoryCoverage(conversationHistory);
  const categoryDiscussionCount = categoryCoverage[question.category] || 0;
  
  // Boost questions from under-discussed categories
  if (categoryDiscussionCount === 0) {
    score += 25; // Not discussed at all
  } else if (categoryDiscussionCount < 2) {
    score += 15; // Minimally discussed
  }
  
  // Check for incomplete understanding indicators
  const hasIncompleteUnderstanding = conversationHistory.some(m => {
    const content = m.content.toLowerCase();
    return (
      content.includes('not sure') ||
      content.includes('unclear') ||
      content.includes('confused') ||
      content.includes('don\'t understand') ||
      content.includes('?')
    );
  });
  
  if (hasIncompleteUnderstanding) {
    score += 10; // User needs more clarity
  }
  
  return Math.min(100, score);
}

/**
 * Calculate actionability score (10% weight)
 * 
 * Based on:
 * - How specific the question is
 * - Whether it leads to concrete actions
 * - Practical value
 * - Clarity
 */
function calculateActionabilityScore(question: GeneratedQuestion): number {
  let score = 50; // Base score
  
  const text = question.text.toLowerCase();
  
  // Boost for action-oriented keywords
  const actionKeywords = [
    'how', 'what', 'when', 'where', 'who',
    'should', 'would', 'could', 'can',
    'first step', 'start', 'begin', 'launch',
    'validate', 'test', 'measure', 'track',
    'build', 'create', 'develop', 'implement',
  ];
  
  for (const keyword of actionKeywords) {
    if (text.includes(keyword)) {
      score += 5;
    }
  }
  
  // Boost for specific questions (not too broad)
  const wordCount = question.text.split(/\s+/).length;
  if (wordCount >= 8 && wordCount <= 20) {
    score += 15; // Good specificity
  } else if (wordCount < 8) {
    score -= 10; // Too vague
  } else if (wordCount > 20) {
    score -= 5; // Too complex
  }
  
  // Category-specific actionability
  if (question.category === 'execution_strategy') {
    score += 15; // Execution questions are inherently actionable
  } else if (question.category === 'market_validation') {
    score += 10; // Validation questions lead to actions
  }
  
  // Boost for questions with clear outcomes
  const outcomeKeywords = ['validate', 'test', 'measure', 'calculate', 'determine', 'identify'];
  for (const keyword of outcomeKeywords) {
    if (text.includes(keyword)) {
      score += 8;
    }
  }
  
  return Math.min(100, score);
}

/**
 * Get category relevance based on analysis characteristics
 */
function getCategoryRelevance(
  category: QuestionCategory,
  analysis: AnalysisData
): number {
  const relevance: Record<QuestionCategory, number> = {
    market_validation: 70,
    competitive_analysis: 60,
    execution_strategy: 65,
    risk_assessment: 55,
  };
  
  // Adjust based on analysis data
  if (category === 'market_validation' && analysis.innovationScore && analysis.innovationScore > 75) {
    relevance[category] += 20;
  }
  
  if (category === 'competitive_analysis' && analysis.competitors && analysis.competitors.length > 2) {
    relevance[category] += 15;
  }
  
  if (category === 'execution_strategy' && analysis.feasibilityRating === 'high') {
    relevance[category] += 20;
  }
  
  if (category === 'risk_assessment' && analysis.feasibilityRating === 'low') {
    relevance[category] += 25;
  }
  
  return relevance[category];
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
}

/**
 * Extract user concerns from messages
 */
function extractUserConcerns(userMessages: ConversationMessage[]): string[] {
  const concerns: string[] = [];
  
  const concernIndicators = [
    'worried about',
    'concerned about',
    'afraid of',
    'unsure about',
    'not sure about',
    'question about',
    'wondering about',
    'confused about',
  ];
  
  for (const message of userMessages) {
    const content = message.content.toLowerCase();
    
    for (const indicator of concernIndicators) {
      if (content.includes(indicator)) {
        // Extract the concern (next few words after indicator)
        const index = content.indexOf(indicator);
        const afterIndicator = content.substring(index + indicator.length);
        const words = afterIndicator.split(/\s+/).slice(0, 5).join(' ');
        concerns.push(words);
      }
    }
  }
  
  return concerns;
}

/**
 * Analyze category focus from user messages
 */
function analyzeCategoryFocus(
  userMessages: ConversationMessage[]
): Record<QuestionCategory, number> {
  const focus: Record<QuestionCategory, number> = {
    market_validation: 0,
    competitive_analysis: 0,
    execution_strategy: 0,
    risk_assessment: 0,
  };
  
  const categoryKeywords: Record<QuestionCategory, string[]> = {
    market_validation: ['market', 'demand', 'customer', 'audience', 'pricing', 'revenue', 'size'],
    competitive_analysis: ['competitor', 'competition', 'advantage', 'differentiation', 'threat', 'rival'],
    execution_strategy: ['build', 'launch', 'mvp', 'team', 'resource', 'timeline', 'feature', 'develop'],
    risk_assessment: ['risk', 'challenge', 'fail', 'regulatory', 'capital', 'worst', 'problem'],
  };
  
  for (const message of userMessages) {
    const content = message.content.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          focus[category as QuestionCategory]++;
        }
      }
    }
  }
  
  return focus;
}

/**
 * Calculate text similarity (simple word overlap)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(extractKeywords(text1));
  const words2 = new Set(extractKeywords(text2));
  
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return union > 0 ? intersection / union : 0;
}

/**
 * Identify discussed topics from conversation
 */
function identifyDiscussedTopics(conversationHistory: ConversationMessage[]): string[] {
  const topics = new Set<string>();
  
  const topicKeywords = [
    'market', 'customer', 'demand', 'pricing', 'revenue',
    'competitor', 'competition', 'advantage', 'threat',
    'build', 'launch', 'mvp', 'team', 'resource',
    'risk', 'challenge', 'regulatory', 'capital',
  ];
  
  for (const message of conversationHistory) {
    const content = message.content.toLowerCase();
    
    for (const keyword of topicKeywords) {
      if (content.includes(keyword)) {
        topics.add(keyword);
      }
    }
  }
  
  return Array.from(topics);
}

/**
 * Extract topics from question text
 */
function extractTopics(text: string): string[] {
  const keywords = extractKeywords(text);
  
  const topicKeywords = [
    'market', 'customer', 'demand', 'pricing', 'revenue',
    'competitor', 'competition', 'advantage', 'threat',
    'build', 'launch', 'mvp', 'team', 'resource',
    'risk', 'challenge', 'regulatory', 'capital',
  ];
  
  return keywords.filter(k => topicKeywords.includes(k));
}

/**
 * Analyze category coverage in conversation
 */
function analyzeCategoryCoverage(
  conversationHistory: ConversationMessage[]
): Record<QuestionCategory, number> {
  const coverage: Record<QuestionCategory, number> = {
    market_validation: 0,
    competitive_analysis: 0,
    execution_strategy: 0,
    risk_assessment: 0,
  };
  
  const categoryKeywords: Record<QuestionCategory, string[]> = {
    market_validation: ['market', 'demand', 'customer', 'audience', 'pricing'],
    competitive_analysis: ['competitor', 'competition', 'advantage', 'threat'],
    execution_strategy: ['build', 'launch', 'mvp', 'team', 'resource'],
    risk_assessment: ['risk', 'challenge', 'fail', 'regulatory'],
  };
  
  for (const message of conversationHistory) {
    const content = message.content.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          coverage[category as QuestionCategory]++;
          break; // Count once per message per category
        }
      }
    }
  }
  
  return coverage;
}

/**
 * Prioritize a list of questions
 * 
 * @param questions - Questions to prioritize
 * @param analysis - Analysis data
 * @param conversationHistory - Conversation history
 * @returns Questions sorted by priority with scores
 */
export function prioritizeQuestions(
  questions: GeneratedQuestion[],
  analysis: AnalysisData,
  conversationHistory: ConversationMessage[]
): Array<GeneratedQuestion & { priorityScore: PriorityScore }> {
  const questionsWithScores = questions.map(question => {
    const priorityScore = calculatePriorityScore(question, analysis, conversationHistory);
    
    return {
      ...question,
      priority: priorityScore.total,
      priorityScore,
    };
  });
  
  // Sort by total priority score (descending)
  questionsWithScores.sort((a, b) => b.priority - a.priority);
  
  return questionsWithScores;
}
