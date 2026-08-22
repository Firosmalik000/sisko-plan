import {
    Camera,
    Images,
    Pause,
    Play,
    Sparkles,
    SwitchCamera,
    X,
    Zap,
    ZapOff,
} from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import { CaptureTray } from './CaptureTray';
import type { ScannerCapture } from './types';

export function CameraViewport({
    videoRef,
    captures,
    ready,
    error,
    autoPaused,
    torchAvailable,
    torchOn,
    onClose,
    onCapture,
    onGallery,
    onRemove,
    onFinish,
    onToggleAuto,
    onToggleTorch,
    onManualSearch,
    manualActionLabel,
}: {
    videoRef: RefObject<HTMLVideoElement | null>;
    captures: ScannerCapture[];
    ready: boolean;
    error: string | null;
    autoPaused: boolean;
    torchAvailable: boolean;
    torchOn: boolean;
    onClose: () => void;
    onCapture: () => void;
    onGallery: (event: ChangeEvent<HTMLInputElement>) => void;
    onRemove: (id: string) => void;
    onFinish: () => void;
    onToggleAuto: () => void;
    onToggleTorch: () => void;
    onManualSearch?: () => void;
    manualActionLabel?: string;
}) {
    return (
        <div className="relative flex h-svh w-full flex-col overflow-hidden bg-[#102a25] text-white">
            <video
                ref={videoRef}
                muted
                playsInline
                className="absolute inset-0 size-full object-cover"
                aria-label="Pratinjau kamera"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,28,24,.7)_0%,transparent_25%,transparent_62%,rgba(8,28,24,.9)_100%)]" />

            <header className="relative z-10 flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+.75rem)]">
                <button
                    type="button"
                    onClick={onClose}
                    className="grid size-11 place-items-center rounded-full bg-[#102a25]/75 text-white backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    aria-label="Tutup kamera"
                >
                    <X className="size-5" />
                </button>
                <div className="rounded-xl bg-[#102a25]/75 px-3 py-2 text-center backdrop-blur-sm">
                    <p className="text-sm font-black">Arahkan, lalu foto</p>
                    <p className="text-[11px] text-[#d5e4df]">
                        Satu atau banyak produk—kamu yang tentukan
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onToggleTorch}
                    disabled={!torchAvailable}
                    className="grid size-11 place-items-center rounded-full bg-[#102a25]/75 text-white backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-35"
                    aria-label={torchOn ? 'Matikan lampu' : 'Nyalakan lampu'}
                >
                    {torchOn ? (
                        <Zap className="size-5" />
                    ) : (
                        <ZapOff className="size-5" />
                    )}
                </button>
            </header>

            <div className="relative z-10 flex flex-1 items-center justify-center px-7 py-4">
                {error ? (
                    <div className="max-w-sm rounded-2xl bg-[#fffaf0] p-5 text-center text-[#173c35] shadow-xl">
                        <Camera className="mx-auto size-8 text-[#d66a35]" />
                        <p className="mt-3 text-base font-black">
                            Kamera belum tersedia
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#58736a]">
                            {error}
                        </p>
                        {onManualSearch && (
                            <button
                                type="button"
                                onClick={onManualSearch}
                                className="mt-4 min-h-11 w-full rounded-xl bg-[#173c35] px-4 text-sm font-black text-white"
                            >
                                {manualActionLabel ?? 'Cari manual'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div
                        className="relative aspect-[4/3] w-full max-w-xl rounded-[1.75rem] border border-white/70 shadow-[0_16px_50px_-22px_rgba(0,0,0,.8)]"
                        aria-hidden="true"
                    >
                        <span className="absolute -top-px -left-px size-14 rounded-tl-[1.75rem] border-t-4 border-l-4 border-[#f0a35d]" />
                        <span className="absolute -right-px -bottom-px size-14 rounded-br-[1.75rem] border-r-4 border-b-4 border-[#f0a35d]" />
                        {!ready && (
                            <div className="grid size-full place-items-center">
                                <SwitchCamera className="size-7 animate-pulse" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <CaptureTray captures={captures} onRemove={onRemove} />
                <div className="flex items-center justify-between gap-4 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                    <label className="grid size-12 cursor-pointer place-items-center rounded-2xl bg-white/12 text-white focus-within:ring-2 focus-within:ring-white">
                        <Images className="size-5" />
                        <span className="sr-only">Pilih dari galeri</span>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={onGallery}
                            className="sr-only"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={onCapture}
                        disabled={!ready}
                        className="grid size-[4.5rem] place-items-center rounded-full border-[5px] border-white bg-[#e2793c] shadow-[0_12px_30px_-12px_rgba(226,121,60,.8)] transition active:scale-95 disabled:opacity-40 motion-reduce:transition-none"
                        aria-label="Ambil foto"
                    >
                        <span className="size-10 rounded-full border-2 border-white/80" />
                    </button>
                    <button
                        type="button"
                        onClick={onFinish}
                        disabled={captures.length === 0}
                        className="min-h-12 min-w-24 rounded-2xl bg-white px-3 text-sm font-black text-[#173c35] disabled:opacity-40"
                    >
                        Lanjutkan · {captures.length}
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onToggleAuto}
                    className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.4rem)] left-1/2 flex min-h-9 -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#102a25]/75 px-3 text-[11px] font-bold text-[#e2eee9] backdrop-blur-sm"
                >
                    {autoPaused ? (
                        <Play className="size-3.5" />
                    ) : (
                        <Pause className="size-3.5" />
                    )}
                    <Sparkles className="size-3.5 text-[#f0a35d]" />
                    Auto {autoPaused ? 'dijeda' : 'aktif'}
                </button>
            </div>
        </div>
    );
}
