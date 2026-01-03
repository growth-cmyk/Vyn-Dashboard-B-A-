import React, { useState, useCallback } from 'react';
import { Upload, Filter, Search, AlertCircle, Loader2, FileText, BarChart3 } from 'lucide-react';
import type { InventoryItem, SalesRecord, FilterCriteria, Platform, CumulativeHistoryData } from '../types';
import { PLATFORM } from '../types';
import { DataService, FilterService, HistoryService } from '../services';
import { PlatformContextService } from '../services/PlatformContextService';
import { KpiDashboard } from './KpiDashboard';
import { InventoryOverview } from './InventoryOverview';
import { SalesAnalytics } from './SalesAnalytics';
import { StockAnalysis } from './StockAnalysis';
import { Charts } from './Charts';
import { ExportControls } from './ExportControls';
import { ReplenishmentPlanner } from './ReplenishmentPlanner';

interface DashboardState {
  inventoryData: InventoryItem[];
  salesData: SalesRecord[];
  isLoading: boolean;
  error: string | null;
  filters: FilterCriteria;
  activeTab: 'inventory' | 'sales' | 'analytics' | 'charts' | 'replenishment' | 'export';
  cumulativeHistory: CumulativeHistoryData | null;
  currentPlatform: Platform;
  historyDetectionMessage: string | null;
  dataQualityWarnings: string[];
}

interface DashboardContentProps {
  activeView: 'dashboard' | 'inventory' | 'sales' | 'action-center' | 'data-management';
  onViewChange?: (view: 'dashboard' | 'inventory' | 'sales' | 'action-center' | 'data-management') => void;
  activePlatform?: Platform;
  onPlatformChange?: (platform: Platform) => void;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ 
  activeView, 
  onViewChange,
  activePlatform = PLATFORM.BLINKIT,
  onPlatformChange: _onPlatformChange = () => {}
}) => {
  // Time period label mapping
  const getTimePeriodLabel = (period?: string): string => {
    switch (period) {
      case 'last-7-days':
        return 'Last 7 Days';
      case 'last-15-days':
        return 'Last 15 Days';
      case 'last-30-days':
        return 'Last 30 Days';
      case 'mtd':
        return 'Month to Date';
      case 'ytd':
        return 'Year to Date';
      case 'last-month':
        return 'Last Month';
      default:
        return 'All Time';
    }
  };

  const [state, setState] = useState<DashboardState>({
    inventoryData: [],
    salesData: [],
    isLoading: false,
    error: null,
    filters: {},
    activeTab: 'inventory',
    cumulativeHistory: null,
    currentPlatform: activePlatform,
    historyDetectionMessage: null,
    dataQualityWarnings: []
  });

  const [uploadProgress, setUploadProgress] = useState<{
    inventory: boolean;
    sales: boolean;
  }>({
    inventory: false,
    sales: false
  });

  // File upload handlers with platform detection
  const handleInventoryUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setUploadProgress(prev => ({ ...prev, inventory: true }));

    try {
      // Use the enhanced method that detects cumulative history
      const result = await DataService.loadMasterInventoryDataWithHistory(file);
      const { items: inventoryData, cumulativeHistory, isHistoryFile } = result;
      
      // Determine platform from the data
      const platform = inventoryData[0]?.platform || PLATFORM.BLINKIT;
      
      if (isHistoryFile && cumulativeHistory) {
        // Use bulk import for files with Upload Date columns
        await HistoryService.saveBulkSnapshots(
          cumulativeHistory,
          file.name,
          platform,
          'blinkit' // Default to blinkit format for inventory
        );
        
        // Create success message for UI
        const startDate = cumulativeHistory.earliestDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        const endDate = cumulativeHistory.latestDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        const historyMessage = `Cumulative history detected: ${cumulativeHistory.totalDaysOfHistory} days found (${startDate} to ${endDate})`;
        
        // Validate data quality
        const qualityCheck = DataService.validateDataQuality(cumulativeHistory);
        
        console.log(`Cumulative file processed: ${cumulativeHistory.totalDaysOfHistory} days of history imported`);
        
        setState(prev => ({ 
          ...prev, 
          inventoryData, 
          cumulativeHistory,
          currentPlatform: platform,
          isLoading: false,
          historyDetectionMessage: historyMessage,
          dataQualityWarnings: qualityCheck.warnings
        }));
        setUploadProgress(prev => ({ ...prev, inventory: false }));
      } else {
        // Fallback to single snapshot for files without date columns
        await HistoryService.saveInventorySnapshot(
          inventoryData, 
          file.name, 
          state.salesData,
          platform,
          'blinkit'
        );
        
        setState(prev => ({ 
          ...prev, 
          inventoryData, 
          cumulativeHistory: null,
          currentPlatform: platform,
          isLoading: false,
          historyDetectionMessage: null,
          dataQualityWarnings: []
        }));
        setUploadProgress(prev => ({ ...prev, inventory: false }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load inventory data',
        isLoading: false 
      }));
      setUploadProgress(prev => ({ ...prev, inventory: false }));
    }
  }, [state.salesData]);

  const handleSalesUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setUploadProgress(prev => ({ ...prev, sales: true }));

    try {
      // Detect data format first
      const dataFormat = await DataService.detectDataFormat(file);
      let salesData: SalesRecord[];

      if (dataFormat === 'amazon') {
        // Load Amazon data
        salesData = await DataService.loadAmazonSalesData(file);
      } else {
        // Load Blinkit data (default)
        salesData = await DataService.loadSalesData(file);
      }

      setState(prev => ({ 
        ...prev, 
        salesData, 
        isLoading: false 
      }));
      setUploadProgress(prev => ({ ...prev, sales: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load sales data',
        isLoading: false 
      }));
      setUploadProgress(prev => ({ ...prev, sales: false }));
    }
  }, []);

  // Filter handlers
  const handleFilterChange = useCallback((newFilters: Partial<FilterCriteria>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {}
    }));
  }, []);

  // Tab navigation
  const handleTabChange = useCallback((tab: 'inventory' | 'sales' | 'analytics' | 'charts' | 'replenishment' | 'export') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // Get filtered data with platform awareness
  const filteredInventory = PlatformContextService.filterDataByPlatform(
    FilterService.applyInventoryFilters(state.inventoryData, state.filters),
    activePlatform
  );
  const filteredSales = PlatformContextService.filterDataByPlatform(
    FilterService.applySalesFilters(state.salesData, state.filters),
    activePlatform
  );

  // Get unique options for filters
  const uniqueLocations = FilterService.getUniqueLocations(state.inventoryData);
  const uniqueSKUs = FilterService.getUniqueSKUs(state.inventoryData);

  // Handle drill-down from charts
  const handleChartDrillDown = useCallback((type: 'location' | 'sku' | 'status', value: string) => {
    switch (type) {
      case 'location':
        const location = uniqueLocations.find(loc => loc.name === value);
        if (location) {
          handleFilterChange({ locations: [location.id] });
        }
        break;
      case 'sku':
        handleFilterChange({ skus: [value] });
        break;
      case 'status':
        if (value === 'out-of-stock' || value === 'understock') {
          handleTabChange('analytics');
        } else {
          handleTabChange('inventory');
        }
        break;
    }
  }, [uniqueLocations, handleFilterChange]);

  // Render content based on active view
  const renderContent = () => {
    if (activeView === 'data-management') {
      return (
        <div className="p-6"> {/* Removed extra top padding since main layout is fixed */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-vyndo-text mb-4 flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Data Upload
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Inventory Upload */}
              <div className="border border-dashed border-slate-300/60 rounded-xl p-6 hover:border-vyndo-primary-500/60 transition-colors">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="inventory-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-vyndo-text">
                        Upload Inventory Data
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        CSV file with inventory levels and stock data
                      </span>
                    </label>
                    <input
                      id="inventory-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleInventoryUpload}
                      className="hidden"
                      disabled={uploadProgress.inventory}
                    />
                  </div>
                  {uploadProgress.inventory && (
                    <div className="mt-2 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-gray-600">Processing...</span>
                    </div>
                  )}
                  {state.inventoryData.length > 0 && !uploadProgress.inventory && (
                    <div className="mt-2 text-sm text-vyndo-green">
                      ✓ {state.inventoryData.length} items loaded
                    </div>
                  )}
                </div>
              </div>

              {/* Sales Upload */}
              <div className="border border-dashed border-slate-300/60 rounded-xl p-6 hover:border-vyndo-primary-500/60 transition-colors">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="sales-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-vyndo-text">
                        Upload Sales Data
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        CSV file with sales transactions and revenue
                      </span>
                    </label>
                    <input
                      id="sales-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleSalesUpload}
                      className="hidden"
                      disabled={uploadProgress.sales}
                    />
                  </div>
                  {uploadProgress.sales && (
                    <div className="mt-2 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-gray-600">Processing...</span>
                    </div>
                  )}
                  {state.salesData.length > 0 && !uploadProgress.sales && (
                    <div className="mt-2 text-sm text-vyndo-green">
                      ✓ {state.salesData.length} records loaded
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* History Detection Success Message */}
            {state.historyDetectionMessage && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Success!
                    </h3>
                    <div className="mt-1 text-sm text-green-700">
                      {state.historyDetectionMessage}
                    </div>
                  </div>
                  <div className="ml-auto pl-3">
                    <div className="-mx-1.5 -my-1.5">
                      <button
                        type="button"
                        onClick={() => setState(prev => ({ ...prev, historyDetectionMessage: null }))}
                        className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
                      >
                        <span className="sr-only">Dismiss</span>
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Data Quality Warnings */}
            {state.dataQualityWarnings.length > 0 && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">
                      Data Quality Warnings
                    </h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <ul className="list-disc list-inside space-y-1">
                        {state.dataQualityWarnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="ml-auto pl-3">
                    <div className="-mx-1.5 -my-1.5">
                      <button
                        type="button"
                        onClick={() => setState(prev => ({ ...prev, dataQualityWarnings: [] }))}
                        className="inline-flex bg-amber-50 rounded-md p-1.5 text-amber-500 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 focus:ring-amber-600"
                      >
                        <span className="sr-only">Dismiss</span>
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Dashboard Overview - Show KPI Dashboard
    if (activeView === 'dashboard') {
      return (
        <div className="p-6"> {/* Removed extra top padding since main layout is fixed */}
          <KpiDashboard 
            inventoryData={filteredInventory}
            salesData={filteredSales}
            isLoading={state.isLoading}
            onViewChange={onViewChange}
            activePlatform={activePlatform}
          />
          
          {/* Show additional dashboard content if data is available */}
          {(state.inventoryData.length > 0 || state.salesData.length > 0) && (
            <div className="space-y-6">
              {/* Quick Stats Cards */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-lg font-semibold text-vyndo-text mb-4">Quick Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-vyndo-text">{state.inventoryData.length}</div>
                    <div className="text-sm text-gray-600">Total SKUs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-vyndo-text">{state.salesData.length}</div>
                    <div className="text-sm text-gray-600">Sales Records</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-vyndo-text">
                      {new Set(state.inventoryData.map(item => item.warehouseFacilityName)).size}
                    </div>
                    <div className="text-sm text-gray-600">Locations</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Show empty state if no data is loaded for other views
    if (state.inventoryData.length === 0 && state.salesData.length === 0 && !state.isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-vyndo-text">No data uploaded</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload your inventory and sales CSV files to get started.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6"> {/* Removed extra top padding since main layout is fixed */}
        {/* Error Display */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-vyndo-red mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-800 mb-1">
                  Data Processing Error
                </div>
                <div className="text-sm text-red-700">
                  {state.error.length > 200 
                    ? `${state.error.substring(0, 200)}...` 
                    : state.error
                  }
                </div>
                <button
                  onClick={() => setState(prev => ({ ...prev, error: null }))}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Premium Navigation Tabs - HARDCODED STYLES FOR VISIBILITY */}
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
          backdropFilter: 'blur(12px)', 
          padding: '8px', 
          borderRadius: '9999px', 
          border: '1px solid rgba(226, 232, 240, 0.5)', 
          marginBottom: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <nav style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleTabChange('inventory')}
              style={{
                padding: '8px 24px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                backgroundColor: state.activeTab === 'inventory' ? '#ef5326' : 'transparent',
                color: state.activeTab === 'inventory' ? 'white' : '#64748b',
                boxShadow: state.activeTab === 'inventory' ? '0 4px 12px rgba(239, 83, 38, 0.4)' : 'none',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                if (state.activeTab !== 'inventory') {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseOut={(e) => {
                if (state.activeTab !== 'inventory') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              Inventory Overview
            </button>
            <button
              onClick={() => handleTabChange('sales')}
              style={{
                padding: '8px 24px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                backgroundColor: state.activeTab === 'sales' ? '#ef5326' : 'transparent',
                color: state.activeTab === 'sales' ? 'white' : '#64748b',
                boxShadow: state.activeTab === 'sales' ? '0 4px 12px rgba(239, 83, 38, 0.4)' : 'none',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                if (state.activeTab !== 'sales') {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseOut={(e) => {
                if (state.activeTab !== 'sales') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              Sales Analytics
            </button>
            <button
              onClick={() => handleTabChange('analytics')}
              style={{
                padding: '8px 24px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                backgroundColor: state.activeTab === 'analytics' ? '#ef5326' : 'transparent',
                color: state.activeTab === 'analytics' ? 'white' : '#64748b',
                boxShadow: state.activeTab === 'analytics' ? '0 4px 12px rgba(239, 83, 38, 0.4)' : 'none',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                if (state.activeTab !== 'analytics') {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseOut={(e) => {
                if (state.activeTab !== 'analytics') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              Stock Analysis
            </button>
            <button
              onClick={() => handleTabChange('charts')}
              style={{
                padding: '8px 24px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                backgroundColor: state.activeTab === 'charts' ? '#ef5326' : 'transparent',
                color: state.activeTab === 'charts' ? 'white' : '#64748b',
                boxShadow: state.activeTab === 'charts' ? '0 4px 12px rgba(239, 83, 38, 0.4)' : 'none',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                if (state.activeTab !== 'charts') {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseOut={(e) => {
                if (state.activeTab !== 'charts') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              Charts & Visualizations
            </button>
            <button
              onClick={() => handleTabChange('replenishment')}
              style={{
                padding: '8px 24px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                backgroundColor: state.activeTab === 'replenishment' ? '#ef5326' : 'transparent',
                color: state.activeTab === 'replenishment' ? 'white' : '#64748b',
                boxShadow: state.activeTab === 'replenishment' ? '0 4px 12px rgba(239, 83, 38, 0.4)' : 'none',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                if (state.activeTab !== 'replenishment') {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseOut={(e) => {
                if (state.activeTab !== 'replenishment') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              Replenishment Planner
            </button>
            <button
              onClick={() => handleTabChange('export')}
              style={{
                padding: '8px 24px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                backgroundColor: state.activeTab === 'export' ? '#ef5326' : 'transparent',
                color: state.activeTab === 'export' ? 'white' : '#64748b',
                boxShadow: state.activeTab === 'export' ? '0 4px 12px rgba(239, 83, 38, 0.4)' : 'none',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                if (state.activeTab !== 'export') {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseOut={(e) => {
                if (state.activeTab !== 'export') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              Export Data
            </button>
          </nav>
        </div>

        {/* Compact Horizontal Filter Bar - FIXED GEOMETRY */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '24px',
          padding: '16px'
        }}>
          {/* Filters Label - Separate Row Above */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Filter style={{ width: '18px', height: '18px', marginRight: '8px' }} />
              Filters
            </h3>
          </div>
          
          {/* Filter Controls Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  color: '#9CA3AF',
                  zIndex: 10
                }} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={state.filters.searchTerm || ''}
                  onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                  style={{
                    paddingLeft: '44px',
                    paddingRight: '16px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    width: '220px',
                    fontSize: '14px',
                    backgroundColor: 'rgba(241, 245, 249, 0.5)',
                    border: 'none',
                    borderRadius: '9999px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.boxShadow = '0 0 0 2px #ef5326';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = 'rgba(241, 245, 249, 0.5)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Location Filter */}
              <select
                value={state.filters.locations?.[0] || ''}
                onChange={(e) => handleFilterChange({ 
                  locations: e.target.value ? [e.target.value] : [] 
                })}
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  backgroundColor: 'rgba(241, 245, 249, 0.5)',
                  border: 'none',
                  borderRadius: '9999px',
                  minWidth: '140px',
                  cursor: 'pointer'
                }}
              >
                <option value="">All locations</option>
                {uniqueLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>

              {/* SKU Filter */}
              <select
                value={state.filters.skus?.[0] || ''}
                onChange={(e) => handleFilterChange({ 
                  skus: e.target.value ? [e.target.value] : [] 
                })}
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  backgroundColor: 'rgba(241, 245, 249, 0.5)',
                  border: 'none',
                  borderRadius: '9999px',
                  minWidth: '120px',
                  cursor: 'pointer'
                }}
              >
                <option value="">All SKUs</option>
                {uniqueSKUs.slice(0, 100).map((sku) => (
                  <option key={sku.id} value={sku.id}>
                    {sku.name}
                  </option>
                ))}
              </select>

              {/* Time Period Filter */}
              <select
                value={state.filters.timePeriod || ''}
                onChange={(e) => handleFilterChange({ 
                  timePeriod: e.target.value as any || undefined 
                })}
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  backgroundColor: 'rgba(241, 245, 249, 0.5)',
                  border: 'none',
                  borderRadius: '9999px',
                  minWidth: '150px',
                  cursor: 'pointer'
                }}
              >
                <option value="">All time</option>
                <option value="last-7-days">Last 7 days</option>
                <option value="last-15-days">Last 15 days</option>
                <option value="last-30-days">Last 30 days</option>
                <option value="mtd">Month to date</option>
                <option value="ytd">Year to date</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {Object.keys(state.filters).length > 0 && (
              <button
                onClick={clearFilters}
                style={{
                  padding: '6px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#ef5326',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 83, 38, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Compact Filter Summary */}
          {Object.keys(state.filters).length > 0 && (
            <div style={{ 
              marginTop: '12px', 
              fontSize: '12px', 
              color: '#6B7280' 
            }}>
              Active: {FilterService.getFilterSummary(state.filters)}
            </div>
          )}
        </div>

        {/* Content Area */}
        {state.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-vyndo-orange mr-3" />
            <span className="text-lg text-gray-600">Loading data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tab Content */}
            {state.activeTab === 'inventory' && (
              <InventoryOverview 
                inventoryData={filteredInventory} 
                activePlatform={activePlatform}
              />
            )}
            
            {state.activeTab === 'sales' && (
              <SalesAnalytics 
                salesData={filteredSales} 
                activePlatform={activePlatform}
              />
            )}
            
            {state.activeTab === 'analytics' && (
              <StockAnalysis inventoryData={filteredInventory} />
            )}
            
            {state.activeTab === 'charts' && (
              <Charts 
                inventoryData={filteredInventory} 
                salesData={filteredSales}
                timePeriod={state.filters.timePeriod}
                activeFilterLabel={getTimePeriodLabel(state.filters.timePeriod)}
                onDrillDown={handleChartDrillDown}
                cumulativeHistory={state.cumulativeHistory}
                platform={state.currentPlatform}
              />
            )}
            
            {state.activeTab === 'replenishment' && (
              <ReplenishmentPlanner 
                inventoryData={filteredInventory} 
                cumulativeHistory={state.cumulativeHistory}
                platform={state.currentPlatform}
              />
            )}
            
            {state.activeTab === 'export' && (
              <ExportControls 
                inventoryData={filteredInventory} 
                salesData={filteredSales}
                filters={state.filters}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return renderContent();
};