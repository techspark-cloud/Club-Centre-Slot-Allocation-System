-- Add a boolean column to track if a student has successfully scanned and verified their physical ID card
ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS id_card_verified BOOLEAN DEFAULT FALSE;
