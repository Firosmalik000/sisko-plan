import {
    Barcode,
    BarChart3,
    Boxes,
    CircleDollarSign,
    ClipboardCheck,
    CreditCard,
    Grid2X2,
    Handshake,
    Home,
    Landmark,
    PackageSearch,
    ReceiptText,
    Ruler,
    ShieldCheck,
    Settings,
    ShoppingCart,
    Store,
    Tags,
    Truck,
    MonitorCog,
    WalletCards,
} from 'lucide-react';
import { dashboard } from '@/routes';
import appearanceRoutes from '@/routes/appearance';
import expensesRoutes from '@/routes/expenses';
import categoriesRoutes from '@/routes/master-data/categories';
import financialAccountRoutes from '@/routes/master-data/financial-accounts';
import productRoutes from '@/routes/master-data/products';
import supplierRoutes from '@/routes/master-data/suppliers';
import unitRoutes from '@/routes/master-data/units';
import operationsRoutes from '@/routes/operations';
import stockOpnameRoutes from '@/routes/operations/stock-opnames';
import posRoutes from '@/routes/pos';
import profileRoutes from '@/routes/profile';
import purchasingRoutes from '@/routes/purchasing';
import reportsRoutes from '@/routes/reports';
import salesRoutes from '@/routes/sales';
import securityRoutes from '@/routes/security';
import storesRoutes from '@/routes/stores';
import subscriptionRoutes from '@/routes/subscription';
export { quickActionHref } from '@/layouts/customer/quick-action';
export type { QuickActionMode } from '@/layouts/customer/quick-action';

export const primaryDestinations = [
    { title: 'Home', href: dashboard.url(), icon: Home },
    { title: 'Product', href: productRoutes.index.url(), icon: Barcode },
    { title: 'Transactions', href: salesRoutes.index.url(), icon: ReceiptText },
] as const;

export const moreDestination = { title: 'More', icon: Grid2X2 } as const;

export const quickActionGroups = [
    {
        title: 'Transactions',
        items: [
            { title: 'Sales', href: posRoutes.index.url(), icon: ShoppingCart },
            { title: 'Purchases', href: purchasingRoutes.index.url(), icon: Truck },
        ],
    },
    {
        title: 'Inventory',
        items: [
            { title: 'Check stock', href: operationsRoutes.inventory.url(), icon: Boxes, supportsScan: false },
            { title: 'New product', href: productRoutes.index.url(), icon: PackageSearch },
        ],
    },
] as const;

export const moreMenuSections = [
    {
        title: 'Operations',
        items: [
            { title: 'Inventory', href: operationsRoutes.inventory.url(), icon: Boxes },
            { title: 'Stock count', href: stockOpnameRoutes.index.url(), icon: ClipboardCheck },
            { title: 'Purchases', href: purchasingRoutes.index.url(), icon: Truck },
            { title: 'Suppliers', href: supplierRoutes.index.url(), icon: Handshake },
        ],
    },
    {
        title: 'Finance',
        items: [
            { title: 'Cash & bank', href: operationsRoutes.cash.url(), icon: WalletCards },
            { title: 'Expenses', href: expensesRoutes.index.url(), icon: CircleDollarSign },
            { title: 'Capital', href: operationsRoutes.capital.url(), icon: Landmark },
            { title: 'Reports', href: reportsRoutes.index.url(), icon: BarChart3 },
        ],
    },
    {
        title: 'Master data',
        items: [
            { title: 'Category', href: categoriesRoutes.index.url(), icon: Tags },
            { title: 'Unit', href: unitRoutes.index.url(), icon: Ruler },
            { title: 'Account keuangan', href: financialAccountRoutes.index.url(), icon: CreditCard },
        ],
    },
    {
        title: 'Account & store',
        items: [
            { title: 'Stores & team', href: storesRoutes.index.url(), icon: Store },
            { title: 'Subscriptions', href: subscriptionRoutes.index.url(), icon: CreditCard },
            { title: 'Settings', href: profileRoutes.edit.url(), icon: Settings },
            { title: 'Security', href: securityRoutes.edit.url(), icon: ShieldCheck },
            { title: 'Appearance', href: appearanceRoutes.edit.url(), icon: MonitorCog },
        ],
    },
] as const;

export const moreDestinationPaths = moreMenuSections.flatMap((section) => section.items.map((item) => item.href));
