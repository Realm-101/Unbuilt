-- Migration: Add search history and favorites support
-- Date: 2025-10-04
-- Description: Adds is_favorite column and indexes for search history queries

-- Add is_favorite column to searches table
ALTER TABLE searches ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false NOT NULL;

-- Add indexes for efficient search history queries
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_timestamp ON searches(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_searches_is_favorite ON searches(is_favorite);

-- Add comment for documentation
COMMENT ON COLUMN searches.is_favorite IS 'Indicates if the search has been marked as a favorite by the user';
