-- Performance Optimization: Add indexes for frequently queried columns
-- Migration: 0001_performance_indexes
-- Date: 2025-10-04

-- Index for user lookups by email (login, authentication)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for user lookups by username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Index for searches by user_id (search history queries)
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);

-- Index for searches by created_at (recent searches, pagination)
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at DESC);

-- Composite index for user searches ordered by date
CREATE INDEX IF NOT EXISTS idx_searches_user_created ON searches(user_id, created_at DESC);

-- Index for search_results by search_id (fetching results for a search)
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON search_results(search_id);

-- Index for search_results by category (filtering by gap type)
CREATE INDEX IF NOT EXISTS idx_search_results_category ON search_results(category);

-- Index for search_results by market_potential (filtering high-value gaps)
CREATE INDEX IF NOT EXISTS idx_search_results_market_potential ON search_results(market_potential);

-- Index for search_results by is_saved (fetching saved results)
CREATE INDEX IF NOT EXISTS idx_search_results_is_saved ON search_results(is_saved);

-- Composite index for saved results by user (via search)
CREATE INDEX IF NOT EXISTS idx_search_results_saved_search ON search_results(search_id, is_saved) WHERE is_saved = true;

-- Index for ideas by user_id (user's ideas)
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);

-- Index for ideas by created_at (recent ideas)
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);

-- Index for business_plans by idea_id (fetching plan for an idea)
CREATE INDEX IF NOT EXISTS idx_business_plans_idea_id ON business_plans(idea_id);

-- Index for market_research by idea_id (fetching research for an idea)
CREATE INDEX IF NOT EXISTS idx_market_research_idea_id ON market_research(idea_id);

-- Index for action_plans by idea_id (fetching action plan for an idea)
CREATE INDEX IF NOT EXISTS idx_action_plans_idea_id ON action_plans(idea_id);

-- Index for teams by owner_id (user's owned teams)
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);

-- Index for team_members by team_id (members of a team)
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);

-- Index for team_members by user_id (teams a user belongs to)
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Composite index for team membership lookups
CREATE INDEX IF NOT EXISTS idx_team_members_team_user ON team_members(team_id, user_id);

-- Index for idea_shares by idea_id (shares for an idea)
CREATE INDEX IF NOT EXISTS idx_idea_shares_idea_id ON idea_shares(idea_id);

-- Index for idea_shares by team_id (ideas shared with a team)
CREATE INDEX IF NOT EXISTS idx_idea_shares_team_id ON idea_shares(team_id);

-- Index for comments by idea_id (comments on an idea)
CREATE INDEX IF NOT EXISTS idx_comments_idea_id ON comments(idea_id);

-- Index for comments by user_id (user's comments)
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Index for comments by created_at (recent comments)
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Index for subscriptions by user_id (user's subscription)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Index for subscriptions by status (active subscriptions)
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Index for subscriptions by stripe_subscription_id (webhook lookups)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- Index for refresh_tokens by user_id (user's tokens)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Index for refresh_tokens by token (token validation)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- Index for refresh_tokens by expires_at (cleanup expired tokens)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Index for sessions by user_id (user's sessions)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Index for sessions by expires_at (cleanup expired sessions)
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Index for security_events by user_id (user's security events)
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);

-- Index for security_events by event_type (filtering by event type)
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);

-- Index for security_events by created_at (recent events)
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);

-- Composite index for user security events by type and date
CREATE INDEX IF NOT EXISTS idx_security_events_user_type_date ON security_events(user_id, event_type, created_at DESC);

-- Add query performance logging comment
COMMENT ON INDEX idx_searches_user_created IS 'Optimizes user search history queries with date ordering';
COMMENT ON INDEX idx_search_results_saved_search IS 'Optimizes saved results queries (partial index)';
COMMENT ON INDEX idx_security_events_user_type_date IS 'Optimizes security monitoring queries by user and event type';
