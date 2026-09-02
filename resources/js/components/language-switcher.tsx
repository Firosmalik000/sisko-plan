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
                >
                    <Globe2 className="size-4" />
                    {locale.toUpperCase()}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {locales.map((language) => (
                    <DropdownMenuItem
                        key={language.code}
                        onClick={() => changeLocale(language.code)}
                        className={
                            language.code === locale ? 'font-bold' : undefined
                        }
                    >
                        {language.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
