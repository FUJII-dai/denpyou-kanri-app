/*
  # Update operation logs table

  1. Changes
    - Drop existing policies if they exist
    - Recreate policies with IF NOT EXISTS
    - Ensure indexes exist
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can read operation_logs" ON operation_logs;
  DROP POLICY IF EXISTS "Anyone can insert operation_logs" ON operation_logs;
  DROP POLICY IF EXISTS "Anyone can delete operation_logs" ON operation_logs;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create policies with IF NOT EXISTS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'operation_logs' 
    AND policyname = 'Anyone can read operation_logs'
  ) THEN
    CREATE POLICY "Anyone can read operation_logs"
      ON operation_logs FOR SELECT
      TO anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'operation_logs' 
    AND policyname = 'Anyone can insert operation_logs'
  ) THEN
    CREATE POLICY "Anyone can insert operation_logs"
      ON operation_logs FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'operation_logs' 
    AND policyname = 'Anyone can delete operation_logs'
  ) THEN
    CREATE POLICY "Anyone can delete operation_logs"
      ON operation_logs FOR DELETE
      TO anon
      USING (true);
  END IF;
END $$;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_operation_logs_business_date ON operation_logs (business_date);
CREATE INDEX IF NOT EXISTS idx_operation_logs_timestamp ON operation_logs (timestamp);