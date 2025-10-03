/**
 * Service Mocks
 * 
 * Mock implementations of external services for testing
 */

import { vi } from 'vitest';

/**
 * Mock Email Service
 */
export const mockEmailService = {
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg_123' }),
  sendPasswordReset: vi.fn().mockResolvedValue({ success: true }),
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
};

/**
 * Mock Payment Service (Stripe)
 */
export const mockPaymentService = {
  createCharge: vi.fn().mockResolvedValue({
    id: 'ch_123',
    status: 'succeeded',
    amount: 1000,
  }),
  createSubscription: vi.fn().mockResolvedValue({
    id: 'sub_123',
    status: 'active',
  }),
  cancelSubscription: vi.fn().mockResolvedValue({
    id: 'sub_123',
    status: 'canceled',
  }),
};

/**
 * Mock AI Service (Gemini)
 */
export const mockAIService = {
  generateText: vi.fn().mockResolvedValue({
    text: 'Generated AI response',
    usage: { promptTokens: 10, completionTokens: 20 },
  }),
  analyzeIdea: vi.fn().mockResolvedValue({
    score: 85,
    feedback: 'Great idea!',
    suggestions: ['Consider market research', 'Validate with users'],
  }),
};

/**
 * Mock Search Service (Perplexity)
 */
export const mockSearchService = {
  search: vi.fn().mockResolvedValue({
    results: [
      { title: 'Result 1', url: 'https://example.com/1', snippet: 'Snippet 1' },
      { title: 'Result 2', url: 'https://example.com/2', snippet: 'Snippet 2' },
    ],
    totalResults: 2,
  }),
  gapAnalysis: vi.fn().mockResolvedValue({
    gaps: ['Gap 1', 'Gap 2'],
    opportunities: ['Opportunity 1', 'Opportunity 2'],
  }),
};

/**
 * Mock PDF Generator Service
 */
export const mockPDFService = {
  generatePDF: vi.fn().mockResolvedValue({
    buffer: Buffer.from('PDF content'),
    filename: 'report.pdf',
  }),
  generateReport: vi.fn().mockResolvedValue({
    buffer: Buffer.from('Report content'),
    filename: 'report.pdf',
  }),
};

/**
 * Mock Security Logger
 */
export const mockSecurityLogger = {
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
  logLoginAttempt: vi.fn().mockResolvedValue(undefined),
  logPasswordChange: vi.fn().mockResolvedValue(undefined),
  logSuspiciousActivity: vi.fn().mockResolvedValue(undefined),
};

/**
 * Mock Session Manager
 */
export const mockSessionManager = {
  createSession: vi.fn().mockResolvedValue({
    id: 'session_123',
    userId: 1,
    expiresAt: new Date(Date.now() + 3600000),
  }),
  getSession: vi.fn().mockResolvedValue(null),
  updateSession: vi.fn().mockResolvedValue(undefined),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  deleteUserSessions: vi.fn().mockResolvedValue(undefined),
};

/**
 * Mock Captcha Service
 */
export const mockCaptchaService = {
  verify: vi.fn().mockResolvedValue({ success: true, score: 0.9 }),
  generate: vi.fn().mockResolvedValue({ token: 'captcha_token_123' }),
};

/**
 * Reset all service mocks
 */
export function resetServiceMocks() {
  Object.values(mockEmailService).forEach(mock => mock.mockClear());
  Object.values(mockPaymentService).forEach(mock => mock.mockClear());
  Object.values(mockAIService).forEach(mock => mock.mockClear());
  Object.values(mockSearchService).forEach(mock => mock.mockClear());
  Object.values(mockPDFService).forEach(mock => mock.mockClear());
  Object.values(mockSecurityLogger).forEach(mock => mock.mockClear());
  Object.values(mockSessionManager).forEach(mock => mock.mockClear());
  Object.values(mockCaptchaService).forEach(mock => mock.mockClear());
}

/**
 * Service error scenarios
 */
export const serviceErrors = {
  emailFailed: () => {
    mockEmailService.sendEmail.mockRejectedValue(new Error('Email service unavailable'));
  },
  
  paymentFailed: () => {
    mockPaymentService.createCharge.mockRejectedValue(new Error('Payment failed'));
  },
  
  aiFailed: () => {
    mockAIService.generateText.mockRejectedValue(new Error('AI service unavailable'));
  },
  
  searchFailed: () => {
    mockSearchService.search.mockRejectedValue(new Error('Search service unavailable'));
  },
  
  captchaFailed: () => {
    mockCaptchaService.verify.mockResolvedValue({ success: false, score: 0.1 });
  },
};
