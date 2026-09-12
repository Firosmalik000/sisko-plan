export type PeriodKey = 'day' | 'month' | 'quarter' | 'semester' | 'year';

export type Performance = {
    net_revenue: string;
    net_cogs: string;
    gross_profit: string;
    expenses: string;
    estimated_profit: string;
};

export type Position = {
    cash_balance: string;
    inventory_value: string;
    supplier_payable: string;
    low_stock_count: number;
};

export type LowStock = {
    product_name: string;
    unit_symbol: string;
    quantity: string;
    minimum_quantity: string;
};

export type SalesTrend = {
    date: string;
    net_revenue: string;
    transactions: number;
};

export type CategorySale = {
    category_name: string;
    net_revenue: string;
    quantity_sold: string;
};

export type TopProduct = {
    product_name: string;
    net_quantity_sold: string;
    net_revenue: string;
    gross_profit: string;
};

export type RevenueComparison = {
    direction: 'up' | 'down' | 'flat';
    percentage: number | null;
};

export type DashboardProps = {
    canViewBusinessPosition: boolean;
    performance?: Performance;
    position?: Position;
    lowStock?: LowStock[];
    transactions?: number;
    salesTrend?: SalesTrend[];
    period?: { key: PeriodKey };
    comparison?: RevenueComparison;
    categorySales?: CategorySale[];
    topProducts?: TopProduct[];
};

export type BusinessDashboardProps = {
    performance: Performance;
    position: Position;
    lowStock: LowStock[];
    transactions: number;
    salesTrend: SalesTrend[];
    period: PeriodKey;
    comparison: RevenueComparison;
    categorySales: CategorySale[];
    topProducts: TopProduct[];
};
