import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, MapPin, Package, DollarSign } from 'lucide-react';
import type { SalesRecord, TimePeriod, SalesAggregation, Platform } from '../types';
import { AnalyticsService } from '../services';
import { TIME_PERIOD, PLATFORM } from '../types';

interface SalesAnalyticsProps {
  salesData: SalesRecord[];
  activePlatform?: Platform;
}

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtitle, trend, icon }) => (
  <div className="bg-white rounded-lg border shadow-sm p-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 83, 38, 0.1)' }}>
            {icon}
          </div>
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
      {trend && (
        <div className={`flex items-center ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.isPositive ? (
            <TrendingUp className="h-4 w-4 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 mr-1" />
          )}
          <span className="text-sm font-medium">
            {Math.abs(trend.value).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  </div>
);

interface LocationSalesTableProps {
  salesByLocation: Map<string, SalesAggregation>;
  period: TimePeriod;
}

const LocationSalesTable: React.FC<LocationSalesTableProps> = ({ salesByLocation, period }) => {
  const sortedLocations = useMemo(() => {
    return Array.from(salesByLocation.entries())
      .sort(([, a], [, b]) => b.totalRevenue - a.totalRevenue);
  }, [salesByLocation]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <MapPin className="h-5 w-5 mr-2" style={{ color: '#ef5326' }} />
          Sales by Location - {period.replace('-', ' ').toUpperCase()}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity Sold
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedLocations.map(([location, data]) => (
              <tr key={location} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{location}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatCurrency(data.totalRevenue)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatNumber(data.totalQuantity)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatCurrency(data.averagePrice)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{data.itemCount}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedLocations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p>No sales data available for the selected period</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface SKUSalesTableProps {
  salesBySKU: Map<string, SalesAggregation>;
  period: TimePeriod;
  salesData: SalesRecord[];
}

const SKUSalesTable: React.FC<SKUSalesTableProps> = ({ salesBySKU, period, salesData }) => {
  const sortedSKUs = useMemo(() => {
    return Array.from(salesBySKU.entries())
      .sort(([, a], [, b]) => b.totalRevenue - a.totalRevenue) // Highest Revenue first
      .slice(0, 10); // Limit to top 10 products
  }, [salesBySKU]);

  const getProductName = (itemId: string) => {
    const record = salesData.find(r => r.itemId === itemId);
    return record?.productName || itemId;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Package className="h-5 w-5 mr-2" style={{ color: '#ef5326' }} />
          Top SKUs by Revenue - {period.replace('-', ' ').toUpperCase()}
        </h3>
        <p className="text-sm text-gray-500 mt-1">Showing top 10 performing products</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity Sold
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Locations
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedSKUs.map(([sku, data]) => (
              <tr key={sku} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {getProductName(sku)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{sku}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatCurrency(data.totalRevenue)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatNumber(data.totalQuantity)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatCurrency(data.averagePrice)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{data.locationCount}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedSKUs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p>No sales data available for the selected period</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ salesData, activePlatform = PLATFORM.BLINKIT }) => {
  // Calculate Amazon-specific metrics if platform is Amazon
  const amazonMetrics = useMemo(() => {
    if (activePlatform !== PLATFORM.AMAZON) return null;
    
    const amazonSales = salesData.filter(record => record.platform === PLATFORM.AMAZON);
    const grossRevenue = amazonSales.reduce((sum, record) => sum + (record.quantity * record.sellingPrice), 0);
    const referralFee = grossRevenue * 0.15; // 15% referral fee
    const estimatedPayout = grossRevenue - referralFee;
    
    return {
      grossRevenue,
      referralFee,
      estimatedPayout,
      feePercentage: 15
    };
  }, [salesData, activePlatform]);

  // Calculate aggregations for different time periods
  const currentPeriodData = useMemo(() => {
    const last30Days = AnalyticsService.aggregateSalesByPeriod(salesData, TIME_PERIOD.LAST_30_DAYS);
    const last15Days = AnalyticsService.aggregateSalesByPeriod(salesData, TIME_PERIOD.LAST_15_DAYS);
    const last7Days = AnalyticsService.aggregateSalesByPeriod(salesData, TIME_PERIOD.LAST_7_DAYS);
    const mtd = AnalyticsService.aggregateSalesByPeriod(salesData, TIME_PERIOD.MONTH_TO_DATE);
    const ytd = AnalyticsService.aggregateSalesByPeriod(salesData, TIME_PERIOD.YEAR_TO_DATE);

    return {
      last30Days,
      last15Days,
      last7Days,
      mtd,
      ytd
    };
  }, [salesData]);

  // Calculate previous period data for trend comparison
  const previousPeriodData = useMemo(() => {
    // For trend calculation, we'll compare current 30 days vs previous 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
    
    const previousPeriodSales = salesData.filter(record => 
      record.orderDate >= sixtyDaysAgo && record.orderDate < thirtyDaysAgo
    );
    
    return AnalyticsService.aggregateSalesByPeriod(previousPeriodSales, TIME_PERIOD.LAST_30_DAYS);
  }, [salesData]);

  // Calculate trends
  const revenueTrend = useMemo(() => {
    const change = AnalyticsService.calculatePercentageChange(
      currentPeriodData.last30Days.totalRevenue,
      previousPeriodData.totalRevenue
    );
    return {
      value: change,
      isPositive: change >= 0
    };
  }, [currentPeriodData.last30Days.totalRevenue, previousPeriodData.totalRevenue]);

  const quantityTrend = useMemo(() => {
    const change = AnalyticsService.calculatePercentageChange(
      currentPeriodData.last30Days.totalQuantity,
      previousPeriodData.totalQuantity
    );
    return {
      value: change,
      isPositive: change >= 0
    };
  }, [currentPeriodData.last30Days.totalQuantity, previousPeriodData.totalQuantity]);

  // Calculate sales by location and SKU for current period
  const salesByLocation = useMemo(() => {
    return AnalyticsService.aggregateSalesByLocation(salesData, TIME_PERIOD.LAST_30_DAYS);
  }, [salesData]);

  const salesBySKU = useMemo(() => {
    return AnalyticsService.aggregateSalesBySKU(salesData, TIME_PERIOD.LAST_30_DAYS);
  }, [salesData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  if (salesData.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-vyndo-text mb-2">No Sales Data</h3>
        <p className="text-sm mb-4">Upload sales data to view analytics and trends.</p>
        <button className="text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors" style={{ backgroundColor: '#ef5326' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d4461f'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef5326'}>
          Upload Data to Start
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Sales Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Last 30 Days Revenue"
            value={formatCurrency(currentPeriodData.last30Days.totalRevenue)}
            subtitle={`${formatNumber(currentPeriodData.last30Days.totalQuantity)} units sold`}
            trend={revenueTrend}
            icon={<DollarSign className="h-4 w-4" style={{ color: '#ef5326' }} />}
          />
          <SummaryCard
            title="Month to Date"
            value={formatCurrency(currentPeriodData.mtd.totalRevenue)}
            subtitle={`${formatNumber(currentPeriodData.mtd.totalQuantity)} units sold`}
            icon={<Calendar className="h-4 w-4" style={{ color: '#ef5326' }} />}
          />
          <SummaryCard
            title="Last 7 Days"
            value={formatCurrency(currentPeriodData.last7Days.totalRevenue)}
            subtitle={`${formatNumber(currentPeriodData.last7Days.totalQuantity)} units sold`}
            trend={quantityTrend}
            icon={<TrendingUp className="h-4 w-4" style={{ color: '#ef5326' }} />}
          />
          <SummaryCard
            title="Year to Date"
            value={formatCurrency(currentPeriodData.ytd.totalRevenue)}
            subtitle={`${formatNumber(currentPeriodData.ytd.totalQuantity)} units sold`}
            icon={<Calendar className="h-4 w-4" style={{ color: '#ef5326' }} />}
          />
        </div>

        {/* Amazon Estimated Payout Card - Only show for Amazon platform */}
        {activePlatform === PLATFORM.AMAZON && amazonMetrics && (
          <div className="mt-6">
            <div className="bg-gradient-to-r from-orange-50 to-blue-50 rounded-lg border border-orange-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Package className="h-5 w-5 mr-2 text-orange-500" />
                    Amazon Estimated Payout (Last 30 Days)
                  </h3>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Gross Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(amazonMetrics.grossRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Referral Fee (15%)</p>
                      <p className="text-2xl font-bold text-red-600">-{formatCurrency(amazonMetrics.referralFee)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estimated Payout</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(amazonMetrics.estimatedPayout)}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Net Margin</div>
                  <div className="text-lg font-semibold text-green-600">
                    {((amazonMetrics.estimatedPayout / amazonMetrics.grossRevenue) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Period Comparison */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Period Comparison</h2>
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(currentPeriodData.last7Days.totalRevenue)}
              </div>
              <div className="text-sm text-gray-500">Last 7 Days</div>
              <div className="text-xs text-gray-400 mt-1">
                {formatNumber(currentPeriodData.last7Days.totalQuantity)} units
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(currentPeriodData.last15Days.totalRevenue)}
              </div>
              <div className="text-sm text-gray-500">Last 15 Days</div>
              <div className="text-xs text-gray-400 mt-1">
                {formatNumber(currentPeriodData.last15Days.totalQuantity)} units
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(currentPeriodData.last30Days.totalRevenue)}
              </div>
              <div className="text-sm text-gray-500">Last 30 Days</div>
              <div className="text-xs text-gray-400 mt-1">
                {formatNumber(currentPeriodData.last30Days.totalQuantity)} units
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales by Location Table */}
      <LocationSalesTable 
        salesByLocation={salesByLocation} 
        period={TIME_PERIOD.LAST_30_DAYS}
      />

      {/* Sales by SKU Table */}
      <SKUSalesTable 
        salesBySKU={salesBySKU} 
        period={TIME_PERIOD.LAST_30_DAYS}
        salesData={salesData}
      />
    </div>
  );
};