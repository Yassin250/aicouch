-- ===========================================================================
-- AI-Based Study Coach System
-- Create the application database on PostgreSQL 17
--
-- HOW TO RUN IN pgAdmin 4
--   1. Right-click "Databases" under the PostgreSQL 17 server.
--   2. Choose "Query Tool".
--   3. Paste the whole of this file and press F5 (Execute).
--
-- IMPORTANT: the database name contains a hyphen, so it MUST be wrapped in
-- double quotes. Without the quotes PostgreSQL reads "Study" minus "coach"
-- and raises a syntax error.
-- ===========================================================================

CREATE DATABASE "Study-coach"
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    TEMPLATE = template0;

-- Optional: connect to the new database and enable pgvector, which is the
-- documented scaling path for storing embeddings as real vectors.
-- The current build stores embeddings as JSON text, so this is NOT required.
--
-- \c "Study-coach"
-- CREATE EXTENSION IF NOT EXISTS vector;
