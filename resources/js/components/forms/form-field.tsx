import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function fieldMessageIds(id: string, description?: ReactNode, error?: ReactNode) {
    return [description ? `${id}-description` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
}

export function FormField({
    id,
    label,
    description,
    error,
    required,
    children,
    className,
}: {
    id: string;
    label: ReactNode;
    description?: ReactNode;
    error?: ReactNode;
    required?: boolean;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <label htmlFor={id} className="block text-sm font-semibold text-foreground">
                {label}
                {required && (
                    <span className="ml-1 text-destructive" aria-hidden="true">
                        *
                    </span>
                )}
            </label>
            {description && (
                <div id={`${id}-description`} className="text-xs text-muted-foreground">
                    {description}
                </div>
            )}
            {children}
            {error && (
                <div id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
                    {error}
                </div>
            )}
        </div>
    );
}
