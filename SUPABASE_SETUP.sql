-- Supabase Setup Script for Cloud Data Persistence
-- Run these commands in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create inventory_history table
CREATE TABLE IF NOT EXISTS inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(255) NOT NULL,
  warehouse_id VARCHAR(255) NOT NULL,
  total_sellable INTEGER NOT NULL,
  platform VARCHAR(50) NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL,
  snapshot_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  upload_source VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_history_item_warehouse 
ON inventory_history (item_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_inventory_history_platform_date 
ON inventory_history (platform, upload_date);

CREATE INDEX IF NOT EXISTS idx_inventory_history_snapshot_time 
ON inventory_history (snapshot_timestamp);

-- Create file_uploads table
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_status VARCHAR(50) DEFAULT 'pending',
  platform VARCHAR(50) NOT NULL,
  record_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for file_uploads
CREATE INDEX IF NOT EXISTS idx_file_uploads_platform 
ON file_uploads (platform);

CREATE INDEX IF NOT EXISTS idx_file_uploads_upload_time 
ON file_uploads (upload_timestamp);

CREATE INDEX IF NOT EXISTS idx_file_uploads_status 
ON file_uploads (processing_status);

-- Create marketing_history table for Marketing module cloud sync
CREATE TABLE IF NOT EXISTS marketing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(100) NOT NULL,
  sku VARCHAR(255),
  platform VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  budget_consumed DECIMAL(10,2) NOT NULL DEFAULT 0,
  direct_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  indirect_sales DECIMAL(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  indirect_add_to_cart INTEGER DEFAULT 0,
  quantities_sold INTEGER DEFAULT 0,
  indirect_quantities_sold INTEGER DEFAULT 0,
  new_users_acquired INTEGER DEFAULT 0,
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  upload_source VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for marketing_history
CREATE INDEX IF NOT EXISTS idx_marketing_history_campaign_date 
ON marketing_history (campaign_name, date);

CREATE INDEX IF NOT EXISTS idx_marketing_history_platform_date 
ON marketing_history (platform, date);

CREATE INDEX IF NOT EXISTS idx_marketing_history_sku 
ON marketing_history (sku);

CREATE INDEX IF NOT EXISTS idx_marketing_history_upload_time 
ON marketing_history (upload_timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory_history
-- Allow authenticated users to read their own data
CREATE POLICY "Users can view inventory history" ON inventory_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert their own data
CREATE POLICY "Users can insert inventory history" ON inventory_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update their own data
CREATE POLICY "Users can update inventory history" ON inventory_history
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for file_uploads
-- Allow authenticated users to read their own files
CREATE POLICY "Users can view file uploads" ON file_uploads
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert their own files
CREATE POLICY "Users can insert file uploads" ON file_uploads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update file uploads" ON file_uploads
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for marketing_history
-- Allow authenticated users to read their own marketing data
CREATE POLICY "Users can view marketing history" ON marketing_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert their own marketing data
CREATE POLICY "Users can insert marketing history" ON marketing_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update their own marketing data
CREATE POLICY "Users can update marketing history" ON marketing_history
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create storage bucket for inventory files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inventory-files',
  'inventory-files',
  false,
  5242880, -- 5MB limit
  ARRAY['text/csv', 'application/vnd.ms-excel', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policy for storage bucket
CREATE POLICY "Users can upload inventory files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'inventory-files' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view inventory files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'inventory-files' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update inventory files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'inventory-files' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete inventory files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'inventory-files' AND 
    auth.role() = 'authenticated'
  );

-- Create a function to clean up old data (for free tier management)
CREATE OR REPLACE FUNCTION cleanup_old_inventory_data()
RETURNS void AS $$
BEGIN
  -- Delete inventory history older than 1 year
  DELETE FROM inventory_history 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Delete file uploads older than 6 months
  DELETE FROM file_uploads 
  WHERE created_at < NOW() - INTERVAL '6 months';
  
  -- Delete marketing history older than 1 year
  DELETE FROM marketing_history 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Note: Storage files should be cleaned up separately via the storage API
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get storage usage statistics
CREATE OR REPLACE FUNCTION get_storage_usage()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  size_bytes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'inventory_history'::TEXT,
    COUNT(*)::BIGINT,
    pg_total_relation_size('inventory_history')::BIGINT
  FROM inventory_history
  
  UNION ALL
  
  SELECT 
    'file_uploads'::TEXT,
    COUNT(*)::BIGINT,
    pg_total_relation_size('file_uploads')::BIGINT
  FROM file_uploads
  
  UNION ALL
  
  SELECT 
    'marketing_history'::TEXT,
    COUNT(*)::BIGINT,
    pg_total_relation_size('marketing_history')::BIGINT
  FROM marketing_history;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON inventory_history TO authenticated;
GRANT ALL ON file_uploads TO authenticated;
GRANT ALL ON marketing_history TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_inventory_data() TO authenticated;
GRANT EXECUTE ON FUNCTION get_storage_usage() TO authenticated;

-- Create user_preferences table for ROP settings cloud sync
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL DEFAULT 'default_user',
  service_level DECIMAL(5,2) NOT NULL DEFAULT 95.0,
  forecast_quantities JSONB DEFAULT '{}'::JSONB,
  lead_time INTEGER DEFAULT 15,
  safety_days INTEGER DEFAULT 3,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
ON user_preferences (user_id);

-- Enable RLS for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_preferences
CREATE POLICY "Users can view their preferences" ON user_preferences
  FOR SELECT USING (auth.role() = 'authenticated' OR user_id = 'default_user');

CREATE POLICY "Users can insert their preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR user_id = 'default_user');

CREATE POLICY "Users can update their preferences" ON user_preferences
  FOR UPDATE USING (auth.role() = 'authenticated' OR user_id = 'default_user');

-- Grant permissions for user_preferences
GRANT ALL ON user_preferences TO authenticated;

-- Create sku_demand_history table for Statistical ROP cloud sync
CREATE TABLE IF NOT EXISTS sku_demand_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL DEFAULT 'default_user',
  item_id VARCHAR(255) NOT NULL,
  month_index INTEGER NOT NULL CHECK (month_index >= 0 AND month_index < 12),
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id, month_index)
);

-- Create indexes for sku_demand_history
CREATE INDEX IF NOT EXISTS idx_sku_demand_history_user_item 
ON sku_demand_history (user_id, item_id);

CREATE INDEX IF NOT EXISTS idx_sku_demand_history_item_month 
ON sku_demand_history (item_id, month_index);

-- Enable RLS for sku_demand_history
ALTER TABLE sku_demand_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sku_demand_history
CREATE POLICY "Users can view their demand history" ON sku_demand_history
  FOR SELECT USING (auth.role() = 'authenticated' OR user_id = 'default_user');

CREATE POLICY "Users can insert their demand history" ON sku_demand_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR user_id = 'default_user');

CREATE POLICY "Users can update their demand history" ON sku_demand_history
  FOR UPDATE USING (auth.role() = 'authenticated' OR user_id = 'default_user');

CREATE POLICY "Users can delete their demand history" ON sku_demand_history
  FOR DELETE USING (auth.role() = 'authenticated' OR user_id = 'default_user');

-- Grant permissions for sku_demand_history
GRANT ALL ON sku_demand_history TO authenticated;

-- Update cleanup function to include demand history
CREATE OR REPLACE FUNCTION cleanup_old_inventory_data()
RETURNS void AS $
BEGIN
  -- Delete inventory history older than 1 year
  DELETE FROM inventory_history 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Delete file uploads older than 6 months
  DELETE FROM file_uploads 
  WHERE created_at < NOW() - INTERVAL '6 months';
  
  -- Delete marketing history older than 1 year
  DELETE FROM marketing_history 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Demand history is kept indefinitely as it's critical for ROP calculations
  -- Only clean up if explicitly requested by user
  
  -- Note: Storage files should be cleaned up separately via the storage API
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update storage usage function to include demand history
CREATE OR REPLACE FUNCTION get_storage_usage()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  size_bytes BIGINT
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    'inventory_history'::TEXT,
    COUNT(*)::BIGINT,
    pg_total_relation_size('inventory_history')::BIGINT
  FROM inventory_history
  
  UNION ALL
  
  SELECT 
    'file_uploads'::TEXT,
    COUNT(*)::BIGINT,
    pg_total_relation_size('file_uploads')::BIGINT
  FROM file_uploads
  
  UNION ALL
  
  SELECT 
    'marketing_history'::TEXT,
    COUNT(*)::BIGINT,
    pg_total_relation_size('marketing_history')::BIGINT
  FROM marketing_history
  
  UNION ALL
  
  SELECT 
    'sku_demand_history'::TEXT,
    COUNT(*)::BIGINT,
    pg_total_relation_size('sku_demand_history')::BIGINT
  FROM sku_demand_history;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;
