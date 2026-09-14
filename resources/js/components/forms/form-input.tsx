import type { ComponentProps, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FormField, fieldMessageIds } from './form-field';

type FormInputProps = Omit<ComponentProps<typeof Input>, 'id' | 'name'> & {
    id: string;
    name: string;
    label: ReactNode;
    description?: ReactNode;
    error?: ReactNode;
};

export function FormInput({ id, name, label, description, error, required, className, ...props }: FormInputProps) {
    return (
        <FormField id={id} label={label} description={description} error={error} required={required}>
            <Input
                {...props}
                id={id}
                name={name}
                required={required}
                aria-invalid={Boolean(error)}
                aria-describedby={fieldMessageIds(id, description, error)}
                className={cn('h-11 rounded-xl bg-background text-base sm:text-sm', className)}
            />
        </FormField>
    );
}
