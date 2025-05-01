/*
  # Add guests history tracking

  1. Changes
    - Add guests_history column to orders table to track historical guest counts
    - Add function to update guests history automatically
    - Add trigger to maintain guests history

  2. Purpose
    - Enable tracking of maximum guest count for reporting
    - Maintain history of guest count changes
*/

-- Add guests_history column if it doesn't exist
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS guests_history integer[] DEFAULT ARRAY[]::integer[];

-- Create function to update guests history
CREATE OR REPLACE FUNCTION update_guests_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update history if guests count changed
  IF (TG_OP = 'INSERT') OR (OLD.guests != NEW.guests) THEN
    -- Append new guests count to history if it's not already the last value
    IF NEW.guests_history IS NULL THEN
      NEW.guests_history := ARRAY[NEW.guests];
    ELSIF NEW.guests != NEW.guests_history[array_length(NEW.guests_history, 1)] THEN
      NEW.guests_history := array_append(NEW.guests_history, NEW.guests);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for guests history
DROP TRIGGER IF EXISTS update_guests_history_trigger ON orders;
CREATE TRIGGER update_guests_history_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_guests_history();