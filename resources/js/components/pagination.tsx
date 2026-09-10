import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export function Pagination({ links }: { links: PaginationLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <nav aria-label="Navigasi halaman" className="flex flex-wrap items-center justify-center gap-1">
            {links.map((link, index) => {
                const isPrevious = index === 0;
                const isNext = index === links.length - 1;
                const content = isPrevious ? (
                    <>
                        <ChevronLeft className="size-4" />
                        <span className="sr-only sm:not-sr-only">Sebelumnya</span>
                    </>
                ) : isNext ? (
                    <>
                        <span className="sr-only sm:not-sr-only">Berikutnya</span>
                        <ChevronRight className="size-4" />
                    </>
                ) : (
                    link.label
                );
                const className = `inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-3 text-sm transition focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:outline-none ${
                    link.active
                        ? 'bg-[var(--app-primary)] text-[var(--app-primary-foreground)] shadow-[0_8px_18px_-12px_var(--app-shadow)]'
                        : 'border border-slate-900/10 bg-white/60 text-slate-700 hover:bg-white'
                }`;

                if (link.url === null) {
                    return (
                        <span key={`${link.label}-${index}`} className={`${className} cursor-not-allowed opacity-40`} aria-disabled="true">
                            {content}
                        </span>
                    );
                }

                return (
                    <Link
                        key={`${link.label}-${index}`}
                        href={link.url}
                        preserveScroll
                        className={className}
                        aria-current={link.active ? 'page' : undefined}
                    >
                        {content}
                    </Link>
                );
            })}
        </nav>
    );
}
