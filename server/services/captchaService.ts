import crypto from 'crypto';

/**
 * CAPTCHA Service for abuse prevention
 * Provides simple mathematical CAPTCHA challenges and verification
 * In production, this should be replaced with a service like reCAPTCHA or hCaptcha
 */

interface CaptchaChallenge {
  id: string;
  question: string;
  answer: number;
  expiresAt: number;
  attempts: number;
}

interface CaptchaResponse {
  challengeId: string;
  question: string;
  expiresIn: number;
}

interface CaptchaVerification {
  isValid: boolean;
  error?: string;
  remainingAttempts?: number;
}

// In-memory store for CAPTCHA challenges (in production, use Redis)
const captchaStore = new Map<string, CaptchaChallenge>();

// CAPTCHA configuration
const CAPTCHA_CONFIG = {
  expirationTime: 5 * 60 * 1000, // 5 minutes
  maxAttempts: 3,
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
};

/**
 * Generate a simple mathematical CAPTCHA challenge
 */
function generateMathChallenge(): { question: string; answer: number } {
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let num1: number, num2: number, answer: number, question: string;
  
  switch (operation) {
    case '+':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      answer = num1 + num2;
      question = `What is ${num1} + ${num2}?`;
      break;
      
    case '-':
      num1 = Math.floor(Math.random() * 50) + 25; // Ensure positive result
      num2 = Math.floor(Math.random() * 25) + 1;
      answer = num1 - num2;
      question = `What is ${num1} - ${num2}?`;
      break;
      
    case '*':
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = num1 * num2;
      question = `What is ${num1} × ${num2}?`;
      break;
      
    default:
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      answer = num1 + num2;
      question = `What is ${num1} + ${num2}?`;
  }
  
  return { question, answer };
}

/**
 * Generate a word-based CAPTCHA challenge
 */
function generateWordChallenge(): { question: string; answer: number } {
  const challenges = [
    { question: "How many letters are in the word 'SECURITY'?", answer: 8 },
    { question: "How many letters are in the word 'CAPTCHA'?", answer: 7 },
    { question: "How many letters are in the word 'VERIFY'?", answer: 6 },
    { question: "How many letters are in the word 'ACCESS'?", answer: 6 },
    { question: "How many letters are in the word 'LOGIN'?", answer: 5 },
    { question: "How many vowels are in the word 'AUTHENTICATION'? (A, E, I, O, U)", answer: 7 },
    { question: "How many consonants are in the word 'SECURE'?", answer: 4 },
    { question: "What is the first letter of 'PASSWORD' in the alphabet? (A=1, B=2, etc.)", answer: 16 },
  ];
  
  return challenges[Math.floor(Math.random() * challenges.length)];
}

/**
 * Create a new CAPTCHA challenge
 */
export function createCaptchaChallenge(): CaptchaResponse {
  const challengeId = crypto.randomUUID();
  const now = Date.now();
  
  // Randomly choose between math and word challenges
  const challenge = Math.random() > 0.5 ? generateMathChallenge() : generateWordChallenge();
  
  const captchaChallenge: CaptchaChallenge = {
    id: challengeId,
    question: challenge.question,
    answer: challenge.answer,
    expiresAt: now + CAPTCHA_CONFIG.expirationTime,
    attempts: 0
  };
  
  captchaStore.set(challengeId, captchaChallenge);
  
  return {
    challengeId,
    question: challenge.question,
    expiresIn: CAPTCHA_CONFIG.expirationTime / 1000 // Return in seconds
  };
}

/**
 * Verify a CAPTCHA response
 */
export function verifyCaptchaResponse(
  challengeId: string, 
  userAnswer: string | number
): CaptchaVerification {
  const challenge = captchaStore.get(challengeId);
  
  if (!challenge) {
    return {
      isValid: false,
      error: 'CAPTCHA challenge not found or expired'
    };
  }
  
  const now = Date.now();
  
  // Check if challenge has expired
  if (now > challenge.expiresAt) {
    captchaStore.delete(challengeId);
    return {
      isValid: false,
      error: 'CAPTCHA challenge has expired'
    };
  }
  
  // Check if max attempts exceeded
  if (challenge.attempts >= CAPTCHA_CONFIG.maxAttempts) {
    captchaStore.delete(challengeId);
    return {
      isValid: false,
      error: 'Maximum CAPTCHA attempts exceeded'
    };
  }
  
  // Increment attempt counter
  challenge.attempts++;
  
  // Convert user answer to number
  const numericAnswer = typeof userAnswer === 'string' ? parseInt(userAnswer, 10) : userAnswer;
  
  if (isNaN(numericAnswer)) {
    return {
      isValid: false,
      error: 'Invalid answer format. Please provide a numeric answer.',
      remainingAttempts: CAPTCHA_CONFIG.maxAttempts - challenge.attempts
    };
  }
  
  // Check if answer is correct
  if (numericAnswer === challenge.answer) {
    // Remove challenge after successful verification
    captchaStore.delete(challengeId);
    return {
      isValid: true
    };
  }
  
  // Wrong answer
  const remainingAttempts = CAPTCHA_CONFIG.maxAttempts - challenge.attempts;
  
  if (remainingAttempts <= 0) {
    captchaStore.delete(challengeId);
    return {
      isValid: false,
      error: 'Incorrect answer. Maximum attempts exceeded.',
      remainingAttempts: 0
    };
  }
  
  return {
    isValid: false,
    error: 'Incorrect answer. Please try again.',
    remainingAttempts
  };
}

/**
 * Get CAPTCHA challenge information (without revealing the answer)
 */
export function getCaptchaChallenge(challengeId: string): { question: string; expiresAt: number } | null {
  const challenge = captchaStore.get(challengeId);
  
  if (!challenge || Date.now() > challenge.expiresAt) {
    return null;
  }
  
  return {
    question: challenge.question,
    expiresAt: challenge.expiresAt
  };
}

/**
 * Clean up expired CAPTCHA challenges
 */
export function cleanupExpiredCaptchas(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [id, challenge] of captchaStore.entries()) {
    if (now > challenge.expiresAt) {
      captchaStore.delete(id);
      cleaned++;
    }
  }
  
  return cleaned;
}

/**
 * Get CAPTCHA statistics
 */
export function getCaptchaStats(): {
  activeChallenges: number;
  totalChallenges: number;
  averageAttempts: number;
} {
  const challenges = Array.from(captchaStore.values());
  const totalAttempts = challenges.reduce((sum, challenge) => sum + challenge.attempts, 0);
  
  return {
    activeChallenges: challenges.length,
    totalChallenges: challenges.length,
    averageAttempts: challenges.length > 0 ? totalAttempts / challenges.length : 0
  };
}

/**
 * Clear all CAPTCHA challenges (useful for testing)
 */
export function clearAllCaptchas(): void {
  captchaStore.clear();
}

// Schedule periodic cleanup of expired challenges
setInterval(() => {
  const cleaned = cleanupExpiredCaptchas();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired CAPTCHA challenges`);
  }
}, CAPTCHA_CONFIG.cleanupInterval);

// Export configuration for testing
export const captchaConfig = CAPTCHA_CONFIG;