-- Fix the roles table check constraint to allow ADMIN, ENTITY, AUDITOR
-- Run this in your PostgreSQL database

-- First, drop the existing constraint if it exists
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check;

-- Add new constraint with the correct values
ALTER TABLE roles ADD CONSTRAINT roles_name_check 
CHECK (name IN ('ADMIN', 'ENTITY', 'AUDITOR'));
