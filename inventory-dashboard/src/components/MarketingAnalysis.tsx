import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, TrendingUp, Funnel, ArrowLeftRight, Info, Target, Users } from 'lucide-react';
import { MarketingService } from '../services/MarketingService';
import { FilterService } from '../services/FilterService';
import { CampaignCharts } from './CampaignCharts';
import { EmptyState } from './EmptyState';
import type { AdCampaignRecord, MarketingKPIs, InventoryItem, CampaignTrendData, FunnelAnalysisData, AdInventorySyncItem, FilterCriteria, Platform } from '../types';
import { PLATFORM } from '../types';

interface MarketingAnalysisProps {
  campaignData?: AdCampaignRecord[];
  inventoryData?: InventoryItem[];
  isLoading?: boolean;
  error?: string | null;
  onCampaignUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  filters?: FilterCriteria;
  onFilterChange?: (filters: Partial<FilterCriteria>) => void;
  activePlatform?: Platform;
  onPlatformChange?: (platform: Platform) => void;
}

export const MarketingAnalysis: React.FC<MarketingAnalysisProps> = ({
  campaignData = [],
  inventoryData = [],
  isLoading = false,
  error = null,
  onCampaignUpload,
  filters = {},
  onFilterChange,
  activePlatform = PLATFORM.BLINKIT,
  onPlatformChange: _onPlatformChange = () => {}
}) => {
  const [marketingKPIs, setMarketingKPIs] = useState<MarketingKPIs | null>(null);
  const [trendData, setTrendData] = useState<CampaignTrendData[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelAnalysisData[]>([]);
  const [syncData, setSyncData] = useState<AdInventorySyncItem[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);

  // Calculate KPIs and analytics when campaign data or filters change
  useEffect(() => {
    if (campaignData.length > 0) {
      // Set filtering state to show loading during filter processing
      setIsFiltering(true);
      
      // Apply filters to campaign data
      const filteredCampaigns = FilterService.applyCampaignFilters(campaignData, filters);
      
      // Calculate KPIs
      const kpis = MarketingService.aggregateKPIMetrics(filteredCampaigns);
      setMarketingKPIs(kpis);

      // Generate trend data for charts
      const trends = MarketingService.generateCampaignTrends(filteredCampaigns);
      setTrendData(trends);

      // Generate funnel analysis
      const funnel = MarketingService.generateFunnelAnalysis(filteredCampaigns);
      setFunnelData(funnel);

      // Generate ad-inventory sync if inventory data is available
      if (inventoryData.length > 0) {
        const sync = MarketingService.generateAdInventorySync(filteredCampaigns, inventoryData);
        setSyncData(sync);
      }
      
      // Clear filtering state
      setIsFiltering(false);
    } else {
      setMarketingKPIs(null);
      setTrendData([]);
      setFunnelData([]);
      setSyncData([]);
      setIsFiltering(false);
    }
  }, [campaignData, inventoryData, filters]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pt-28 p-6">
        <div className="max-w-7xl mx-auto">
          <EmptyState 
            type="error"
            title="Error Loading Marketing Data"
            description={error}
          />
        </div>
      </div>
    );
  }

  // Show upload empty state if no campaign data
  if (campaignData.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8fafc] font-inter">
        <div className="space-y-12">
          {/* Premium Header */}
          <div className="bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8 mb-12">
            <div className="flex justify-between items-center w-full mb-12">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                  Marketing Intelligence
                </h1>
                <p className="text-slate-600 text-lg font-medium">
                  Actionable insights from your advertising campaigns
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {onCampaignUpload && (
                  <div className="relative">
                    <label htmlFor="marketing-campaign-upload" className="cursor-pointer">
                      <div className="flex items-center space-x-3 bg-gradient-to-r from-[#ef5326] to-[#d63384] hover:from-[#d63384] hover:to-[#ef5326] text-white px-6 py-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl">
                        <FileSpreadsheet className="h-5 w-5 stroke-[1.5]" />
                        <span className="font-semibold tracking-wide">Upload Campaign Data</span>
                      </div>
                    </label>
                    <input
                      id="marketing-campaign-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={onCampaignUpload}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </div>
                )}
                {isLoading && (
                  <div className="flex items-center space-x-3 text-slate-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#ef5326] border-t-transparent"></div>
                    <span className="font-medium">Processing campaign data...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Empty State */}
          <EmptyState 
            type="marketing"
            title="Upload Campaign Data to Begin"
            description="Upload your Blinkit campaign Excel file with PRODUCT_RECOMMENDATION, PRODUCT_LISTING, and BRAND_BOOSTER tabs to unlock powerful marketing analytics and strategic recommendations."
            actionText="Upload Campaign Excel"
            onAction={() => document.getElementById('marketing-campaign-upload')?.click()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-inter">
      <div className="space-y-12">
        
        {/* Premium Header - HEADER ISOLATION */}
        <div className="bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8 mb-12">
          <div className="flex justify-between items-center w-full mb-12">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                Marketing Intelligence
              </h1>
              <p className="text-slate-600 text-lg font-medium">
                Actionable insights from your advertising campaigns
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Premium Upload Button */}
              {onCampaignUpload && (
                <div className="relative">
                  <label htmlFor="marketing-campaign-upload" className="cursor-pointer">
                    <div className="flex items-center space-x-3 bg-gradient-to-r from-[#ef5326] to-[#d63384] hover:from-[#d63384] hover:to-[#ef5326] text-white px-6 py-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl">
                      <FileSpreadsheet className="h-5 w-5 stroke-[1.5]" />
                      <span className="font-semibold tracking-wide">Upload Campaign Data</span>
                    </div>
                  </label>
                  <input
                    id="marketing-campaign-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={onCampaignUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                </div>
              )}
              {isLoading && (
                <div className="flex items-center space-x-3 text-slate-600">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#ef5326] border-t-transparent"></div>
                  <span className="font-medium">Processing campaign data...</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content - Strict 12 Column Bento Grid - VISUAL DIFFERENTIATION */}
        <div className={`transition-all duration-500 ${campaignData.length > 0 ? 'animate-in fade-in slide-in-from-bottom-4' : ''}`}>
          {/* KPI Row Container - Limited Width */}
          <div className="max-w-5xl mx-auto mb-12">
            <div className="grid grid-cols-4 gap-6">
              
              {/* Row 1: 4 Glassmorphic KPI Cards (col-span-1 each) - CONTAINED WIDTH */}
              <div className="col-span-1">
                <div className="bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8 min-h-[140px]">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="h-7 w-7 text-[#ef5326] stroke-[1.5]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-600 mb-1 tracking-wide">TOTAL AD SPEND</div>
                      <div className="text-3xl font-bold font-mono text-slate-900 mb-1">
                        {marketingKPIs ? `₹${(marketingKPIs.totalAdSpend / 1000).toFixed(1)}K` : '₹0'}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {campaignData.length} campaigns
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1">
                <div className="bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8 min-h-[140px]">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="h-7 w-7 text-green-600 stroke-[1.5]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-600 mb-1 tracking-wide">TOTAL REVENUE</div>
                      <div className="text-3xl font-bold font-mono text-slate-900 mb-1">
                        {marketingKPIs ? `₹${(marketingKPIs.totalAdSales / 1000).toFixed(1)}K` : '₹0'}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {marketingKPIs ? `${marketingKPIs.totalImpressions.toLocaleString()} impressions` : 'No data'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1">
                <div className="bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8 min-h-[140px]">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-lg">
                      <Target className="h-7 w-7 text-blue-600 stroke-[1.5]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-600 mb-1 tracking-wide">AVERAGE ROAS</div>
                      <div className="text-3xl font-bold font-mono text-slate-900 mb-1">
                        {marketingKPIs ? `${marketingKPIs.averageRoAS.toFixed(2)}x` : '0.00x'}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {marketingKPIs ? `${marketingKPIs.overallCTR.toFixed(1)}% CTR` : 'No data'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1">
                <div className="bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8 min-h-[140px]">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-violet-100 rounded-2xl flex items-center justify-center shadow-lg">
                      <Users className="h-7 w-7 text-purple-600 stroke-[1.5]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-600 mb-1 tracking-wide">NEW CUSTOMERS</div>
                      <div className="text-3xl font-bold font-mono text-slate-900 mb-1">
                        {marketingKPIs ? marketingKPIs.newCustomerAcquisition.toLocaleString() : '0'}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Listing + Recommendation
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section - Full Width Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Row 2: Spend vs Revenue Chart (col-span-8) + Strategic Summary (col-span-4) - SOLID WHITE */}
            <div className="col-span-8">
              <CampaignCharts 
                trendData={trendData}
                isLoading={isLoading}
                isFiltering={isFiltering}
                filters={filters}
                onFilterChange={onFilterChange}
              />
            </div>

            <div className="col-span-4">
              <div className="bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8 min-h-[400px]">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-6 flex items-center">
                  <Info className="h-6 w-6 mr-3 text-[#ef5326] stroke-[1.5]" />
                  Strategic Summary
                </h3>
                
                {campaignData.length === 0 ? (
                  <EmptyState 
                    type="marketing"
                    title="No Campaign Data"
                    description="Upload campaign data to view strategic insights and performance metrics."
                    className="h-80"
                  />
                ) : (
                  <div className="space-y-6">
                    {/* Performance Metrics */}
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-4">
                      <div className="text-sm font-semibold text-slate-700 mb-3 tracking-wide">PERFORMANCE METRICS</div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Total RoAS</span>
                          <span className="text-lg font-bold text-slate-900">
                            {marketingKPIs ? `${marketingKPIs.averageRoAS.toFixed(2)}x` : '0.00x'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Overall CTR</span>
                          <span className="text-lg font-bold text-slate-900">
                            {marketingKPIs ? `${marketingKPIs.overallCTR.toFixed(1)}%` : '0.0%'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">New Customers</span>
                          <span className="text-lg font-bold text-slate-900">
                            {marketingKPIs ? marketingKPIs.newCustomerAcquisition.toLocaleString() : '0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Top Campaign */}
                    {marketingKPIs?.topPerformingCampaign && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4">
                        <div className="text-sm font-semibold text-green-700 mb-2 tracking-wide">TOP PERFORMER</div>
                        <div className="text-sm font-bold text-green-900 leading-tight">
                          {marketingKPIs.topPerformingCampaign}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-4">
                      <div className="text-sm font-semibold text-orange-700 mb-3 tracking-wide">QUICK ACTIONS</div>
                      <div className="space-y-2">
                        <div className="text-xs text-orange-800 bg-white/60 rounded-lg p-2">
                          • Review high-spend campaigns for optimization
                        </div>
                        <div className="text-xs text-orange-800 bg-white/60 rounded-lg p-2">
                          • Scale successful product listing campaigns
                        </div>
                        <div className="text-xs text-orange-800 bg-white/60 rounded-lg p-2">
                          • Monitor inventory levels for ad sync
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Funnel Analysis (col-span-4) - FIXED FUNNEL ROWS */}
            <div className="col-span-4">
              <div className="bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8 min-h-[500px]">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8 flex items-center">
                  <Funnel className="h-6 w-6 mr-3 text-[#ef5326] stroke-[1.5]" />
                  Conversion Funnel
                </h3>
                
                {campaignData.length === 0 ? (
                  <EmptyState 
                    type="analytics"
                    title="No Campaign Data Available"
                    description="Upload campaign data to view conversion funnel analysis and performance metrics."
                    className="h-80"
                  />
                ) : isFiltering ? (
                  <div className="flex items-center justify-center h-80 text-slate-500">
                    <div className="text-center">
                      <div className="text-lg font-medium mb-2">Applying Filters</div>
                      <div className="text-sm">Updating funnel analysis with filtered data...</div>
                    </div>
                  </div>
                ) : funnelData.length === 0 ? (
                  <div className="flex items-center justify-center h-80 text-slate-500">
                    <div className="text-center">
                      <div className="text-lg font-medium mb-2">
                        {Object.keys(filters).length > 0 ? 'No Data Matches Filters' : 'Processing Funnel Data'}
                      </div>
                      <div className="text-sm">
                        {Object.keys(filters).length > 0 
                          ? 'Try adjusting your filter criteria to see funnel analysis'
                          : 'Analyzing conversion metrics...'
                        }
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {funnelData.map((stage, index) => {
                      const maxValue = funnelData[0]?.value || 1;
                      const widthPercent = (stage.value / maxValue) * 100;
                      // Stepped gradient from Vyndo Orange to Millet Green
                      const getGradientColor = (index: number, total: number) => {
                        const ratio = index / (total - 1);
                        if (ratio <= 0.5) {
                          // Orange to Yellow transition
                          return `linear-gradient(90deg, #ef5326, #f97316)`;
                        } else {
                          // Yellow to Green transition
                          return `linear-gradient(90deg, #eab308, #2d6a4f)`;
                        }
                      };
                      
                      return (
                        <div key={stage.stage} className="pb-2">
                          {/* CENTERED FUNNEL SHAPE: Left Label | Centered Bar | Right Percentage */}
                          <div className="flex items-center justify-between mb-2">
                            {/* Left: Stage Label */}
                            <div className="text-sm font-bold text-slate-700 tracking-wide w-32 text-left">
                              {stage.stage}
                            </div>
                            
                            {/* Right: Percentage */}
                            <div className="text-sm font-bold text-slate-900 font-mono w-16 text-right">
                              {stage.conversionRate?.toFixed(1) || '0.0'}%
                            </div>
                          </div>
                          
                          {/* Centered Funnel Bar */}
                          <div className="flex justify-center mb-3">
                            <div className="w-full max-w-md bg-slate-100 rounded-full h-8 relative overflow-hidden shadow-inner">
                              <div 
                                className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-center relative"
                                style={{ 
                                  width: `${Math.max(widthPercent, 12)}%`,
                                  background: getGradientColor(index, funnelData.length),
                                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                }}
                              >
                                {widthPercent > 25 && (
                                  <span className="text-white text-sm font-bold drop-shadow-sm">
                                    {stage.value.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              {widthPercent <= 25 && (
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                  <span className="text-slate-600 text-sm font-bold">
                                    {stage.value.toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Strategic Recommendations (col-span-8) - REAL HTML TABLE */}
            <div className="col-span-8">
              <div className="bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8 min-h-[500px]">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8 flex items-center">
                  <ArrowLeftRight className="h-6 w-6 mr-3 text-[#ef5326] stroke-[1.5]" />
                  Strategic Recommendations
                </h3>
                
                {campaignData.length === 0 ? (
                  <EmptyState 
                    type="marketing"
                    title="No Campaign Data Available"
                    description="Upload campaign data to view strategic recommendations and ad-inventory sync analysis."
                    className="h-80"
                  />
                ) : inventoryData.length === 0 ? (
                  <EmptyState 
                    type="inventory"
                    title="Inventory Data Required"
                    description="Upload inventory data to enable strategic recommendations and ad-inventory correlation analysis."
                    className="h-80"
                  />
                ) : isFiltering ? (
                  <div className="flex items-center justify-center h-80 text-slate-500">
                    <div className="text-center">
                      <div className="text-lg font-medium mb-2">Applying Filters</div>
                      <div className="text-sm">Updating strategic recommendations with filtered data...</div>
                    </div>
                  </div>
                ) : syncData.length === 0 ? (
                  <div className="flex items-center justify-center h-80 text-slate-500">
                    <div className="text-center">
                      <div className="text-lg font-medium mb-2">
                        {Object.keys(filters).length > 0 ? 'No Data Matches Filters' : 'Processing Strategic Data'}
                      </div>
                      <div className="text-sm">
                        {Object.keys(filters).length > 0 
                          ? 'Try adjusting your filter criteria to see recommendations'
                          : 'Analyzing ad-inventory correlations...'
                        }
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {/* STRICT HTML TABLE - table-layout: fixed, precise column widths */}
                    <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                      <thead>
                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                          <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400 border-r border-slate-200" style={{ width: '40%' }}>
                            PRODUCT NAME
                          </th>
                          <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-r border-slate-200" style={{ width: '15%' }}>
                            SPEND
                          </th>
                          <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-r border-slate-200" style={{ width: '15%' }}>
                            INVENTORY
                          </th>
                          <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-r border-slate-200" style={{ width: '15%' }}>
                            ACTION
                          </th>
                          <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400" style={{ width: '15%' }}>
                            REASON
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Filter out "SKU not found" entries and show only actionable data */}
                        {syncData
                          .filter(item => !item.recommendedAction.includes('SKU not found'))
                          .slice(0, 6)
                          .map((item, index) => {
                            const getActionLabel = (action: string): string => {
                              if (action.includes('SCALE ADS')) return 'SCALE ADS';
                              if (action.includes('PAUSE ADS')) return 'PAUSE ADS';
                              if (action.includes('OPTIMIZE')) return 'OPTIMIZE';
                              return 'MONITOR';
                            };

                            const getReasonLabel = (item: AdInventorySyncItem): string => {
                              if (item.strategicAction.includes('SCALE ADS')) {
                                const days = item.daysOfCover ? Math.round(item.daysOfCover) : 0;
                                return days > 90 ? 'Flash Promo' : `${days} days stock`;
                              } else if (item.strategicAction.includes('PAUSE ADS')) {
                                const days = item.daysOfCover ? Math.round(item.daysOfCover) : 0;
                                return days < 18 ? 'Restock Now' : `${days}-day risk`;
                              } else if (item.adSpend > 10000) {
                                return 'High spend';
                              } else {
                                return 'Monitor';
                              }
                            };
                            
                            return (
                              <tr 
                                key={`${item.sku}-${index}`} 
                                className={`border-b border-slate-100 hover:bg-slate-50 transition-colors h-16 ${
                                  index % 2 === 0 ? 'bg-white' : 'bg-slate-25'
                                }`}
                              >
                                {/* Product Name Column - STRICT WIDTH with TRUNCATION */}
                                <td className="py-4 px-6 border-r border-slate-100" style={{ width: '40%' }}>
                                  <div className="text-sm font-bold text-slate-900 truncate mb-1" title={item.campaignName}>
                                    {item.campaignName}
                                  </div>
                                  <div className="text-xs text-slate-500 font-mono truncate">
                                    SKU: {item.sku}
                                  </div>
                                </td>
                                
                                {/* Ad Spend Column - STRICT WIDTH */}
                                <td className="py-4 px-4 border-r border-slate-100" style={{ width: '15%' }}>
                                  <div className="text-sm font-bold text-slate-900 font-mono">
                                    ₹{(item.adSpend / 1000).toFixed(1)}K
                                  </div>
                                </td>
                                
                                {/* Inventory Column - STRICT WIDTH */}
                                <td className="py-4 px-4 border-r border-slate-100" style={{ width: '15%' }}>
                                  <div className="text-sm font-semibold text-slate-700 font-mono">
                                    {item.daysOfCover ? `${Math.round(item.daysOfCover)} days` : 'Unknown'}
                                  </div>
                                </td>
                                
                                {/* Action Column - STRICT WIDTH */}
                                <td className="py-4 px-4 border-r border-slate-100" style={{ width: '15%' }}>
                                  <span 
                                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${
                                      item.strategicAction.includes('PAUSE ADS') ? 'bg-red-500' :
                                      item.strategicAction.includes('SCALE ADS') ? 'bg-green-500' :
                                      item.strategicAction.includes('OPTIMIZE') ? 'bg-blue-500' : 'bg-gray-500'
                                    }`}
                                  >
                                    {getActionLabel(item.strategicAction)}
                                  </span>
                                </td>
                                
                                {/* Reason Column - STRICT WIDTH */}
                                <td className="py-4 px-4" style={{ width: '15%' }}>
                                  <div className="text-sm text-slate-600 font-medium truncate">
                                    {getReasonLabel(item)}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                    
                    {syncData.filter(item => !item.recommendedAction.includes('SKU not found')).length > 6 && (
                      <div className="text-center py-6 mt-6 border-t border-slate-200">
                        <span className="text-xs text-slate-600 font-medium bg-slate-50 px-4 py-2 rounded-full">
                          Showing top 6 of {syncData.filter(item => !item.recommendedAction.includes('SKU not found')).length} actionable recommendations
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Grid - SINGLE HORIZONTAL ROW OF TRANSPARENT CARDS */}
          {campaignData.length > 0 && (
            <div className="bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-t-2 border-[#ef5326] rounded-3xl p-8">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8 flex items-center">
                <Info className="h-6 w-6 mr-3 text-[#ef5326] stroke-[1.5]" />
                Quick Overview
              </h3>
              
              {/* SINGLE HORIZONTAL ROW - PERFECTLY CENTERED */}
              <div className="max-w-[1600px] mx-auto">
                <div className="grid grid-cols-4 gap-8">
                  <div className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 hover:bg-white/80 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#ef5326] to-[#d63384] rounded-xl flex items-center justify-center shadow-md">
                        <FileSpreadsheet className="h-6 w-6 text-white stroke-[1.5]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#ef5326] mb-1 tracking-wide">CAMPAIGN RECORDS</div>
                        <div className="text-2xl font-bold font-mono text-slate-900">{campaignData.length}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 hover:bg-white/80 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#ef5326] to-[#d63384] rounded-xl flex items-center justify-center shadow-md">
                        <TrendingUp className="h-6 w-6 text-white stroke-[1.5]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#ef5326] mb-1 tracking-wide">DATE RANGE</div>
                        <div className="text-sm font-bold font-mono text-slate-900 leading-tight">
                          {campaignData.length > 0 ? 
                            `${new Date(Math.min(...campaignData.map(c => c.date.getTime()))).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(Math.max(...campaignData.map(c => c.date.getTime()))).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` 
                            : 'No data'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 hover:bg-white/80 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#ef5326] to-[#d63384] rounded-xl flex items-center justify-center shadow-md">
                        <Funnel className="h-6 w-6 text-white stroke-[1.5]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#ef5326] mb-1 tracking-wide">PLATFORM</div>
                        <div className="text-2xl font-bold font-mono text-slate-900">
                          {activePlatform === PLATFORM.AMAZON ? 'Amazon' : 'Blinkit'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 hover:bg-white/80 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#ef5326] to-[#d63384] rounded-xl flex items-center justify-center shadow-md">
                        <ArrowLeftRight className="h-6 w-6 text-white stroke-[1.5]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#ef5326] mb-1 tracking-wide">LAST UPDATED</div>
                        <div className="text-lg font-bold font-mono text-slate-900">
                          {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};