import { Link } from '@inertiajs/react';
import type { MouseEventHandler, ReactNode } from 'react';
import { destinationKind } from '@/lib/promotions';

export function PromotionLink({
    destination,
    children,
    className,
    onClick,
}: {
    destination: string | null;
    children: ReactNode;
    className?: string;
    onClick?: MouseEventHandler;
}) {
    const kind = destinationKind(destination);

    if (kind === 'internal' && destination) {
        return (
            <Link href={destination} className={className} onClick={onClick}>
                {children}
            </Link>
        );
    }

    if (kind === 'external' && destination) {
        return (
            <a href={destination} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
                {children}
            </a>
        );
    }

    return <div className={className}>{children}</div>;
}
