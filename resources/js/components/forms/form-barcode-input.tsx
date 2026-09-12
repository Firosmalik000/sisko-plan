import { Camera, RefreshCw, ScanBarcode, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { translate } from '@/lib/i18n';
import { FormField, fieldMessageIds } from './form-field';

export function FormBarcodeInput({
    id,
    name,
    label,
    value,
    error,
    onChange,
    onScan,
    onGenerate,
}: {
    id: string;
    name: string;
    label: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
    onScan: () => void;
    onGenerate: () => void;
}) {
    return (
        <FormField id={id} label={label} error={error}>
            <div className="flex h-11 min-w-0 overflow-hidden rounded-xl border border-input bg-background transition focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-2 has-[input[aria-invalid=true]]:ring-destructive/20">
                <div className="relative min-w-0 flex-1">
                    <ScanBarcode
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        id={id}
                        name={name}
                        type="text"
                        value={value}
                        placeholder={translate('Ketik atau scan barcode')}
                        aria-invalid={Boolean(error)}
                        aria-describedby={fieldMessageIds(id, undefined, error)}
                        className="h-full rounded-none border-0 bg-transparent pr-10 pl-9 text-base shadow-none focus-visible:ring-0 sm:text-sm"
                        onChange={(event) => onChange(event.target.value)}
                    />
                    {value && (
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            aria-label={translate('Hapus barcode')}
                            title={translate('Hapus barcode')}
                            className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>
                <Button type="button" variant="ghost" onClick={onGenerate} className="h-full shrink-0 rounded-none border-l px-3">
                    <RefreshCw className="size-4" />
                    <span className="hidden sm:inline">{translate('Buat otomatis')}</span>
                </Button>
                <Button type="button" variant="ghost" onClick={onScan} className="h-full shrink-0 rounded-none border-l px-3 text-primary">
                    <Camera className="size-4" />
                    <span className="hidden sm:inline">{translate(value ? 'Scan ulang' : 'Scan')}</span>
                </Button>
            </div>
        </FormField>
    );
}
