/*
  # Create orders table with realtime enabled

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `order_number` (integer)
      - `table_type` (text)
      - `table_num` (integer)
      - `guests` (integer)
      - `start_time` (text)
      - `end_time` (text)
      - `duration` (text)
      - `customer_name` (text, nullable)
      - `catch_casts` (text[], nullable)
      - `referral_casts` (text[], nullable)
      - `extensions` (jsonb, nullable)
      - `menus` (jsonb, nullable)
      - `cast_drinks` (jsonb, nullable)
      - `bottles` (jsonb, nullable)
      - `foods` (jsonb, nullable)
      - `drink_type` (text)
      - `drink_price` (integer)
      - `karaoke_count` (integer, nullable)
      - `note` (text, nullable)
      - `total_amount` (integer)
      - `status` (text)
      - `payment_method` (text, nullable)
      - `payment_details` (jsonb, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `orders` table
    - Add policies for anonymous and authenticated users to perform CRUD operations
    - Enable realtime for the table

  3. Triggers
    - Add trigger to update updated_at column automatically
*/

-- Enable the pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the orders table
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
  catch_casts text[] DEFAULT ARRAY[]::text[],
  referral_casts text[] DEFAULT ARRAY[]::text[],
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

-- Create the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop the trigger if it exists and create it again
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read orders" ON orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;
DROP POLICY IF EXISTS "Anyone can delete orders" ON orders;
DROP POLICY IF EXISTS "Users can read all orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;

-- Create policies for anonymous users
CREATE POLICY "Anyone can read orders"
  ON orders
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert orders"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update orders"
  ON orders
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete orders"
  ON orders
  FOR DELETE
  TO anon
  USING (true);

-- Create policies for authenticated users
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

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;