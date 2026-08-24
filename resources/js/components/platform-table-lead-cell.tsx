import type { Method } from '@inertiajs/core';
import { Link } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type PlatformRowAction = {
    label: string;
    icon: LucideIcon;
    href?: string;
    method?: Method;
    data?: Record<string, string | number | boolean>;
    destructive?: boolean;
    onSelect?: () => void;
};

export function PlatformTableLeadHeader({
    withActions = true,
}: {
    withActions?: boolean;
}) {
    return (
        <th className="w-24 px-4 py-3.5">
            <span>No.</span>
            {withActions && <span className="sr-only"> dan tindakan</span>}
        </th>
    );
}

export function PlatformTableLeadCell({
    index,
    label,
    actions = [],
    overlays,
}: {
    index: number;
    label: string;
    actions?: PlatformRowAction[];
    overlays?: ReactNode;
}) {
    return (
        <td className="w-24 px-4 py-3.5">
            <div className="flex items-center gap-2">
                <span className="min-w-6 text-center text-xs font-bold text-slate-500 tabular-nums">
                    {index}
                </span>
                {actions.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#0b292f] transition hover:border-[#0b292f]/25 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a681e]"
                                aria-label={`Buka tindakan untuk ${label}`}
                            >
                                <MoreHorizontal className="size-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="start"
                            sideOffset={6}
                            className="w-52 border-slate-200 bg-white p-1.5 shadow-xl"
                        >
                            {actions.map((action) => {
                                const Icon = action.icon;
                                const className = action.destructive
                                    ? 'text-rose-700 focus:bg-rose-50 focus:text-rose-800'
                                    : 'text-slate-700 focus:bg-slate-100 focus:text-[#0b292f]';

                                return action.href ? (
                                    <DropdownMenuItem
                                        key={action.label}
                                        asChild
                                        className={className}
                                    >
                                        <Link
                                            href={action.href}
                                            method={action.method ?? 'get'}
                                            data={action.data}
                                            as="button"
                                            preserveScroll
                                            className="w-full cursor-pointer"
                                        >
                                            <Icon className="size-4" />
                                            {action.label}
                                        </Link>
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        key={action.label}
                                        className={`cursor-pointer ${className}`}
                                        onSelect={action.onSelect}
                                    >
                                        <Icon className="size-4" />
                                        {action.label}
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            {overlays}
        </td>
    );
}

export function paginatedRowNumber(
    currentPage: number,
    perPage: number,
    index: number,
) {
    return (currentPage - 1) * perPage + index + 1;
}
