import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * ConversationPage - Handles AI conversation interactions
 * 
 * Provides methods for sending messages, tracking message count,
 * and interacting with suggested questions in AI conversations.
 * 
 * Example:
 * ```
 * const conversationPage = new ConversationPage(page);
 * await conversationPage.goto(searchId);
 * await conversationPage.sendMessage('What are the key challenges?');
 * const count = await conversationPage.getMessageCount();
 * ```
 */
export class ConversationPage extends BasePage {
  // Message input and sending
  private readonly messageInput = '[data-testid="message-input"]';
  private readonly sendButton = '[data-testid="send-button"]';
  private readonly sendIcon = '[data-testid="send-icon"]';
  
  // Message history
  private readonly messageHistory = '[data-testid="message-history"]';
  private readonly messageContainer = '[data-testid="message-container"]';
  private readonly userMessage = '[data-testid="user-message"]';
  private readonly aiMessage = '[data-testid="ai-message"]';
  private readonly messageText = '[data-testid="message-text"]';
  private readonly messageTimestamp = '[data-testid="message-timestamp"]';
  
  // Suggested questions
  private readonly suggestedQuestions = '[data-testid="suggested-questions"]';
  private readonly suggestedQuestion = '[data-testid="suggested-question"]';
  private readonly questionChip = '[data-testid="question-chip"]';
  
  // Conversation controls
  private readonly clearButton = '[data-testid="clear-conversation"]';
  private readonly exportButton = '[data-testid="export-conversation"]';
  private readonly shareButton = '[data-testid="share-conversation"]';
  
  // Status indicators
  private readonly typingIndicator = '[data-testid="typing-indicator"]';
  private readonly loadingIndicator = '[data-testid="loading-indicator"]';
  private readonly errorMessage = '[data-testid="error-message"]';
  
  // Limits and warnings
  private readonly messageLimit = '[data-testid="message-limit"]';
  private readonly limitWarning = '[data-testid="limit-warning"]';
  private readonly upgradePrompt = '[data-testid="upgrade-prompt"]';
  
  // Conversation metadata
  private readonly conversationTitle = '[data-testid="conversation-title"]';
  private readonly conversationId = '[data-testid="conversation-id"]';
  private readonly messageCount = '[data-testid="message-count"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to conversation page
   * @param searchId - The ID of the search to start conversation about
   */
  async gotoConversation(searchId: number): Promise<void> {
    await super.goto(`/conversation/${searchId}`);
  }

  /**
   * Navigate to conversation from search results
   * @param searchId - The ID of the search
   */
  async gotoFromSearch(searchId: number): Promise<void> {
    await super.goto(`/search/${searchId}/conversation`);
  }

  /**
   * Send a message in the conversation
   * @param message - The message text to send
   */
  async sendMessage(message: string): Promise<void> {
    await this.fill(this.messageInput, message);
    await this.click(this.sendButton);
    
    // Wait for message to be sent and AI to respond
    await this.waitForAIResponse();
  }

  /**
   * Wait for AI to respond to a message
   * @param timeoutMs - Maximum time to wait in milliseconds
   */
  async waitForAIResponse(timeoutMs: number = 30000): Promise<void> {
    // Wait for typing indicator to appear
    await this.page.waitForSelector(this.typingIndicator, {
      state: 'visible',
      timeout: 5000
    }).catch(() => {
      // Typing indicator might not appear if response is very fast
    });
    
    // Wait for typing indicator to disappear
    await this.page.waitForSelector(this.typingIndicator, {
      state: 'hidden',
      timeout: timeoutMs
    });
  }

  /**
   * Get the total count of messages in the conversation
   * @returns Total message count (user + AI messages)
   */
  async getMessageCount(): Promise<number> {
    const messages = await this.locator(`${this.messageHistory} ${this.messageContainer}`);
    return await messages.count();
  }

  /**
   * Get the count of user messages
   */
  async getUserMessageCount(): Promise<number> {
    const userMessages = await this.locator(this.userMessage);
    return await userMessages.count();
  }

  /**
   * Get the count of AI messages
   */
  async getAIMessageCount(): Promise<number> {
    const aiMessages = await this.locator(this.aiMessage);
    return await aiMessages.count();
  }

  /**
   * Get message text by index
   * @param index - Zero-based index of the message
   */
  async getMessageText(index: number): Promise<string> {
    const message = await this.locator(this.messageContainer).nth(index);
    return await message.locator(this.messageText).textContent() || '';
  }

  /**
   * Get the last message text
   */
  async getLastMessageText(): Promise<string> {
    const count = await this.getMessageCount();
    if (count === 0) return '';
    return await this.getMessageText(count - 1);
  }

  /**
   * Get the last AI message text
   */
  async getLastAIMessageText(): Promise<string> {
    const aiMessages = await this.locator(this.aiMessage);
    const count = await aiMessages.count();
    
    if (count === 0) return '';
    
    const lastAIMessage = aiMessages.nth(count - 1);
    return await lastAIMessage.locator(this.messageText).textContent() || '';
  }

  /**
   * Get all suggested questions
   */
  async getSuggestedQuestions(): Promise<string[]> {
    const questions = await this.locator(this.suggestedQuestion);
    const count = await questions.count();
    const questionTexts: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = await questions.nth(i).textContent();
      if (text) {
        questionTexts.push(text.trim());
      }
    }
    
    return questionTexts;
  }

  /**
   * Click on a suggested question
   * @param index - Zero-based index of the suggested question
   */
  async clickSuggestedQuestion(index: number): Promise<void> {
    const questions = await this.locator(this.suggestedQuestion);
    await questions.nth(index).click();
    
    // Wait for AI response
    await this.waitForAIResponse();
  }

  /**
   * Click on a suggested question by text
   * @param questionText - The text of the question to click
   */
  async clickSuggestedQuestionByText(questionText: string): Promise<void> {
    await this.page.click(`${this.suggestedQuestion}:has-text("${questionText}")`);
    await this.waitForAIResponse();
  }

  /**
   * Check if suggested questions are visible
   */
  async areSuggestedQuestionsVisible(): Promise<boolean> {
    return await this.locator(this.suggestedQuestions).isVisible();
  }

  /**
   * Get the message input value
   */
  async getMessageInputValue(): Promise<string> {
    const input = await this.locator(this.messageInput);
    return await input.inputValue();
  }

  /**
   * Clear the message input
   */
  async clearMessageInput(): Promise<void> {
    await this.locator(this.messageInput).clear();
  }

  /**
   * Check if send button is disabled
   */
  async isSendButtonDisabled(): Promise<boolean> {
    const button = await this.locator(this.sendButton);
    return await button.isDisabled();
  }

  /**
   * Check if typing indicator is visible
   */
  async isTypingIndicatorVisible(): Promise<boolean> {
    return await this.locator(this.typingIndicator).isVisible();
  }

  /**
   * Get the remaining message count from limit indicator
   * @returns Remaining messages or null if not visible
   */
  async getRemainingMessageCount(): Promise<number | null> {
    if (!(await this.locator(this.messageLimit).isVisible())) {
      return null;
    }
    
    const limitText = await this.getText(this.messageLimit);
    const match = limitText.match(/(\d+)\s*(?:messages?\s*)?remaining/i);
    
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Check if message limit warning is visible
   */
  async isLimitWarningVisible(): Promise<boolean> {
    return await this.locator(this.limitWarning).isVisible();
  }

  /**
   * Check if upgrade prompt is visible
   */
  async isUpgradePromptVisible(): Promise<boolean> {
    return await this.locator(this.upgradePrompt).isVisible();
  }

  /**
   * Click the upgrade prompt
   */
  async clickUpgradePrompt(): Promise<void> {
    await this.click(this.upgradePrompt);
  }

  /**
   * Clear the conversation
   */
  async clearConversation(): Promise<void> {
    await this.click(this.clearButton);
    
    // Wait for confirmation dialog if present
    await this.page.waitForTimeout(500);
    
    // Click confirm if dialog appears
    const confirmButton = this.page.locator('[data-testid="confirm-clear"]');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  /**
   * Export the conversation
   */
  async exportConversation(): Promise<void> {
    await this.click(this.exportButton);
  }

  /**
   * Share the conversation
   */
  async shareConversation(): Promise<void> {
    await this.click(this.shareButton);
  }

  /**
   * Get the conversation title
   */
  async getConversationTitle(): Promise<string> {
    return await this.getText(this.conversationTitle);
  }

  /**
   * Check if there's an error message
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.locator(this.errorMessage).isVisible();
  }

  /**
   * Get the error message text
   */
  async getErrorMessage(): Promise<string> {
    if (await this.hasErrorMessage()) {
      return await this.getText(this.errorMessage);
    }
    return '';
  }

  /**
   * Scroll to the bottom of the message history
   */
  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => {
      const messageHistory = document.querySelector('[data-testid="message-history"]');
      if (messageHistory) {
        messageHistory.scrollTop = messageHistory.scrollHeight;
      }
    });
  }

  /**
   * Scroll to the top of the message history
   */
  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => {
      const messageHistory = document.querySelector('[data-testid="message-history"]');
      if (messageHistory) {
        messageHistory.scrollTop = 0;
      }
    });
  }

  /**
   * Wait for conversation to load
   */
  async waitForConversationLoad(): Promise<void> {
    await this.waitForPageLoad();
    await this.page.waitForSelector(this.messageInput, { state: 'visible' });
  }

  /**
   * Check if conversation is empty
   */
  async isConversationEmpty(): Promise<boolean> {
    const count = await this.getMessageCount();
    return count === 0;
  }

  /**
   * Send multiple messages in sequence
   * @param messages - Array of message texts to send
   */
  async sendMultipleMessages(messages: string[]): Promise<void> {
    for (const message of messages) {
      await this.sendMessage(message);
      await this.page.waitForTimeout(1000); // Brief pause between messages
    }
  }
}
