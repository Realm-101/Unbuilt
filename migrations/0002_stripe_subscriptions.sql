-- Migration: Add Stripe subscription fields to users table
-- Date: 2025-10-04
-- Description: Adds subscription tier and period end fields for Stripe integration

-- Add subscription tier column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free' NOT NULL;
  END IF;
END $$;

-- Add subscription period end column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'subscription_period_end'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_period_end TIMESTAMP;
  END IF;
END $$;

-- Create index on subscription tier for faster queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);

-- Create index on subscription status for faster queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Update existing users to have 'free' tier if null
UPDATE users SET subscription_tier = 'free' WHERE subscription_tier IS NULL;

-- Add comment to document the subscription tiers
COMMENT ON COLUMN users.subscription_tier IS 'Subscription tier: free, pro, business, enterprise';
COMMENT ON COLUMN users.subscription_status IS 'Stripe subscription status: active, canceled, past_due, etc.';
COMMENT ON COLUMN users.subscription_period_end IS 'End date of current subscription period';
