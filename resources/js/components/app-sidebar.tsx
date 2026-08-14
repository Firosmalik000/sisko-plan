import { Link } from '@inertiajs/react';
import {
    Boxes,
    ChartNoAxesCombined,
    CircleDollarSign,
    CreditCard,
    LayoutGrid,
    PackageSearch,
    ShoppingCart,
    Store,
    Truck,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { StoreSwitcher } from '@/components/store-switcher';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Toko & Anggota',
        href: '/stores',
        icon: Store,
    },
    {
        title: 'Master Data',
        href: '/master-data/products',
        icon: PackageSearch,
    },
    {
        title: 'Stok, Kas & Modal',
        href: '/operations/inventory',
        icon: Boxes,
    },
    {
        title: 'Pembelian & Utang',
        href: '/purchasing',
        icon: Truck,
    },
    {
        title: 'Kasir / POS',
        href: '/pos',
        icon: ShoppingCart,
    },
    {
        title: 'Biaya Toko',
        href: '/expenses',
        icon: CircleDollarSign,
    },
    {
        title: 'Laporan',
        href: '/reports',
        icon: ChartNoAxesCombined,
    },
    {
        title: 'Paket & Langganan',
        href: '/subscription',
        icon: CreditCard,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <StoreSwitcher />
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
