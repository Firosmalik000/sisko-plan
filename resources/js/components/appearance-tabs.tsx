import { Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'inline-flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-emerald-50 px-4 py-3 text-emerald-900',
                className,
            )}
            {...props}
        >
            <Sun className="size-4" />
            <span className="text-sm font-semibold">Tema terang aktif</span>
        </div>
    );
}
