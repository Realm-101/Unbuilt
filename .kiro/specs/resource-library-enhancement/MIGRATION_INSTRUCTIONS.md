# Resource Library Enhancement - Migration Instructions

## Overview

This document provides instructions for running the database migration for the Resource Library Enhancement feature.

## Migration Files

- **Migration SQL**: `migrations/0007_resource_library_enhancement.sql`
- **Rollback SQL**: `migrations/0007_resource_library_enhancement_rollback.sql`
- **Migration Script**: `server/scripts/run-resource-library-migration.ts`

## Tables Created

The migration creates the following tables:

1. **resource_categories** - Hierarchical categories for organizing resources
2. **resource_tags** - Tags for flexible resource classification
3. **resources** - Core resource library with tools, templates, guides, videos, and articles
4. **resource_tag_mappings** - Many-to-many relationship between resources and tags
5. **user_bookmarks** - User-saved resources with personal notes and custom tags
6. **resource_ratings** - User ratings and reviews for resources
7. **resource_contributions** - User-submitted resources pending admin review
8. **resource_access_history** - Tracks resource access for analytics and recommendations
9. **resource_analytics** - Daily aggregated metrics for resource performance

## Running the Migration

### Prerequisites

- Ensure DATABASE_URL is configured in `.env` file
- Ensure the database is accessible

### Execute Migration

```bash
# Run the migration
npx tsx server/scripts/run-resource-library-migration.ts

# Or using npm script (if added to package.json)
npm run migrate:resource-library
```

### Rollback Migration

If you need to rollback the migration:

```bash
# Rollback the migration
npx tsx server/scripts/run-resource-library-migration.ts rollback
```

## Verification

After running the migration, verify the tables were created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'resource%'
ORDER BY table_name;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename LIKE 'resource%'
ORDER BY tablename, indexname;

-- Check full-text search trigger
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'resources_search_vector_update';
```

## Features

### Full-Text Search

The migration includes a PostgreSQL full-text search setup:

- **search_vector** column on resources table (TSVECTOR type)
- Automatic trigger to update search_vector on INSERT/UPDATE
- GIN index for fast full-text search queries

### Hierarchical Categories

Resource categories support parent-child relationships for nested organization.

### Performance Indexes

All tables include appropriate indexes for:
- Foreign key relationships
- Common query patterns (filtering, sorting)
- Full-text search

## Schema Updates

The migration also updates `shared/schema.ts` with:

- Table definitions using Drizzle ORM
- TypeScript types for all tables
- Zod validation schemas for API endpoints

## Next Steps

After running the migration:

1. Seed initial resource categories (Task 3.1)
2. Seed curated resources (Task 3.2)
3. Build resource API endpoints (Task 4)

## Troubleshooting

### Connection Issues

If you encounter database connection errors:

1. Verify DATABASE_URL in `.env` is correct
2. Check database is accessible from your network
3. Ensure SSL/TLS settings are correct for Neon Database

### Migration Failures

If the migration fails:

1. Check the error message for specific SQL errors
2. Verify no conflicting table names exist
3. Run the rollback script to clean up partial migration
4. Fix any issues and re-run the migration

### Rollback Issues

If rollback fails:

1. Manually drop tables in reverse dependency order
2. Check for any foreign key constraints preventing deletion
3. Use CASCADE option if needed (already included in rollback script)

