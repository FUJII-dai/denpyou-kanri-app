/*
  # Add staff table and improve data persistence

  1. Schema Changes
    - Create staff table if not exists
    - Add unique constraint on name
    - Add index for faster lookups
    
  2. Security
    - Enable RLS if not already enabled
    - Add policies if they don't exist
    
  3. Triggers
    - Add updated_at trigger if not exists
*/

-- Create staff table if not exists
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT staff_name_unique UNIQUE (name)
);

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read staff" ON staff;
  DROP POLICY IF EXISTS "Anyone can insert staff" ON staff;
  DROP POLICY IF EXISTS "Anyone can update staff" ON staff;
  DROP POLICY IF EXISTS "Anyone can delete staff" ON staff;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create policies for anonymous access
CREATE POLICY "Anyone can read staff"
  ON staff FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert staff"
  ON staff FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update staff"
  ON staff FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete staff"
  ON staff FOR DELETE
  TO anon
  USING (true);

-- Create updated_at trigger if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_staff_updated_at') THEN
    CREATE TRIGGER update_staff_updated_at
      BEFORE UPDATE ON staff
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_name ON staff (name);

-- Add table to realtime publication if not already added
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'staff'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE staff;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;