import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function RecordList({ className, ...props }: ComponentProps<'div'>) {
    return <div className={cn('overflow-hidden rounded-2xl bg-card text-card-foreground', className)} {...props} />;
}

export function RecordListHeader({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            className={cn(
                'hidden border-b border-border bg-[var(--app-soft)]/45 px-4 py-3 text-xs font-semibold text-muted-foreground md:grid md:px-5',
                className,
            )}
            {...props}
        />
    );
}

export function RecordListRow({ asChild, className, ...props }: ComponentProps<'div'> & { asChild?: boolean }) {
    const Component = asChild ? Slot : 'div';

    return (
        <Component
            className={cn(
                'border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--app-soft)]/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset md:px-5',
                className,
            )}
            {...props}
        />
    );
}
