import { useSyncExternalStore } from 'react';
import { englishCatalog } from '@/lang/en';
import { englishLexicon } from '@/lang/en/lexicon';
import { indonesianCatalog } from '@/lang/id';
import { malayCatalog } from '@/lang/ms';
import { malayLexicon } from '@/lang/ms/lexicon';
import { vietnameseCatalog } from '@/lang/vi';
import type { AppLocale } from '@/lib/currency';

let activeLocale: AppLocale = 'id';
const localeListeners = new Set<() => void>();

function subscribeLocale(listener: () => void): () => void {
    localeListeners.add(listener);

    return () => localeListeners.delete(listener);
}

function getLocaleSnapshot(): AppLocale {
    return activeLocale;
}

function preserveCase(source: string, translated: string): string {
    if (source === source.toUpperCase()) {
        return translated.toUpperCase();
    }

    if (source[0] === source[0]?.toUpperCase()) {
        return translated.charAt(0).toUpperCase() + translated.slice(1);
    }

    return translated;
}

function translateMalayLiteral(text: string): string {
    let result = text;

    for (const [source, translated] of malayLexicon) {
        const pattern = new RegExp(`(?<![\\p{L}])${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'giu');
        result = result.replace(pattern, (match) => preserveCase(match, translated));
    }

    return result;
}

function translateEnglishLiteral(text: string): string {
    let result = text;

    for (const [source, translated] of englishLexicon) {
        const pattern = new RegExp(`(?<![\\p{L}])${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'giu');
        result = result.replace(pattern, (match) => preserveCase(match, translated));
    }

    return result;
}

export function setActiveLocale(locale: AppLocale): void {
    if (activeLocale === locale) {
        return;
    }

    activeLocale = locale;
    localeListeners.forEach((listener) => listener());
}

export function translate(text: string, locale: AppLocale = activeLocale): string {
    const source = text.trim();
    const lookup = source.replace(/\s+/gu, ' ');

    const passkeyRemoval = lookup.match(
        /^Are you sure you want to remove the "(.+)" passkey\? You will no longer be able to use it to sign in\.$/u,
    );

    if (passkeyRemoval) {
        const message =
            locale === 'ms'
                ? `Adakah anda pasti mahu memadam passkey "${passkeyRemoval[1]}"? Anda tidak lagi boleh menggunakannya untuk log masuk.`
                : locale === 'en'
                  ? lookup
                  : locale === 'vi'
                    ? `Bạn có chắc muốn xóa passkey "${passkeyRemoval[1]}" không? Bạn sẽ không thể dùng passkey này để đăng nhập nữa.`
                    : `Yakin ingin menghapus passkey "${passkeyRemoval[1]}"? Passkey ini tidak dapat digunakan lagi untuk masuk.`;

        return text.replace(source, message);
    }

    const translated =
        locale === 'ms'
            ? malayCatalog[lookup]
            : locale === 'en'
              ? englishCatalog[lookup]
              : locale === 'vi'
                ? vietnameseCatalog[lookup]
                : indonesianCatalog[lookup];

    if (translated !== undefined) {
        return text.replace(source, translated);
    }

    const photoLabel = lookup.match(/^(Foto|Scan barcode) (.+)$/u);

    if (photoLabel && locale !== 'id') {
        const prefix =
            locale === 'en'
                ? photoLabel[1] === 'Foto'
                    ? 'Photo:'
                    : 'Scan barcode:'
                : locale === 'ms'
                  ? photoLabel[1] === 'Foto'
                      ? 'Gambar:'
                      : 'Imbas kod bar:'
                  : photoLabel[1] === 'Foto'
                    ? 'Ảnh:'
                    : 'Quét mã vạch:';

        return text.replace(source, `${prefix} ${photoLabel[2]}`);
    }

    if (locale === 'vi') {
        const unreadNotifications = lookup.match(/^(\d+) notifikasi belum dibaca$/u);

        if (unreadNotifications) {
            return text.replace(source, `${unreadNotifications[1]} thông báo chưa đọc`);
        }

        const dynamicPatterns: Array<[RegExp, string]> = [
            [/^Alur utama (.+)$/u, 'Quy trình chính $1'],
            [/^Perbandingan (.+) dan pencatatan manual$/u, 'So sánh $1 với cách ghi chép thủ công'],
            [/^(.+), beranda$/u, '$1, trang chủ'],
            [/^(\d+) foto diambil$/u, 'Đã chụp $1 ảnh'],
            [/^Buka tindakan untuk (.+)$/u, 'Mở thao tác cho $1'],
            [/^Catat pembayaran (.+)$/u, 'Ghi nhận thanh toán cho $1'],
            [/^Edit subscription (.+)$/u, 'Chỉnh sửa đăng ký của $1'],
            [/^Hapus Produk (.+) dari antrean$/u, 'Xóa sản phẩm $1 khỏi hàng chờ'],
            [/^Kapasitas (.+)$/u, 'Dung lượng $1'],
            [/^Hapus (.+)$/u, 'Xóa $1'],
            [/^Kurangi (.+)$/u, 'Giảm $1'],
            [/^Jumlah (.+)$/u, 'Số lượng $1'],
            [/^Tambah (.+)$/u, 'Thêm $1'],
            [/^Edit (.+)$/u, 'Chỉnh sửa $1'],
            [/^Kode error (.+)$/u, 'Mã lỗi $1'],
            [/^Hasil stock opname (.+)$/u, 'Kết quả kiểm kê tồn kho $1'],
        ];

        for (const [pattern, replacement] of dynamicPatterns) {
            if (pattern.test(lookup)) {
                return text.replace(source, lookup.replace(pattern, replacement));
            }
        }

        return text;
    }

    if (locale === 'ms') {
        const dynamicPatterns: Array<[RegExp, string]> = [
            [/^Alur utama (.+)$/u, 'Aliran utama $1'],
            [/^Perbandingan (.+) dan pencatatan manual$/u, 'Perbandingan $1 dan rekod manual'],
            [/^(.+), beranda$/u, '$1, laman utama'],
            [/^(\d+) foto diambil$/u, '$1 gambar diambil'],
            [/^Buka tindakan untuk (.+)$/u, 'Buka tindakan untuk $1'],
            [/^Catat pembayaran (.+)$/u, 'Rekod pembayaran $1'],
            [/^Edit subscription (.+)$/u, 'Edit langganan $1'],
            [/^Hapus Produk (.+) dari antrean$/u, 'Padam Produk $1 daripada baris gilir'],
            [/^Kapasitas (.+)$/u, 'Kapasiti $1'],
            [/^Hapus (.+)$/u, 'Padam $1'],
            [/^Kurangi (.+)$/u, 'Kurangkan $1'],
            [/^Jumlah (.+)$/u, 'Kuantiti $1'],
            [/^Tambah (.+)$/u, 'Tambah $1'],
            [/^Edit (.+)$/u, 'Edit $1'],
            [/^Kode error (.+)$/u, 'Kod ralat $1'],
            [/^Hasil stock opname (.+)$/u, 'Hasil kiraan stok $1'],
        ];

        for (const [pattern, replacement] of dynamicPatterns) {
            if (pattern.test(lookup)) {
                return text.replace(source, lookup.replace(pattern, replacement));
            }
        }

        return translateMalayLiteral(text);
    }

    if (locale === 'en') {
        const dynamicPatterns: Array<[RegExp, string]> = [
            [/^Alur utama (.+)$/u, 'Main flow $1'],
            [/^Perbandingan (.+) dan pencatatan manual$/u, '$1 and manual recording comparison'],
            [/^(.+), beranda$/u, '$1, home'],
            [/^(\d+) foto diambil$/u, '$1 photos captured'],
            [/^Buka tindakan untuk (.+)$/u, 'Open actions for $1'],
            [/^Catat pembayaran (.+)$/u, 'Record $1 payment'],
            [/^Edit subscription (.+)$/u, 'Edit $1 subscription'],
            [/^Hapus Produk (.+) dari antrean$/u, 'Remove Product $1 from the queue'],
            [/^Kapasitas (.+)$/u, '$1 capacity'],
            [/^Hapus (.+)$/u, 'Delete $1'],
            [/^Kurangi (.+)$/u, 'Decrease $1'],
            [/^Jumlah (.+)$/u, '$1 quantity'],
            [/^Tambah (.+)$/u, 'Add $1'],
            [/^Edit (.+)$/u, 'Edit $1'],
            [/^Kode error (.+)$/u, 'Error code $1'],
            [/^Hasil stock opname (.+)$/u, 'Stock count result $1'],
        ];

        for (const [pattern, replacement] of dynamicPatterns) {
            if (pattern.test(lookup)) {
                return text.replace(source, lookup.replace(pattern, replacement));
            }
        }

        return translateEnglishLiteral(text);
    }

    return text;
}

export function useTranslation() {
    const currentLocale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getLocaleSnapshot);

    return {
        locale: currentLocale,
        t: (text: string) => translate(text, currentLocale),
    };
}
