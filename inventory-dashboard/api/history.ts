import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gmorgozafqwevskcubff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtb3Jnb3phZnF3ZXZza2N1YmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MDI5NzQsImV4cCI6MjA1MjM3ODk3NH0.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface InventorySnapshot {
  timestamp: Date;
  itemId: string;
  warehouseFacilityId: string;
  totalSellable: number;
  uploadSource: string;
  platform: string;
  platformMetadata: any;
}

interface MarketingSnapshot {
  campaignName: string;
  campaignType: string;
  sku?: string;
  platform: string;
  date: Date;
  budgetConsumed: number;
  directSales: number;
  indirectSales?: number;
  impressions?: number;
  uniqueClicks?: number;
  ctr: number;
  addToCart?: number;
  indirectAddToCart?: number;
  quantitiesSold?: number;
  indirectQuantitiesSold?: number;
  newUsersAcquired?: number;
  uploadTimestamp: Date;
  uploadSource: string;
  metadata?: any;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;

  try {
    switch (method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('History API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { 
    type = 'inventory', 
    platform, 
    limit = '100', 
    offset = '0' 
  } = req.query;

  const limitNum = parseInt(limit as string, 10);
  const offsetNum = parseInt(offset as string, 10);

  if (type === 'inventory') {
    // Get inventory history
    let query = supabase
      .from('inventory_history')
      .select('*')
      .order('snapshot_timestamp', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: `Failed to fetch inventory history: ${error.message}` });
    }

    const snapshots: InventorySnapshot[] = (data || []).map(row => ({
      timestamp: new Date(row.snapshot_timestamp),
      itemId: row.item_id,
      warehouseFacilityId: row.warehouse_id,
      totalSellable: row.total_sellable,
      uploadSource: row.upload_source || 'unknown',
      platform: row.platform,
      platformMetadata: row.metadata?.platformMetadata || {
        uploadSource: row.upload_source || 'unknown',
        dataFormat: 'blinkit',
        recordCount: 1
      }
    }));

    return res.status(200).json(snapshots);

  } else if (type === 'marketing') {
    // Get marketing history
    let query = supabase
      .from('marketing_history')
      .select('*')
      .order('date', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: `Failed to fetch marketing history: ${error.message}` });
    }

    const snapshots: MarketingSnapshot[] = (data || []).map(row => ({
      campaignName: row.campaign_name,
      campaignType: row.campaign_type,
      sku: row.sku,
      platform: row.platform,
      date: new Date(row.date),
      budgetConsumed: row.budget_consumed,
      directSales: row.direct_sales,
      indirectSales: row.indirect_sales,
      impressions: row.impressions,
      uniqueClicks: row.unique_clicks,
      ctr: row.ctr,
      addToCart: row.add_to_cart,
      indirectAddToCart: row.indirect_add_to_cart,
      quantitiesSold: row.quantities_sold,
      indirectQuantitiesSold: row.indirect_quantities_sold,
      newUsersAcquired: row.new_users_acquired,
      uploadTimestamp: new Date(row.upload_timestamp),
      uploadSource: row.upload_source,
      metadata: row.metadata
    }));

    return res.status(200).json(snapshots);

  } else {
    return res.status(400).json({ error: 'Invalid type. Must be "inventory" or "marketing"' });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { type, data } = req.body;

  if (!type || !data || !Array.isArray(data)) {
    return res.status(400).json({ error: 'Invalid request body. Expected { type, data }' });
  }

  if (type === 'inventory') {
    // Save inventory snapshots
    const dbSnapshots = data.map((snapshot: InventorySnapshot) => ({
      item_id: snapshot.itemId,
      warehouse_id: snapshot.warehouseFacilityId,
      total_sellable: snapshot.totalSellable,
      platform: snapshot.platform,
      upload_date: snapshot.timestamp,
      snapshot_timestamp: snapshot.timestamp,
      upload_source: snapshot.uploadSource,
      metadata: {
        platformMetadata: snapshot.platformMetadata
      }
    }));

    const { error } = await supabase
      .from('inventory_history')
      .insert(dbSnapshots);

    if (error) {
      return res.status(500).json({ error: `Failed to save inventory snapshots: ${error.message}` });
    }

    return res.status(200).json({ 
      success: true, 
      message: `Saved ${data.length} inventory snapshots` 
    });

  } else if (type === 'marketing') {
    // Save marketing snapshots
    const dbSnapshots = data.map((snapshot: MarketingSnapshot) => ({
      campaign_name: snapshot.campaignName,
      campaign_type: snapshot.campaignType,
      sku: snapshot.sku,
      platform: snapshot.platform,
      date: snapshot.date instanceof Date ? snapshot.date.toISOString().split('T')[0] : snapshot.date,
      budget_consumed: snapshot.budgetConsumed,
      direct_sales: snapshot.directSales,
      indirect_sales: snapshot.indirectSales || 0,
      impressions: snapshot.impressions || 0,
      unique_clicks: snapshot.uniqueClicks || 0,
      ctr: snapshot.ctr,
      add_to_cart: snapshot.addToCart || 0,
      indirect_add_to_cart: snapshot.indirectAddToCart || 0,
      quantities_sold: snapshot.quantitiesSold || 0,
      indirect_quantities_sold: snapshot.indirectQuantitiesSold || 0,
      new_users_acquired: snapshot.newUsersAcquired || 0,
      upload_timestamp: snapshot.uploadTimestamp,
      upload_source: snapshot.uploadSource,
      metadata: snapshot.metadata || {}
    }));

    const { error } = await supabase
      .from('marketing_history')
      .insert(dbSnapshots);

    if (error) {
      return res.status(500).json({ error: `Failed to save marketing snapshots: ${error.message}` });
    }

    return res.status(200).json({ 
      success: true, 
      message: `Saved ${data.length} marketing snapshots` 
    });

  } else {
    return res.status(400).json({ error: 'Invalid type. Must be "inventory" or "marketing"' });
  }
}