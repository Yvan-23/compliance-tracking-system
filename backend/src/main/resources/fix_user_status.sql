-- Fix the users table check constraint to allow ACTIVE, INACTIVE, SUSPENDED
-- Run this in your PostgreSQL database

-- First, drop the existing constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;

-- Add new constraint with the correct values
ALTER TABLE users ADD CONSTRAINT users_status_check 
CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'));