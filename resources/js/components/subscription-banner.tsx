import { Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

type SubscriptionState = {
    can_write: boolean;
    reason: string | null;
    status: string;
    plan_name: string;
};

export function SubscriptionBanner() {
    const { subscriptionState } = usePage<{
        subscriptionState: SubscriptionState | null;
    }>().props;

    if (subscriptionState === null || subscriptionState.can_write) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 border-b border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                    <strong>Mode hanya-baca.</strong>{' '}
                    {subscriptionState.reason ??
                        'Subscription tidak dapat digunakan untuk perubahan baru.'}
                </p>
            </div>
            <Link
                href="/pricing"
                className="inline-flex shrink-0 items-center gap-1 font-bold underline underline-offset-4"
            >
                Lihat penawaran <ArrowRight className="size-4" />
            </Link>
        </div>
    );
}
