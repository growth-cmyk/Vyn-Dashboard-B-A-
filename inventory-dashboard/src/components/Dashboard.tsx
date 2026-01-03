import React, { useState, useCallback } from 'react';
import { Upload, Filter, Search, AlertCircle, Loader2, FileText, BarChart3, History } from 'lucide-react';
import type { InventoryItem, SalesRecord, FilterCriteria } from '../types';
import { DataService, FilterService } from '../services';
import { HistoryService } from '../services/HistoryService';
import { InventoryOverview } from './InventoryOverview';
import { SalesAnalytics } from './SalesAnalytics';
import { StockAnalysis } from './StockAnalysis';
import { Charts } from './Charts';
import { ExportControls } from './ExportControls';
import { GoalTracker } from './GoalTracker';

interface DashboardState {
  inventoryData: InventoryItem[];
  salesData: SalesRecord[];
  isLoading: boolean;
  error: string | null;
  filters: FilterCriteria;
  activeTab: 'overview' | 'inventory' | 'sales' | 'analytics' | 'charts' | 'export';
}

export const Dashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    inventoryData: [],
    salesData: [],
    isLoading: false,
    error: null,
    filters: {},
    activeTab: 'overview'
  });

  const [uploadProgress, setUploadProgress] = useState<{
    inventory: boolean;
    sales: boolean;
  }>({
    inventory: false,
    sales: false
  });

  // File upload handlers
  const handleInventoryUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setUploadProgress(prev => ({ ...prev, inventory: true }));

    try {
      const inventoryData = await DataService.loadInventoryData(file);
      
      // Save inventory snapshot for historical tracking
      await HistoryService.saveInventorySnapshot(inventoryData, file.name, state.salesData);
      
      setState(prev => ({ 
        ...prev, 
        inventoryData, 
        isLoading: false 
      }));
      setUploadProgress(prev => ({ ...prev, inventory: false }));
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
      const salesData = await DataService.loadSalesData(file);
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
  const handleTabChange = useCallback((tab: 'overview' | 'inventory' | 'sales' | 'analytics' | 'charts' | 'export') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // Get filtered data
  const filteredInventory = FilterService.applyInventoryFilters(state.inventoryData, state.filters);
  const filteredSales = FilterService.applySalesFilters(state.salesData, state.filters);

  // Get unique options for filters
  const uniqueLocations = FilterService.getUniqueLocations(state.inventoryData);
  const uniqueSKUs = FilterService.getUniqueSKUs(state.inventoryData);

  // Handle drill-down from charts
  const handleChartDrillDown = useCallback((type: 'location' | 'sku' | 'status', value: string) => {
    // Update filters based on drill-down
    switch (type) {
      case 'location':
        // Find the location ID from the name
        const location = uniqueLocations.find(loc => loc.name === value);
        if (location) {
          handleFilterChange({ locations: [location.id] });
        }
        break;
      case 'sku':
        handleFilterChange({ skus: [value] });
        break;
      case 'status':
        // For status, we could add a status filter if needed
        // For now, just switch to the appropriate tab
        if (value === 'out-of-stock' || value === 'understock') {
          handleTabChange('analytics');
        } else {
          handleTabChange('inventory');
        }
        break;
    }
  }, [uniqueLocations, handleFilterChange]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Inventory & Sales Dashboard
              </h1>
            </div>
            <div className="text-sm text-gray-500">
              {state.inventoryData.length > 0 && (
                <span>{state.inventoryData.length} inventory items</span>
              )}
              {state.inventoryData.length > 0 && state.salesData.length > 0 && (
                <span className="mx-2">•</span>
              )}
              {state.salesData.length > 0 && (
                <span>{state.salesData.length} sales records</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* File Upload Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Data Management
            </h2>
            
            {/* History Indicator */}
            <div className="flex items-center text-sm text-gray-600">
              <History className="h-4 w-4 mr-1" />
              <span>
                {(() => {
                  const snapshots = HistoryService.getInventorySnapshots();
                  return snapshots.length > 0 
                    ? `${snapshots.length} days of history captured`
                    : 'No history yet';
                })()}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Inventory Upload */}
            <div className="border border-dashed border-slate-300/60 rounded-lg p-6 hover:border-vyndo-primary-500/60 transition-colors">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="inventory-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload Inventory Data
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      CSV file with inventory levels and stock data
                    </span>
                    <span className="mt-1 block text-xs text-blue-600">
                      Supports both detailed and master inventory formats
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
                  <div className="mt-2 text-sm text-green-600">
                    ✓ {state.inventoryData.length} items loaded
                  </div>
                )}
              </div>
            </div>

            {/* Sales Upload */}
            <div className="border border-dashed border-slate-300/60 rounded-lg p-6 hover:border-vyndo-primary-500/60 transition-colors">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="sales-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
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
                  <div className="mt-2 text-sm text-green-600">
                    ✓ {state.salesData.length} records loaded
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
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
                {state.error.length > 200 && (
                  <details className="mt-2">
                    <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800">
                      Show full error details
                    </summary>
                    <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded border max-h-32 overflow-y-auto">
                      {state.error}
                    </div>
                  </details>
                )}
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

        {/* Navigation Tabs */}
        {(state.inventoryData.length > 0 || state.salesData.length > 0) && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => handleTabChange('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    state.activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Dashboard Overview
                </button>
                <button
                  onClick={() => handleTabChange('inventory')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    state.activeTab === 'inventory'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Inventory Details
                </button>
                <button
                  onClick={() => handleTabChange('sales')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    state.activeTab === 'sales'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Sales Analytics
                </button>
                <button
                  onClick={() => handleTabChange('analytics')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    state.activeTab === 'analytics'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Stock Analysis
                </button>
                <button
                  onClick={() => handleTabChange('charts')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    state.activeTab === 'charts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Charts & Visualizations
                </button>
                <button
                  onClick={() => handleTabChange('export')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    state.activeTab === 'export'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Export Data
                </button>
              </nav>
            </div>

            {/* Filter Controls */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </h3>
                {Object.keys(state.filters).length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={state.filters.searchTerm || ''}
                      onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                      className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Location Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    value={state.filters.locations?.[0] || ''}
                    onChange={(e) => handleFilterChange({ 
                      locations: e.target.value ? [e.target.value] : [] 
                    })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">All locations</option>
                    {uniqueLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SKU Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU
                  </label>
                  <select
                    value={state.filters.skus?.[0] || ''}
                    onChange={(e) => handleFilterChange({ 
                      skus: e.target.value ? [e.target.value] : [] 
                    })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">All SKUs</option>
                    {uniqueSKUs.slice(0, 100).map((sku) => (
                      <option key={sku.id} value={sku.id}>
                        {sku.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Period Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Period
                  </label>
                  <select
                    value={state.filters.timePeriod || ''}
                    onChange={(e) => handleFilterChange({ 
                      timePeriod: e.target.value as any || undefined 
                    })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">All time</option>
                    <option value="last-7-days">Last 7 days</option>
                    <option value="last-15-days">Last 15 days</option>
                    <option value="last-30-days">Last 30 days</option>
                    <option value="mtd">Month to date</option>
                    <option value="ytd">Year to date</option>
                  </select>
                </div>
              </div>

              {/* Filter Summary */}
              {Object.keys(state.filters).length > 0 && (
                <div className="mt-4 text-sm text-gray-600">
                  Active filters: {FilterService.getFilterSummary(state.filters)}
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="p-6">
              {state.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                  <span className="text-lg text-gray-600">Loading data...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Tab Content */}
                  {state.activeTab === 'overview' && (
                    <GoalTracker inventoryData={filteredInventory} />
                  )}
                  
                  {state.activeTab === 'inventory' && (
                    <InventoryOverview inventoryData={filteredInventory} />
                  )}
                  
                  {state.activeTab === 'sales' && (
                    <SalesAnalytics salesData={filteredSales} />
                  )}
                  
                  {state.activeTab === 'analytics' && (
                    <StockAnalysis inventoryData={filteredInventory} />
                  )}
                  
                  {state.activeTab === 'charts' && (
                    <Charts 
                      inventoryData={filteredInventory} 
                      salesData={filteredSales}
                      timePeriod={state.filters.timePeriod}
                      activeFilterLabel={FilterService.getFilterSummary(state.filters)}
                      onDrillDown={handleChartDrillDown}
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
          </div>
        )}

        {/* Empty State */}
        {state.inventoryData.length === 0 && state.salesData.length === 0 && !state.isLoading && (
          <div className="text-center py-12">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No data uploaded</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload your inventory and sales CSV files to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};