import { pgTable, text, serial, integer, boolean, timestamp, jsonb, index, unique, foreignKey, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const searches = pgTable("searches", {
  id: serial().primaryKey().notNull(),
  query: text().notNull(),
  timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
  resultsCount: integer("results_count").default(0).notNull(),
  userId: integer("user_id"),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "searches_user_id_users_id_fk"
  }),
]);

export const searchResults = pgTable("search_results", {
  id: serial().primaryKey().notNull(),
  searchId: integer("search_id").notNull(),
  title: text().notNull(),
  description: text().notNull(),
  category: text().notNull(),
  feasibility: text().notNull(),
  marketPotential: text("market_potential").notNull(),
  innovationScore: integer("innovation_score").notNull(),
  marketSize: text("market_size").notNull(),
  gapReason: text("gap_reason").notNull(),
  isSaved: boolean("is_saved").default(false).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.searchId],
    foreignColumns: [searches.id],
    name: "search_results_search_id_searches_id_fk"
  }),
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
  subscriptionStatus: text("subscription_status").default('inactive'),
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
