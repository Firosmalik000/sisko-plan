import { AlertCircle, Check, LoaderCircle, X } from 'lucide-react';
import type { ScannerCapture } from './types';

export function CaptureTray({
    captures,
    onRemove,
}: {
    captures: ScannerCapture[];
    onRemove: (id: string) => void;
}) {
    if (captures.length === 0) {
        return null;
    }

    return (
        <div
            className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-3"
            aria-label={`${captures.length} foto diambil`}
        >
            {captures.map((capture, index) => (
                <div
                    key={capture.id}
                    className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20"
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
                        ) : capture.status === 'recognized' ? (
                            <Check className="size-3" />
                        ) : capture.status === 'failed' ? (
                            <AlertCircle className="size-3" />
                        ) : (
                            index + 1
                        )}
                    </span>
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
                            : capture.status === 'recognized'
                              ? 'selesai dikenali'
                              : capture.status === 'failed'
                                ? 'gagal dikenali'
                                : 'menunggu diproses'}
                    </span>
                </div>
            ))}
        </div>
    );
}
