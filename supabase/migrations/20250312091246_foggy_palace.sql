/*
  # Add register cash management table

  1. New Tables
    - `register_cash`
      - `business_date` (date, primary key)
      - `starting_amount` (integer)
      - `coins_amount` (integer)
      - `withdrawals` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for anonymous access
*/

CREATE TABLE register_cash (
  business_date date PRIMARY KEY,
  starting_amount integer DEFAULT 0,
  coins_amount integer DEFAULT 0,
  withdrawals jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE register_cash ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read register_cash"
  ON register_cash FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert register_cash"
  ON register_cash FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update register_cash"
  ON register_cash FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_register_cash_updated_at
  BEFORE UPDATE ON register_cash
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE register_cash;