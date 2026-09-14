import { router, usePage } from '@inertiajs/react';
import { Globe2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { loadLocaleCatalog, setActiveLocale, useTranslation } from '@/lib/i18n';
import { appLocaleOptions, isAppLocale } from '@/lib/locales';
import type { AppLocaleOption } from '@/lib/locales';

const isLocaleOption = (value: unknown): value is AppLocaleOption =>
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    isAppLocale(value.code) &&
    'label' in value &&
    typeof value.label === 'string';

export default function LanguageSwitcher({ variant = 'button' }: { variant?: 'button' | 'settings' }) {
    const pageProps = usePage().props;
    const { locale, t } = useTranslation();
    const configuredLocales = Array.isArray(pageProps.locales) ? pageProps.locales.filter(isLocaleOption) : [];
    const locales = configuredLocales.length > 0 ? configuredLocales : appLocaleOptions;
    const [isChanging, setIsChanging] = useState(false);

    const changeLocale = async (nextLocale: string) => {
        if (!isAppLocale(nextLocale) || nextLocale === locale || isChanging) {
            return;
        }

        setIsChanging(true);

        try {
            await loadLocaleCatalog(nextLocale);
        } catch {
            setIsChanging(false);

            return;
        }

        const previousLocale = locale;
        setActiveLocale(nextLocale);
        router.post(
            '/locale',
            { locale: nextLocale },
            {
                preserveState: false,
                preserveScroll: true,
                onError: () => setActiveLocale(previousLocale),
                onCancel: () => setActiveLocale(previousLocale),
                onFinish: () => setIsChanging(false),
            },
        );
    };

    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    if (variant === 'settings') {
        return (
            <>
                <DropdownMenuLabel className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <Globe2 className="size-4" />
                    {t('Language')}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={locale} onValueChange={(value) => void changeLocale(value)} aria-label={t('Language')}>
                    {locales.map((language) => (
                        <DropdownMenuRadioItem
                            key={language.code}
                            value={language.code}
                            disabled={isChanging}
                            onSelect={(event) => event.preventDefault()}
                            className="min-h-11 rounded-xl pr-3 pl-8 text-sm focus:bg-muted data-[state=checked]:bg-accent data-[state=checked]:font-medium data-[state=checked]:focus:bg-accent"
                        >
                            {language.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isChanging}
                    aria-label={t('Select language')}
                    className="border-[#ee4d2d]/20 bg-white font-black text-[#b83219] shadow-sm hover:border-[#ee4d2d]/35 hover:bg-[#fff0eb] hover:text-[#b83219] data-[state=open]:border-[#ee4d2d]/35 data-[state=open]:bg-[#fff0eb] data-[state=open]:text-[#b83219]"
                >
                    <Globe2 className="size-4" />
                    <span>{locale.toUpperCase()}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-[#ee4d2d]/15 bg-white text-[#3b211b]">
                {locales.map((language) => (
                    <DropdownMenuItem
                        key={language.code}
                        onClick={() => void changeLocale(language.code)}
                        className={
                            language.code === locale
                                ? 'bg-[#fff0eb] font-bold text-[#b83219] focus:bg-[#ffe2d9] focus:text-[#b83219]'
                                : 'focus:bg-[#fff0eb] focus:text-[#b83219]'
                        }
                    >
                        {language.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
