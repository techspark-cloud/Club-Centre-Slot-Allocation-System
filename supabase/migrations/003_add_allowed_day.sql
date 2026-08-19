-- Migration 003: Add Allowed Day for Sections

-- Add allowed_day column to students table to restrict booking to a specific day
ALTER TABLE students ADD COLUMN allowed_day day_name;
