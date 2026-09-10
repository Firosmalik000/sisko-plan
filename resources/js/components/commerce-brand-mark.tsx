import { Landmark, Music2, QrCode, ShoppingBag, Store } from 'lucide-react';

const brandStyles: Record<string, string> = {
    shopee: 'bg-[#ee4d2d] text-white',
    tokopedia: 'bg-[#03ac0e] text-white',
    blibli: 'bg-[#0095da] text-white',
    lazada: 'bg-[#5f259f] text-white',
    tiktok_shop: 'bg-[#161823] text-white',
    qris: 'bg-[#b21f2d] text-white',
    duitnow_qr: 'bg-[#e91e63] text-white',
    promptpay_qr: 'bg-[#123f6d] text-white',
    vietqr: 'bg-[#005baa] text-white',
    touch_n_go: 'bg-[#005baa] text-white',
    cash: 'bg-[#e3f3ed] text-[#176b57]',
    other: 'bg-slate-100 text-slate-600',
};

const brandText: Record<string, string> = {
    shopee: 'S',
    blibli: 'B',
    lazada: 'L',
    duitnow_qr: 'DN',
    promptpay_qr: 'PP',
    vietqr: 'VQ',
    touch_n_go: 'TNG',
};

export function CommerceBrandMark({ code, className = '' }: { code: string | null | undefined; className?: string }) {
    const resolvedCode = code ?? 'other';
    const style = brandStyles[resolvedCode] ?? brandStyles.other;
    const text = brandText[resolvedCode];
    const Icon =
        resolvedCode === 'tokopedia'
            ? Store
            : resolvedCode === 'tiktok_shop'
              ? Music2
              : resolvedCode === 'qris'
                ? QrCode
                : resolvedCode === 'cash'
                  ? Landmark
                  : resolvedCode === 'other'
                    ? Store
                    : ShoppingBag;

    return (
        <span
            aria-hidden="true"
            className={`inline-grid size-7 shrink-0 place-items-center rounded-lg text-[9px] leading-none font-black tracking-[-0.02em] ${style} ${className}`}
        >
            {text ?? <Icon className="size-3.5" />}
        </span>
    );
}
