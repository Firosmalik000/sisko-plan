import { useState } from 'react';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { currencySymbol, currencySymbolPosition, formatCurrencyNumber, parseCurrencyInput } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { FormField, fieldMessageIds } from './form-field';

export function FormCurrencyInput({
    id,
    name,
    label,
    value,
    onValueChange,
    description,
    error,
    required,
    disabled,
    min,
    className,
}: {
    id: string;
    name: string;
    label: ReactNode;
    value: string;
    onValueChange: (value: string) => void;
    description?: ReactNode;
    error?: ReactNode;
    required?: boolean;
    disabled?: boolean;
    min?: string;
    className?: string;
}) {
    const [focused, setFocused] = useState(false);
    const [draft, setDraft] = useState(value);
    const position = currencySymbolPosition();

    const displayValue = focused ? draft : value === '' ? '' : formatCurrencyNumber(value);
    const symbol = currencySymbol();

    return (
        <FormField id={id} label={label} description={description} error={error} required={required}>
            <div className="relative">
                <span
                    aria-hidden="true"
                    className={cn(
                        'pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground',
                        position === 'before' ? 'left-3' : 'right-3',
                    )}
                >
                    {symbol}
                </span>
                <Input
                    id={id}
                    name={name}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={displayValue}
                    disabled={disabled}
                    required={required}
                    aria-invalid={Boolean(error)}
                    aria-describedby={fieldMessageIds(id, description, error)}
                    data-min={min}
                    onFocus={() => {
                        setDraft(value);
                        setFocused(true);
                    }}
                    onChange={(event) => {
                        setDraft(event.target.value);
                        onValueChange(parseCurrencyInput(event.target.value));
                    }}
                    onBlur={() => {
                        const normalized = parseCurrencyInput(draft).replace(/\.$/, '');
                        onValueChange(normalized);
                        setDraft(normalized);
                        setFocused(false);
                    }}
                    className={cn(
                        position === 'before' ? 'pl-12' : 'pr-12',
                        'h-11 rounded-xl bg-background text-right text-base tabular-nums sm:text-sm',
                        className,
                    )}
                />
            </div>
        </FormField>
    );
}
