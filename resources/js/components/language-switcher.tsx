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

export default function LanguageSwitcher() {
    const { locale, locales } = usePage().props;
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
