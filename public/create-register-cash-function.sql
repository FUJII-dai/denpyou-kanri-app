
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION execute_sql TO anon;
GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;

DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS register_cash (
    business_date date PRIMARY KEY,
    starting_amount integer DEFAULT 0,
    coins_amount integer DEFAULT 0,
    withdrawals jsonb DEFAULT '[]'::jsonb,
    next_day_amount integer DEFAULT 0,
    next_day_coins integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

  ALTER TABLE register_cash ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Anyone can read register_cash" ON register_cash;
  DROP POLICY IF EXISTS "Anyone can insert register_cash" ON register_cash;
  DROP POLICY IF EXISTS "Anyone can update register_cash" ON register_cash;

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

  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  END IF;

  DROP TRIGGER IF EXISTS update_register_cash_updated_at ON register_cash;
  CREATE TRIGGER update_register_cash_updated_at
    BEFORE UPDATE ON register_cash
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE register_cash;
  EXCEPTION WHEN OTHERS THEN
  END;

  INSERT INTO register_cash (business_date, starting_amount, coins_amount, withdrawals, next_day_amount, next_day_coins)
  VALUES (CURRENT_DATE, 0, 0, '[]'::jsonb, 0, 0)
  ON CONFLICT (business_date) DO NOTHING;

END $$;
