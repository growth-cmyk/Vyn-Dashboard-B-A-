import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  Users
} from 'lucide-react';
import { ModernCard, ModernCardContent } from './ModernCard';
import type { MarketingKPIs } from '../types';

interface MarketingKPICardsProps {
  kpis: MarketingKPIs | null;
  isLoading?: boolean;
  campaignCount?: number;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient?: 'orange' | 'green' | 'blue' | 'purple';
  isLoading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  gradient = 'orange',
  isLoading = false 
}) => {
  const getGradientStyles = () => {
    switch (gradient) {
      case 'green':
        return 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200/60 dark:border-emerald-700/40';
      case 'blue':
        return 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/60 dark:border-blue-700/40';
      case 'purple':
        return 'from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200/60 dark:border-purple-700/40';
      default: // orange
        return 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200/60 dark:border-orange-700/40';
    }
  };

  const getIconColor = () => {
    switch (gradient) {
      case 'green':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'blue':
        return 'text-blue-600 dark:text-blue-400';
      case 'purple':
        return 'text-purple-600 dark:text-purple-400';
      default: // orange
        return 'text-orange-600 dark:text-orange-400';
    }
  };

  return (
    <ModernCard 
      variant="elevated" 
      size="md"
      className={`bg-gradient-to-br ${getGradientStyles()} hover:shadow-lg transition-all duration-300`}
    >
      <ModernCardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Icon className={`h-5 w-5 ${getIconColor()}`} />
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {title}
              </h3>
            </div>
            
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                {subtitle && (
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4"></div>
                )}
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold font-mono text-slate-900 dark:text-white mb-1">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                {subtitle && (
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {subtitle}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </ModernCardContent>
    </ModernCard>
  );
};

export const MarketingKPICards: React.FC<MarketingKPICardsProps> = ({ 
  kpis, 
  isLoading = false,
  campaignCount = 0 
}) => {
  // Format currency values
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `₹${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    } else {
      return `₹${value.toFixed(0)}`;
    }
  };

  // Format percentage values
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate RoAS health for gradient selection
  const getRoASGradient = (roas: number): 'green' | 'orange' | 'blue' => {
    if (roas >= 3.0) return 'green'; // High RoAS - green
    if (roas >= 1.5) return 'orange'; // Medium RoAS - orange
    return 'blue'; // Low RoAS - blue
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Ad Spend */}
      <KPICard
        title="Total Ad Spend"
        value={kpis ? formatCurrency(kpis.totalAdSpend) : '₹0'}
        subtitle={kpis ? `${campaignCount} campaigns` : 'No campaigns'}
        icon={DollarSign}
        gradient="orange"
        isLoading={isLoading}
      />

      {/* Total Ad Sales */}
      <KPICard
        title="Total Ad Sales"
        value={kpis ? formatCurrency(kpis.totalAdSales) : '₹0'}
        subtitle={kpis ? `${kpis.totalImpressions.toLocaleString()} impressions` : 'No sales data'}
        icon={TrendingUp}
        gradient="green"
        isLoading={isLoading}
      />

      {/* Average RoAS */}
      <KPICard
        title="Average RoAS"
        value={kpis ? `${kpis.averageRoAS.toFixed(2)}x` : '0.00x'}
        subtitle={kpis ? `${formatPercentage(kpis.overallCTR)} CTR` : 'No performance data'}
        icon={Target}
        gradient={kpis ? getRoASGradient(kpis.averageRoAS) : 'blue'}
        isLoading={isLoading}
      />

      {/* New Customer Acquisition */}
      <KPICard
        title="New Customer Acquisition"
        value={kpis ? kpis.newCustomerAcquisition.toLocaleString() : '0'}
        subtitle={kpis ? `Top: ${kpis.topPerformingCampaign}` : 'No acquisition data'}
        icon={Users}
        gradient="purple"
        isLoading={isLoading}
      />
    </div>
  );
};