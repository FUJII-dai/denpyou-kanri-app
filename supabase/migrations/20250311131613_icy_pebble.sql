/*
  # Add temporary input fields to orders table

  1. Changes
    - Add temp_cast_drink column for storing temporary cast drink input
    - Add temp_bottle column for storing temporary bottle input
    - Add temp_food column for storing temporary food input

  2. Purpose
    - Enable persistence of form input values across sessions
    - Prevent loss of user input when navigating or refreshing
*/

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS temp_cast_drink jsonb,
ADD COLUMN IF NOT EXISTS temp_bottle jsonb,
ADD COLUMN IF NOT EXISTS temp_food jsonb;