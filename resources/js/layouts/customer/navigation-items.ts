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
    ReceiptText,
    Ruler,
    ShieldCheck,
    Settings,
    ShoppingCart,
    ScanLine,
    Store,
    Tags,
    Truck,
    MonitorCog,
    WalletCards,
    UsersRound,
    MonitorDot,
} from 'lucide-react';
import { customerNavigationContract } from '@/layouts/customer/navigation-contract';
import { dashboard } from '@/routes';
import appearanceRoutes from '@/routes/appearance';
import { more as moreRoute } from '@/routes/customer';
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
import registersRoutes from '@/routes/registers';
import reportsRoutes from '@/routes/reports';
import salesRoutes from '@/routes/sales';
import securityRoutes from '@/routes/security';
import storesRoutes from '@/routes/stores';
import subscriptionRoutes from '@/routes/subscription';
import teamRoutes from '@/routes/team';

const primaryIcons = {
    home: Home,
    products: Barcode,
    cashier: ShoppingCart,
    transactions: ReceiptText,
    more: Grid2X2,
} as const;

export const cashierOptionIcons = {
    scan: ScanLine,
    manual: ShoppingCart,
} as const;

const primaryHrefs = {
    home: dashboard.url(),
    products: productRoutes.index.url(),
    transactions: salesRoutes.index.url(),
    more: moreRoute.url(),
} as const;

export const primaryDestinations = customerNavigationContract.map((item) =>
    item.kind === 'launcher'
        ? {
              ...item,
              icon: primaryIcons[item.key],
              options: item.options.map((option) => ({
                  ...option,
                  href: posRoutes.index.url(option.key === 'scan' ? { query: { scan: 1 } } : undefined),
              })),
          }
        : { ...item, href: primaryHrefs[item.key], icon: primaryIcons[item.key] },
);

export const moreMenuSections = [
    {
        title: 'Operations',
        items: [
            { title: 'Inventory', href: operationsRoutes.inventory.url(), icon: Boxes, capability: 'inventory.manage' },
            { title: 'Stock count', href: stockOpnameRoutes.index.url(), icon: ClipboardCheck },
            { title: 'Purchases', href: purchasingRoutes.index.url(), icon: Truck, capability: 'purchasing.manage' },
            { title: 'Suppliers', href: supplierRoutes.index.url(), icon: Handshake },
        ],
    },
    {
        title: 'Finance',
        items: [
            { title: 'Cash & bank', href: operationsRoutes.cash.url(), icon: WalletCards, capability: 'cash.view' },
            { title: 'Expenses', href: expensesRoutes.index.url(), icon: CircleDollarSign, capability: 'expenses.manage' },
            { title: 'Marketplace settlements', href: salesRoutes.settlements.index.url(), icon: Landmark, capability: 'cash.view' },
            { title: 'Capital', href: operationsRoutes.capital.url(), icon: Landmark },
            { title: 'Reports', href: reportsRoutes.index.url(), icon: BarChart3, capability: 'reports.view' },
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
            { title: 'Stores', href: storesRoutes.index.url(), icon: Store, capability: 'store.manage' },
            { title: 'Team', href: teamRoutes.index.url(), icon: UsersRound, capability: 'team.view' },
            { title: 'Registers', href: registersRoutes.index.url(), icon: MonitorDot, capability: 'store.manage' },
            { title: 'Subscriptions', href: subscriptionRoutes.index.url(), icon: CreditCard, capability: 'subscription.manage' },
            { title: 'Settings', href: profileRoutes.edit.url(), icon: Settings },
            { title: 'Security', href: securityRoutes.edit.url(), icon: ShieldCheck },
            { title: 'Appearance', href: appearanceRoutes.edit.url(), icon: MonitorCog },
        ],
    },
] as const;
