import {
    BarChart3,
    Boxes,
    Check,
    CircleDollarSign,
    ClipboardCheck,
    CreditCard,
    Handshake,
    Home,
    PackageSearch,
    Plus,
    ReceiptText,
    ShoppingCart,
    Store,
    Truck,
} from 'lucide-react';

export const primaryItems = [
    { title: 'Beranda', href: '/dashboard', icon: Home },
    { title: 'Produk', href: '/master-data/products', icon: PackageSearch },
    { title: 'Transaksi', href: '/sales', icon: ReceiptText },
] as const;

export const cashierActions = [
    { title: 'Scan penjualan', href: '/pos', icon: ShoppingCart, iconClassName: 'bg-orange-50 text-orange-700' },
    { title: 'Scan kulakan', href: '/purchasing', icon: Truck, iconClassName: 'bg-sky-50 text-sky-700' },
    { title: 'Cek stok', href: '/operations/inventory', icon: Boxes, iconClassName: 'bg-emerald-50 text-emerald-700' },
    { title: 'Scan produk baru', href: '/master-data/products', icon: PackageSearch, iconClassName: 'bg-amber-50 text-amber-700' },
] as const;

export const manualCashierActions = [
    { title: 'Input penjualan', href: '/pos', icon: ShoppingCart, iconClassName: 'bg-orange-50 text-orange-700' },
    { title: 'Input kulakan', href: '/purchasing', icon: Truck, iconClassName: 'bg-sky-50 text-sky-700' },
    { title: 'Cek stok manual', href: '/operations/inventory', icon: Boxes, iconClassName: 'bg-emerald-50 text-emerald-700' },
    { title: 'Tambah produk', href: '/master-data/products', icon: PackageSearch, iconClassName: 'bg-amber-50 text-amber-700' },
] as const;

export const moreMenuSections = [
    {
        title: 'Operasional',
        items: [
            { title: 'Laporan', href: '/reports', icon: BarChart3 },
            { title: 'Stok', href: '/operations/inventory', icon: Boxes },
            { title: 'Stock opname', href: '/operations/stock-opnames', icon: ClipboardCheck },
            { title: 'Pembelian', href: '/purchasing', icon: Truck },
            { title: 'Supplier', href: '/master-data/suppliers', icon: Handshake },
            { title: 'Kas & Bank', href: '/operations/cash', icon: CreditCard },
            { title: 'Biaya', href: '/expenses', icon: CircleDollarSign },
            { title: 'Toko', href: '/stores', icon: Store },
        ],
    },
    {
        title: 'Akun & Paket',
        items: [
            { title: 'Modal', href: '/operations/capital', icon: Plus },
            { title: 'Langganan', href: '/subscription', icon: Check },
        ],
    },
] as const;
