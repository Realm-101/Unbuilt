import { analyzeGaps } from './gemini';

interface ChatContext {
  message: string;
  context: Array<{ role: string; content: string }>;
  sessionId: string;
}

interface ChatResponse {
  response: string;
  suggestions?: string[];
  actions?: Array<{ label: string; action: string; data?: any }>;
  sessionId?: string;
}

// Knowledge base for common questions and guidance
const knowledgeBase = {
  gettingStarted: [
    "Start by searching for market gaps in your area of interest",
    "Use specific keywords related to problems you've observed",
    "Look for underserved customer segments",
    "Consider emerging technologies and their applications"
  ],
  ideaValidation: [
    "Check if similar solutions exist and how they perform",
    "Identify your unique value proposition",
    "Research your target market size",
    "Validate demand through customer interviews"
  ],
  marketTrends: [
    "AI and machine learning applications",
    "Sustainable and eco-friendly solutions",
    "Remote work and collaboration tools",
    "Health and wellness technology",
    "Creator economy platforms"
  ],
  searchTips: [
    "Be specific but not too narrow",
    "Use industry terms and keywords",
    "Try different angles and perspectives",
    "Combine problem areas with technologies"
  ]
};

// Intent classification
function classifyIntent(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('help') || lowerMessage.includes('how to') || lowerMessage.includes('get started')) {
    return 'help';
  }
  if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('gap') || lowerMessage.includes('opportunity')) {
    return 'discovery';
  }
  if (lowerMessage.includes('validate') || lowerMessage.includes('test') || lowerMessage.includes('verify')) {
    return 'validation';
  }
  if (lowerMessage.includes('trend') || lowerMessage.includes('popular') || lowerMessage.includes('emerging')) {
    return 'trends';
  }
  if (lowerMessage.includes('compete') || lowerMessage.includes('competition') || lowerMessage.includes('competitor')) {
    return 'competitive';
  }
  if (lowerMessage.includes('plan') || lowerMessage.includes('strategy') || lowerMessage.includes('business')) {
    return 'planning';
  }
  
  return 'general';
}

// Generate contextual suggestions
function generateSuggestions(intent: string, message: string): string[] {
  const suggestions: string[] = [];
  
  switch (intent) {
    case 'help':
      suggestions.push(
        "Show me how to find market gaps",
        "What makes a good business idea?",
        "How do I validate my concept?",
        "Explain the discovery process"
      );
      break;
    case 'discovery':
      suggestions.push(
        "Find gaps in healthcare technology",
        "Explore opportunities in education",
        "What problems do small businesses face?",
        "Show sustainable tech opportunities"
      );
      break;
    case 'validation':
      suggestions.push(
        "How to test market demand?",
        "Calculate potential market size",
        "Identify my target customers",
        "Analyze competitor weaknesses"
      );
      break;
    case 'trends':
      suggestions.push(
        "What's trending in AI applications?",
        "Show emerging markets in 2025",
        "Future of remote work tools",
        "Growing industries to watch"
      );
      break;
    case 'competitive':
      suggestions.push(
        "How to differentiate my product?",
        "Find competitor blind spots",
        "Analyze market positioning",
        "Identify underserved segments"
      );
      break;
    case 'planning':
      suggestions.push(
        "Create a business model canvas",
        "Build go-to-market strategy",
        "Calculate financial projections",
        "Define value proposition"
      );
      break;
    default:
      suggestions.push(
        "Help me find market opportunities",
        "What's trending in tech?",
        "How do I validate an idea?",
        "Show me successful examples"
      );
  }
  
  return suggestions.slice(0, 4);
}

// Generate action buttons based on context
function generateActions(intent: string, message: string): Array<{ label: string; action: string; data?: any }> {
  const actions = [];
  
  switch (intent) {
    case 'discovery':
      // Extract potential search terms
      const searchTerms = extractKeyTerms(message);
      if (searchTerms) {
        actions.push({
          label: '🔍 Search for gaps',
          action: 'search',
          data: searchTerms
        });
      }
      actions.push({
        label: '📊 View trends',
        action: 'trends'
      });
      break;
      
    case 'validation':
      const ideaTerms = extractKeyTerms(message);
      if (ideaTerms) {
        actions.push({
          label: '✅ Validate idea',
          action: 'validate',
          data: ideaTerms
        });
      }
      break;
      
    case 'trends':
      actions.push({
        label: '📈 Explore trends',
        action: 'trends'
      });
      break;
      
    case 'help':
      actions.push({
        label: '📚 View guide',
        action: 'help'
      });
      break;
  }
  
  return actions;
}

// Extract key terms from message for searches
function extractKeyTerms(message: string): string {
  // Remove common words and extract meaningful terms
  const stopWords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'but', 'help', 'me', 'find', 'search', 'show', 'want', 'need', 'looking', 'interested']);
  
  const words = message.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  return words.slice(0, 5).join(' ');
}

// Main chat processing function
export async function processChat(input: ChatContext): Promise<ChatResponse> {
  try {
    const { message, context, sessionId } = input;
    const intent = classifyIntent(message);
    
    // Generate response based on intent
    let response = '';
    
    switch (intent) {
      case 'help':
        response = `I'll help you get started with Unbuilt! Here's how to make the most of our platform:

1. **Discover Opportunities**: Search for market gaps by describing problems you've noticed or industries you're interested in.

2. **Validate Ideas**: Once you find an interesting opportunity, use our validation tools to assess market demand and feasibility.

3. **Analyze Trends**: Explore what's trending in different markets to spot emerging opportunities.

4. **Plan Your Business**: Generate business plans and action steps for your validated ideas.

💡 **Pro tip**: Start with a specific problem you've personally experienced - these often make the best business opportunities!`;
        break;
        
      case 'discovery':
        const searchQuery = extractKeyTerms(message);
        if (searchQuery) {
          response = `I'll help you explore market opportunities related to "${searchQuery}". 

Here's what I recommend:
• Focus on specific pain points in this area
• Look for underserved customer segments
• Consider how emerging technologies could solve existing problems
• Think about gaps in current solutions

Would you like me to search for specific opportunities now, or would you like to refine your search criteria?`;
        } else {
          response = `To find the best market opportunities, try to be specific about:
• The industry or sector you're interested in
• The problem you want to solve
• The target audience you want to serve

For example: "Find gaps in mental health apps for teenagers" or "Opportunities in sustainable packaging for restaurants"`;
        }
        break;
        
      case 'validation':
        response = `Let's validate your business idea! Here's my recommended approach:

1. **Market Demand**: Research if people are actively looking for this solution
2. **Competition Analysis**: Identify existing solutions and their weaknesses
3. **Target Market Size**: Calculate the potential customer base
4. **Unique Value**: Define what makes your solution different

I can help you with each of these steps. What aspect would you like to explore first?`;
        break;
        
      case 'trends':
        response = `Here are the hottest market trends I'm seeing:

🚀 **Technology**: AI-powered tools, automation, no-code platforms
🌱 **Sustainability**: Eco-friendly products, circular economy, green tech
🏡 **Remote Work**: Collaboration tools, virtual offices, productivity apps
🧘 **Wellness**: Mental health, fitness tech, personalized healthcare
💰 **FinTech**: Digital payments, crypto applications, investment tools

Each of these areas has numerous untapped opportunities. Which trend interests you most?`;
        break;
        
      case 'competitive':
        response = `Let's analyze the competitive landscape! Here's how to find your edge:

📊 **Market Analysis**:
• Identify direct and indirect competitors
• Map their strengths and weaknesses
• Find underserved customer segments

🎯 **Differentiation Strategies**:
• Better user experience
• Unique features or approach
• Focus on specific niche
• Superior customer service

Would you like to analyze competitors in a specific market?`;
        break;
        
      case 'planning':
        response = `I'll help you create a solid business plan! Let's cover the essentials:

📋 **Business Model Canvas**:
• Value proposition
• Customer segments
• Revenue streams
• Key resources and partnerships

📈 **Go-to-Market Strategy**:
• Launch plan
• Marketing channels
• Pricing strategy
• Growth metrics

What aspect of your business plan would you like to develop first?`;
        break;
        
      default:
        // For general queries, try to use AI to generate a response
        response = `I understand you're interested in "${message}". Let me help you explore this further.

Based on your query, I can:
• Search for market gaps and opportunities
• Validate business ideas
• Show you current trends
• Help with competitive analysis

What specific aspect would you like to explore?`;
    }
    
    // Generate suggestions and actions
    const suggestions = generateSuggestions(intent, message);
    const actions = generateActions(intent, message);
    
    // Return the response
    return {
      response,
      suggestions,
      actions,
      sessionId: sessionId === 'new' ? `session-${Date.now()}` : sessionId
    };
    
  } catch (error) {
    console.error('Error processing chat:', error);
    return {
      response: "I apologize, but I encountered an error while processing your request. Please try rephrasing your question or try again later.",
      suggestions: [
        "Help me get started",
        "Show trending opportunities",
        "How to validate an idea",
        "Find market gaps"
      ]
    };
  }
}

// Advanced AI-powered response (when Gemini API is available)
export async function generateAIResponse(message: string, context: any[]): Promise<string> {
  try {
    // This would integrate with Gemini API for more sophisticated responses
    // For now, we'll use the rule-based system above
    const prompt = `
You are an AI assistant helping entrepreneurs discover market opportunities and validate business ideas.
User message: ${message}
Context: ${JSON.stringify(context.slice(-3))}

Provide a helpful, encouraging response that:
1. Addresses their specific question
2. Offers actionable guidance
3. Suggests next steps
4. Maintains a supportive, professional tone

Keep the response concise (under 200 words).
`;
    
    // When Gemini API is configured, uncomment:
    // const aiResponse = await generateWithGemini(prompt);
    // return aiResponse;
    
    // For now, return a contextual response
    return processChat({ message, context, sessionId: 'temp' }).then(res => res.response);
    
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}