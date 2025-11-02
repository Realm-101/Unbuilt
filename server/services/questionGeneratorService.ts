import { getGeminiClient, isGeminiAvailable } from './geminiConversationService';
import type { ConversationMessage, SuggestedQuestion } from '@shared/schema';
import type { SearchResult } from '@shared/schema';

/**
 * Question Generator Service
 * 
 * Generates suggested follow-up questions for conversations based on:
 * - Analysis results (gaps, competitors, scores)
 * - Conversation history
 * - Question categories and priorities
 */

/**
 * Question category types
 */
export type QuestionCategory = 
  | 'market_validation' 
  | 'competitive_analysis' 
  | 'execution_strategy' 
  | 'risk_assessment';

/**
 * Generated question with metadata
 */
export interface GeneratedQuestion {
  text: string;
  category: QuestionCategory;
  priority: number;
  relevanceScore: number;
}

/**
 * Analysis data for question generation
 */
export interface AnalysisData {
  query: string;
  innovationScore?: number;
  feasibilityRating?: string;
  topGaps: Array<{
    title: string;
    category: string;
    feasibility: string;
    marketPotential: string;
    innovationScore: number;
  }>;
  competitors?: string[];
  actionPlan?: any;
}

/**
 * Question templates by category
 */
const QUESTION_TEMPLATES: Record<QuestionCategory, string[]> = {
  market_validation: [
    "What evidence supports the market demand for {gap}?",
    "Who are the early adopters most likely to try {gap}?",
    "What market trends make {gap} timely right now?",
    "How large is the addressable market for {gap}?",
    "What customer pain points does {gap} solve?",
    "How would you validate demand for {gap} before building?",
    "What pricing model would work best for {gap}?",
    "Which geographic markets should be targeted first for {gap}?",
  ],
  competitive_analysis: [
    "Why haven't existing competitors addressed {gap}?",
    "What would be my unique competitive advantage with {gap}?",
    "Which competitor poses the biggest threat to {gap}?",
    "How defensible is the position for {gap}?",
    "What barriers to entry exist for {gap}?",
    "How would incumbents likely respond to {gap}?",
    "What partnerships could strengthen {gap}?",
    "What intellectual property considerations exist for {gap}?",
  ],
  execution_strategy: [
    "What should be my first step to validate {gap}?",
    "What resources would I need to get started with {gap}?",
    "What's the minimum viable product for {gap}?",
    "How long would it take to launch {gap}?",
    "What team composition is needed for {gap}?",
    "What technology stack would work best for {gap}?",
    "How should I prioritize features for {gap}?",
    "What metrics should I track for {gap}?",
  ],
  risk_assessment: [
    "What are the biggest risks I should prepare for with {gap}?",
    "What regulatory challenges might {gap} face?",
    "What could cause {gap} to fail?",
    "How capital-intensive is {gap}?",
    "What market conditions could negatively impact {gap}?",
    "What technical risks exist for {gap}?",
    "How dependent is {gap} on external factors?",
    "What's the worst-case scenario for {gap}?",
  ],
};

/**
 * Initial questions for new conversations (category-based)
 */
const INITIAL_QUESTIONS: Record<QuestionCategory, string[]> = {
  market_validation: [
    "What evidence supports the market demand for this opportunity?",
    "Who are the early adopters most likely to try this?",
    "What market trends make this opportunity timely?",
  ],
  competitive_analysis: [
    "Why haven't existing competitors addressed this gap?",
    "What would be my unique competitive advantage?",
    "Which competitor poses the biggest threat?",
  ],
  execution_strategy: [
    "What should be my first step to validate this idea?",
    "What resources would I need to get started?",
    "What are the biggest risks I should prepare for?",
  ],
  risk_assessment: [
    "What could cause this opportunity to fail?",
    "What regulatory challenges might I face?",
    "How capital-intensive is this opportunity?",
  ],
};

/**
 * Generate initial questions for a new conversation
 * 
 * @param analysis - Analysis data including gaps and scores
 * @returns Array of generated questions with priorities
 */
export async function generateInitialQuestions(
  analysis: AnalysisData
): Promise<GeneratedQuestion[]> {
  const questions: GeneratedQuestion[] = [];
  
  // Get top gap for context
  const topGap = analysis.topGaps[0];
  const gapTitle = topGap?.title || 'this opportunity';
  
  // Always include all categories to ensure we have enough questions
  const categories: QuestionCategory[] = [
    'market_validation',
    'competitive_analysis',
    'execution_strategy',
    'risk_assessment',
  ];
  
  for (const category of categories) {
    const templates = INITIAL_QUESTIONS[category];
    
    // Determine number of questions per category
    let numQuestions = 1;
    if (category === 'market_validation') {
      numQuestions = 2; // Always prioritize market validation
    } else if (category === 'risk_assessment') {
      // Boost risk questions for low feasibility
      numQuestions = analysis.feasibilityRating === 'low' ? 2 : 1;
    }
    
    const selectedTemplates = templates.slice(0, numQuestions);
    
    for (let i = 0; i < selectedTemplates.length; i++) {
      const template = selectedTemplates[i];
      const text = template.replace(/{gap}/g, gapTitle);
      
      // Calculate priority based on category and position
      const categoryPriority = getCategoryBasePriority(category, analysis);
      const positionBonus = (selectedTemplates.length - i) * 5;
      const priority = categoryPriority + positionBonus;
      
      questions.push({
        text,
        category,
        priority,
        relevanceScore: calculateRelevanceScore(category, analysis),
      });
    }
  }
  
  // Sort by priority (highest first)
  questions.sort((a, b) => b.priority - a.priority);
  
  // Return exactly 5 questions
  return questions.slice(0, 5);
}

/**
 * Generate follow-up questions based on conversation history
 * 
 * @param analysis - Analysis data
 * @param conversationHistory - Previous messages in the conversation
 * @returns Array of generated questions with priorities
 */
export async function generateFollowUpQuestions(
  analysis: AnalysisData,
  conversationHistory: ConversationMessage[]
): Promise<GeneratedQuestion[]> {
  // If Gemini is available, use AI to generate contextual questions
  if (isGeminiAvailable()) {
    try {
      return await generateAIFollowUpQuestions(analysis, conversationHistory);
    } catch (error) {
      console.error('Failed to generate AI follow-up questions:', error);
      // Fall back to template-based generation
    }
  }
  
  // Template-based generation as fallback
  return generateTemplateFollowUpQuestions(analysis, conversationHistory);
}

/**
 * Generate follow-up questions using AI
 */
async function generateAIFollowUpQuestions(
  analysis: AnalysisData,
  conversationHistory: ConversationMessage[]
): Promise<GeneratedQuestion[]> {
  try {
    const client = getGeminiClient();
    
    // Build context from conversation
    const recentMessages = conversationHistory.slice(-6); // Last 3 exchanges
    const conversationContext = recentMessages
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
      .join('\n');
    
    // Build analysis context
    const topGaps = analysis.topGaps.slice(0, 3);
    const analysisContext = `
Original Query: ${analysis.query}
Innovation Score: ${analysis.innovationScore || 'N/A'}
Feasibility: ${analysis.feasibilityRating || 'N/A'}
Top Gaps: ${topGaps.map(g => `- ${g.title} (${g.category})`).join('\n')}
    `.trim();
    
    const prompt = `You are helping generate follow-up questions for a business opportunity analysis conversation.

${analysisContext}

Recent Conversation:
${conversationContext}

Generate 5 relevant follow-up questions that:
1. Build on what has been discussed
2. Address gaps in understanding
3. Help the user make progress
4. Are specific and actionable
5. Cover different aspects (market, competition, execution, risks)

For each question, specify:
- The question text
- Category: market_validation, competitive_analysis, execution_strategy, or risk_assessment
- Priority: 0-100 (higher = more important)

Format as JSON array:
[
  {"text": "question text", "category": "market_validation", "priority": 85},
  ...
]`;

    // Use the Gemini API (type assertion to work around type issues)
    const model: any = await (client.models as any).get('gemini-2.5-pro-latest');
    const response: any = await model.generateContent({
      config: {
        temperature: 0.8,
        maxOutputTokens: 1000,
      },
      contents: prompt,
    });
    
    const content = response.text || '';
    
    // Parse JSON response
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((q: any) => ({
          text: q.text,
          category: q.category as QuestionCategory,
          priority: q.priority || 50,
          relevanceScore: q.priority || 50,
        }));
      }
    } catch (error) {
      console.error('Failed to parse AI-generated questions:', error);
    }
  } catch (error) {
    console.error('Failed to generate AI questions:', error);
  }
  
  // Fallback if AI generation fails
  return generateTemplateFollowUpQuestions(analysis, conversationHistory);
}

/**
 * Generate follow-up questions using templates
 */
function generateTemplateFollowUpQuestions(
  analysis: AnalysisData,
  conversationHistory: ConversationMessage[]
): Promise<GeneratedQuestion[]> {
  const questions: GeneratedQuestion[] = [];
  
  // Extract topics discussed from conversation
  const discussedTopics = extractDiscussedTopics(conversationHistory);
  
  // Get top gap for context
  const topGap = analysis.topGaps[0];
  const gapTitle = topGap?.title || 'this opportunity';
  
  // Generate questions from each category
  const categories: QuestionCategory[] = [
    'market_validation',
    'competitive_analysis',
    'execution_strategy',
    'risk_assessment',
  ];
  
  for (const category of categories) {
    // Skip if this category was heavily discussed
    if (discussedTopics[category] > 3) {
      continue;
    }
    
    const templates = QUESTION_TEMPLATES[category];
    const unusedTemplates = templates.filter(t => {
      const questionText = t.replace(/{gap}/g, gapTitle);
      return !isQuestionSimilarToHistory(questionText, conversationHistory);
    });
    
    if (unusedTemplates.length > 0) {
      // Pick 1-2 questions from this category
      const numQuestions = Math.min(2, unusedTemplates.length);
      const selectedTemplates = unusedTemplates.slice(0, numQuestions);
      
      for (const template of selectedTemplates) {
        const text = template.replace(/{gap}/g, gapTitle);
        const priority = calculateFollowUpPriority(
          category,
          analysis,
          discussedTopics
        );
        
        questions.push({
          text,
          category,
          priority,
          relevanceScore: priority,
        });
      }
    }
  }
  
  // Sort by priority and return top 5
  questions.sort((a, b) => b.priority - a.priority);
  return Promise.resolve(questions.slice(0, 5));
}

/**
 * Extract discussed topics from conversation history
 */
function extractDiscussedTopics(
  conversationHistory: ConversationMessage[]
): Record<QuestionCategory, number> {
  const topics: Record<QuestionCategory, number> = {
    market_validation: 0,
    competitive_analysis: 0,
    execution_strategy: 0,
    risk_assessment: 0,
  };
  
  const keywords: Record<QuestionCategory, string[]> = {
    market_validation: ['market', 'demand', 'customer', 'audience', 'pricing', 'revenue'],
    competitive_analysis: ['competitor', 'competition', 'advantage', 'differentiation', 'threat'],
    execution_strategy: ['build', 'launch', 'mvp', 'team', 'resource', 'timeline', 'feature'],
    risk_assessment: ['risk', 'challenge', 'fail', 'regulatory', 'capital', 'worst'],
  };
  
  for (const message of conversationHistory) {
    const content = message.content.toLowerCase();
    
    for (const [category, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (content.includes(word)) {
          topics[category as QuestionCategory]++;
        }
      }
    }
  }
  
  return topics;
}

/**
 * Check if a question is similar to any in conversation history
 */
function isQuestionSimilarToHistory(
  question: string,
  conversationHistory: ConversationMessage[]
): boolean {
  const questionLower = question.toLowerCase();
  const questionWords = new Set(
    questionLower.split(/\s+/).filter(w => w.length > 3)
  );
  
  for (const message of conversationHistory) {
    if (message.role === 'user') {
      const messageLower = message.content.toLowerCase();
      const messageWords = new Set(
        messageLower.split(/\s+/).filter(w => w.length > 3)
      );
      
      // Calculate word overlap
      const overlap = [...questionWords].filter(w => messageWords.has(w)).length;
      const similarity = overlap / Math.max(questionWords.size, messageWords.size);
      
      // If >50% similar, consider it a duplicate
      if (similarity > 0.5) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get base priority for a category based on analysis
 */
function getCategoryBasePriority(
  category: QuestionCategory,
  analysis: AnalysisData
): number {
  const basePriorities: Record<QuestionCategory, number> = {
    market_validation: 80,
    competitive_analysis: 70,
    execution_strategy: 75,
    risk_assessment: 65,
  };
  
  let priority = basePriorities[category];
  
  // Adjust based on analysis data
  if (category === 'market_validation') {
    // Higher priority if innovation score is high
    if (analysis.innovationScore && analysis.innovationScore > 80) {
      priority += 10;
    }
  }
  
  if (category === 'competitive_analysis') {
    // Higher priority if there are many competitors
    if (analysis.competitors && analysis.competitors.length > 3) {
      priority += 10;
    }
  }
  
  if (category === 'execution_strategy') {
    // Higher priority if feasibility is high
    if (analysis.feasibilityRating === 'high') {
      priority += 10;
    }
  }
  
  if (category === 'risk_assessment') {
    // Higher priority if feasibility is low
    if (analysis.feasibilityRating === 'low') {
      priority += 15;
    }
  }
  
  return priority;
}

/**
 * Calculate follow-up priority based on conversation context
 */
function calculateFollowUpPriority(
  category: QuestionCategory,
  analysis: AnalysisData,
  discussedTopics: Record<QuestionCategory, number>
): number {
  // Start with base priority
  let priority = getCategoryBasePriority(category, analysis);
  
  // Reduce priority if topic was heavily discussed
  const discussionCount = discussedTopics[category];
  priority -= discussionCount * 10;
  
  // Boost priority for under-discussed topics
  const totalDiscussions = Object.values(discussedTopics).reduce((a, b) => a + b, 0);
  if (totalDiscussions > 0 && discussionCount === 0) {
    priority += 15; // Boost undiscussed topics
  }
  
  // Ensure priority stays in valid range
  return Math.max(0, Math.min(100, priority));
}

/**
 * Calculate relevance score for a question
 */
function calculateRelevanceScore(
  category: QuestionCategory,
  analysis: AnalysisData
): number {
  // Base score
  let score = 50;
  
  // Adjust based on analysis characteristics
  if (category === 'market_validation') {
    score += (analysis.innovationScore || 50) * 0.3;
  }
  
  if (category === 'competitive_analysis') {
    const competitorCount = analysis.competitors?.length || 0;
    score += Math.min(30, competitorCount * 5);
  }
  
  if (category === 'execution_strategy') {
    if (analysis.feasibilityRating === 'high') {
      score += 20;
    } else if (analysis.feasibilityRating === 'medium') {
      score += 10;
    }
  }
  
  if (category === 'risk_assessment') {
    if (analysis.feasibilityRating === 'low') {
      score += 25;
    }
  }
  
  return Math.min(100, score);
}

/**
 * Deduplicate questions by removing similar ones
 * 
 * @param questions - Array of questions to deduplicate
 * @returns Deduplicated array of questions
 */
export function deduplicateQuestions(
  questions: GeneratedQuestion[]
): GeneratedQuestion[] {
  const unique: GeneratedQuestion[] = [];
  
  for (const question of questions) {
    const isDuplicate = unique.some(existing => {
      return areSimilarQuestions(question.text, existing.text);
    });
    
    if (!isDuplicate) {
      unique.push(question);
    }
  }
  
  return unique;
}

/**
 * Check if two questions are similar
 */
function areSimilarQuestions(q1: string, q2: string): boolean {
  // Remove punctuation and normalize
  const normalize = (text: string) => 
    text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
  
  const words1 = new Set(normalize(q1));
  const words2 = new Set(normalize(q2));
  
  // Calculate Jaccard similarity (intersection / union)
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  const similarity = union > 0 ? intersection / union : 0;
  
  return similarity >= 0.5; // 50% similarity threshold for better duplicate detection
}

/**
 * Filter questions that have already been asked
 * 
 * @param questions - Generated questions
 * @param existingQuestions - Questions already in the database
 * @returns Filtered questions
 */
export function filterExistingQuestions(
  questions: GeneratedQuestion[],
  existingQuestions: SuggestedQuestion[]
): GeneratedQuestion[] {
  return questions.filter(q => {
    return !existingQuestions.some(existing => {
      return areSimilarQuestions(q.text, existing.questionText);
    });
  });
}
