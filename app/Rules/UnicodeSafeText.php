<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Rule teks aman Unicode untuk validasi profil/pengaturan (Req 21.3, Property 31).
 *
 * Menerima huruf/mark Unicode lokal (Latin, CJK, Arab, dan skrip lain termasuk
 * emoji berbasis huruf), spasi, tanda baca umum; MENOLAK karakter kontrol
 * (C0/C1: \x00–\x1F kecuali newline/tab bila `$allowNewlines`, plus \x7F) yang
 * lazim dipakai untuk injeksi/pemalsuan log. Fungsi validasi murni sehingga
 * dapat diuji langsung lewat {@see self::passesValue()}.
 */
class UnicodeSafeText implements ValidationRule
{
    public function __construct(private bool $allowNewlines = false) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! self::passesValue($value, $this->allowNewlines)) {
            $fail(__('Karakter tidak diperbolehkan pada :attribute.', ['attribute' => $attribute]));
        }
    }

    /**
     * Logika murni: true bila teks tidak memuat karakter kontrol/injeksi.
     *
     * Menolak byte kontrol C0 `\x00-\x1F` dan DEL/C1 `\x7F-\x9F`. Bila
     * `$allowNewlines`, izinkan `\n`, `\r`, dan tab `\t` (untuk header/footer
     * struk multi-baris). Harus valid UTF-8.
     */
    public static function passesValue(string $value, bool $allowNewlines = false): bool
    {
        if (! mb_check_encoding($value, 'UTF-8')) {
            return false;
        }

        $pattern = $allowNewlines
            ? '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/u'
            : '/[\x00-\x1F\x7F-\x9F]/u';

        return preg_match($pattern, $value) === 0;
    }
}
