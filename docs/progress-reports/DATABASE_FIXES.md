# Database Schema Fixes

## 1. Fix User ID Type Inconsistencies

### Problem
Mixed usage of string and integer types for user IDs across the application.

### Solution
Standardize on string UUIDs for better scalability:

```typescript
// shared/schema.ts - Update user table
export const users = pgTable("users", {
  id: text().primaryKey().notNull(), // Change from serial to text
  email: text().notNull(),
  // ... rest of fields
});

// Update foreign key references
export const searches = pgTable("searches", {
  id: serial().primaryKey().notNull(),
  query: text().notNull(),
  userId: text("user_id"), // Change from integer to text
  // ...
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "searches_user_id_users_id_fk"
  }),
]);
```

## 2. Add Missing Indexes for Performance

```sql
-- Add indexes for common queries
CREATE INDEX idx_searches_user_id ON searches(user_id);
CREATE INDEX idx_searches_timestamp ON searches(timestamp);
CREATE INDEX idx_search_results_search_id ON search_results(search_id);
CREATE INDEX idx_search_results_innovation_score ON search_results(innovation_score);
CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_created_at ON ideas(created_at);
```

## 3. Add Data Validation Constraints

```sql
-- Add check constraints for data integrity
ALTER TABLE search_results 
ADD CONSTRAINT check_innovation_score 
CHECK (innovation_score >= 0 AND innovation_score <= 100);

ALTER TABLE ideas 
ADD CONSTRAINT check_overall_score 
CHECK (overall_score >= 0 AND overall_score <= 100);

ALTER TABLE users 
ADD CONSTRAINT check_plan 
CHECK (plan IN ('free', 'pro', 'enterprise'));
```