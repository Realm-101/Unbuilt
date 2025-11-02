import { pgTable, text, serial, integer, boolean, timestamp, jsonb, index, unique, foreignKey, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const searches = pgTable("searches", {
  id: serial().primaryKey().notNull(),
  query: text().notNull(),
  timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
  resultsCount: integer("results_count").default(0).notNull(),
  userId: integer("user_id"),
  isFavorite: boolean("is_favorite").default(false).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "searches_user_id_users_id_fk"
  }),
  index("idx_searches_user_id").on(table.userId),
  index("idx_searches_timestamp").on(table.timestamp.desc()),
  index("idx_searches_is_favorite").on(table.isFavorite),
]);

export const searchResults = pgTable("search_results", {
  id: serial().primaryKey().notNull(),
  searchId: integer("search_id").notNull(),
  title: text().notNull(),
  description: text().notNull(),
  category: text().notNull(), // 'market' | 'technology' | 'ux' | 'business_model'
  feasibility: text().notNull(), // 'high' | 'medium' | 'low'
  marketPotential: text("market_potential").notNull(), // 'high' | 'medium' | 'low'
  innovationScore: integer("innovation_score").notNull(),
  marketSize: text("market_size").notNull(),
  gapReason: text("gap_reason").notNull(),
  isSaved: boolean("is_saved").default(false).notNull(),
  // Phase 3 enhanced fields
  confidenceScore: integer("confidence_score").default(75).notNull(), // 0-100
  priority: text().default('medium').notNull(), // 'high' | 'medium' | 'low'
  actionableRecommendations: jsonb("actionable_recommendations").default([]).notNull(), // string[]
  competitorAnalysis: text("competitor_analysis"),
  industryContext: text("industry_context"),
  targetAudience: text("target_audience"),
  keyTrends: jsonb("key_trends").default([]), // string[]
}, (table) => [
  foreignKey({
    columns: [table.searchId],
    foreignColumns: [searches.id],
    name: "search_results_search_id_searches_id_fk"
  }),
  index("idx_search_results_priority").on(table.priority),
  index("idx_search_results_category").on(table.category),
  index("idx_search_results_confidence_score").on(table.confidenceScore.desc()),
]);

export const users = pgTable("users", {
  id: serial().primaryKey().notNull(),
  email: text().notNull(),
  password: text(),
  name: text(),
  plan: text().default('free').notNull(),
  searchCount: integer("search_count").default(0).notNull(),
  lastResetDate: timestamp("last_reset_date", { mode: 'string' }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionTier: text("subscription_tier").default('free').notNull(), // 'free' | 'pro' | 'business' | 'enterprise'
  subscriptionStatus: text("subscription_status").default('inactive'),
  subscriptionPeriodEnd: timestamp("subscription_period_end", { mode: 'string' }),
  trialUsed: boolean("trial_used").default(false).notNull(),
  trialExpiration: timestamp("trial_expiration", { mode: 'string' }),
  preferences: jsonb().default({}),
  isActive: boolean("is_active").default(true).notNull(),
  avatar: text(),
  provider: text().default('local').notNull(),
  providerId: text("provider_id"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  // Security fields for session management
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lastFailedLogin: timestamp("last_failed_login", { mode: 'string' }),
  accountLocked: boolean("account_locked").default(false).notNull(),
  lockoutExpires: timestamp("lockout_expires", { mode: 'string' }),
  // Privacy controls
  analyticsOptOut: boolean("analytics_opt_out").default(false).notNull(),
  // Password security fields
  lastPasswordChange: timestamp("last_password_change", { mode: 'string' }).defaultNow(),
  passwordExpiryWarningSent: boolean("password_expiry_warning_sent").default(false).notNull(),
  forcePasswordChange: boolean("force_password_change").default(false).notNull(),
  passwordStrengthScore: integer("password_strength_score").default(0).notNull(),
}, (table) => [
  unique("users_email_unique").on(table.email),
]);

export const sessions = pgTable("session", {
  sid: text().primaryKey().notNull(),
  sess: jsonb().notNull(),
  expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
  index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

// JWT Token blacklist table
export const jwtTokens = pgTable("jwt_tokens", {
  id: text().primaryKey(),
  userId: integer("user_id").notNull(),
  tokenType: text("token_type").notNull(), // 'access' | 'refresh'
  issuedAt: timestamp("issued_at", { mode: 'string' }).notNull(),
  expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  revokedAt: timestamp("revoked_at", { mode: 'string' }),
  revokedBy: text("revoked_by"),
  deviceInfo: text("device_info"),
  ipAddress: text("ip_address"),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "jwt_tokens_user_id_users_id_fk"
  }),
  index("jwt_tokens_user_id_idx").on(table.userId),
  index("jwt_tokens_expires_at_idx").on(table.expiresAt),
]);

export const ideas = pgTable("ideas", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  title: text().notNull(),
  description: text().notNull(),
  targetMarket: text("target_market").notNull(),
  businessModel: text("business_model").notNull(),
  category: text().notNull(),
  // Scoring metrics
  originalityScore: integer("originality_score").default(0).notNull(),
  credibilityScore: integer("credibility_score").default(0).notNull(),
  marketGapScore: integer("market_gap_score").default(0).notNull(),
  competitionScore: integer("competition_score").default(0).notNull(),
  overallScore: integer("overall_score").default(0).notNull(),
  // Financial projections
  initialInvestment: integer("initial_investment").default(0),
  monthlyRevenue: integer("monthly_revenue").default(0),
  monthlyExpenses: integer("monthly_expenses").default(0),
  breakEvenMonths: integer("break_even_months").default(0),
  projectedRoi: integer("projected_roi").default(0), // percentage
  financialProjections: jsonb("financial_projections"), // detailed 5-year projections
  // Metadata
  sourceSearchResultId: integer("source_search_result_id"), // if created from a gap
  status: text().default('draft').notNull(), // draft, validated, published
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "ideas_user_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.sourceSearchResultId],
    foreignColumns: [searchResults.id],
    name: "ideas_source_search_result_id_search_results_id_fk"
  }),
]);

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type JWTToken = typeof jwtTokens.$inferSelect;
export type InsertJWTToken = typeof jwtTokens.$inferInsert;

export const insertSearchSchema = createInsertSchema(searches).pick({
  query: true,
  userId: true,
});

export const insertSearchResultSchema = createInsertSchema(searchResults).pick({
  searchId: true,
  title: true,
  description: true,
  category: true,
  feasibility: true,
  marketPotential: true,
  innovationScore: true,
  marketSize: true,
  gapReason: true,
  confidenceScore: true,
  priority: true,
  actionableRecommendations: true,
  competitorAnalysis: true,
  industryContext: true,
  targetAudience: true,
  keyTrends: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  confirmPassword: z.string().min(6).optional(),
  name: z.string().min(2).max(100),
}).refine((data) => {
  // Only validate password match if password is provided (for local auth)
  if (data.password && data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Create the insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertSessionSchema = createInsertSchema(sessions);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type InsertSearch = z.infer<typeof insertSearchSchema>;
export type Search = typeof searches.$inferSelect;
export type InsertSearchResult = z.infer<typeof insertSearchResultSchema>;
export type SearchResult = typeof searchResults.$inferSelect;

// Team collaboration tables
export const teams = pgTable("teams", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
  settings: jsonb().default({}),
  plan: varchar({ length: 50 }).default('free'),
});

export const teamMembers = pgTable("team_members", {
  id: serial().primaryKey().notNull(),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),
  email: varchar({ length: 255 }).notNull(),
  role: varchar({ length: 50 }).default('member').notNull(), // owner, admin, member, viewer
  joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
  invitedBy: text("invited_by"),
  status: varchar({ length: 50 }).default('active'), // active, invited, suspended
}, (table) => [
  foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.id],
    name: "team_members_team_id_teams_id_fk"
  }),
]);

export const ideaShares = pgTable("idea_shares", {
  id: serial().primaryKey().notNull(),
  ideaId: integer("idea_id").notNull(),
  teamId: integer("team_id"),
  sharedWith: text("shared_with"), // User ID if sharing with individual
  sharedBy: text("shared_by").notNull(),
  permissions: jsonb().default({ canEdit: false, canComment: true, canShare: false }),
  sharedAt: timestamp("shared_at", { mode: 'string' }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: 'string' }),
}, (table) => [
  foreignKey({
    columns: [table.ideaId],
    foreignColumns: [ideas.id],
    name: "idea_shares_idea_id_ideas_id_fk"
  }),
  foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.id],
    name: "idea_shares_team_id_teams_id_fk"
  }),
]);

export const comments = pgTable("comments", {
  id: serial().primaryKey().notNull(),
  ideaId: integer("idea_id").notNull(),
  userId: text("user_id").notNull(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  content: text().notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
  isResolved: boolean("is_resolved").default(false),
  reactions: jsonb().default({}), // {"👍": ["user1", "user2"], "❤️": ["user3"]}
}, (table) => [
  foreignKey({
    columns: [table.ideaId],
    foreignColumns: [ideas.id],
    name: "comments_idea_id_ideas_id_fk"
  }),
  // Self-referencing foreign key for parent comment (threaded comments)
  index("comments_parent_id_idx").on(table.parentId),
]);

export const activityFeed = pgTable("activity_feed", {
  id: serial().primaryKey().notNull(),
  teamId: integer("team_id"),
  ideaId: integer("idea_id"),
  userId: text("user_id").notNull(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  action: varchar({ length: 50 }).notNull(), // created, updated, commented, shared, validated, etc.
  details: jsonb().default({}),
  timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
  entityType: varchar("entity_type", { length: 50 }), // idea, comment, team, etc.
  entityId: integer("entity_id"),
}, (table) => [
  foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.id],
    name: "activity_feed_team_id_teams_id_fk"
  }),
  foreignKey({
    columns: [table.ideaId],
    foreignColumns: [ideas.id],
    name: "activity_feed_idea_id_ideas_id_fk"
  }),
]);

// Security audit logging tables
export const securityAuditLogs = pgTable("security_audit_logs", {
  id: serial().primaryKey().notNull(),
  timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
  eventType: text("event_type").notNull(), // AUTH_SUCCESS, AUTH_FAILURE, SUSPICIOUS_ACTIVITY, etc.
  userId: integer("user_id"),
  userEmail: text("user_email"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  action: text().notNull(), // login, logout, password_change, etc.
  resource: text(), // API endpoint or resource accessed
  resourceId: text("resource_id"), // ID of specific resource if applicable
  success: boolean().notNull(),
  errorMessage: text("error_message"),
  metadata: jsonb().default({}), // Additional context data
  severity: text().default('info').notNull(), // info, warning, error, critical
  sessionId: text("session_id"),
  requestId: text("request_id"), // For correlation across services
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "security_audit_logs_user_id_users_id_fk"
  }),
  index("security_audit_logs_timestamp_idx").on(table.timestamp),
  index("security_audit_logs_event_type_idx").on(table.eventType),
  index("security_audit_logs_user_id_idx").on(table.userId),
  index("security_audit_logs_ip_address_idx").on(table.ipAddress),
  index("security_audit_logs_severity_idx").on(table.severity),
]);

export const securityAlerts = pgTable("security_alerts", {
  id: serial().primaryKey().notNull(),
  timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
  alertType: text("alert_type").notNull(), // BRUTE_FORCE, SUSPICIOUS_LOGIN, RATE_LIMIT_EXCEEDED, etc.
  severity: text().default('medium').notNull(), // low, medium, high, critical
  userId: integer("user_id"),
  ipAddress: text("ip_address"),
  description: text().notNull(),
  details: jsonb().default({}),
  status: text().default('open').notNull(), // open, investigating, resolved, false_positive
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at", { mode: 'string' }),
  resolutionNotes: text("resolution_notes"),
  notificationsSent: boolean("notifications_sent").default(false).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "security_alerts_user_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.resolvedBy],
    foreignColumns: [users.id],
    name: "security_alerts_resolved_by_users_id_fk"
  }),
  index("security_alerts_timestamp_idx").on(table.timestamp),
  index("security_alerts_alert_type_idx").on(table.alertType),
  index("security_alerts_severity_idx").on(table.severity),
  index("security_alerts_status_idx").on(table.status),
]);

// Password history table for tracking previous passwords
export const passwordHistory = pgTable("password_history", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  replacedAt: timestamp("replaced_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "password_history_user_id_users_id_fk"
  }),
  index("password_history_user_id_idx").on(table.userId),
  index("password_history_created_at_idx").on(table.createdAt),
  index("password_history_user_created_idx").on(table.userId, table.createdAt.desc()),
]);

// Analytics events table for usage tracking
export const analyticsEvents = pgTable("analytics_events", {
  id: serial().primaryKey().notNull(),
  eventType: text("event_type").notNull(), // search_performed, export_generated, page_view, feature_usage, etc.
  userId: integer("user_id"),
  timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
  metadata: jsonb().default({}), // Event-specific data (query, format, page, etc.)
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "analytics_events_user_id_users_id_fk"
  }),
  index("analytics_events_timestamp_idx").on(table.timestamp),
  index("analytics_events_event_type_idx").on(table.eventType),
  index("analytics_events_user_id_idx").on(table.userId),
]);

// UX Information Architecture tables
export const userPreferences = pgTable("user_preferences", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  role: text(), // 'entrepreneur' | 'investor' | 'product_manager' | 'researcher' | 'exploring'
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  tourProgress: jsonb("tour_progress").default([]).notNull(), // TourStep[]
  expandedSections: jsonb("expanded_sections").default({}).notNull(), // Record<string, boolean>
  keyboardShortcuts: jsonb("keyboard_shortcuts").default({}).notNull(), // Record<string, string>
  accessibilitySettings: jsonb("accessibility_settings").default({
    highContrast: false,
    reducedMotion: false,
    screenReaderOptimized: false,
  }).notNull(),
  notificationPreferences: jsonb("notification_preferences").default({
    resourceNotifications: true,
    frequency: 'weekly',
    categories: [],
    contributionUpdates: true,
  }).notNull(), // { resourceNotifications: boolean, frequency: 'daily' | 'weekly', categories: number[], contributionUpdates: boolean }
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "user_preferences_user_id_users_id_fk"
  }),
  unique("user_preferences_user_id_unique").on(table.userId),
  index("user_preferences_user_id_idx").on(table.userId),
]);

export const projects = pgTable("projects", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  name: varchar({ length: 200 }).notNull(),
  description: text(),
  tags: jsonb().default([]).notNull(), // string[]
  archived: boolean().default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "projects_user_id_users_id_fk"
  }),
  index("projects_user_id_idx").on(table.userId),
  index("projects_archived_idx").on(table.archived),
]);

export const projectAnalyses = pgTable("project_analyses", {
  id: serial().primaryKey().notNull(),
  projectId: integer("project_id").notNull(),
  searchId: integer("search_id").notNull(),
  addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: "project_analyses_project_id_projects_id_fk"
  }),
  foreignKey({
    columns: [table.searchId],
    foreignColumns: [searches.id],
    name: "project_analyses_search_id_searches_id_fk"
  }),
  unique("project_analyses_project_search_unique").on(table.projectId, table.searchId),
  index("project_analyses_project_id_idx").on(table.projectId),
  index("project_analyses_search_id_idx").on(table.searchId),
]);

export const actionPlanProgress = pgTable("action_plan_progress", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  searchId: integer("search_id").notNull(),
  completedSteps: jsonb("completed_steps").default([]).notNull(), // string[]
  phaseCompletion: jsonb("phase_completion").default({}).notNull(), // Record<string, number>
  overallCompletion: integer("overall_completion").default(0).notNull(),
  lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "action_plan_progress_user_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.searchId],
    foreignColumns: [searches.id],
    name: "action_plan_progress_search_id_searches_id_fk"
  }),
  unique("action_plan_progress_user_search_unique").on(table.userId, table.searchId),
  index("action_plan_progress_user_id_idx").on(table.userId),
  index("action_plan_progress_search_id_idx").on(table.searchId),
]);

export const shareLinks = pgTable("share_links", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  searchId: integer("search_id").notNull(),
  token: varchar({ length: 64 }).notNull(),
  expiresAt: timestamp("expires_at", { mode: 'string' }),
  viewCount: integer("view_count").default(0).notNull(),
  active: boolean().default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at", { mode: 'string' }),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "share_links_user_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.searchId],
    foreignColumns: [searches.id],
    name: "share_links_search_id_searches_id_fk"
  }),
  unique("share_links_token_unique").on(table.token),
  index("share_links_user_id_idx").on(table.userId),
  index("share_links_token_idx").on(table.token),
  index("share_links_active_idx").on(table.active),
]);

export const helpArticles = pgTable("help_articles", {
  id: serial().primaryKey().notNull(),
  title: varchar({ length: 200 }).notNull(),
  content: text().notNull(),
  context: jsonb().default([]).notNull(), // string[] - page/feature identifiers
  category: varchar({ length: 50 }).notNull(), // 'getting-started' | 'features' | 'troubleshooting' | 'faq'
  tags: jsonb().default([]).notNull(), // string[]
  videoUrl: text(),
  relatedArticles: jsonb("related_articles").default([]).notNull(), // string[] - article IDs
  viewCount: integer("view_count").default(0).notNull(),
  helpfulCount: integer("helpful_count").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("help_articles_category_idx").on(table.category),
  index("help_articles_view_count_idx").on(table.viewCount.desc()),
]);

// Interactive AI Conversations tables
export const conversations = pgTable("conversations", {
  id: serial().primaryKey().notNull(),
  analysisId: integer("analysis_id").notNull(), // FK to searches table
  userId: integer("user_id").notNull(),
  variantIds: jsonb("variant_ids").default([]).notNull(), // string[] - IDs of analysis variants
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.analysisId],
    foreignColumns: [searches.id],
    name: "conversations_analysis_id_searches_id_fk"
  }),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "conversations_user_id_users_id_fk"
  }),
  unique("conversations_analysis_user_unique").on(table.analysisId, table.userId),
  index("conversations_analysis_id_idx").on(table.analysisId),
  index("conversations_user_id_idx").on(table.userId),
  index("conversations_updated_at_idx").on(table.updatedAt.desc()),
]);

export const conversationMessages = pgTable("conversation_messages", {
  id: serial().primaryKey().notNull(),
  conversationId: integer("conversation_id").notNull(),
  role: varchar({ length: 20 }).notNull(), // 'user' | 'assistant'
  content: text().notNull(),
  metadata: jsonb().default({}).notNull(), // { tokensUsed?, processingTime?, confidence?, sources?, assumptions? }
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  editedAt: timestamp("edited_at", { mode: 'string' }),
}, (table) => [
  foreignKey({
    columns: [table.conversationId],
    foreignColumns: [conversations.id],
    name: "conversation_messages_conversation_id_conversations_id_fk"
  }),
  index("conversation_messages_conversation_id_idx").on(table.conversationId),
  index("conversation_messages_created_at_idx").on(table.createdAt),
  index("conversation_messages_role_idx").on(table.role),
]);

export const suggestedQuestions = pgTable("suggested_questions", {
  id: serial().primaryKey().notNull(),
  conversationId: integer("conversation_id").notNull(),
  questionText: text("question_text").notNull(),
  category: varchar({ length: 50 }).notNull(), // 'market_validation' | 'competitive_analysis' | 'execution_strategy' | 'risk_assessment'
  priority: integer().default(0).notNull(), // Higher number = higher priority
  used: boolean().default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.conversationId],
    foreignColumns: [conversations.id],
    name: "suggested_questions_conversation_id_conversations_id_fk"
  }),
  index("suggested_questions_conversation_id_idx").on(table.conversationId),
  index("suggested_questions_category_idx").on(table.category),
  index("suggested_questions_priority_idx").on(table.priority.desc()),
  index("suggested_questions_used_idx").on(table.used),
]);

export const conversationAnalytics = pgTable("conversation_analytics", {
  id: serial().primaryKey().notNull(),
  conversationId: integer("conversation_id").notNull(),
  userId: integer("user_id").notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  totalTokensUsed: integer("total_tokens_used").default(0).notNull(),
  avgResponseTime: integer("avg_response_time").default(0).notNull(), // milliseconds
  userSatisfaction: integer("user_satisfaction"), // 1-5 rating
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.conversationId],
    foreignColumns: [conversations.id],
    name: "conversation_analytics_conversation_id_conversations_id_fk"
  }),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "conversation_analytics_user_id_users_id_fk"
  }),
  unique("conversation_analytics_conversation_unique").on(table.conversationId),
  index("conversation_analytics_user_id_idx").on(table.userId),
  index("conversation_analytics_message_count_idx").on(table.messageCount.desc()),
  index("conversation_analytics_total_tokens_idx").on(table.totalTokensUsed.desc()),
]);

export const PLAN_LIMITS = {
  free: { searches: 5, exports: 3 },
  pro: { searches: -1, exports: -1 }, // unlimited
  enterprise: { searches: -1, exports: -1 }, // unlimited
};

export const PLAN_PRICES = {
  free: 0,
  pro: 29,
  enterprise: 299,
};

// Idea validation schemas
export const insertIdeaSchema = createInsertSchema(ideas).pick({
  title: true,
  description: true,
  targetMarket: true,
  businessModel: true,
  category: true,
  initialInvestment: true,
  monthlyRevenue: true,
  monthlyExpenses: true,
  sourceSearchResultId: true,
});

export const validateIdeaSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000),
  targetMarket: z.string().min(5, "Target market must be specified").max(500),
  businessModel: z.string().min(5, "Business model must be specified").max(500),
  category: z.enum(['tech', 'healthcare', 'fintech', 'ecommerce', 'saas', 'marketplace', 'education', 'sustainability', 'other']),
  initialInvestment: z.number().min(0).max(10000000).optional(),
  monthlyRevenue: z.number().min(0).max(1000000).optional(),
  monthlyExpenses: z.number().min(0).max(1000000).optional(),
  sourceSearchResultId: z.number().optional(),
});

export const financialProjectionSchema = z.object({
  year: z.number(),
  revenue: z.number(),
  expenses: z.number(),
  profit: z.number(),
  cashFlow: z.number(),
  customers: z.number().optional(),
  marketShare: z.number().optional(),
});

// Export types
export type Idea = typeof ideas.$inferSelect;
export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type ValidateIdea = z.infer<typeof validateIdeaSchema>;
export type FinancialProjection = z.infer<typeof financialProjectionSchema>;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type IdeaShare = typeof ideaShares.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type ActivityFeedItem = typeof activityFeed.$inferSelect;
export type SecurityAuditLog = typeof securityAuditLogs.$inferSelect;
export type InsertSecurityAuditLog = typeof securityAuditLogs.$inferInsert;
export type SecurityAlert = typeof securityAlerts.$inferSelect;
export type InsertSecurityAlert = typeof securityAlerts.$inferInsert;
export type PasswordHistory = typeof passwordHistory.$inferSelect;
export type InsertPasswordHistory = typeof passwordHistory.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// UX Information Architecture types
export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type ProjectAnalysis = typeof projectAnalyses.$inferSelect;
export type InsertProjectAnalysis = typeof projectAnalyses.$inferInsert;
export type ActionPlanProgress = typeof actionPlanProgress.$inferSelect;
export type InsertActionPlanProgress = typeof actionPlanProgress.$inferInsert;
export type ShareLink = typeof shareLinks.$inferSelect;
export type InsertShareLink = typeof shareLinks.$inferInsert;
export type HelpArticle = typeof helpArticles.$inferSelect;
export type InsertHelpArticle = typeof helpArticles.$inferInsert;

// Project validation schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200, "Project name must be 200 characters or less"),
  description: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  archived: z.boolean().optional(),
});

export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

// Interactive AI Conversations types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = typeof conversationMessages.$inferInsert;
export type SuggestedQuestion = typeof suggestedQuestions.$inferSelect;
export type InsertSuggestedQuestion = typeof suggestedQuestions.$inferInsert;
export type ConversationAnalytics = typeof conversationAnalytics.$inferSelect;
export type InsertConversationAnalytics = typeof conversationAnalytics.$inferInsert;

// Conversation validation schemas
export const createConversationSchema = z.object({
  analysisId: z.number().int().positive(),
  userId: z.number().int().positive(),
});

export const createMessageSchema = z.object({
  conversationId: z.number().int().positive(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(10000),
  metadata: z.object({
    tokensUsed: z.number().optional(),
    processingTime: z.number().optional(),
    confidence: z.number().min(0).max(100).optional(),
    sources: z.array(z.string()).optional(),
    assumptions: z.array(z.string()).optional(),
  }).optional(),
});

export const createSuggestedQuestionSchema = z.object({
  conversationId: z.number().int().positive(),
  questionText: z.string().min(5).max(500),
  category: z.enum(['market_validation', 'competitive_analysis', 'execution_strategy', 'risk_assessment']),
  priority: z.number().int().min(0).max(100).optional(),
});

export const updateConversationAnalyticsSchema = z.object({
  messageCount: z.number().int().min(0).optional(),
  totalTokensUsed: z.number().int().min(0).optional(),
  avgResponseTime: z.number().int().min(0).optional(),
  userSatisfaction: z.number().int().min(1).max(5).optional(),
});

export type CreateConversation = z.infer<typeof createConversationSchema>;
export type CreateMessage = z.infer<typeof createMessageSchema>;
export type CreateSuggestedQuestion = z.infer<typeof createSuggestedQuestionSchema>;
export type UpdateConversationAnalytics = z.infer<typeof updateConversationAnalyticsSchema>;

// Resource Library Enhancement tables
export const resourceCategories = pgTable("resource_categories", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  slug: varchar({ length: 100 }).notNull(),
  description: text(),
  icon: varchar({ length: 50 }), // lucide icon name
  displayOrder: integer("display_order").default(0).notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique("resource_categories_name_unique").on(table.name),
  unique("resource_categories_slug_unique").on(table.slug),
  foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id],
    name: "resource_categories_parent_id_resource_categories_id_fk"
  }),
  index("resource_categories_parent_id_idx").on(table.parentId),
  index("resource_categories_display_order_idx").on(table.displayOrder),
]);

export const resourceTags = pgTable("resource_tags", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 50 }).notNull(),
  slug: varchar({ length: 50 }).notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
}, (table) => [
  unique("resource_tags_name_unique").on(table.name),
  unique("resource_tags_slug_unique").on(table.slug),
  index("resource_tags_usage_count_idx").on(table.usageCount.desc()),
]);

export const resources = pgTable("resources", {
  id: serial().primaryKey().notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  url: text().notNull(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // 'tool', 'template', 'guide', 'video', 'article'
  categoryId: integer("category_id"),
  phaseRelevance: jsonb("phase_relevance").default([]).notNull(), // string[] - ['research', 'validation', 'development', 'launch']
  ideaTypes: jsonb("idea_types").default([]).notNull(), // string[] - ['software', 'physical_product', 'service', 'marketplace']
  difficultyLevel: varchar("difficulty_level", { length: 20 }), // 'beginner', 'intermediate', 'advanced'
  estimatedTimeMinutes: integer("estimated_time_minutes"),
  isPremium: boolean("is_premium").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  averageRating: integer("average_rating").default(0).notNull(), // stored as integer (0-500 for 0.0-5.0 with 0.1 precision)
  ratingCount: integer("rating_count").default(0).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  bookmarkCount: integer("bookmark_count").default(0).notNull(),
  metadata: jsonb().default({}).notNull(), // flexible storage for resource-specific data
  searchVector: text("search_vector"), // tsvector for full-text search (stored as text, converted in queries)
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.categoryId],
    foreignColumns: [resourceCategories.id],
    name: "resources_category_id_resource_categories_id_fk"
  }),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "resources_created_by_users_id_fk"
  }),
  index("resources_category_id_idx").on(table.categoryId),
  index("resources_is_active_idx").on(table.isActive),
  index("resources_average_rating_idx").on(table.averageRating.desc()),
  index("resources_view_count_idx").on(table.viewCount.desc()),
  index("resources_resource_type_idx").on(table.resourceType),
]);

export const resourceTagMappings = pgTable("resource_tag_mappings", {
  resourceId: integer("resource_id").notNull(),
  tagId: integer("tag_id").notNull(),
}, (table) => [
  foreignKey({
    columns: [table.resourceId],
    foreignColumns: [resources.id],
    name: "resource_tag_mappings_resource_id_resources_id_fk"
  }),
  foreignKey({
    columns: [table.tagId],
    foreignColumns: [resourceTags.id],
    name: "resource_tag_mappings_tag_id_resource_tags_id_fk"
  }),
  index("resource_tag_mappings_resource_id_idx").on(table.resourceId),
  index("resource_tag_mappings_tag_id_idx").on(table.tagId),
]);

export const userBookmarks = pgTable("user_bookmarks", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  resourceId: integer("resource_id").notNull(),
  notes: text(),
  customTags: jsonb("custom_tags").default([]).notNull(), // string[]
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "user_bookmarks_user_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.resourceId],
    foreignColumns: [resources.id],
    name: "user_bookmarks_resource_id_resources_id_fk"
  }),
  unique("user_bookmarks_user_resource_unique").on(table.userId, table.resourceId),
  index("user_bookmarks_user_id_idx").on(table.userId),
  index("user_bookmarks_resource_id_idx").on(table.resourceId),
]);

export const resourceRatings = pgTable("resource_ratings", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  resourceId: integer("resource_id").notNull(),
  rating: integer().notNull(), // 1-5
  review: text(),
  isHelpfulCount: integer("is_helpful_count").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "resource_ratings_user_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.resourceId],
    foreignColumns: [resources.id],
    name: "resource_ratings_resource_id_resources_id_fk"
  }),
  unique("resource_ratings_user_resource_unique").on(table.userId, table.resourceId),
  index("resource_ratings_resource_id_idx").on(table.resourceId),
  index("resource_ratings_rating_idx").on(table.rating.desc()),
  index("resource_ratings_is_helpful_count_idx").on(table.isHelpfulCount.desc()),
]);

export const resourceContributions = pgTable("resource_contributions", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  url: text().notNull(),
  suggestedCategoryId: integer("suggested_category_id"),
  suggestedTags: jsonb("suggested_tags").default([]).notNull(), // string[]
  status: varchar({ length: 20 }).default('pending').notNull(), // 'pending', 'approved', 'rejected'
  adminNotes: text("admin_notes"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "resource_contributions_user_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.suggestedCategoryId],
    foreignColumns: [resourceCategories.id],
    name: "resource_contributions_suggested_category_id_resource_categories_id_fk"
  }),
  foreignKey({
    columns: [table.reviewedBy],
    foreignColumns: [users.id],
    name: "resource_contributions_reviewed_by_users_id_fk"
  }),
  index("resource_contributions_status_idx").on(table.status),
  index("resource_contributions_user_id_idx").on(table.userId),
  index("resource_contributions_created_at_idx").on(table.createdAt.desc()),
]);

export const resourceAccessHistory = pgTable("resource_access_history", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  resourceId: integer("resource_id").notNull(),
  analysisId: integer("analysis_id"),
  actionPlanStepId: text("action_plan_step_id"), // reference to specific step if applicable
  accessType: varchar("access_type", { length: 20 }).notNull(), // 'view', 'download', 'external_link'
  accessedAt: timestamp("accessed_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "resource_access_history_user_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.resourceId],
    foreignColumns: [resources.id],
    name: "resource_access_history_resource_id_resources_id_fk"
  }),
  foreignKey({
    columns: [table.analysisId],
    foreignColumns: [searches.id],
    name: "resource_access_history_analysis_id_searches_id_fk"
  }),
  index("resource_access_history_user_id_idx").on(table.userId),
  index("resource_access_history_resource_id_idx").on(table.resourceId),
  index("resource_access_history_analysis_id_idx").on(table.analysisId),
  index("resource_access_history_accessed_at_idx").on(table.accessedAt.desc()),
]);

export const resourceAnalytics = pgTable("resource_analytics", {
  id: serial().primaryKey().notNull(),
  resourceId: integer("resource_id").notNull(),
  date: timestamp({ mode: 'string' }).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  uniqueUsers: integer("unique_users").default(0).notNull(),
  bookmarkCount: integer("bookmark_count").default(0).notNull(),
  downloadCount: integer("download_count").default(0).notNull(),
  externalClickCount: integer("external_click_count").default(0).notNull(),
  averageTimeSpentSeconds: integer("average_time_spent_seconds").default(0).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.resourceId],
    foreignColumns: [resources.id],
    name: "resource_analytics_resource_id_resources_id_fk"
  }),
  unique("resource_analytics_resource_date_unique").on(table.resourceId, table.date),
  index("resource_analytics_resource_id_idx").on(table.resourceId),
  index("resource_analytics_date_idx").on(table.date.desc()),
  index("resource_analytics_view_count_idx").on(table.viewCount.desc()),
]);

// Resource Library types
export type ResourceCategory = typeof resourceCategories.$inferSelect;
export type InsertResourceCategory = typeof resourceCategories.$inferInsert;
export type ResourceTag = typeof resourceTags.$inferSelect;
export type InsertResourceTag = typeof resourceTags.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;
export type ResourceTagMapping = typeof resourceTagMappings.$inferSelect;
export type InsertResourceTagMapping = typeof resourceTagMappings.$inferInsert;
export type UserBookmark = typeof userBookmarks.$inferSelect;
export type InsertUserBookmark = typeof userBookmarks.$inferInsert;
export type ResourceRating = typeof resourceRatings.$inferSelect;
export type InsertResourceRating = typeof resourceRatings.$inferInsert;
export type ResourceContribution = typeof resourceContributions.$inferSelect;
export type InsertResourceContribution = typeof resourceContributions.$inferInsert;
export type ResourceAccessHistory = typeof resourceAccessHistory.$inferSelect;
export type InsertResourceAccessHistory = typeof resourceAccessHistory.$inferInsert;
export type ResourceAnalytics = typeof resourceAnalytics.$inferSelect;
export type InsertResourceAnalytics = typeof resourceAnalytics.$inferInsert;

// Resource Library validation schemas
export const createResourceSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(255),
  description: z.string().min(20, "Description must be at least 20 characters"),
  url: z.string().url("Must be a valid URL"),
  resourceType: z.enum(['tool', 'template', 'guide', 'video', 'article']),
  categoryId: z.number().int().positive().optional(),
  phaseRelevance: z.array(z.enum(['research', 'validation', 'development', 'launch'])).optional().default([]),
  ideaTypes: z.array(z.enum(['software', 'physical_product', 'service', 'marketplace'])).optional().default([]),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedTimeMinutes: z.number().int().positive().optional(),
  isPremium: z.boolean().optional().default(false),
  metadata: z.record(z.any()).optional().default({}),
});

export const updateResourceSchema = z.object({
  title: z.string().min(5).max(255).optional(),
  description: z.string().min(20).optional(),
  url: z.string().url().optional(),
  resourceType: z.enum(['tool', 'template', 'guide', 'video', 'article']).optional(),
  categoryId: z.number().int().positive().optional(),
  phaseRelevance: z.array(z.enum(['research', 'validation', 'development', 'launch'])).optional(),
  ideaTypes: z.array(z.enum(['software', 'physical_product', 'service', 'marketplace'])).optional(),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedTimeMinutes: z.number().int().positive().optional(),
  isPremium: z.boolean().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export const createResourceCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.number().int().optional().default(0),
  parentId: z.number().int().positive().optional(),
});

export const createResourceRatingSchema = z.object({
  resourceId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  review: z.string().max(2000).optional(),
});

export const createResourceContributionSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(20),
  url: z.string().url(),
  suggestedCategoryId: z.number().int().positive().optional(),
  suggestedTags: z.array(z.string()).optional().default([]),
});

export const createBookmarkSchema = z.object({
  resourceId: z.number().int().positive(),
  notes: z.string().max(1000).optional(),
  customTags: z.array(z.string()).optional().default([]),
});

export const trackResourceAccessSchema = z.object({
  resourceId: z.number().int().positive(),
  analysisId: z.number().int().positive().optional(),
  actionPlanStepId: z.string().optional(),
  accessType: z.enum(['view', 'download', 'external_link']),
});

export type CreateResource = z.infer<typeof createResourceSchema>;
export type UpdateResource = z.infer<typeof updateResourceSchema>;
export type CreateResourceCategory = z.infer<typeof createResourceCategorySchema>;
export type CreateResourceRating = z.infer<typeof createResourceRatingSchema>;
export type CreateResourceContribution = z.infer<typeof createResourceContributionSchema>;
export type CreateBookmark = z.infer<typeof createBookmarkSchema>;
export type TrackResourceAccess = z.infer<typeof trackResourceAccessSchema>;

// ============================================================================
// Action Plan Customization & Progress Tracking
// ============================================================================

// Enum types for action plans
export const planStatusEnum = ['active', 'completed', 'archived'] as const;
export const taskStatusEnum = ['not_started', 'in_progress', 'completed', 'skipped'] as const;
export const taskHistoryActionEnum = ['created', 'updated', 'completed', 'skipped', 'deleted', 'reordered'] as const;

// Action Plans table
export const actionPlans = pgTable("action_plans", {
  id: serial().primaryKey().notNull(),
  searchId: integer("search_id").notNull(),
  userId: integer("user_id").notNull(),
  templateId: integer("template_id"),
  title: varchar({ length: 200 }).notNull(),
  description: text(),
  status: text().default('active').notNull(), // 'active' | 'completed' | 'archived'
  originalPlan: jsonb("original_plan").notNull(), // AI-generated plan (immutable)
  customizations: jsonb().default({}).notNull(), // User modifications
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
  foreignKey({
    columns: [table.searchId],
    foreignColumns: [searches.id],
    name: "action_plans_search_id_searches_id_fk"
  }),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "action_plans_user_id_users_id_fk"
  }),
  index("action_plans_search_id_idx").on(table.searchId),
  index("action_plans_user_id_idx").on(table.userId),
  index("action_plans_status_idx").on(table.status),
  index("action_plans_user_status_idx").on(table.userId, table.status),
  index("action_plans_updated_at_idx").on(table.updatedAt.desc()),
]);

// Plan Phases table
export const planPhases = pgTable("plan_phases", {
  id: serial().primaryKey().notNull(),
  planId: integer("plan_id").notNull(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  order: integer().notNull(),
  estimatedDuration: varchar("estimated_duration", { length: 50 }), // e.g., "2 weeks"
  isCustom: boolean("is_custom").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.planId],
    foreignColumns: [actionPlans.id],
    name: "plan_phases_plan_id_action_plans_id_fk"
  }),
  index("plan_phases_plan_id_idx").on(table.planId),
  index("plan_phases_plan_order_idx").on(table.planId, table.order),
  unique("plan_phases_plan_order_unique").on(table.planId, table.order),
]);

// Plan Tasks table
export const planTasks = pgTable("plan_tasks", {
  id: serial().primaryKey().notNull(),
  phaseId: integer("phase_id").notNull(),
  planId: integer("plan_id").notNull(), // Denormalized for faster queries
  title: varchar({ length: 200 }).notNull(),
  description: text(),
  estimatedTime: varchar("estimated_time", { length: 50 }), // e.g., "4 hours"
  resources: jsonb().default([]).notNull(), // Links to resources (string[])
  order: integer().notNull(),
  status: text().default('not_started').notNull(), // 'not_started' | 'in_progress' | 'completed' | 'skipped'
  isCustom: boolean("is_custom").default(false).notNull(),
  assigneeId: integer("assignee_id"),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  completedBy: integer("completed_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.phaseId],
    foreignColumns: [planPhases.id],
    name: "plan_tasks_phase_id_plan_phases_id_fk"
  }),
  foreignKey({
    columns: [table.planId],
    foreignColumns: [actionPlans.id],
    name: "plan_tasks_plan_id_action_plans_id_fk"
  }),
  foreignKey({
    columns: [table.assigneeId],
    foreignColumns: [users.id],
    name: "plan_tasks_assignee_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.completedBy],
    foreignColumns: [users.id],
    name: "plan_tasks_completed_by_users_id_fk"
  }),
  index("plan_tasks_phase_id_idx").on(table.phaseId),
  index("plan_tasks_plan_id_idx").on(table.planId),
  index("plan_tasks_status_idx").on(table.status),
  index("plan_tasks_plan_status_idx").on(table.planId, table.status),
  index("plan_tasks_phase_order_idx").on(table.phaseId, table.order),
  index("plan_tasks_assignee_id_idx").on(table.assigneeId),
  index("plan_tasks_completed_at_idx").on(table.completedAt.desc()),
  unique("plan_tasks_phase_order_unique").on(table.phaseId, table.order),
]);

// Task Dependencies table
export const taskDependencies = pgTable("task_dependencies", {
  id: serial().primaryKey().notNull(),
  taskId: integer("task_id").notNull(), // Dependent task
  prerequisiteTaskId: integer("prerequisite_task_id").notNull(), // Must be completed first
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.taskId],
    foreignColumns: [planTasks.id],
    name: "task_dependencies_task_id_plan_tasks_id_fk"
  }),
  foreignKey({
    columns: [table.prerequisiteTaskId],
    foreignColumns: [planTasks.id],
    name: "task_dependencies_prerequisite_task_id_plan_tasks_id_fk"
  }),
  index("task_dependencies_task_id_idx").on(table.taskId),
  index("task_dependencies_prerequisite_task_id_idx").on(table.prerequisiteTaskId),
  unique("task_dependencies_unique").on(table.taskId, table.prerequisiteTaskId),
]);

// Plan Templates table
export const planTemplates = pgTable("plan_templates", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  category: varchar({ length: 50 }).notNull(), // 'software', 'physical', 'service', etc.
  icon: varchar({ length: 50 }), // Icon identifier
  phases: jsonb().notNull(), // Template structure
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("plan_templates_category_idx").on(table.category),
  index("plan_templates_is_active_idx").on(table.isActive),
  index("plan_templates_is_default_idx").on(table.isDefault),
  unique("plan_templates_name_unique").on(table.name),
]);

// Task History table (Audit Trail)
export const taskHistory = pgTable("task_history", {
  id: serial().primaryKey().notNull(),
  taskId: integer("task_id").notNull(),
  userId: integer("user_id").notNull(),
  action: text().notNull(), // 'created' | 'updated' | 'completed' | 'skipped' | 'deleted' | 'reordered'
  previousState: jsonb("previous_state"),
  newState: jsonb("new_state"),
  timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.taskId],
    foreignColumns: [planTasks.id],
    name: "task_history_task_id_plan_tasks_id_fk"
  }),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "task_history_user_id_users_id_fk"
  }),
  index("task_history_task_id_idx").on(table.taskId),
  index("task_history_user_id_idx").on(table.userId),
  index("task_history_timestamp_idx").on(table.timestamp.desc()),
  index("task_history_task_timestamp_idx").on(table.taskId, table.timestamp.desc()),
]);

// Progress Snapshots table (Analytics)
export const progressSnapshots = pgTable("progress_snapshots", {
  id: serial().primaryKey().notNull(),
  planId: integer("plan_id").notNull(),
  totalTasks: integer("total_tasks").notNull(),
  completedTasks: integer("completed_tasks").notNull(),
  inProgressTasks: integer("in_progress_tasks").notNull(),
  skippedTasks: integer("skipped_tasks").notNull(),
  completionPercentage: integer("completion_percentage").notNull(), // 0-100
  averageTaskTime: integer("average_task_time"), // In hours
  velocity: integer(), // Tasks per week (stored as integer for simplicity)
  timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.planId],
    foreignColumns: [actionPlans.id],
    name: "progress_snapshots_plan_id_action_plans_id_fk"
  }),
  index("progress_snapshots_plan_id_idx").on(table.planId),
  index("progress_snapshots_timestamp_idx").on(table.timestamp.desc()),
  index("progress_snapshots_plan_timestamp_idx").on(table.planId, table.timestamp.desc()),
]);

// Add foreign key for template reference in action_plans
// (This is handled in the migration file as an ALTER TABLE statement)

// ============================================================================
// Action Plan Types
// ============================================================================

export type ActionPlan = typeof actionPlans.$inferSelect;
export type InsertActionPlan = typeof actionPlans.$inferInsert;
export type PlanPhase = typeof planPhases.$inferSelect;
export type InsertPlanPhase = typeof planPhases.$inferInsert;
export type PlanTask = typeof planTasks.$inferSelect;
export type InsertPlanTask = typeof planTasks.$inferInsert;
export type TaskDependency = typeof taskDependencies.$inferSelect;
export type InsertTaskDependency = typeof taskDependencies.$inferInsert;
export type PlanTemplate = typeof planTemplates.$inferSelect;
export type InsertPlanTemplate = typeof planTemplates.$inferInsert;
export type TaskHistory = typeof taskHistory.$inferSelect;
export type InsertTaskHistory = typeof taskHistory.$inferInsert;
export type ProgressSnapshot = typeof progressSnapshots.$inferSelect;
export type InsertProgressSnapshot = typeof progressSnapshots.$inferInsert;

// ============================================================================
// Action Plan Validation Schemas
// ============================================================================

export const createActionPlanSchema = z.object({
  searchId: z.number().int().positive(),
  userId: z.number().int().positive(),
  templateId: z.number().int().positive().optional(),
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().optional(),
  originalPlan: z.record(z.any()), // JSONB structure
});

export const updateActionPlanSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  customizations: z.record(z.any()).optional(),
});

export const createPlanPhaseSchema = z.object({
  planId: z.number().int().positive(),
  name: z.string().min(2, "Phase name must be at least 2 characters").max(100),
  description: z.string().optional(),
  order: z.number().int().min(0),
  estimatedDuration: z.string().max(50).optional(),
  isCustom: z.boolean().optional().default(false),
});

export const updatePlanPhaseSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
  estimatedDuration: z.string().max(50).optional(),
});

export const createPlanTaskSchema = z.object({
  phaseId: z.number().int().positive(),
  planId: z.number().int().positive(),
  title: z.string().min(3, "Task title must be at least 3 characters").max(200),
  description: z.string().optional(),
  estimatedTime: z.string().max(50).optional(),
  resources: z.array(z.string()).optional().default([]),
  order: z.number().int().min(0),
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']).optional().default('not_started'),
  isCustom: z.boolean().optional().default(false),
  assigneeId: z.number().int().positive().optional(),
});

export const updatePlanTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  estimatedTime: z.string().max(50).optional(),
  resources: z.array(z.string()).optional(),
  order: z.number().int().min(0).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']).optional(),
  assigneeId: z.number().int().positive().optional(),
});

export const createTaskDependencySchema = z.object({
  taskId: z.number().int().positive(),
  prerequisiteTaskId: z.number().int().positive(),
}).refine(data => data.taskId !== data.prerequisiteTaskId, {
  message: 'Task cannot depend on itself',
  path: ['prerequisiteTaskId'],
});

export const validateDependenciesSchema = z.object({
  taskId: z.number().int().positive(),
  prerequisiteTaskId: z.number().int().positive(),
});

export const reorderTasksSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1),
});

export const createPlanTemplateSchema = z.object({
  name: z.string().min(3, "Template name must be at least 3 characters").max(100),
  description: z.string().optional(),
  category: z.string().min(2).max(50),
  icon: z.string().max(50).optional(),
  phases: z.array(z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    order: z.number().int().min(0),
    tasks: z.array(z.object({
      title: z.string().min(3).max(200),
      description: z.string().optional(),
      estimatedTime: z.string().optional(),
      resources: z.array(z.string()).optional().default([]),
      order: z.number().int().min(0),
    })),
  })),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const updatePlanTemplateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  category: z.string().min(2).max(50).optional(),
  icon: z.string().max(50).optional(),
  phases: z.array(z.any()).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Export validation schema types
export type CreateActionPlan = z.infer<typeof createActionPlanSchema>;
export type UpdateActionPlan = z.infer<typeof updateActionPlanSchema>;
export type CreatePlanPhase = z.infer<typeof createPlanPhaseSchema>;
export type UpdatePlanPhase = z.infer<typeof updatePlanPhaseSchema>;
export type CreatePlanTask = z.infer<typeof createPlanTaskSchema>;
export type UpdatePlanTask = z.infer<typeof updatePlanTaskSchema>;
export type CreateTaskDependency = z.infer<typeof createTaskDependencySchema>;
export type ValidateDependencies = z.infer<typeof validateDependenciesSchema>;
export type ReorderTasks = z.infer<typeof reorderTasksSchema>;
export type CreatePlanTemplate = z.infer<typeof createPlanTemplateSchema>;
export type UpdatePlanTemplate = z.infer<typeof updatePlanTemplateSchema>;

// ============================================================================
// Progress Metrics Interface
// ============================================================================

export interface ProgressMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  skippedTasks: number;
  completionPercentage: number;
  currentPhase?: string;
  estimatedCompletion?: Date | null;
  velocity?: number; // Tasks per week
  averageTaskTime?: number; // In hours
}

// ============================================================================
// Dependency Validation Interface
// ============================================================================

export interface DependencyValidation {
  isValid: boolean;
  errors: string[];
  circularDependencies: string[][];
}

// Feature Flags table for gradual rollout and A/B testing
export const featureFlags = pgTable("feature_flags", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  description: text().notNull(),
  enabled: boolean().default(false).notNull(),
  rolloutPercentage: integer("rollout_percentage").default(0).notNull(), // 0-100
  allowedTiers: jsonb("allowed_tiers").default([]).notNull(), // ['free', 'pro', 'enterprise']
  allowedUserIds: jsonb("allowed_user_ids").default([]).notNull(), // [1, 2, 3]
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique("feature_flags_name_unique").on(table.name),
  index("idx_feature_flags_name").on(table.name),
  index("idx_feature_flags_enabled").on(table.enabled),
]);

// User Feature Flags table for tracking individual user feature access
export const userFeatureFlags = pgTable("user_feature_flags", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  featureFlagId: integer("feature_flag_id").notNull(),
  enabled: boolean().default(true).notNull(),
  enabledAt: timestamp("enabled_at", { mode: 'string' }).defaultNow().notNull(),
  disabledAt: timestamp("disabled_at", { mode: 'string' }),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "user_feature_flags_user_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.featureFlagId],
    foreignColumns: [featureFlags.id],
    name: "user_feature_flags_feature_flag_id_feature_flags_id_fk"
  }),
  unique("user_feature_flags_user_feature_unique").on(table.userId, table.featureFlagId),
  index("idx_user_feature_flags_user_id").on(table.userId),
  index("idx_user_feature_flags_feature_flag_id").on(table.featureFlagId),
]);
