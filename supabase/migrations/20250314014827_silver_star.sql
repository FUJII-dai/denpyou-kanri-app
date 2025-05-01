/*
  # Add order history tracking

  1. New Tables
    - `order_history`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `action` (text) - 'create', 'update', 'delete'
      - `changes` (jsonb) - 変更内容
      - `changed_by` (text) - 変更者
      - `changed_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for anonymous access (demo mode)

  3. Triggers
    - Add trigger to automatically track changes
*/

-- Create order_history table
CREATE TABLE order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  action text NOT NULL,
  changes jsonb NOT NULL,
  changed_by text,
  changed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read order_history"
  ON order_history FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert order_history"
  ON order_history FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create function to track changes
CREATE OR REPLACE FUNCTION track_order_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes jsonb;
  action_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
    changes := to_jsonb(NEW.*);
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
    changes := jsonb_build_object(
      'old', to_jsonb(OLD.*),
      'new', to_jsonb(NEW.*)
    );
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
    changes := to_jsonb(OLD.*);
  END IF;

  INSERT INTO order_history (
    order_id,
    action,
    changes,
    changed_at
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    action_type,
    changes,
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER track_order_changes_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION track_order_changes();

CREATE TRIGGER track_order_changes_update
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION track_order_changes();

CREATE TRIGGER track_order_changes_delete
  AFTER DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION track_order_changes();

-- Add index for faster lookups
CREATE INDEX idx_order_history_order_id ON order_history(order_id);
CREATE INDEX idx_order_history_changed_at ON order_history(changed_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE order_history;