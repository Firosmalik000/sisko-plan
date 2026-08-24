import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Clock3,
    House,
    LockKeyhole,
    RefreshCw,
    SearchX,
    ServerCog,
    ShieldAlert,
    TriangleAlert,
} from 'lucide-react';
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
        title: 'Permintaan tidak dapat diproses',
        description:
            'Data yang dikirim tidak sesuai dengan yang dibutuhkan halaman ini.',
        icon: TriangleAlert,
        primary: 'back',
    },
    401: {
        title: 'Silakan masuk kembali',
        description:
            'Sesi masuk tidak ditemukan atau akses akun perlu dikonfirmasi ulang.',
        icon: LockKeyhole,
        primary: 'login',
    },
    403: {
        title: 'Akses tidak tersedia',
        description:
            'Akun Anda tidak memiliki izin untuk membuka halaman atau menjalankan tindakan ini.',
        icon: ShieldAlert,
        primary: 'home',
    },
    404: {
        title: 'Halaman tidak ditemukan',
        description:
            'Alamat mungkin berubah, sudah tidak digunakan, atau tidak pernah tersedia.',
        icon: SearchX,
        primary: 'back',
    },
    405: {
        title: 'Cara akses tidak didukung',
        description:
            'Halaman menerima jenis permintaan yang berbeda. Kembali lalu coba tindakan semula.',
        icon: TriangleAlert,
        primary: 'back',
    },
    408: {
        title: 'Permintaan terlalu lama',
        description:
            'Koneksi terputus sebelum proses selesai. Periksa jaringan lalu coba kembali.',
        icon: Clock3,
        primary: 'reload',
    },
    409: {
        title: 'Data sedang berubah',
        description:
            'Kondisi data sudah berbeda dari saat halaman dibuka. Muat ulang sebelum melanjutkan.',
        icon: RefreshCw,
        primary: 'reload',
    },
    410: {
        title: 'Halaman sudah tidak tersedia',
        description:
            'Konten ini telah dipindahkan atau dihapus dan tidak dapat dibuka lagi.',
        icon: SearchX,
        primary: 'home',
    },
    413: {
        title: 'Data yang dikirim terlalu besar',
        description:
            'Kurangi ukuran data atau file, lalu kirim kembali dari halaman sebelumnya.',
        icon: TriangleAlert,
        primary: 'back',
    },
    419: {
        title: 'Sesi Anda telah berakhir',
        description:
            'Halaman terlalu lama terbuka. Muat ulang untuk mendapatkan sesi yang baru.',
        icon: Clock3,
        primary: 'reload',
    },
    422: {
        title: 'Data belum dapat diproses',
        description:
            'Periksa kembali data yang dimasukkan, lalu perbaiki bagian yang belum sesuai.',
        icon: TriangleAlert,
        primary: 'back',
    },
    423: {
        title: 'Data sedang dikunci',
        description:
            'Proses lain sedang menggunakan data ini. Tunggu sebentar lalu coba kembali.',
        icon: LockKeyhole,
        primary: 'reload',
    },
    429: {
        title: 'Terlalu banyak percobaan',
        description:
            'Batas permintaan sementara tercapai. Tunggu beberapa saat sebelum mencoba lagi.',
        icon: Clock3,
        primary: 'reload',
    },
    500: {
        title: 'Terjadi kendala pada sistem',
        description:
            'Permintaan belum dapat diselesaikan. Data error telah diberi ID untuk penelusuran.',
        icon: ServerCog,
        primary: 'reload',
    },
    502: {
        title: 'Layanan penghubung bermasalah',
        description:
            'Salah satu layanan belum memberikan respons yang valid. Coba kembali sebentar lagi.',
        icon: ServerCog,
        primary: 'reload',
    },
    503: {
        title: 'Layanan sedang tidak tersedia',
        description:
            'Sistem sedang dirawat atau menerima beban tinggi. Silakan coba kembali nanti.',
        icon: ServerCog,
        primary: 'reload',
    },
    504: {
        title: 'Respons layanan terlalu lama',
        description:
            'Sistem belum menerima jawaban tepat waktu. Tunggu sebentar lalu coba kembali.',
        icon: Clock3,
        primary: 'reload',
    },
};

export default function ErrorPage({
    status,
    requestId,
    homeUrl,
    loginUrl,
    isAuthenticated,
    isPlatformAdmin,
}: Props) {
    const content = errors[status] ?? fallbackContent(status);
    const Icon = content.icon;
    const homeLabel = isPlatformAdmin
        ? 'Kembali ke portal'
        : isAuthenticated
          ? 'Kembali ke dashboard'
          : 'Kembali ke beranda';

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
                        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                            {content.description}
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <PrimaryAction
                                action={content.primary}
                                homeUrl={homeUrl}
                                homeLabel={homeLabel}
                                loginUrl={loginUrl}
                            />
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
                            ID permintaan:{' '}
                            <code className="rounded bg-[#0b292f]/6 px-1.5 py-1 font-mono text-[#0b292f]">
                                {requestId}
                            </code>
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
                Masuk kembali
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
            <button
                type="button"
                className={className}
                onClick={() => window.location.reload()}
            >
                <RefreshCw className="size-4" />
                Muat ulang halaman
            </button>
        );
    }

    return (
        <button
            type="button"
            className={className}
            onClick={() => window.history.back()}
        >
            <ArrowLeft className="size-4" />
            Kembali
        </button>
    );
}

function ErrorReceipt({ status }: { status: number }) {
    return (
        <aside
            aria-label={`Kode error ${status}`}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-[#0b292f] text-white shadow-2xl shadow-[#0b292f]/20 lg:w-[26rem]"
        >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <span className="text-xs font-black tracking-[0.14em] text-[#e7bd52] uppercase">
                    Status sistem
                </span>
                <span className="size-2 rounded-full bg-[#e7bd52]" />
            </div>
            <div className="px-5 py-7 sm:px-7 sm:py-9">
                <p className="text-[5rem] leading-none font-black tracking-[-0.04em] tabular-nums sm:text-[6rem]">
                    {status}
                </p>
                <div className="mt-8 space-y-3" aria-hidden="true">
                    <span className="block h-px bg-white/15" />
                    <span className="block h-px w-4/5 bg-white/10" />
                    <span className="block h-px w-3/5 bg-white/10" />
                </div>
                <div className="mt-8 flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>SISKO CONTROL</span>
                    <span>Perlu ditangani</span>
                </div>
            </div>
        </aside>
    );
}

function fallbackContent(status: number): ErrorContent {
    return status >= 500
        ? {
              title: 'Layanan belum dapat digunakan',
              description:
                  'Sistem mengalami kendala sementara. Muat ulang atau kembali beberapa saat lagi.',
              icon: ServerCog,
              primary: 'reload',
          }
        : {
              title: 'Permintaan belum dapat diselesaikan',
              description:
                  'Kembali ke halaman sebelumnya atau buka halaman utama untuk melanjutkan.',
              icon: TriangleAlert,
              primary: 'back',
          };
}
