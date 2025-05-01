/*
  # Create operation logs table

  1. New Tables
    - `operation_logs`
      - `id` (uuid, primary key)
      - `action` (text, not null) - The type of operation performed
      - `details` (jsonb) - Additional details about the operation
      - `business_date` (date, not null) - The business date when the operation occurred
      - `created_at` (timestamptz) - Timestamp of when the log was created
      - `updated_at` (timestamptz) - Timestamp of when the log was last updated

  2. Security
    - Enable RLS on `operation_logs` table
    - Add policy for anyone to insert logs
    - Add policy for anyone to read logs
*/

CREATE TABLE IF NOT EXISTS operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  business_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert operation_logs"
  ON operation_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can read operation_logs"
  ON operation_logs
  FOR SELECT
  TO anon
  USING (true);

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER update_operation_logs_updated_at
  BEFORE UPDATE ON operation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();