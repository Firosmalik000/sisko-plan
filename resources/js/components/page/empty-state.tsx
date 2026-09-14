import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: {
    icon?: LucideIcon;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('grid min-h-44 place-items-center px-4 py-10 text-center sm:px-6 sm:py-12', className)}>
            {Icon && (
                <div className="grid size-11 place-items-center rounded-xl bg-[var(--app-soft)] text-[var(--app-primary)]">
                    <Icon className="size-5" aria-hidden="true" />
                </div>
            )}
            <h3 className={cn('text-base font-bold text-foreground', Icon && 'mt-3')}>{title}</h3>
            {description && <div className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">{description}</div>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
