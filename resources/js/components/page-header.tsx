import type { ReactNode } from 'react';

export function PageHeader({
    title,
    description,
    icon,
    actions,
}: {
    title: string;
    description?: string;
    icon?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="flex items-center gap-3">
                    {icon && (
                        <span className="shrink-0 text-primary" aria-hidden="true">
                            {icon}
                        </span>
                    )}
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">{title}</h1>
                </div>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
        </header>
    );
}
