import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageSection({
    title,
    description,
    actions,
    children,
    className,
    contentClassName,
}: {
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
}) {
    return (
        <section className={cn('overflow-hidden rounded-2xl bg-card text-card-foreground', className)}>
            {(title || description || actions) && (
                <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                        {title && <h2 className="text-base font-bold tracking-[-0.02em] sm:text-lg">{title}</h2>}
                        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
                    </div>
                    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
                </div>
            )}
            <div className={contentClassName}>{children}</div>
        </section>
    );
}
