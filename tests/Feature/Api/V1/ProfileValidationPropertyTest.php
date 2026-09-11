<?php

namespace Tests\Feature\Api\V1;

use App\Rules\UnicodeSafeText;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Feature: xsisten, Property 31: Validasi profil mendukung Unicode.
 *
 * For any string huruf/mark Unicode → validasi menerima; untuk karakter
 * kontrol/injeksi → menolak. Dijalankan >=100 iterasi dengan sampel acak
 * lintas skrip (Latin/CJK/Arab/emoji-huruf) vs karakter kontrol \x00-\x1F.
 */
class ProfileValidationPropertyTest extends TestCase
{
    use RefreshDatabase;

    private const ITERATIONS = 150;

    /**
     * Basis huruf/mark Unicode dari berbagai skrip (harus diterima).
     *
     * @var list<string>
     */
    private const LETTERS = [
        'a', 'B', 'z', 'É', 'ñ', 'ü', 'ç', // Latin + diakritik
        '商', '店', '日', '本', '한', '국', // CJK / Hangul
        'م', 'ت', 'ج', 'ر', // Arab
        'Я', 'Ж', 'д', // Cyrillic
        'α', 'β', 'Ω', // Greek
        'ก', 'ทย', // Thai
        ' ', '.', ',', '-', "'", '&', '(', ')', '/', // tanda baca umum
    ];

    protected function setUp(): void
    {
        parent::setUp();
        mt_srand(20260912);
    }

    /**
     * Feature: xsisten, Property 31: string huruf/mark Unicode selalu diterima.
     */
    public function test_property_31_unicode_letters_accepted(): void
    {
        for ($i = 0; $i < self::ITERATIONS; $i++) {
            $text = $this->randomLetterString(mt_rand(1, 40));

            $this->assertTrue(
                UnicodeSafeText::passesValue($text),
                'Teks Unicode valid ditolak: '.bin2hex($text),
            );

            // Konsisten lewat validator Laravel (single-line, tanpa newline).
            $validator = Validator::make(['v' => $text], ['v' => [new UnicodeSafeText]]);
            $this->assertTrue($validator->passes(), "Validator menolak teks valid: {$text}");
        }
    }

    /**
     * Feature: xsisten, Property 31: karakter kontrol/injeksi selalu ditolak.
     */
    public function test_property_31_control_characters_rejected(): void
    {
        for ($i = 0; $i < self::ITERATIONS; $i++) {
            $base = $this->randomLetterString(mt_rand(0, 20));
            $control = $this->randomControlChar();
            $position = mt_rand(0, mb_strlen($base));
            $tainted = mb_substr($base, 0, $position).$control.mb_substr($base, $position);

            $this->assertFalse(
                UnicodeSafeText::passesValue($tainted),
                'Karakter kontrol tidak ditolak: '.bin2hex($tainted),
            );

            $validator = Validator::make(['v' => $tainted], ['v' => [new UnicodeSafeText]]);
            $this->assertTrue($validator->fails(), 'Validator menerima karakter kontrol: '.bin2hex($tainted));
        }
    }

    /**
     * Feature: xsisten, Property 31: newline diizinkan pada mode multi-baris
     * (struk) tetapi kontrol lain tetap ditolak.
     */
    public function test_property_31_newlines_allowed_only_in_multiline_mode(): void
    {
        for ($i = 0; $i < self::ITERATIONS; $i++) {
            $line1 = $this->randomLetterString(mt_rand(1, 15));
            $line2 = $this->randomLetterString(mt_rand(1, 15));
            $multi = $line1."\n".$line2;

            $this->assertTrue(UnicodeSafeText::passesValue($multi, allowNewlines: true));
            $this->assertFalse(UnicodeSafeText::passesValue($multi, allowNewlines: false));

            // NUL byte tetap ditolak meski multi-baris diizinkan.
            $this->assertFalse(UnicodeSafeText::passesValue($line1."\x00".$line2, allowNewlines: true));
        }
    }

    private function randomLetterString(int $length): string
    {
        $result = '';

        for ($i = 0; $i < $length; $i++) {
            $result .= self::LETTERS[array_rand(self::LETTERS)];
        }

        return $result;
    }

    private function randomControlChar(): string
    {
        // C0 controls \x00-\x1F (kecuali dipilih acak) + DEL \x7F.
        $candidates = range(0x00, 0x1F);
        $candidates[] = 0x7F;

        return chr($candidates[array_rand($candidates)]);
    }
}
