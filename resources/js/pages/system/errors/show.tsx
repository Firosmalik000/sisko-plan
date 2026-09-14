import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Clock3, House, LockKeyhole, RefreshCw, SearchX, ServerCog, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { ComponentType } from 'react';

type Props = {
    status: number;
    requestId: string;
    homeUrl: string;
    loginUrl: string;
    isAuthenticated: boolean;
    isPlatformAdmin: boolean;
};

type ErrorContent = {
    title: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
    primary: 'back' | 'home' | 'login' | 'reload';
};

const errors: Record<number, ErrorContent> = {
    400: {
        title: 'Request cannot processed',
        description: 'The submitted data does not match what this page requires.',
        icon: TriangleAlert,
        primary: 'back',
    },
    401: {
        title: 'Please sign in again',
        description: 'The login session was not found or account access must be confirmed again.',
        icon: LockKeyhole,
        primary: 'login',
    },
    403: {
        title: 'Access unavailable',
        description: 'Your account does not have permission to open this page or perform this action.',
        icon: ShieldAlert,
        primary: 'home',
    },
    404: {
        title: 'Page not found',
        description: 'The address may have changed, is no longer used, or was never available.',
        icon: SearchX,
        primary: 'back',
    },
    405: {
        title: 'Way access not supported',
        description: 'This page received a different request type. Go back and try the action again.',
        icon: TriangleAlert,
        primary: 'back',
    },
    408: {
        title: 'Request too long',
        description: 'The connection ended before the process finished. Check your network and try again.',
        icon: Clock3,
        primary: 'reload',
    },
    409: {
        title: 'Data is changing',
        description: 'The data has changed since this page was opened. Reload before continuing.',
        icon: RefreshCw,
        primary: 'reload',
    },
    410: {
        title: 'Page already unavailable',
        description: 'This content has been moved or deleted and can no longer be opened.',
        icon: SearchX,
        primary: 'home',
    },
    413: {
        title: 'Submitted data is too large',
        description: 'Reduce the data or file size, then submit it again from the previous page.',
        icon: TriangleAlert,
        primary: 'back',
    },
    419: {
        title: 'Your session has ended',
        description: 'Page too long open. Reload again for get session that new.',
        icon: Clock3,
        primary: 'reload',
    },
    422: {
        title: 'Data could not be processed',
        description: 'Review the entered data and correct any fields that are not valid.',
        icon: TriangleAlert,
        primary: 'back',
    },
    423: {
        title: 'Data is locked',
        description: 'Another process is using this data. Wait a moment and try again.',
        icon: LockKeyhole,
        primary: 'reload',
    },
    429: {
        title: 'Too many attempts',
        description: 'The temporary request limit has been reached. Wait a moment before trying again.',
        icon: Clock3,
        primary: 'reload',
    },
    500: {
        title: 'A system error occurred',
        description: 'The request could not be completed. The error has been assigned an ID for investigation.',
        icon: ServerCog,
        primary: 'reload',
    },
    502: {
        title: 'Service connector unavailable',
        description: 'A connected service returned an invalid response. Try again shortly.',
        icon: ServerCog,
        primary: 'reload',
    },
    503: {
        title: 'Service currently unavailable',
        description: 'System currently under maintenance or receiving load high. Please try back later.',
        icon: ServerCog,
        primary: 'reload',
    },
    504: {
        title: 'Response service too long',
        description: 'The system did not receive a response in time. Wait a moment and try again.',
        icon: Clock3,
        primary: 'reload',
    },
};

export default function ErrorPage({ status, requestId, homeUrl, loginUrl, isAuthenticated, isPlatformAdmin }: Props) {
    const content = errors[status] ?? fallbackContent(status);
    const Icon = content.icon;
    const homeLabel = isPlatformAdmin ? 'Back to portal' : isAuthenticated ? 'Back to dashboard' : 'Back to home';

    return (
        <>
            <Head title={`${status} - ${content.title}`} />
            <div className="relative isolate overflow-hidden">
                <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_82%_12%,rgba(215,169,65,0.18),transparent_42%)]"
                />
                <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-20 lg:px-8 lg:py-16">
                    <section className="max-w-2xl">
                        <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-[#0b292f] text-[#e7bd52] shadow-lg shadow-[#0b292f]/15">
                            <Icon className="size-6" />
                        </div>
                        <h1 className="max-w-xl text-4xl leading-[1.05] font-black tracking-[-0.035em] text-balance text-[#0b292f] sm:text-5xl">
                            {content.title}
                        </h1>
                        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">{content.description}</p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <PrimaryAction action={content.primary} homeUrl={homeUrl} homeLabel={homeLabel} loginUrl={loginUrl} />
                            {content.primary !== 'home' && (
                                <Link
                                    href={homeUrl}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#0b292f]/15 bg-white px-4 text-sm font-bold text-[#0b292f] transition outline-none hover:bg-[#0b292f]/5 focus-visible:ring-2 focus-visible:ring-[#d7a941] focus-visible:ring-offset-2"
                                >
                                    <House className="size-4" />
                                    {homeLabel}
                                </Link>
                            )}
                        </div>

                        <p className="mt-8 text-xs font-semibold text-slate-500">
                            ID request: <code className="rounded bg-[#0b292f]/6 px-1.5 py-1 font-mono text-[#0b292f]">{requestId}</code>
                        </p>
                    </section>

                    <ErrorReceipt status={status} />
                </div>
            </div>
        </>
    );
}

function PrimaryAction({
    action,
    homeUrl,
    homeLabel,
    loginUrl,
}: {
    action: ErrorContent['primary'];
    homeUrl: string;
    homeLabel: string;
    loginUrl: string;
}) {
    const className =
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0b292f] px-4 text-sm font-bold text-white shadow-lg shadow-[#0b292f]/15 outline-none transition hover:bg-[#16434c] focus-visible:ring-2 focus-visible:ring-[#d7a941] focus-visible:ring-offset-2';

    if (action === 'login') {
        return (
            <Link href={loginUrl} className={className}>
                <LockKeyhole className="size-4" />
                Sign in again
            </Link>
        );
    }

    if (action === 'home') {
        return (
            <Link href={homeUrl} className={className}>
                <House className="size-4" />
                {homeLabel}
            </Link>
        );
    }

    if (action === 'reload') {
        return (
            <button type="button" className={className} onClick={() => window.location.reload()}>
                <RefreshCw className="size-4" />
                Reload again page
            </button>
        );
    }

    return (
        <button type="button" className={className} onClick={() => window.history.back()}>
            <ArrowLeft className="size-4" />
            Back
        </button>
    );
}

function ErrorReceipt({ status }: { status: number }) {
    return (
        <aside
            aria-label={`Code error${status}`}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-[#0b292f] text-white shadow-2xl shadow-[#0b292f]/20 lg:w-[26rem]"
        >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <span className="text-xs font-black tracking-[0.14em] text-[#e7bd52] uppercase">Status system</span>
                <span className="size-2 rounded-full bg-[#e7bd52]" />
            </div>
            <div className="px-5 py-7 sm:px-7 sm:py-9">
                <p className="text-[5rem] leading-none font-black tracking-[-0.04em] tabular-nums sm:text-[6rem]">{status}</p>
                <div className="mt-8 space-y-3" aria-hidden="true">
                    <span className="block h-px bg-white/15" />
                    <span className="block h-px w-4/5 bg-white/10" />
                    <span className="block h-px w-3/5 bg-white/10" />
                </div>
                <div className="mt-8 flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>SISKO CONTROL</span>
                    <span>Need handled</span>
                </div>
            </div>
        </aside>
    );
}

function fallbackContent(status: number): ErrorContent {
    return status >= 500
        ? {
              title: 'Service unavailable',
              description: 'System experiencing issues temporarily. Reload again or back a few when again.',
              icon: ServerCog,
              primary: 'reload',
          }
        : {
              title: 'The request could not be completed',
              description: 'Return to the previous page or open the home page to continue.',
              icon: TriangleAlert,
              primary: 'back',
          };
}
