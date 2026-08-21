import { Link, usePage } from '@inertiajs/react';
import { ArrowLeftRight, BadgeAlert } from 'lucide-react';
import type { Auth, Impersonation } from '@/types';

type PageProps = {
    auth: Auth;
    impersonation: Impersonation | null;
};

export function ImpersonationBanner() {
    const { auth, impersonation } = usePage<PageProps>().props;

    if (impersonation === null) {
        return null;
    }

    return (
        <div className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-amber-950 shadow-sm sm:px-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <BadgeAlert className="mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold">
                            Impersonasi aktif
                        </p>
                        <p className="truncate text-sm text-amber-900/80">
                            Sedang masuk sebagai {auth.user?.name ?? 'akun ini'}
                        </p>
                        <p className="truncate text-xs text-amber-900/70">
                            Dari {impersonation.admin_name} ·{' '}
                            {impersonation.admin_email}
                        </p>
                    </div>
                </div>
                <Link
                    href="/impersonation/leave"
                    method="post"
                    as="button"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-amber-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-900"
                >
                    Kembali ke Super Admin
                    <ArrowLeftRight className="size-4" />
                </Link>
            </div>
        </div>
    );
}
