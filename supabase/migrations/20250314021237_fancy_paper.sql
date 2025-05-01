/*
  # Add daily history tables

  1. New Tables
    - `daily_order_snapshots`
      - Stores daily snapshots of orders
      - Includes all order details as of business day end
    - `daily_sales_snapshots`
      - Stores daily sales aggregation snapshots
      - Includes detailed breakdowns of sales and performance

  2. Security
    - Enable RLS
    - Add policies for anonymous access (demo mode)
*/

-- Create daily order snapshots table
CREATE TABLE daily_order_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_date date NOT NULL,
  order_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (business_date)
);

-- Create daily sales snapshots table
CREATE TABLE daily_sales_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_date date NOT NULL,
  total_sales integer NOT NULL DEFAULT 0,
  cash_sales integer NOT NULL DEFAULT 0,
  card_sales integer NOT NULL DEFAULT 0,
  electronic_sales integer NOT NULL DEFAULT 0,
  total_guests integer NOT NULL DEFAULT 0,
  total_groups integer NOT NULL DEFAULT 0,
  cast_sales jsonb DEFAULT '[]'::jsonb,
  hourly_sales jsonb DEFAULT '[]'::jsonb,
  order_details jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (business_date)
);

-- Enable RLS
ALTER TABLE daily_order_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_order_snapshots
CREATE POLICY "Anyone can read daily_order_snapshots"
  ON daily_order_snapshots FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert daily_order_snapshots"
  ON daily_order_snapshots FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policies for daily_sales_snapshots
CREATE POLICY "Anyone can read daily_sales_snapshots"
  ON daily_sales_snapshots FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert daily_sales_snapshots"
  ON daily_sales_snapshots FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_daily_order_snapshots_date ON daily_order_snapshots(business_date);
CREATE INDEX idx_daily_sales_snapshots_date ON daily_sales_snapshots(business_date);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE daily_order_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_sales_snapshots;