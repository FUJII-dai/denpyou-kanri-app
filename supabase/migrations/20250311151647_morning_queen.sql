/*
  # Add temporary input fields

  1. Changes
    - Add temp_cast_drink column for storing temporary cast drink input
    - Add temp_bottle column for storing temporary bottle input
    - Add temp_food column for storing temporary food input

  2. Purpose
    - Enable persistence of form input values
    - Improve user experience by maintaining input state
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'temp_cast_drink'
  ) THEN
    ALTER TABLE orders ADD COLUMN temp_cast_drink jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'temp_bottle'
  ) THEN
    ALTER TABLE orders ADD COLUMN temp_bottle jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'temp_food'
  ) THEN
    ALTER TABLE orders ADD COLUMN temp_food jsonb;
  END IF;
END $$;