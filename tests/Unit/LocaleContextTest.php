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
}
