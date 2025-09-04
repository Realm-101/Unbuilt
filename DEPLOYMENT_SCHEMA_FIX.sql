-- Deployment Schema Fix for SID/SESS Column Conflicts
-- Run this if you encounter session table conflicts during deployment

-- Step 1: Backup existing session data (optional)
-- CREATE TABLE sessions_backup AS SELECT * FROM sessions;

-- Step 2: Drop existing session table and all constraints
DROP TABLE IF EXISTS sessions CASCADE;

-- Step 3: Recreate with explicit column definitions
CREATE TABLE sessions (
    sid text NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL,
    CONSTRAINT sessions_pkey PRIMARY KEY (sid)
);

-- Step 4: Create the expire index for session cleanup
CREATE INDEX "IDX_session_expire" ON sessions USING btree (expire);

-- Step 5: Set proper ownership and permissions
ALTER TABLE sessions OWNER TO neondb_owner;
GRANT ALL ON TABLE sessions TO neondb_owner;

-- Verification queries
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;

-- Check constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'sessions'::regclass;