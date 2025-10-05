-- Migration: Add enhanced fields to search_results table for Phase 3
-- Date: October 4, 2025
-- Description: Adds confidence scores, priority, recommendations, competitor analysis, and industry context

-- Add new columns to search_results table
ALTER TABLE search_results 
ADD COLUMN IF NOT EXISTS confidence_score INTEGER DEFAULT 75 CHECK (confidence_score >= 0 AND confidence_score <= 100),
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS actionable_recommendations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS competitor_analysis TEXT,
ADD COLUMN IF NOT EXISTS industry_context TEXT,
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS key_trends JSONB DEFAULT '[]'::jsonb;

-- Update category column to use structured categories
-- Note: This will map existing categories to new structured format
UPDATE search_results 
SET category = CASE 
  WHEN category LIKE '%Tech%' OR category LIKE '%Technology%' THEN 'technology'
  WHEN category LIKE '%Service%' THEN 'market'
  WHEN category LIKE '%Product%' THEN 'market'
  WHEN category LIKE '%Business Model%' THEN 'business_model'
  WHEN category LIKE '%UX%' OR category LIKE '%User Experience%' THEN 'ux'
  ELSE 'market'
END
WHERE category NOT IN ('market', 'technology', 'ux', 'business_model');

-- Add check constraint for category
ALTER TABLE search_results 
DROP CONSTRAINT IF EXISTS search_results_category_check;

ALTER TABLE search_results 
ADD CONSTRAINT search_results_category_check 
CHECK (category IN ('market', 'technology', 'ux', 'business_model'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_search_results_priority ON search_results(priority);
CREATE INDEX IF NOT EXISTS idx_search_results_category ON search_results(category);
CREATE INDEX IF NOT EXISTS idx_search_results_confidence_score ON search_results(confidence_score DESC);

-- Add comment to table
COMMENT ON TABLE search_results IS 'Enhanced search results with Phase 3 features: confidence scores, priorities, and actionable recommendations';

-- Add comments to new columns
COMMENT ON COLUMN search_results.confidence_score IS 'Confidence level in the gap analysis (0-100)';
COMMENT ON COLUMN search_results.priority IS 'Priority level based on market potential and feasibility';
COMMENT ON COLUMN search_results.actionable_recommendations IS 'Array of specific next steps and recommendations';
COMMENT ON COLUMN search_results.competitor_analysis IS 'Brief competitive landscape analysis';
COMMENT ON COLUMN search_results.industry_context IS 'Industry-specific insights and trends';
