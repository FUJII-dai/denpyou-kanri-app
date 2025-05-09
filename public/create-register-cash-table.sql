CREATE TABLE IF NOT EXISTS register_cash (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_date text NOT NULL,
  starting_amount integer DEFAULT 0,
  coins_amount integer DEFAULT 0,
  next_day_amount integer DEFAULT 0,
  next_day_coins integer DEFAULT 0,
  withdrawals jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE register_cash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all register_cash"
  ON register_cash
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert register_cash"
  ON register_cash
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update register_cash"
  ON register_cash
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_register_cash_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_register_cash_updated_at
  BEFORE UPDATE ON register_cash
  FOR EACH ROW
  EXECUTE FUNCTION update_register_cash_updated_at();
