<?php

namespace Tests\Unit;

use App\Support\LocaleContext;
use Illuminate\Http\Request;
use Tests\TestCase;

class LocaleContextTest extends TestCase
{
    public function test_country_header_is_mapped_to_the_supported_first_visit_locale(): void
    {
        foreach ([
            'ID' => 'id',
            'MY' => 'ms',
            'VN' => 'vi',
            'SG' => 'en',
            'XX' => 'en',
            '' => 'en',
        ] as $country => $expectedLocale) {
            $request = Request::create('/', server: [
                'HTTP_CF_IPCOUNTRY' => $country,
            ]);

            $this->assertSame($expectedLocale, LocaleContext::localeFromCountry($request));
        }
    }

    public function test_country_header_name_can_be_configured_for_another_proxy(): void
    {
        config()->set('localization.country_header', 'X-Visitor-Country');

        $request = Request::create('/', server: [
            'HTTP_X_VISITOR_COUNTRY' => 'vn',
        ]);

        $this->assertSame('vi', LocaleContext::localeFromCountry($request));
    }

    public function test_market_is_an_iso_country_code_independent_from_locale(): void
    {
        $request = Request::create('/', server: ['HTTP_CF_IPCOUNTRY' => 'sg']);
        $request->setLaravelSession(app('session')->driver());
        $request->session()->put('locale', 'ms');

        $this->assertSame('SG', LocaleContext::market($request));

        $request->session()->put('market', 'ph');
        $this->assertSame('PH', LocaleContext::market($request));
    }

    public function test_every_southeast_asian_country_gets_a_supported_default_locale(): void
    {
        $expected = [
            'BN' => 'ms', 'KH' => 'km', 'ID' => 'id', 'LA' => 'lo',
            'MY' => 'ms', 'MM' => 'my', 'PH' => 'fil', 'SG' => 'en',
            'TH' => 'th', 'TL' => 'tet', 'VN' => 'vi',
        ];

        foreach ($expected as $country => $locale) {
            $request = Request::create('/', server: ['HTTP_CF_IPCOUNTRY' => $country]);
            $this->assertSame($locale, LocaleContext::localeFromCountry($request));
        }
    }

    public function test_every_supported_locale_can_be_selected_and_has_a_native_label(): void
    {
        $request = Request::create('/');
        $request->setLaravelSession(app('session')->driver());

        $expectedOptions = [
            ['code' => 'en', 'label' => 'English'],
            ['code' => 'id', 'label' => 'Bahasa Indonesia'],
            ['code' => 'ms', 'label' => 'Bahasa Melayu'],
            ['code' => 'vi', 'label' => 'Tiếng Việt'],
            ['code' => 'th', 'label' => 'ไทย'],
            ['code' => 'fil', 'label' => 'Filipino'],
            ['code' => 'km', 'label' => 'ភាសាខ្មែរ'],
            ['code' => 'lo', 'label' => 'ພາສາລາວ'],
            ['code' => 'my', 'label' => 'မြန်မာဘာသာ'],
            ['code' => 'tet', 'label' => 'Tetum'],
        ];

        $this->assertSame(array_column($expectedOptions, 'code'), LocaleContext::allowedLocales($request));
        $this->assertSame($expectedOptions, LocaleContext::options($request));

        foreach (array_column($expectedOptions, 'code') as $locale) {
            $request->session()->put('locale', $locale);
            $this->assertSame($locale, LocaleContext::locale($request));
        }
    }
}
