import { Link, usePage } from '@inertiajs/react';
import { Check, ChevronDown, Grid2X2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { translate } from '@/lib/i18n';
import { index as categoriesIndex } from '@/routes/master-data/categories';
import { index as financialAccountsIndex } from '@/routes/master-data/financial-accounts';
import { index as productsIndex } from '@/routes/master-data/products';
import { index as suppliersIndex } from '@/routes/master-data/suppliers';
import { index as unitsIndex } from '@/routes/master-data/units';

const supportingDataLinks = [
    { label: 'Produk', href: productsIndex.url() },
    { label: 'Kategori', href: categoriesIndex.url() },
    { label: 'Satuan', href: unitsIndex.url() },
    { label: 'Supplier', href: suppliersIndex.url() },
    { label: 'Kas & rekening', href: financialAccountsIndex.url() },
];

type MasterDataLink = (typeof supportingDataLinks)[number];

export function MasterDataMenu({ links: visibleLinks = supportingDataLinks }: { links?: MasterDataLink[] }) {
    const { url } = usePage();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="h-11">
                    <Grid2X2 className="size-4" aria-hidden="true" />
                    {translate('Data pendukung')}
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl p-2">
                <DropdownMenuLabel className="text-xs text-muted-foreground">{translate('Master data')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {visibleLinks.map((link) => {
                    const active = url.startsWith(link.href);

                    return (
                        <DropdownMenuItem key={link.href} asChild className="rounded-lg">
                            <Link href={link.href} className="flex min-h-10 items-center gap-2.5">
                                <span className="min-w-0 flex-1">{translate(link.label)}</span>
                                {active && <Check className="size-4 text-[var(--app-primary)]" aria-hidden="true" />}
                            </Link>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
