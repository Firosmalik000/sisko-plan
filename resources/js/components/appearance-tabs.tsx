import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const options = [
    { value: 'light', label: 'Terang', icon: Sun },
    { value: 'dark', label: 'Gelap', icon: Moon },
    { value: 'system', label: 'Ikuti perangkat', icon: Monitor },
] as const;

export default function AppearanceToggleTab({
    className,
    variant = 'page',
    ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: 'page' | 'menu' }) {
    const { appearance, updateAppearance } = useAppearance();
    const { t } = useTranslation();

    if (variant === 'menu') {
        return (
            <>
                <DropdownMenuLabel className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('Tampilan')}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                    aria-label={t('Tampilan')}
                    value={appearance}
                    onValueChange={(value) => updateAppearance(value as Appearance)}
                >
                    {options.map(({ value, label, icon: Icon }) => (
                        <DropdownMenuRadioItem
                            key={value}
                            value={value}
                            onSelect={(event) => event.preventDefault()}
                            className="min-h-11 gap-3 rounded-xl pr-3 pl-8 text-sm focus:bg-muted data-[state=checked]:bg-accent data-[state=checked]:font-medium data-[state=checked]:focus:bg-accent"
                        >
                            <Icon className="size-4" />
                            {t(label)}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </>
        );
    }

    return (
        <div className={cn('flex flex-wrap gap-2', className)} {...props}>
            {options.map(({ value, label, icon: Icon }) => (
                <button
                    type="button"
                    key={value}
                    aria-pressed={appearance === value}
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring',
                        appearance === value ? 'bg-accent text-accent-foreground' : 'hover:bg-accent',
                    )}
                >
                    <Icon className="size-4" />
                    {t(label)}
                </button>
            ))}
        </div>
    );
}
