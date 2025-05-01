/*
  # Add indexes for daily_sales and register_cash tables

  1. Changes
    - Add indexes for business_date columns
    - Add indexes for commonly queried fields
    
  2. Purpose
    - Improve query performance for date-based lookups
    - Optimize data retrieval for history views
*/

-- Add indexes for daily_sales table
CREATE INDEX IF NOT EXISTS idx_daily_sales_business_date 
ON daily_sales (business_date);

CREATE INDEX IF NOT EXISTS idx_daily_sales_total_sales 
ON daily_sales (total_sales);

CREATE INDEX IF NOT EXISTS idx_daily_sales_cash_sales 
ON daily_sales (cash_sales);

-- Add indexes for register_cash table
CREATE INDEX IF NOT EXISTS idx_register_cash_business_date 
ON register_cash (business_date);

CREATE INDEX IF NOT EXISTS idx_register_cash_starting_amount 
ON register_cash (starting_amount);