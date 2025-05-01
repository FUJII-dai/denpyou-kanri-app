/*
  # Add next day cash fields to register_cash table

  1. Changes
    - Add next_day_amount column for storing next day's starting amount
    - Add next_day_coins column for storing next day's coins amount
    
  2. Purpose
    - Enable tracking of next day's cash register settings
    - Support cash collection calculation
*/

-- Add next day cash columns
ALTER TABLE register_cash
ADD COLUMN IF NOT EXISTS next_day_amount integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_day_coins integer DEFAULT 0;