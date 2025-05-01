/*
  # Add daily sales aggregation

  1. New Tables
    - `daily_sales`
      - `business_date` (date, primary key)
      - `total_sales` (integer)
      - `cash_sales` (integer)
      - `card_sales` (integer)
      - `electronic_sales` (integer)
      - `total_guests` (integer)
      - `total_groups` (integer)
      - `cast_sales` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for anonymous access (demo mode)
*/

-- Create daily_sales table
CREATE TABLE daily_sales (
  business_date date PRIMARY KEY,
  total_sales integer NOT NULL DEFAULT 0,
  cash_sales integer NOT NULL DEFAULT 0,
  card_sales integer NOT NULL DEFAULT 0,
  electronic_sales integer NOT NULL DEFAULT 0,
  total_guests integer NOT NULL DEFAULT 0,
  total_groups integer NOT NULL DEFAULT 0,
  cast_sales jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read daily_sales"
  ON daily_sales FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert daily_sales"
  ON daily_sales FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update daily_sales"
  ON daily_sales FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_daily_sales_updated_at
  BEFORE UPDATE ON daily_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for faster date lookups
CREATE INDEX idx_daily_sales_business_date ON daily_sales (business_date);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE daily_sales;