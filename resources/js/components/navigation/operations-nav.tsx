import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

const operationItems = [
    { label: 'Inventory', href: '/operations/inventory' },
    { label: 'Stock opname', href: '/operations/stock-opnames' },
    { label: 'Kas & akun', href: '/operations/cash' },
    { label: 'Modal pemilik', href: '/operations/capital' },
] as const;

export function OperationsNav({ active }: { active: string }) {
    return (
        <nav aria-label="Navigasi operasional" className="flex max-w-full gap-1.5 overflow-x-auto pb-0.5">
            {operationItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active === item.href ? 'page' : undefined}
                    className={cn(
                        'min-h-10 shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        active === item.href
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-accent text-muted-foreground hover:text-foreground',
                    )}
                >
                    {item.label}
                </Link>
            ))}
        </nav>
    );
}
