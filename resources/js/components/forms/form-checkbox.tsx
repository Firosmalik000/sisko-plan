import type { ComponentProps, ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

type FormCheckboxProps = Omit<ComponentProps<typeof Checkbox>, 'id' | 'name'> & {
    id: string;
    name: string;
    label: ReactNode;
    description?: ReactNode;
    error?: ReactNode;
};

export function FormCheckbox({ id, name, label, description, error, ...props }: FormCheckboxProps) {
    const describedBy = [description ? `${id}-description` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

    return (
        <div className="space-y-1.5">
            <div className="flex items-start gap-3">
                <Checkbox {...props} id={id} name={name} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
                <div className="min-w-0">
                    <label htmlFor={id} className="text-sm font-semibold text-foreground">
                        {label}
                    </label>
                    {description && (
                        <div id={`${id}-description`} className="mt-0.5 text-xs text-muted-foreground">
                            {description}
                        </div>
                    )}
                </div>
            </div>
            {error && (
                <div id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
                    {error}
                </div>
            )}
        </div>
    );
}
