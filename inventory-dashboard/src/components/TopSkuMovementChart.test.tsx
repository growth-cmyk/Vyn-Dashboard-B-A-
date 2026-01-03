import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopSkuMovementChart } from './TopSkuMovementChart';
import type { SalesRecord } from '../types';

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>
}));

describe('TopSkuMovementChart', () => {
  const mockSalesData: SalesRecord[] = [
    {
      orderId: 'order1',
      orderDate: new Date('2024-01-01'),
      itemId: 'item1',
      productName: 'Test Product 1',
      brandName: 'Test Brand',
      upc: '123456789',
      supplyCity: 'Mumbai',
      supplyState: 'Maharashtra',
      customerCity: 'Mumbai',
      customerState: 'Maharashtra',
      quantity: 10,
      sellingPrice: 100
    },
    {
      orderId: 'order2',
      orderDate: new Date('2024-01-02'),
      itemId: 'item2',
      productName: 'Test Product 2',
      brandName: 'Test Brand',
      upc: '987654321',
      supplyCity: 'Delhi',
      supplyState: 'Delhi',
      customerCity: 'Delhi',
      customerState: 'Delhi',
      quantity: 5,
      sellingPrice: 200
    }
  ];

  it('renders without crashing', () => {
    render(<TopSkuMovementChart salesData={mockSalesData} />);
    expect(screen.getByText('Top SKU Multi-City Movement')).toBeInTheDocument();
  });

  it('shows no data message when sales data is empty', () => {
    render(<TopSkuMovementChart salesData={[]} />);
    expect(screen.getByText('No Sales Data Available')).toBeInTheDocument();
  });

  it('displays SKU selector pills when data is available', () => {
    render(<TopSkuMovementChart salesData={mockSalesData} />);
    expect(screen.getByText('Top 10 SKUs by Revenue')).toBeInTheDocument();
  });

  it('renders the chart component', () => {
    render(<TopSkuMovementChart salesData={mockSalesData} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('displays hero SKU strategy insights', () => {
    render(<TopSkuMovementChart salesData={mockSalesData} />);
    expect(screen.getByText('Hero SKU Strategy Insights')).toBeInTheDocument();
  });
});