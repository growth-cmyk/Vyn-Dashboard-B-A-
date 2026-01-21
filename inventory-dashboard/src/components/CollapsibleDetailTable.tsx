/**
 * CollapsibleDetailTable - Details-on-demand table with glassmorphism
 * 
 * Features:
 * - Collapsed by default (visual-first approach)
 * - Smooth slide-down animation
 * - Glassmorphism styling
 * - Flexible column configuration
 * - Max height with scroll
 * 
 * Requirements: 6.5
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface ColumnDefinition<T = any> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface CollapsibleDetailTableProps<T = any> {
  title: string;
  data: T[];
  columns: ColumnDefinition<T>[];
  defaultCollapsed?: boolean;
  maxHeight?: number;
  className?: string;
  emptyMessage?: string;
}

export const CollapsibleDetailTable = <T extends Record<string, any>>({
  title,
  data,
  columns,
  defaultCollapsed = true,
  maxHeight = 400,
  className = '',
  emptyMessage = 'No data available',
}: CollapsibleDetailTableProps<T>) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 border border-gray-200 rounded-lg transition-all duration-200 group"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{title}</span>
          <span className="text-xs text-gray-500">
            ({data.length} {data.length === 1 ? 'item' : 'items'})
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
            {isCollapsed ? 'View Details' : 'Hide Details'}
          </span>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? 'max-h-0' : 'max-h-[1000px]'
        }`}
      >
        <div className="mt-2 rounded-lg border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
          {data.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              {emptyMessage}
            </div>
          ) : (
            <div
              className="overflow-auto"
              style={{ maxHeight: `${maxHeight}px` }}
            >
              <table className="w-full">
                <thead className="bg-gray-50/80 sticky top-0 z-10">
                  <tr>
                    {columns.map((column, index) => (
                      <th
                        key={column.key}
                        className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${getAlignmentClass(
                          column.align
                        )} ${index === 0 ? 'rounded-tl-lg' : ''} ${
                          index === columns.length - 1 ? 'rounded-tr-lg' : ''
                        }`}
                        style={{ width: column.width }}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="hover:bg-gray-50/50 transition-colors duration-150"
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-4 py-3 text-sm text-gray-900 ${getAlignmentClass(
                            column.align
                          )}`}
                        >
                          {column.render
                            ? column.render(row[column.key], row)
                            : row[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
