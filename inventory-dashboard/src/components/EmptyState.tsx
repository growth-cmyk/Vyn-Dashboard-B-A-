import React from 'react';
import { Upload, FileSpreadsheet, BarChart3, TrendingUp, Megaphone, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  type: 'upload' | 'marketing' | 'inventory' | 'sales' | 'analytics' | 'charts' | 'export' | 'error';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionText,
  onAction,
  className = ''
}) => {
  const getEmptyStateConfig = () => {
    switch (type) {
      case 'upload':
        return {
          icon: Upload,
          defaultTitle: 'Upload Data to Begin',
          defaultDescription: 'Upload your inventory, sales, or marketing data to start analyzing your business performance.',
          defaultActionText: 'Upload Files',
          iconColor: 'text-vyndo-orange',
          bgGradient: 'from-orange-50 to-red-50'
        };
      
      case 'marketing':
        return {
          icon: Megaphone,
          defaultTitle: 'No Marketing Data Available',
          defaultDescription: 'Upload your Blinkit campaign Excel file to view marketing analytics and strategic recommendations.',
          defaultActionText: 'Upload Campaign Data',
          iconColor: 'text-purple-500',
          bgGradient: 'from-purple-50 to-indigo-50'
        };
      
      case 'inventory':
        return {
          icon: FileSpreadsheet,
          defaultTitle: 'No Inventory Data',
          defaultDescription: 'Upload your inventory CSV file to view stock levels, analytics, and replenishment recommendations.',
          defaultActionText: 'Upload Inventory Data',
          iconColor: 'text-blue-500',
          bgGradient: 'from-blue-50 to-cyan-50'
        };
      
      case 'sales':
        return {
          icon: BarChart3,
          defaultTitle: 'No Sales Data',
          defaultDescription: 'Upload your sales CSV file to analyze revenue trends, customer patterns, and performance metrics.',
          defaultActionText: 'Upload Sales Data',
          iconColor: 'text-green-500',
          bgGradient: 'from-green-50 to-emerald-50'
        };
      
      case 'analytics':
        return {
          icon: TrendingUp,
          defaultTitle: 'Analytics Unavailable',
          defaultDescription: 'Upload inventory data to enable stock analysis, reorder recommendations, and performance insights.',
          defaultActionText: 'Upload Data',
          iconColor: 'text-indigo-500',
          bgGradient: 'from-indigo-50 to-purple-50'
        };
      
      case 'charts':
        return {
          icon: BarChart3,
          defaultTitle: 'No Data for Visualization',
          defaultDescription: 'Upload your data files to view interactive charts, trends, and visual analytics.',
          defaultActionText: 'Upload Data',
          iconColor: 'text-teal-500',
          bgGradient: 'from-teal-50 to-cyan-50'
        };
      
      case 'export':
        return {
          icon: Upload,
          defaultTitle: 'No Data to Export',
          defaultDescription: 'Upload your data files to enable export functionality and generate comprehensive reports.',
          defaultActionText: 'Upload Data',
          iconColor: 'text-amber-500',
          bgGradient: 'from-amber-50 to-yellow-50'
        };
      
      case 'error':
        return {
          icon: AlertCircle,
          defaultTitle: 'Something went wrong',
          defaultDescription: 'There was an error processing your request. Please try again or contact support.',
          defaultActionText: 'Try Again',
          iconColor: 'text-red-500',
          bgGradient: 'from-red-50 to-pink-50'
        };
      
      default:
        return {
          icon: Upload,
          defaultTitle: 'No Data Available',
          defaultDescription: 'Upload your data to get started with Vyndo analytics.',
          defaultActionText: 'Upload Data',
          iconColor: 'text-gray-500',
          bgGradient: 'from-gray-50 to-slate-50'
        };
    }
  };

  const config = getEmptyStateConfig();
  const IconComponent = config.icon;

  return (
    <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
      <div className={`text-center max-w-md mx-auto p-8 rounded-3xl bg-gradient-to-br ${config.bgGradient} border border-white/50 shadow-lg backdrop-blur-sm`}>
        {/* Icon */}
        <div className="mb-6">
          <div className={`mx-auto w-20 h-20 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center`}>
            <IconComponent className={`h-10 w-10 ${config.iconColor} stroke-[1.5]`} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">
          {title || config.defaultTitle}
        </h3>

        {/* Description */}
        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          {description || config.defaultDescription}
        </p>

        {/* Action Button */}
        {(onAction || actionText) && (
          <button
            onClick={onAction}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-vyndo-orange to-red-500 hover:from-red-500 hover:to-vyndo-orange text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Upload className="h-4 w-4 mr-2 stroke-[1.5]" />
            {actionText || config.defaultActionText}
          </button>
        )}

        {/* Vyndo Branding */}
        <div className="mt-6 pt-4 border-t border-white/30">
          <p className="text-xs text-slate-500 font-medium">
            Powered by <span className="text-vyndo-orange font-bold">Vyndo</span> Analytics
          </p>
        </div>
      </div>
    </div>
  );
};