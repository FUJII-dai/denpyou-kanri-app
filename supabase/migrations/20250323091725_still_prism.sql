/*
  # Add operation logs table

  1. New Tables
    - `operation_logs`
      - `id` (uuid, primary key)
      - `action` (text)
      - `details` (jsonb)
      - `timestamp` (timestamptz)
      - `business_date` (date)

  2. Security
    - Enable RLS
    - Add policies for anonymous access (demo mode)
*/

-- Create operation_logs table
CREATE TABLE operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now(),
  business_date date NOT NULL
);

-- Enable RLS
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read operation_logs"
  ON operation_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert operation_logs"
  ON operation_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can delete operation_logs"
  ON operation_logs FOR DELETE
  TO anon
  USING (true);

-- Add indexes
CREATE INDEX idx_operation_logs_business_date ON operation_logs (business_date);
CREATE INDEX idx_operation_logs_timestamp ON operation_logs (timestamp);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE operation_logs;