-- Configurable Likert Scale — Part 1: Enum extension
-- Adds 'likert' to question_type enum. Must be in its own migration because
-- PostgreSQL cannot use a newly-added enum value in the same transaction.

ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'likert';
