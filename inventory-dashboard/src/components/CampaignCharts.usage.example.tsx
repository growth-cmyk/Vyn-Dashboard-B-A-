import React from 'react';
import { CampaignCharts } from './CampaignCharts';
import { MarketingService } from '../services/MarketingService';
import type { AdCampaignRecord } from '../types';

/**
 * Example usage of CampaignCharts component
 * This demonstrates how to integrate the component with campaign data
 */
interface CampaignChartsExampleProps {
  campaignData: AdCampaignRecord[];
  isLoading?: boolean;
}

export const CampaignChartsExample: React.FC<CampaignChartsExampleProps> = ({
  campaignData,
  isLoading = false
}) => {
  // Generate trend data using MarketingService
  const trendData = React.useMemo(() => {
    if (campaignData.length === 0) return [];
    return MarketingService.generateCampaignTrends(campaignData);
  }, [campaignData]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Campaign Performance Analysis</h2>
      
      {/* Using the CampaignCharts component */}
      <CampaignCharts 
        trendData={trendData}
        isLoading={isLoading}
        className="w-full"
      />
      
      {/* Additional analytics could go here */}
      {trendData.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-slate-600">Total Days:</span>
              <span className="ml-2 font-mono">{trendData.length}</span>
            </div>
            <div>
              <span className="text-sm text-slate-600">Date Range:</span>
              <span className="ml-2 font-mono">
                {trendData[0]?.date} to {trendData[trendData.length - 1]?.date}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Alternative usage: Standalone chart with custom styling
 */
export const StandaloneCampaignChart: React.FC<{
  campaignData: AdCampaignRecord[];
}> = ({ campaignData }) => {
  const trendData = MarketingService.generateCampaignTrends(campaignData);
  
  return (
    <div className="col-span-8"> {/* Bento Grid: 8 columns */}
      <CampaignCharts 
        trendData={trendData}
        isLoading={false}
      />
    </div>
  );
};

/**
 * Usage in a dashboard context with error handling
 */
export const DashboardCampaignChart: React.FC<{
  campaignData: AdCampaignRecord[];
  error?: string | null;
  isLoading?: boolean;
}> = ({ campaignData, error, isLoading }) => {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Error Loading Campaign Data</h3>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  const trendData = MarketingService.generateCampaignTrends(campaignData);
  
  return (
    <CampaignCharts 
      trendData={trendData}
      isLoading={isLoading}
    />
  );
};