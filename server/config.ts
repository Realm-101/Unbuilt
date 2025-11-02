// API Configuration with proper error handling
interface Config {
  geminiApiKey: string | undefined;
  stripeSecretKey: string | undefined;
  sendgridApiKey: string | undefined;
  redisUrl: string | undefined;
  isDevelopment: boolean;
  isProduction: boolean;
}

export const config: Config = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  redisUrl: process.env.REDIS_URL,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Validation function for required services
export function validateConfig() {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check critical services
  if (!config.geminiApiKey) {
    warnings.push('GEMINI_API_KEY not configured - AI gap analysis will use demo data');
  }

  if (!config.stripeSecretKey) {
    warnings.push('STRIPE_SECRET_KEY not configured - payment features disabled');
  }

  if (!config.sendgridApiKey) {
    warnings.push('SENDGRID_API_KEY not configured - email features disabled');
  }

  if (!config.redisUrl) {
    warnings.push('REDIS_URL not configured - caching features disabled');
  }

  // Log warnings but don't fail
  warnings.forEach(warning => console.warn(`⚠️  ${warning}`));
  
  // Return status for runtime checks
  return {
    hasGemini: !!config.geminiApiKey,
    hasStripe: !!config.stripeSecretKey,
    hasSendgrid: !!config.sendgridApiKey,
    hasRedis: !!config.redisUrl,
    warnings,
    errors
  };
}

// Initialize and validate on startup
const configStatus = validateConfig();

export { configStatus };