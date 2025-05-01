/*
  # Fix RLS policies for orders table

  1. Security Changes
    - Enable RLS on orders table
    - Add policies for:
      - Anonymous users can read orders
      - Anonymous users can insert orders
      - Anonymous users can update orders
      - Anonymous users can delete orders
    
  Note: Since this is a demo application without authentication, 
  we're allowing anonymous access to all operations
*/

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read orders" ON orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;
DROP POLICY IF EXISTS "Anyone can delete orders" ON orders;

-- Create new policies for anonymous access
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