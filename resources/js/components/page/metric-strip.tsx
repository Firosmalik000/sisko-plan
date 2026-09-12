import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function MetricStrip({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                'grid grid-cols-2 overflow-hidden rounded-2xl bg-[var(--app-soft)] text-[var(--app-ink)] sm:grid-flow-col sm:grid-cols-none [&>*:nth-child(even)]:border-l sm:[&>*:nth-child(n)]:border-t-0 sm:[&>*:nth-child(n+2)]:border-l [&>*:nth-child(n+3)]:border-t',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function MetricItem({ label, value, detail }: { label: ReactNode; value: ReactNode; detail?: ReactNode }) {
    return (
        <div className="min-w-0 border-[var(--app-ink)]/8 px-3.5 py-4 sm:px-5 sm:py-5">
            <div className="text-xs font-medium text-[var(--muted-foreground)]">{label}</div>
            <div className="mt-1.5 truncate text-xl font-bold tracking-[-0.035em] text-[var(--app-ink)] tabular-nums sm:text-2xl">
                {value}
            </div>
            {detail && <div className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{detail}</div>}
        </div>
    );
}
