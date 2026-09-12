import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FormField, fieldMessageIds } from './form-field';

type FormSelectProps = Omit<ComponentProps<'select'>, 'id' | 'name'> & {
    id: string;
    name: string;
    label: ReactNode;
    description?: ReactNode;
    error?: ReactNode;
};

export function FormSelect({ id, name, label, description, error, required, className, children, ...props }: FormSelectProps) {
    return (
        <FormField id={id} label={label} description={description} error={error} required={required}>
            <select
                {...props}
                id={id}
                name={name}
                required={required}
                aria-invalid={Boolean(error)}
                aria-describedby={fieldMessageIds(id, description, error)}
                className={cn(
                    'h-11 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground transition outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 sm:text-sm',
                    className,
                )}
            >
                {children}
            </select>
        </FormField>
    );
}
