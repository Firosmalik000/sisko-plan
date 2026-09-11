import type { ComponentProps, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { FormField, fieldMessageIds } from './form-field';

type FormPhoneInputProps = Omit<ComponentProps<typeof Input>, 'id' | 'name' | 'type' | 'inputMode'> & {
    id: string;
    name: string;
    label: ReactNode;
    description?: ReactNode;
    error?: ReactNode;
};

export function FormPhoneInput({ id, name, label, description, error, required, ...props }: FormPhoneInputProps) {
    return (
        <FormField id={id} label={label} description={description} error={error} required={required}>
            <Input
                {...props}
                id={id}
                name={name}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required={required}
                aria-invalid={Boolean(error)}
                aria-describedby={fieldMessageIds(id, description, error)}
            />
        </FormField>
    );
}
