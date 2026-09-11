import type { FormEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DataToolbar({
    search,
    filters,
    actions,
    onSubmit,
    className,
}: {
    search?: ReactNode;
    filters?: ReactNode;
    actions?: ReactNode;
    onSubmit?: FormEventHandler<HTMLFormElement>;
    className?: string;
}) {
    return (
        <form
            onSubmit={onSubmit}
            className={cn('flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center sm:p-4', className)}
        >
            {search && <div className="min-w-0 flex-1">{search}</div>}
            {filters && <div className="flex min-w-0 flex-wrap items-center gap-2">{filters}</div>}
            {actions && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{actions}</div>}
        </form>
    );
}
