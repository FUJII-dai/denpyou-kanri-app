/*
  # Create initial database schema

  1. Tables
    - orders: For managing customer orders and bills
    - staff: For managing staff/cast members

  2. Security
    - Enable RLS on all tables
    - Add policies for anonymous access (demo mode)
    - Add triggers for timestamp management
*/

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS staff;

-- Create orders table
CREATE TABLE orders (
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
  temp_cast_drink jsonb,
  temp_bottle jsonb,
  temp_food jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create staff table
CREATE TABLE staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Anyone can read orders"
  ON orders FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update orders"
  ON orders FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete orders"
  ON orders FOR DELETE
  TO anon
  USING (true);

-- Create policies for staff
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

-- Create updated_at trigger function
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;