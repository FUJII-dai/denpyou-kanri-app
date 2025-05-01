/*
  # Create orders table

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
      - `customer_name` (text)
      - `catch_casts` (text[])
      - `referral_casts` (text[])
      - `extensions` (jsonb)
      - `menus` (jsonb)
      - `cast_drinks` (jsonb)
      - `bottles` (jsonb)
      - `foods` (jsonb)
      - `drink_type` (text)
      - `drink_price` (integer)
      - `karaoke_count` (integer)
      - `note` (text)
      - `total_amount` (integer)
      - `status` (text)
      - `payment_method` (text)
      - `payment_details` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `orders` table
    - Add policy for authenticated users to read/write their own data
*/

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

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read/write orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 更新時にupdated_atを自動更新するトリガー
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