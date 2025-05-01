-- Add sort_order column
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Update existing records with sequential sort order
WITH numbered_staff AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as rn
  FROM staff
)
UPDATE staff
SET sort_order = numbered_staff.rn
FROM numbered_staff
WHERE staff.id = numbered_staff.id;

-- Add index for sort_order
CREATE INDEX IF NOT EXISTS idx_staff_sort_order ON staff (sort_order);