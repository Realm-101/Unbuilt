import { Router } from 'express';
import { processChat } from '../services/aiAssistant';
import { jwtAuth } from '../middleware/jwtAuth';

const router = Router();

// Chat endpoint
router.post('/chat', jwtAuth, async (req, res) => {
  try {
    const { message, context, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Process the chat message
    const response = await processChat({
      message,
      context: context ?? [],
      sessionId: sessionId ?? 'new'
    });
    
    res.json(response);
  } catch (error) {
    console.error('AI Assistant error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      response: "I apologize, but I'm having trouble processing your request. Please try again.",
      suggestions: ["Help me get started", "Find market opportunities", "Show trending markets"]
    });
  }
});

// Get chat history (for future implementation)
router.get('/history/:sessionId', jwtAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    // TODO: Implement chat history storage and retrieval
    res.json({ messages: [], sessionId });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

export default router;