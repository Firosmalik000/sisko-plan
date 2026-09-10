import { usePage } from '@inertiajs/react';
import { Building2, ExternalLink, MessageCircle, ScanLine, Users } from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n';

export type SubscriptionLimitKind = 'store' | 'staff' | 'scan';

type Locale = 'id' | 'en' | 'ms' | 'vi';

type LocalizedCopy = {
    title: string;
    description: string;
    request: string;
    action: string;
    cancel: string;
    unavailable: string;
};

const copy: Record<SubscriptionLimitKind, LocalizedCopy> = {
    store: {
        title: 'Kapasitas toko sudah penuh',
        description: 'Hubungi admin untuk menambah kapasitas toko pada akun Anda.',
        request: 'saya ingin mengajukan penambahan kapasitas toko untuk akun saya',
        action: 'Hubungi admin via WhatsApp',
        cancel: 'Nanti saja',
        unavailable: 'Nomor WhatsApp dukungan belum tersedia. Silakan hubungi admin platform.',
    },
    staff: {
        title: 'Kapasitas staf sudah penuh',
        description: 'Hubungi admin untuk menambah kapasitas staf pada akun Anda.',
        request: 'saya ingin mengajukan penambahan kapasitas staf untuk akun saya',
        action: 'Hubungi admin via WhatsApp',
        cancel: 'Nanti saja',
        unavailable: 'Nomor WhatsApp dukungan belum tersedia. Silakan hubungi admin platform.',
    },
    scan: {
        title: 'Kuota scan sudah habis',
        description: 'Hubungi admin untuk menambah kuota scan pada akun Anda.',
        request: 'saya ingin mengajukan penambahan kuota scan untuk akun saya',
        action: 'Hubungi admin via WhatsApp',
        cancel: 'Nanti saja',
        unavailable: 'Nomor WhatsApp dukungan belum tersedia. Silakan hubungi admin platform.',
    },
};

const icons: Record<SubscriptionLimitKind, ComponentType<{ className?: string }>> = {
    store: Building2,
    staff: Users,
    scan: ScanLine,
};

export function SubscriptionLimitContactDialog({
    kind,
    open,
    onOpenChange,
}: {
    kind: SubscriptionLimitKind;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { branding } = usePage().props;
    const { locale, t } = useTranslation();
    const content = copy[kind];
    const Icon = icons[kind];
    const phone = normalizeWhatsAppNumber(branding.support_phone);
    const message = createMessage(locale, branding.brand_name, t(content.request));
    const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-1rem)] gap-0 overflow-hidden rounded-2xl border-[#ead8d1] bg-[#fffdfc] p-0 shadow-[0_24px_70px_-30px_rgba(74,36,26,.45)] sm:max-w-md">
                <DialogHeader className="border-b border-[#ead8d1] px-5 py-5 pr-12 text-left">
                    <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-[#fff0eb] text-[#d83f22]">
                        <Icon className="size-5" />
                    </span>
                    <DialogTitle className="text-xl font-black tracking-[-0.03em] text-[var(--app-ink)]">{t(content.title)}</DialogTitle>
                    <DialogDescription className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                        {t(content.description)}
                    </DialogDescription>
                </DialogHeader>

                {!whatsappUrl && (
                    <p role="status" className="mx-5 my-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                        {t(content.unavailable)}
                    </p>
                )}

                <DialogFooter className="flex-col-reverse gap-2 border-t border-[#ead8d1] bg-[#fffaf7] px-5 py-4 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
                        {t(content.cancel)}
                    </Button>
                    {whatsappUrl && (
                        <Button asChild className="h-11 bg-[#128c4b] text-white hover:bg-[#0e773f]">
                            <a href={whatsappUrl} target="_blank" rel="noreferrer">
                                <MessageCircle className="size-4" />
                                {t(content.action)}
                                <ExternalLink className="size-3.5" />
                            </a>
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function normalizeWhatsAppNumber(value: string | null): string | null {
    if (!value) {
        return null;
    }

    let digits = value.replace(/\D/gu, '');

    if (digits.startsWith('00')) {
        digits = digits.slice(2);
    } else if (digits.startsWith('0')) {
        digits = `62${digits.slice(1)}`;
    }

    return /^[1-9]\d{7,14}$/u.test(digits) ? digits : null;
}

function createMessage(locale: Locale, brandName: string, request: string): string {
    if (locale === 'en') {
        return `Hello ${brandName} Admin, ${request}. Please share the available options and the next steps. Thank you.`;
    }

    if (locale === 'ms') {
        return `Salam Pentadbir ${brandName}, ${request}. Mohon maklumat tentang pilihan yang tersedia dan proses seterusnya. Terima kasih.`;
    }

    if (locale === 'vi') {
        return `Xin chào Quản trị viên ${brandName}, ${request}. Vui lòng cho tôi biết các lựa chọn hiện có và hướng dẫn bước tiếp theo. Xin cảm ơn.`;
    }

    return `Halo Admin ${brandName}, ${request}. Mohon informasi mengenai pilihan yang tersedia dan proses selanjutnya. Terima kasih.`;
}
