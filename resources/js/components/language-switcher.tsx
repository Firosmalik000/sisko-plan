import { router, usePage } from '@inertiajs/react';
import { Globe2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type LocaleCode = 'id' | 'ms';
type LocaleOption = { code: LocaleCode; label: string };

const fallbackLocales: LocaleOption[] = [
    { code: 'id', label: 'Bahasa Indonesia' },
    { code: 'ms', label: 'Bahasa Melayu' },
];

const isLocaleOption = (value: unknown): value is LocaleOption =>
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    (value.code === 'id' || value.code === 'ms') &&
    'label' in value &&
    typeof value.label === 'string';

export default function LanguageSwitcher() {
    const pageProps = usePage().props;
    const locale: LocaleCode = pageProps.locale === 'ms' ? 'ms' : 'id';
    const configuredLocales = Array.isArray(pageProps.locales)
        ? pageProps.locales.filter(isLocaleOption)
        : [];
    const locales =
        configuredLocales.length > 0 ? configuredLocales : fallbackLocales;
    const [isChanging, setIsChanging] = useState(false);

    const changeLocale = (nextLocale: string) => {
        if (nextLocale === locale || isChanging) {
            return;
        }

        setIsChanging(true);
        router.post(
            '/locale',
            { locale: nextLocale },
            {
                preserveScroll: true,
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
            <DropdownMenuContent
                align="end"
                className="border-[#ee4d2d]/15 bg-white text-[#3b211b]"
            >
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
