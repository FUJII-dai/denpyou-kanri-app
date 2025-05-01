/*
  # Create orders table with all required fields

  1. New Tables
    - `orders`
      - Basic info: id, order_number, table info, guests, timing
      - Customer info: customer_name, catch_casts, referral_casts
      - Order items: extensions, menus, cast_drinks, bottles, foods
      - Payment: drink_type, drink_price, total_amount, status, payment details
      
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column();

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number integer NOT NULL,
  table_type text NOT NULL,
  table_num integer NOT NULL,
  guests integer NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  duration text NOT NULL,
  customer_name text,
  catch_casts text[],
  referral_casts text[],
  extensions jsonb DEFAULT '[]'::jsonb,
  menus jsonb DEFAULT '[]'::jsonb,
  cast_drinks jsonb DEFAULT '[]'::jsonb,
  bottles jsonb DEFAULT '[]'::jsonb,
  foods jsonb DEFAULT '[]'::jsonb,
  drink_type text NOT NULL,
  drink_price integer NOT NULL,
  karaoke_count integer DEFAULT 0,
  note text,
  total_amount integer NOT NULL,
  status text NOT NULL,
  payment_method text,
  payment_details jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();