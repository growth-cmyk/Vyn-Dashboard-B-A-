import React, { useState } from 'react';
import { DataService } from '../services';
import type { InventoryItem, SalesRecord, ValidationResult } from '../types';

/**
 * Test component for DataService functionality
 */
export const DataServiceTest: React.FC = () => {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrityResult, setIntegrityResult] = useState<ValidationResult | null>(null);

  const handleInventoryFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const data = await DataService.loadInventoryData(file);
      setInventoryData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Inventory loading failed: ${errorMessage}`);
      console.error('Inventory loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSalesFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const data = await DataService.loadSalesData(file);
      setSalesData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Sales loading failed: ${errorMessage}`);
      console.error('Sales loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateDataIntegrity = () => {
    if (inventoryData.length === 0 || salesData.length === 0) {
      setError('Both inventory and sales data must be loaded first');
      return;
    }

    const result = DataService.validateDataIntegrity(inventoryData, salesData);
    setIntegrityResult(result);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">DataService Test</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          Loading...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inventory File Upload */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Inventory Data</h2>
          <input
            type="file"
            accept=".csv"
            onChange={handleInventoryFileUpload}
            className="mb-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <div className="text-sm text-gray-600">
            <p>Items loaded: {inventoryData.length}</p>
            {inventoryData.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Sample item:</p>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(inventoryData[0], null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Sales File Upload */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Sales Data</h2>
          <input
            type="file"
            accept=".csv"
            onChange={handleSalesFileUpload}
            className="mb-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          <div className="text-sm text-gray-600">
            <p>Records loaded: {salesData.length}</p>
            {salesData.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Sample record:</p>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(salesData[0], null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Integrity Validation */}
      {inventoryData.length > 0 && salesData.length > 0 && (
        <div className="mt-6 border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Data Integrity</h2>
          <button
            onClick={validateDataIntegrity}
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          >
            Validate Data Integrity
          </button>
          
          {integrityResult && (
            <div className="mt-4">
              <div className={`p-3 rounded ${integrityResult.isValid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                <p className="font-medium">
                  Status: {integrityResult.isValid ? 'Valid' : 'Has Issues'}
                </p>
                <p>Errors: {integrityResult.errors.length}</p>
                <p>Warnings: {integrityResult.warnings.length}</p>
              </div>
              
              {integrityResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-red-700">Errors:</p>
                  <ul className="text-sm text-red-600 list-disc list-inside">
                    {integrityResult.errors.map((error, index) => (
                      <li key={index}>{error.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {integrityResult.warnings.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-yellow-700">Warnings:</p>
                  <ul className="text-sm text-yellow-600 list-disc list-inside">
                    {integrityResult.warnings.slice(0, 5).map((warning, index) => (
                      <li key={index}>{warning.message}</li>
                    ))}
                    {integrityResult.warnings.length > 5 && (
                      <li>... and {integrityResult.warnings.length - 5} more warnings</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Summary</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Inventory Items:</strong> {inventoryData.length}</p>
            <p><strong>Unique Warehouses:</strong> {new Set(inventoryData.map(item => item.warehouseFacilityId)).size}</p>
            <p><strong>Unique Products:</strong> {new Set(inventoryData.map(item => item.itemId)).size}</p>
          </div>
          <div>
            <p><strong>Sales Records:</strong> {salesData.length}</p>
            <p><strong>Unique Orders:</strong> {new Set(salesData.map(record => record.orderId)).size}</p>
            <p><strong>Date Range:</strong> {
              salesData.length > 0 
                ? `${new Date(Math.min(...salesData.map(r => r.orderDate.getTime()))).toLocaleDateString()} - ${new Date(Math.max(...salesData.map(r => r.orderDate.getTime()))).toLocaleDateString()}`
                : 'N/A'
            }</p>
          </div>
        </div>
      </div>
    </div>
  );
};