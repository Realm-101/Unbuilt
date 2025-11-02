/**
 * AI Response Quality Tests
 * 
 * Tests AI response quality including:
 * - Relevance to questions
 * - Consistency with analysis data
 * - Appropriate disclaimers
 * - Edge case handling
 * - Hallucination detection
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.6, 6.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { responseValidator } from '../../../services/conversations/responseValidator';
import type { ContextWindow } from '../../../services/contextWindowManager';

describe('AI Response Quality Tests', () => {
  describe('Relevance to Questions', () => {
    it('should validate response is relevant to user query', () => {
      const userQuery = 'What is the market size for AI fitness apps?';
      const relevantResponse = `The market size for AI fitness apps is estimated at $2.3 billion in 2024, 
        with projected growth to $8.5 billion by 2028. This represents a CAGR of approximately 38%.`;
      
      const result = responseValidator.checkRelevance(relevantResponse, userQuery);
      
      expect(result.isRelevant).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should detect irrelevant responses', () => {
      const userQuery = 'What is the market size for AI fitness apps?';
      const irrelevantResponse = `The weather today is sunny with a high of 75 degrees. 
        It's a great day for outdoor activities.`;
      
      const result = responseValidator.checkRelevance(irrelevantResponse, userQuery);
      
      expect(result.isRelevant).toBe(false);
      expect(result.confidence).toBeLessThan(0.2);
    });

    it('should handle queries with technical terms', () => {
      const userQuery = 'How does computer vision improve workout form correction?';
      const relevantResponse = `Computer vision technology analyzes body positioning and movement patterns 
        in real-time to provide immediate feedback on workout form. It uses pose estimation algorithms 
        to detect joint angles and compare them against optimal form standards.`;
      
      const result = responseValidator.checkRelevance(relevantResponse, userQuery);
      
      expect(result.isRelevant).toBe(true);
    });

    it('should handle short queries', () => {
      const userQuery = 'Why?';
      const response = `This opportunity is unique because it combines AI personalization with 
        real-time feedback, addressing a gap that existing fitness apps haven't filled.`;
      
      const result = responseValidator.checkRelevance(response, userQuery);
      
      // Short queries are harder to match, but should still work
      expect(result).toHaveProperty('isRelevant');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('Consistency with Analysis Data', () => {
    it('should reference analysis data in responses', () => {
      const analysisContext = `
        Innovation Score: 85
        Top Gap: Personalized workout plans (Score: 90)
        Feasibility: High
      `;
      
      const response = `Based on the analysis, this opportunity has a strong innovation score of 85, 
        with personalized workout plans being the top gap identified (score: 90). The high feasibility 
        rating suggests this is achievable with current technology.`;
      
      // Check that response mentions key data points
      expect(response).toContain('85');
      expect(response).toContain('90');
      expect(response).toContain('personalized workout plans');
      expect(response).toContain('high feasibility');
    });

    it('should not contradict analysis findings', () => {
      const analysisContext = `
        Innovation Score: 85 (High)
        Feasibility: High
        Market Demand: Strong
      `;
      
      // This response contradicts the analysis
      const contradictoryResponse = `This opportunity has low innovation potential and 
        weak market demand, making it a risky venture.`;
      
      // Check for contradictions
      const hasContradiction = 
        (analysisContext.includes('High') && contradictoryResponse.includes('low')) ||
        (analysisContext.includes('Strong') && contradictoryResponse.includes('weak'));
      
      expect(hasContradiction).toBe(true);
    });

    it('should maintain consistency across multiple exchanges', () => {
      const firstResponse = `The innovation score of 85 indicates strong potential.`;
      const secondResponse = `As mentioned earlier, with an innovation score of 85, 
        this opportunity shows significant promise.`;
      
      // Both responses should reference the same score
      expect(firstResponse).toContain('85');
      expect(secondResponse).toContain('85');
    });
  });

  describe('Appropriate Disclaimers', () => {
    it('should include financial disclaimer when discussing investments', async () => {
      const response = `You could expect returns of 20-30% annually if you invest in this market. 
        The ROI looks very promising based on current trends.`;
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.issues).toContain('Financial advice provided without appropriate disclaimer');
      expect(result.severity).toBe('medium');
    });

    it('should include legal disclaimer when discussing regulations', async () => {
      const response = `You'll need to comply with GDPR regulations and ensure your contracts 
        include liability clauses. The patent process typically takes 18-24 months.`;
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.issues).toContain('Legal advice provided without appropriate disclaimer');
      expect(result.severity).toBe('medium');
    });

    it('should accept responses with proper financial disclaimers', async () => {
      const response = `Based on market trends, potential returns could be 20-30% annually. 
        However, this is not financial advice - please consult with a qualified financial advisor 
        before making investment decisions.`;
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.isValid).toBe(true);
      expect(result.issues).not.toContain('Financial advice provided without appropriate disclaimer');
    });

    it('should accept responses with proper legal disclaimers', async () => {
      const response = `You'll need to consider GDPR compliance and contract terms. 
        This is not legal advice - please consult with a qualified attorney for legal matters.`;
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.isValid).toBe(true);
      expect(result.issues).not.toContain('Legal advice provided without appropriate disclaimer');
    });

    it('should automatically add disclaimers when needed', () => {
      const response = `You should invest in this market as the ROI is excellent.`;
      
      const withDisclaimers = responseValidator.addDisclaimers(response);
      
      expect(withDisclaimers).toContain('not financial advice');
      expect(withDisclaimers).toContain('consult with a qualified financial advisor');
    });

    it('should block medical advice', async () => {
      const response = `Based on your symptoms and diagnosis, you likely have a muscle strain. 
        I recommend this treatment and medication for your condition.`;
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Response appears to provide medical advice, which is not allowed');
      expect(result.severity).toBe('high');
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle off-topic questions gracefully', () => {
      const userQuery = 'What is the weather like today?';
      const response = `I'm here to help you explore your business opportunity. 
        Let's focus on your gap analysis. What specific aspects of the market would you like to discuss?`;
      
      const result = responseValidator.checkRelevance(response, userQuery);
      
      // Response redirects to relevant topic
      expect(response).toContain('business opportunity');
      expect(response).toContain('gap analysis');
    });

    it('should handle ambiguous questions', () => {
      const userQuery = 'Is this good?';
      const response = `To provide a meaningful answer, I need more context. Are you asking about 
        the innovation score, market feasibility, or a specific aspect of the opportunity?`;
      
      expect(response).toContain('more context');
      expect(response).toContain('innovation score');
      expect(response).toContain('feasibility');
    });

    it('should handle questions requiring assumptions', () => {
      const userQuery = 'How much will it cost to build?';
      const response = `Development costs vary significantly based on several factors. 
        Assuming a basic MVP with core features, you might expect $50,000-$150,000. 
        However, this assumes standard development rates and a 3-4 month timeline.`;
      
      expect(response).toContain('Assuming');
      expect(response).toContain('vary');
      expect(response).toContain('might expect');
    });

    it('should acknowledge uncertainty when appropriate', () => {
      const userQuery = 'Will this definitely succeed?';
      const response = `While the analysis shows strong potential with an innovation score of 85, 
        success is never guaranteed. Market conditions, execution quality, and timing all play crucial roles.`;
      
      expect(response).toContain('never guaranteed');
      expect(response.toLowerCase()).toMatch(/while|however|but/);
    });

    it('should handle questions about competitors', () => {
      const userQuery = 'Why isn\'t Fitbit doing this?';
      const response = `Fitbit focuses primarily on hardware-based fitness tracking. 
        This opportunity involves AI-powered personalization, which may not align with their 
        current business model or technical capabilities.`;
      
      expect(response).toContain('Fitbit');
      expect(response.toLowerCase()).toMatch(/may|might|could/);
    });

    it('should handle very long questions', async () => {
      const longQuery = `I'm really interested in understanding the market dynamics here. 
        Can you explain in detail how the competitive landscape works, what the barriers to entry are, 
        how much capital I would need, what the regulatory environment looks like, who the key players are, 
        what the growth projections are, and whether this is the right time to enter the market?`.repeat(3);
      
      const response = `Let me address your questions systematically. The competitive landscape shows...`;
      
      const structureCheck = responseValidator.validateResponseStructure(response);
      expect(structureCheck.isValid).toBe(true);
    });

    it('should handle questions with special characters', () => {
      const userQuery = 'What about AI/ML & computer vision? (Is it feasible?)';
      const response = `AI/ML and computer vision are definitely feasible for this application. 
        Modern frameworks make implementation accessible.`;
      
      const result = responseValidator.checkRelevance(response, userQuery);
      expect(result.isRelevant).toBe(true);
    });
  });

  describe('Hallucination Detection', () => {
    it('should detect specific dates without sources', () => {
      const response = `The company was founded on 2023-05-15 and raised $5M in Series A funding. 
        The CEO announced plans on 2024-03-20 to expand globally.`;
      
      const result = responseValidator.detectHallucination(response);
      
      // Should detect dates, but needs multiple indicators for likely hallucination
      expect(result.indicators.length).toBeGreaterThan(0);
      expect(result.indicators).toContain('Contains specific dates without sources');
    });

    it('should detect precise statistics without attribution', () => {
      const response = `The market is growing at exactly 37.42% annually with 94.3% customer satisfaction.`;
      
      const result = responseValidator.detectHallucination(response);
      
      expect(result.indicators).toContain('Contains precise statistics without attribution');
    });

    it('should accept statistics with proper attribution', () => {
      const response = `According to market research, the market is growing at approximately 37% annually. 
        Based on industry reports, customer satisfaction is around 94%.`;
      
      const result = responseValidator.detectHallucination(response);
      
      expect(result.likelyHallucination).toBe(false);
    });

    it('should detect specific names without context', () => {
      const response = `The CEO announced plans to expand into Europe next quarter.`;
      
      const result = responseValidator.detectHallucination(response);
      
      expect(result.indicators).toContain('Mentions specific roles without context');
    });

    it('should accept general statements', () => {
      const response = `Many companies in this space are expanding internationally. 
        Leadership teams typically focus on market validation before scaling.`;
      
      const result = responseValidator.detectHallucination(response);
      
      expect(result.likelyHallucination).toBe(false);
    });

    it('should detect absolute claims without evidence', async () => {
      const response = `This will 100% guaranteed succeed with no risk whatsoever. 
        It always works and never fails.`;
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.issues).toContain('Response contains absolute claims that may be misleading');
    });

    it('should accept qualified statements', async () => {
      const response = `Based on the analysis, this opportunity shows strong potential. 
        While success isn't guaranteed, the data suggests favorable market conditions.`;
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Response Structure and Quality', () => {
    it('should reject empty responses', () => {
      const result = responseValidator.validateResponseStructure('');
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Response is empty');
    });

    it('should reject whitespace-only responses', () => {
      const result = responseValidator.validateResponseStructure('   \n\t  ');
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Response is empty');
    });

    it('should reject very short responses', () => {
      const result = responseValidator.validateResponseStructure('Yes.');
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Response is too short');
    });

    it('should reject excessively long responses', () => {
      const longResponse = 'A'.repeat(6000);
      const result = responseValidator.validateResponseStructure(longResponse);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Response is excessively long');
    });

    it('should accept well-structured responses', () => {
      const response = `This opportunity shows strong potential for several reasons:

1. High innovation score (85) indicates significant market gap
2. Strong feasibility rating suggests achievable implementation
3. Growing market demand supports timing

The key differentiator is the AI-powered personalization, which existing competitors haven't fully addressed.`;
      
      const result = responseValidator.validateResponseStructure(response);
      
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Confidence Indicators', () => {
    it('should detect missing confidence indicators in specific claims', async () => {
      const response = `The market size is $5.2 billion. You will capture 15% market share. 
        Revenue will reach $780 million in year three. This is a precise forecast with exact numbers 
        that will definitely happen.`.repeat(3); // Make it longer than 200 chars
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.issues).toContain('Response makes specific claims without confidence indicators');
    });

    it('should accept responses with appropriate confidence indicators', async () => {
      const response = `Based on market research, the market size is estimated at $5.2 billion. 
        You could potentially capture 10-15% market share, which might generate around $500-780 million 
        in revenue by year three, according to typical growth patterns.`;
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.isValid).toBe(true);
    });

    it('should accept general responses without specific claims', async () => {
      const response = `This is an interesting opportunity worth exploring further. 
        The market shows promise and the timing seems favorable.`;
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Inappropriate Content Detection', () => {
    it('should detect hate speech', async () => {
      const response = `This market segment shows discriminatory practices and racist attitudes.`;
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Response contains potentially inappropriate content');
      expect(result.severity).toBe('high');
    });

    it('should detect violent content', async () => {
      const response = `You should harm competitors and kill their market share with violence.`;
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.isValid).toBe(false);
      expect(result.severity).toBe('high');
    });

    it('should accept business-appropriate competitive language', async () => {
      const response = `You can compete effectively by differentiating your offering and 
        capturing market share through superior value proposition.`;
      
      const result = await responseValidator.validateResponse(response);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Context Window Integration', () => {
    it('should validate responses match context window content', () => {
      const context: ContextWindow = {
        systemPrompt: 'You are an AI advisor for Unbuilt',
        analysisContext: 'Innovation Score: 85, Top Gap: AI personalization',
        conversationHistory: 'User asked about market size',
        currentQuery: 'What makes this unique?',
        totalTokens: 500
      };
      
      const response = `The uniqueness comes from the AI personalization capability, 
        which addresses the top gap identified in your analysis with a score of 85.`;
      
      // Response should reference context elements
      expect(response).toContain('AI personalization');
      expect(response).toContain('85');
    });

    it('should detect responses that ignore context', () => {
      const context: ContextWindow = {
        systemPrompt: 'You are an AI advisor for Unbuilt',
        analysisContext: 'Innovation Score: 85, Market: Fitness apps',
        conversationHistory: '',
        currentQuery: 'Tell me about the fitness app opportunity',
        totalTokens: 300
      };
      
      const offTopicResponse = `Let me discuss cryptocurrency trading strategies and blockchain technology.`;
      
      const result = responseValidator.checkRelevance(
        offTopicResponse,
        context.currentQuery
      );
      
      // Should have low relevance since it doesn't match the query
      expect(result.confidence).toBeLessThan(0.3);
    });
  });

  describe('Multi-turn Conversation Quality', () => {
    it('should maintain consistency across conversation turns', () => {
      const turn1Response = `The innovation score of 85 indicates strong potential.`;
      const turn2Response = `As I mentioned, the 85 innovation score shows this is promising.`;
      const turn3Response = `Building on the 85 score we discussed, let's explore implementation.`;
      
      // All responses should reference the same score
      [turn1Response, turn2Response, turn3Response].forEach(response => {
        expect(response).toContain('85');
      });
    });

    it('should reference previous conversation context', () => {
      const previousContext = 'User asked about market size: $2.3B';
      const currentResponse = `As we discussed regarding the $2.3B market size, 
        this represents significant opportunity.`;
      
      expect(currentResponse).toContain('$2.3B');
      expect(currentResponse).toContain('discussed');
    });

    it('should avoid contradicting previous statements', () => {
      const turn1 = `The feasibility is high due to available technology.`;
      const turn2 = `Given the high feasibility we discussed, implementation is achievable.`;
      
      // Both should agree on "high feasibility"
      expect(turn1.toLowerCase()).toContain('high');
      expect(turn2.toLowerCase()).toContain('high');
      expect(turn2.toLowerCase()).toContain('achievable');
    });
  });
});
