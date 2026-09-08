import { router, usePage } from '@inertiajs/react';
import { Globe2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { AppLocale, MarketCode } from '@/lib/currency';
import { setActiveLocale } from '@/lib/i18n';

type LocaleOption = { code: AppLocale; label: string };

const fallbackLocales = (market: MarketCode): LocaleOption[] =>
    market === 'ms'
        ? [
              { code: 'ms', label: 'Bahasa Melayu' },
              { code: 'en', label: 'English' },
          ]
        : market === 'vi'
          ? [
                { code: 'vi', label: 'Tiếng Việt' },
                { code: 'en', label: 'English' },
            ]
          : [
                { code: 'id', label: 'Bahasa Indonesia' },
                { code: 'en', label: 'English' },
            ];

const isLocaleOption = (value: unknown): value is LocaleOption =>
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    (value.code === 'en' || value.code === 'id' || value.code === 'ms' || value.code === 'vi') &&
    'label' in value &&
    typeof value.label === 'string';

export default function LanguageSwitcher() {
    const pageProps = usePage().props;
    const rawLocale = pageProps.locale as unknown;
    const locale: AppLocale = rawLocale === 'en' || rawLocale === 'ms' || rawLocale === 'vi' ? rawLocale : 'id';
    const rawMarket = pageProps.market as unknown;
    const market: MarketCode = rawMarket === 'ms' || rawMarket === 'vi' ? rawMarket : 'id';
    const configuredLocales = Array.isArray(pageProps.locales) ? pageProps.locales.filter(isLocaleOption) : [];
    const locales = configuredLocales.length > 0 ? configuredLocales : fallbackLocales(market);
    const context = locales.some((language) => language.code === 'en') ? 'customer' : 'market';
    const [isChanging, setIsChanging] = useState(false);

    const changeLocale = (nextLocale: string) => {
        if (nextLocale === locale || isChanging) {
            return;
        }

        const previousLocale = locale;
        setActiveLocale(nextLocale as AppLocale);
        setIsChanging(true);
        router.post(
            '/locale',
            { locale: nextLocale, context },
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

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isChanging}
                    aria-label="Pilih bahasa"
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
                        onClick={() => changeLocale(language.code)}
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
