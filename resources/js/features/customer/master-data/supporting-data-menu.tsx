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

const supportingDataLinks = [
    { label: 'Produk', href: '/master-data/products' },
    { label: 'Kategori', href: '/master-data/categories' },
    { label: 'Satuan', href: '/master-data/units' },
    { label: 'Supplier', href: '/master-data/suppliers' },
    { label: 'Kas & rekening', href: '/master-data/financial-accounts' },
];

type MasterDataLink = (typeof supportingDataLinks)[number];

export function SupportingDataMenu({ links: visibleLinks = supportingDataLinks }: { links?: MasterDataLink[] }) {
    const { url } = usePage();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="h-10">
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
