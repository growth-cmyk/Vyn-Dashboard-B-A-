import React from 'react';
import { Upload, Loader2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { MarketingAnalysis } from './MarketingAnalysis';
import type { AdCampaignRecord, Platform, InventoryItem, FilterCriteria } from '../types';

interface MarketingDashboardProps {
  activePlatform?: Platform;
  onPlatformChange?: (platform: Platform) => void;
  campaignData?: AdCampaignRecord[];
  inventoryData?: InventoryItem[];
  isLoading?: boolean;
  error?: string | null;
  onCampaignUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  filters?: FilterCriteria;
  onFilterChange?: (filters: Partial<FilterCriteria>) => void;
}

export const MarketingDashboard: React.FC<MarketingDashboardProps> = ({
  activePlatform,
  onPlatformChange,
  campaignData = [],
  inventoryData = [],
  isLoading = false,
  error = null,
  onCampaignUpload,
  filters = {},
  onFilterChange
}) => {
  // If we have campaign data, show the analysis dashboard directly
  if (campaignData.length > 0) {
    return (
      <MarketingAnalysis 
        campaignData={campaignData}
        inventoryData={inventoryData}
        isLoading={isLoading}
        error={error}
        onCampaignUpload={onCampaignUpload}
        filters={filters}
        onFilterChange={onFilterChange}
        activePlatform={activePlatform}
        onPlatformChange={onPlatformChange}
      />
    );
  }

  // Show upload interface if no data is loaded and not loading
  if (!isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6 mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Marketing Analysis
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Upload your Blinkit campaign Excel file to analyze advertising performance and strategic insights
            </p>
          </div>

          {/* Upload Interface */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-8">
            <div className="text-center">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 rounded-3xl flex items-center justify-center mb-6">
                <FileSpreadsheet className="h-12 w-12 text-orange-600 dark:text-orange-400" />
              </div>
              
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Upload Blinkit Campaign Excel
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Upload your Excel file containing PRODUCT_RECOMMENDATION, PRODUCT_LISTING, and BRAND_BOOSTER campaign data from the Data Management tab
              </p>

              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium rounded-2xl transition-all duration-300 hover:shadow-lg">
                <Upload className="h-5 w-5 mr-2" />
                Go to Data Management
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-50/70 backdrop-blur-xl border border-red-200/60 shadow-xl rounded-3xl p-6">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-800 mb-1">
                    Upload Error
                  </div>
                  <div className="text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show loading state (this should rarely be seen since loading is handled in DashboardContent)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Processing Campaign Data
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Please wait while we process your Excel file...
              </p>
            </div>

            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mr-3" />
              <span className="text-slate-600 dark:text-slate-400">
                Loading campaign data...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // This should never be reached, but just in case
  return null;
};