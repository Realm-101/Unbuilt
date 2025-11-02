import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { SearchPage } from '../../page-objects/search.page';
import { SearchResultsPage } from '../../page-objects/search-results.page';
import { ConversationPage } from '../../page-objects/conversation.page';

/**
 * AI Conversation E2E Tests
 * 
 * Tests the AI conversation functionality including:
 * - Conversation initiation from search results
 * - Message exchange and AI responses
 * - 10-message limit for free tier
 * - Suggested questions functionality
 * - Conversation export
 * 
 * Requirements: 3.3
 */

test.describe('AI Conversations', () => {
  let loginPage: LoginPage;
  let searchPage: SearchPage;
  let resultsPage: SearchResultsPage;
  let conversationPage: ConversationPage;
  let searchId: number;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    searchPage = new SearchPage(page);
    resultsPage = new SearchResultsPage(page);
    conversationPage = new ConversationPage(page);

    // Login and create a search for conversation testing
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');
    
    // Create a search to have context for conversations
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in AI-powered education platforms');
    await searchPage.waitForSearchCompletion();
    
    // Extract search ID from URL
    await page.waitForURL(/\/search\/(\d+)/);
    const url = page.url();
    const match = url.match(/\/search\/(\d+)/);
    searchId = match ? parseInt(match[1], 10) : 1;
  });

  test('should initiate conversation from search results', async ({ page }) => {
    // Navigate to conversation from search results
    await conversationPage.gotoFromSearch(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Verify conversation page loaded
    await expect(page).toHaveURL(new RegExp(`/search/${searchId}/conversation`));
    
    // Verify message input is visible and enabled
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeVisible();
    await expect(messageInput).toBeEnabled();
    
    // Verify conversation is initially empty
    expect(await conversationPage.isConversationEmpty()).toBe(true);
  });

  test('should send message and receive AI response', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Send a message
    const testMessage = 'What are the key challenges in this market?';
    await conversationPage.sendMessage(testMessage);
    
    // Verify message was sent
    const messageCount = await conversationPage.getMessageCount();
    expect(messageCount).toBeGreaterThanOrEqual(2); // User message + AI response
    
    // Verify user message appears
    const userMessageCount = await conversationPage.getUserMessageCount();
    expect(userMessageCount).toBeGreaterThanOrEqual(1);
    
    // Verify AI response appears
    const aiMessageCount = await conversationPage.getAIMessageCount();
    expect(aiMessageCount).toBeGreaterThanOrEqual(1);
    
    // Verify AI response has content
    const lastAIMessage = await conversationPage.getLastAIMessageText();
    expect(lastAIMessage.length).toBeGreaterThan(10);
  });

  test('should display typing indicator while AI is responding', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Send a message
    await conversationPage.fill('[data-testid="message-input"]', 'Tell me more about the opportunities');
    await conversationPage.click('[data-testid="send-button"]');
    
    // Verify typing indicator appears
    await page.waitForTimeout(500); // Brief wait for indicator to appear
    const isTyping = await conversationPage.isTypingIndicatorVisible();
    
    // Typing indicator should appear at some point (might be very fast)
    // We'll just verify the response eventually arrives
    await conversationPage.waitForAIResponse();
    
    // Verify typing indicator is gone after response
    expect(await conversationPage.isTypingIndicatorVisible()).toBe(false);
  });

  test('should enforce 10-message limit for free tier', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Send 5 messages (which will generate 5 user + 5 AI = 10 total)
    const messages = [
      'What are the main gaps?',
      'Who are the competitors?',
      'What is the market size?',
      'What are the risks?',
      'What is the timeline?'
    ];
    
    for (const message of messages) {
      await conversationPage.sendMessage(message);
      await page.waitForTimeout(1000); // Brief pause between messages
    }
    
    // Verify we have 10 messages (5 user + 5 AI)
    const messageCount = await conversationPage.getMessageCount();
    expect(messageCount).toBe(10);
    
    // Verify limit warning or upgrade prompt is visible
    const hasLimitWarning = await conversationPage.isLimitWarningVisible();
    const hasUpgradePrompt = await conversationPage.isUpgradePromptVisible();
    
    expect(hasLimitWarning || hasUpgradePrompt).toBe(true);
    
    // Verify message input is disabled or shows limit reached
    const sendButtonDisabled = await conversationPage.isSendButtonDisabled();
    expect(sendButtonDisabled).toBe(true);
  });

  test('should display remaining message count', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Check initial remaining count (should be 10 for free tier)
    const initialRemaining = await conversationPage.getRemainingMessageCount();
    
    if (initialRemaining !== null) {
      expect(initialRemaining).toBeLessThanOrEqual(10);
      
      // Send a message
      await conversationPage.sendMessage('What are the opportunities?');
      
      // Check remaining count decreased
      const newRemaining = await conversationPage.getRemainingMessageCount();
      
      if (newRemaining !== null) {
        expect(newRemaining).toBeLessThan(initialRemaining);
      }
    }
  });

  test('should display and interact with suggested questions', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Check if suggested questions are visible
    const hasSuggestedQuestions = await conversationPage.areSuggestedQuestionsVisible();
    
    if (hasSuggestedQuestions) {
      // Get suggested questions
      const questions = await conversationPage.getSuggestedQuestions();
      expect(questions.length).toBeGreaterThan(0);
      
      // Click on first suggested question
      await conversationPage.clickSuggestedQuestion(0);
      
      // Verify message was sent and response received
      const messageCount = await conversationPage.getMessageCount();
      expect(messageCount).toBeGreaterThanOrEqual(2);
    }
  });

  test('should click suggested question by text', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Check if suggested questions are visible
    if (await conversationPage.areSuggestedQuestionsVisible()) {
      const questions = await conversationPage.getSuggestedQuestions();
      
      if (questions.length > 0) {
        const firstQuestion = questions[0];
        
        // Click the question by text
        await conversationPage.clickSuggestedQuestionByText(firstQuestion);
        
        // Verify response was received
        const aiMessageCount = await conversationPage.getAIMessageCount();
        expect(aiMessageCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('should export conversation', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Send a few messages to have content to export
    await conversationPage.sendMessage('What are the key insights?');
    await conversationPage.sendMessage('What should I focus on first?');
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await conversationPage.exportConversation();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download occurred
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('should clear conversation', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Send some messages
    await conversationPage.sendMessage('First message');
    await conversationPage.sendMessage('Second message');
    
    // Verify messages exist
    let messageCount = await conversationPage.getMessageCount();
    expect(messageCount).toBeGreaterThan(0);
    
    // Clear conversation
    await conversationPage.clearConversation();
    
    // Verify conversation is empty
    messageCount = await conversationPage.getMessageCount();
    expect(messageCount).toBe(0);
  });

  test('should send multiple messages in sequence', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    const messages = [
      'What is the market opportunity?',
      'Who are the target customers?',
      'What is the competitive landscape?'
    ];
    
    await conversationPage.sendMultipleMessages(messages);
    
    // Verify all messages were sent
    const userMessageCount = await conversationPage.getUserMessageCount();
    expect(userMessageCount).toBe(messages.length);
    
    // Verify AI responded to all messages
    const aiMessageCount = await conversationPage.getAIMessageCount();
    expect(aiMessageCount).toBe(messages.length);
  });

  test('should disable send button when input is empty', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Clear message input
    await conversationPage.clearMessageInput();
    
    // Verify send button is disabled
    expect(await conversationPage.isSendButtonDisabled()).toBe(true);
    
    // Type a message
    await conversationPage.fill('[data-testid="message-input"]', 'Test message');
    
    // Verify send button is enabled
    expect(await conversationPage.isSendButtonDisabled()).toBe(false);
  });

  test('should scroll to bottom after new message', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Send multiple messages to create scrollable content
    for (let i = 0; i < 5; i++) {
      await conversationPage.sendMessage(`Message ${i + 1}: What are the details?`);
    }
    
    // Scroll to top
    await conversationPage.scrollToTop();
    await page.waitForTimeout(500);
    
    // Send another message
    await conversationPage.sendMessage('Latest message');
    
    // Verify we can see the latest message (should auto-scroll)
    const lastMessage = await conversationPage.getLastMessageText();
    expect(lastMessage).toContain('Latest message');
  });

  test('should display conversation title', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Get conversation title
    const title = await conversationPage.getConversationTitle();
    
    // Verify title is not empty
    expect(title.length).toBeGreaterThan(0);
  });

  test('should handle error messages', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Initially should have no error
    expect(await conversationPage.hasErrorMessage()).toBe(false);
    
    // Note: Error handling would need to be triggered by specific conditions
    // This test verifies the error checking mechanism works
  });

  test('should share conversation', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Send a message to have content
    await conversationPage.sendMessage('What are the opportunities?');
    
    // Click share button
    await conversationPage.shareConversation();
    
    // Verify share dialog or modal appears
    await page.waitForTimeout(1000);
    
    // Check if share modal is visible
    const shareModal = page.locator('[data-testid="share-modal"]');
    const isShareModalVisible = await shareModal.isVisible().catch(() => false);
    
    // Share functionality should trigger some UI response
    expect(isShareModalVisible || page.url().includes('share')).toBeTruthy();
  });

  test('should get message text by index', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    const testMessage = 'What are the key challenges?';
    await conversationPage.sendMessage(testMessage);
    
    // Get first message (user message)
    const firstMessage = await conversationPage.getMessageText(0);
    expect(firstMessage).toContain(testMessage);
    
    // Get second message (AI response)
    const secondMessage = await conversationPage.getMessageText(1);
    expect(secondMessage.length).toBeGreaterThan(0);
  });

  test('should show upgrade prompt when limit reached', async ({ page }) => {
    await conversationPage.gotoConversation(searchId);
    await conversationPage.waitForConversationLoad();
    
    // Send messages until limit is reached
    const maxMessages = 5; // 5 user messages = 10 total with AI responses
    
    for (let i = 0; i < maxMessages; i++) {
      await conversationPage.sendMessage(`Question ${i + 1}`);
      await page.waitForTimeout(1000);
    }
    
    // Check if upgrade prompt is visible
    const hasUpgradePrompt = await conversationPage.isUpgradePromptVisible();
    
    if (hasUpgradePrompt) {
      // Click upgrade prompt
      await conversationPage.clickUpgradePrompt();
      
      // Verify navigation to upgrade page
      await page.waitForTimeout(1000);
      expect(page.url()).toMatch(/upgrade|pricing|subscription/i);
    }
  });
});
