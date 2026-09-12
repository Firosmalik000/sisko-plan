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
    { title: 'Beranda', href: dashboard.url(), icon: Home },
    { title: 'Produk', href: productRoutes.index.url(), icon: Barcode },
    { title: 'Transaksi', href: salesRoutes.index.url(), icon: ReceiptText },
] as const;

export const moreDestination = { title: 'Lainnya', icon: Grid2X2 } as const;

export const quickActionGroups = [
    {
        title: 'Transaksi',
        items: [
            { title: 'Penjualan', href: posRoutes.index.url(), icon: ShoppingCart },
            { title: 'Pembelian', href: purchasingRoutes.index.url(), icon: Truck },
        ],
    },
    {
        title: 'Persediaan',
        items: [
            { title: 'Cek stok', href: operationsRoutes.inventory.url(), icon: Boxes, supportsScan: false },
            { title: 'Produk baru', href: productRoutes.index.url(), icon: PackageSearch },
        ],
    },
] as const;

export const moreMenuSections = [
    {
        title: 'Operasional',
        items: [
            { title: 'Persediaan', href: operationsRoutes.inventory.url(), icon: Boxes },
            { title: 'Stock opname', href: stockOpnameRoutes.index.url(), icon: ClipboardCheck },
            { title: 'Pembelian', href: purchasingRoutes.index.url(), icon: Truck },
            { title: 'Supplier', href: supplierRoutes.index.url(), icon: Handshake },
        ],
    },
    {
        title: 'Keuangan',
        items: [
            { title: 'Kas & bank', href: operationsRoutes.cash.url(), icon: WalletCards },
            { title: 'Biaya', href: expensesRoutes.index.url(), icon: CircleDollarSign },
            { title: 'Modal', href: operationsRoutes.capital.url(), icon: Landmark },
            { title: 'Laporan', href: reportsRoutes.index.url(), icon: BarChart3 },
        ],
    },
    {
        title: 'Master data',
        items: [
            { title: 'Kategori', href: categoriesRoutes.index.url(), icon: Tags },
            { title: 'Satuan', href: unitRoutes.index.url(), icon: Ruler },
            { title: 'Akun keuangan', href: financialAccountRoutes.index.url(), icon: CreditCard },
        ],
    },
    {
        title: 'Akun & toko',
        items: [
            { title: 'Toko & anggota', href: storesRoutes.index.url(), icon: Store },
            { title: 'Langganan', href: subscriptionRoutes.index.url(), icon: CreditCard },
            { title: 'Pengaturan', href: profileRoutes.edit.url(), icon: Settings },
            { title: 'Keamanan', href: securityRoutes.edit.url(), icon: ShieldCheck },
            { title: 'Tampilan', href: appearanceRoutes.edit.url(), icon: MonitorCog },
        ],
    },
] as const;

export const moreDestinationPaths = moreMenuSections.flatMap((section) => section.items.map((item) => item.href));
