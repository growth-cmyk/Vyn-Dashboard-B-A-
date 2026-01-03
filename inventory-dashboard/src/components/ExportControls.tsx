import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Loader2, CheckCircle } from 'lucide-react';
import type { InventoryItem, SalesRecord, FilterCriteria } from '../types';
import { ExportService, type ExportFormat, type ExportOptions } from '../services/ExportService';

interface ExportControlsProps {
  inventoryData: InventoryItem[];
  salesData: SalesRecord[];
  filters: FilterCriteria;
  className?: string;
}

interface ExportState {
  isExporting: boolean;
  lastExport: {
    filename: string;
    timestamp: Date;
  } | null;
  error: string | null;
}

export const ExportControls: React.FC<ExportControlsProps> = ({
  inventoryData,
  salesData,
  filters,
  className = ''
}) => {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    lastExport: null,
    error: null
  });

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'xlsx',
    includeHeaders: true,
    sheets: {
      inventory: true,
      sales: true,
      analytics: true,
      summary: true
    }
  });

  // Handle export execution
  const handleExport = async (type: 'inventory' | 'sales' | 'analytics' | 'report', format: ExportFormat) => {
    setState(prev => ({ ...prev, isExporting: true, error: null }));

    try {
      let content: string | ArrayBuffer;
      let baseFilename: string;

      switch (type) {
        case 'inventory':
          content = ExportService.exportInventoryToCSV(inventoryData, { ...exportOptions, format });
          baseFilename = 'inventory_data';
          break;

        case 'sales':
          content = ExportService.exportSalesToCSV(salesData, { ...exportOptions, format });
          baseFilename = 'sales_data';
          break;

        case 'analytics':
          content = ExportService.exportStockAnalysisToCSV(inventoryData, { ...exportOptions, format });
          baseFilename = 'stock_analysis';
          break;

        case 'report':
          content = ExportService.generateReport(inventoryData, salesData, filters, format);
          baseFilename = 'inventory_sales_report';
          break;

        default:
          throw new Error('Invalid export type');
      }

      const filename = ExportService.generateFilename(baseFilename, format, filters);
      ExportService.downloadFile(content, filename, format);

      setState(prev => ({
        ...prev,
        isExporting: false,
        lastExport: {
          filename,
          timestamp: new Date()
        }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isExporting: false,
        error: error instanceof Error ? error.message : 'Export failed'
      }));
    }
  };

  // Handle sheet selection changes
  const handleSheetToggle = (sheet: keyof NonNullable<ExportOptions['sheets']>) => {
    setExportOptions(prev => ({
      ...prev,
      sheets: {
        ...prev.sheets,
        [sheet]: !prev.sheets?.[sheet]
      }
    }));
  };

  const hasData = inventoryData.length > 0 || salesData.length > 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-vyndo-text flex items-center">
          <Download className="h-5 w-5 mr-2 text-vyndo-orange" />
          Export Data
        </h3>
        {state.lastExport && (
          <div className="flex items-center text-sm text-vyndo-green">
            <CheckCircle className="h-4 w-4 mr-1" />
            Last export: {state.lastExport.filename} at {state.lastExport.timestamp.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {!hasData ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p className="text-vyndo-text font-medium">No data available for export</p>
          <p className="text-sm mb-4">Upload inventory and sales data to enable exports</p>
          <button className="bg-vyndo-orange text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
            Upload Data to Start
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Export Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={exportOptions.format === 'csv'}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as ExportFormat }))}
                  className="mr-2"
                />
                <FileText className="h-4 w-4 mr-1" />
                CSV
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={exportOptions.format === 'xlsx'}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as ExportFormat }))}
                  className="mr-2"
                />
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Excel
              </label>
            </div>
          </div>

          {/* Excel Sheet Selection */}
          {exportOptions.format === 'xlsx' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Sheets
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.sheets?.summary || false}
                    onChange={() => handleSheetToggle('summary')}
                    className="mr-2"
                  />
                  Summary Report
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.sheets?.inventory || false}
                    onChange={() => handleSheetToggle('inventory')}
                    disabled={inventoryData.length === 0}
                    className="mr-2"
                  />
                  Inventory Data ({inventoryData.length} items)
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.sheets?.sales || false}
                    onChange={() => handleSheetToggle('sales')}
                    disabled={salesData.length === 0}
                    className="mr-2"
                  />
                  Sales Data ({salesData.length} records)
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.sheets?.analytics || false}
                    onChange={() => handleSheetToggle('analytics')}
                    disabled={inventoryData.length === 0}
                    className="mr-2"
                  />
                  Stock Analysis
                </label>
              </div>
            </div>
          )}

          {/* Export Options */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportOptions.includeHeaders}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeHeaders: e.target.checked }))}
                className="mr-2"
              />
              Include column headers
            </label>
          </div>

          {/* Quick Export Buttons */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Exports</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Inventory Export */}
              <button
                onClick={() => handleExport('inventory', exportOptions.format)}
                disabled={state.isExporting || inventoryData.length === 0}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Inventory
              </button>

              {/* Sales Export */}
              <button
                onClick={() => handleExport('sales', exportOptions.format)}
                disabled={state.isExporting || salesData.length === 0}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Sales
              </button>

              {/* Analytics Export */}
              <button
                onClick={() => handleExport('analytics', exportOptions.format)}
                disabled={state.isExporting || inventoryData.length === 0}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Analytics
              </button>

              {/* Complete Report Export */}
              <button
                onClick={() => handleExport('report', exportOptions.format)}
                disabled={state.isExporting}
                className="flex items-center justify-center px-4 py-2 bg-vyndo-orange text-white rounded-md shadow-sm text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                Full Report
              </button>
            </div>
          </div>

          {/* Export Summary */}
          <div className="bg-gray-50 rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Export Summary</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• {inventoryData.length} inventory items</p>
              <p>• {salesData.length} sales records</p>
              <p>• Applied filters: {Object.keys(filters).length > 0 ? 'Yes' : 'None'}</p>
              {Object.keys(filters).length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Filters: {Object.entries(filters)
                    .filter(([_, value]) => value && (Array.isArray(value) ? value.length > 0 : true))
                    .map(([key, value]) => {
                      if (Array.isArray(value)) {
                        return `${key}: ${value.length} selected`;
                      }
                      return `${key}: ${value}`;
                    })
                    .join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};