/*
  # Remove history tracking tables and triggers

  1. Changes
    - Drop order_history table
    - Drop daily_order_snapshots table
    - Drop daily_sales_snapshots table
    - Drop related triggers and functions
    
  2. Purpose
    - Simplify data management
    - Remove unnecessary complexity
*/

-- Drop history tables
DROP TABLE IF EXISTS order_history;
DROP TABLE IF EXISTS daily_order_snapshots;
DROP TABLE IF EXISTS daily_sales_snapshots;

-- Drop related triggers
DROP TRIGGER IF EXISTS track_order_changes_insert ON orders;
DROP TRIGGER IF EXISTS track_order_changes_update ON orders;
DROP TRIGGER IF EXISTS track_order_changes_delete ON orders;

-- Drop related functions
DROP FUNCTION IF EXISTS track_order_changes;