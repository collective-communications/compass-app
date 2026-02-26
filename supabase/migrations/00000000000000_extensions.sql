-- PostgreSQL 13+ includes gen_random_uuid() natively (no extension needed).
-- pgcrypto kept for crypt()/gen_salt() if needed later.
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
