import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const pageWidths = {
    standard: 'max-w-[1296px]',
    form: 'max-w-[740px]',
    wide: 'max-w-[1500px]',
} as const;

export type AppPageProps = {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    back?: { href: string; label: string };
    size?: keyof typeof pageWidths;
    children: ReactNode;
    className?: string;
};

export function AppPage({ title, description, actions, back, size = 'standard', children, className }: AppPageProps) {
    return (
        <>
            <Head title={title} />
            <div className={cn('min-h-full bg-background px-3 py-6 min-[375px]:px-4 sm:px-6 sm:py-8 lg:px-7 lg:py-9', className)}>
                <div className={cn('mx-auto flex w-full flex-col gap-5 sm:gap-6', pageWidths[size])}>
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-2.5">
                            {back && (
                                <Link
                                    href={back.href}
                                    aria-label={back.label}
                                    className="grid size-10 shrink-0 place-items-center rounded-xl text-foreground transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                >
                                    <ArrowLeft className="size-5" />
                                </Link>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-2xl leading-tight font-bold tracking-[-0.035em] text-foreground sm:text-[1.625rem]">
                                    {title}
                                </h1>
                                {description && (
                                    <div className="mt-1.5 max-w-[65ch] text-sm leading-6 text-muted-foreground">{description}</div>
                                )}
                            </div>
                        </div>
                        {actions && (
                            <div className="grid w-full auto-cols-fr grid-flow-col items-center gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:justify-end">
                                {actions}
                            </div>
                        )}
                    </header>
                    {children}
                </div>
            </div>
        </>
    );
}
