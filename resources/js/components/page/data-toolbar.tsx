import type { FormEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const dataToolbarControlClass =
    'h-11 min-w-0 rounded-xl border border-input bg-background px-3 text-base text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm';

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
            className={cn('flex flex-col gap-3 border-b border-border p-3 min-[375px]:p-4 lg:flex-row lg:items-center', className)}
        >
            {search && <div className="min-w-0 flex-1">{search}</div>}
            {filters && <div className="grid min-w-0 grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap">{filters}</div>}
            {actions && <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap lg:ml-auto">{actions}</div>}
        </form>
    );
}
