import { AlertCircle, Check, LoaderCircle, X } from 'lucide-react';
import type { ScannerCapture } from './types';

export function CaptureTray({
    captures,
    onRemove,
}: {
    captures: ScannerCapture[];
    onRemove: (id: string) => void;
}) {
    const visibleCaptures = captures.filter(
        (capture) =>
            capture.results.length > 0 || capture.status !== 'recognized',
    );

    if (visibleCaptures.length === 0) {
        return null;
    }

    return (
        <div
            className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-3"
            aria-label={`${visibleCaptures.length} foto diambil`}
        >
            {visibleCaptures.map((capture, index) => (
                <div
                    key={capture.id}
                    className={`relative size-16 shrink-0 overflow-hidden rounded-xl bg-white/10 ring-2 ${capture.status === 'recognized' && capture.results.some((result) => result.match !== null) ? 'ring-[#82d4a7]' : capture.status === 'failed' || capture.status === 'recognized' ? 'ring-[#f0a35d]' : 'ring-white/20'}`}
                >
                    {capture.previewUrl ? (
                        <img
                            src={capture.previewUrl}
                            alt={`Foto ${index + 1}`}
                            className="size-full object-cover"
                        />
                    ) : (
                        <div className="size-full bg-[#274d44]" />
                    )}
                    <span className="absolute bottom-1 left-1 grid size-5 place-items-center rounded-md bg-[#102a25]/85 text-[10px] font-black text-white">
                        {capture.status === 'recognizing' ? (
                            <LoaderCircle className="size-3 animate-spin" />
                        ) : capture.status === 'recognized' &&
                          capture.results.some(
                              (result) => result.match !== null,
                          ) ? (
                            <Check className="size-3" />
                        ) : capture.status === 'failed' ||
                          capture.status === 'recognized' ? (
                            <AlertCircle className="size-3" />
                        ) : (
                            index + 1
                        )}
                    </span>
                    {capture.results[0]?.quantity &&
                        capture.results[0].quantity > 1 && (
                            <span className="absolute right-1 bottom-1 rounded-md bg-[#e2793c] px-1.5 py-0.5 text-[10px] font-black text-white">
                                x{capture.results[0].quantity}
                            </span>
                        )}
                    <button
                        type="button"
                        onClick={() => onRemove(capture.id)}
                        className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-[#102a25]/80 text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                        aria-label={`Hapus foto ${index + 1}`}
                    >
                        <X className="size-3.5" />
                    </button>
                    <span className="sr-only">
                        {capture.status === 'recognizing'
                            ? 'sedang dikenali'
                            : capture.status === 'recognized' &&
                                capture.results.some(
                                    (result) => result.match !== null,
                                )
                              ? 'produk berhasil dikenali'
                              : capture.status === 'failed' ||
                                  capture.status === 'recognized'
                                ? 'gagal dikenali'
                                : 'menunggu diproses'}
                    </span>
                </div>
            ))}
        </div>
    );
}
