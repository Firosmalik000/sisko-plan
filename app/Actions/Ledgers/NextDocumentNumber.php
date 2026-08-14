<?php

namespace App\Actions\Ledgers;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class NextDocumentNumber
{
    public function handle(int $storeId, string $type, CarbonInterface $occurredAt): string
    {
        $timezone = DB::table('store_settings')->where('store_id', $storeId)->value('timezone') ?? 'Asia/Jakarta';
        $period = CarbonImmutable::instance($occurredAt)->setTimezone((string) $timezone)->format('Ym');
        DB::table('document_sequences')->insertOrIgnore([
            'store_id' => $storeId,
            'document_type' => $type,
            'period' => $period,
            'last_number' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $sequence = DB::table('document_sequences')
            ->where(['store_id' => $storeId, 'document_type' => $type, 'period' => $period])
            ->lockForUpdate()->firstOrFail();
        $number = ((int) $sequence->last_number) + 1;
        DB::table('document_sequences')->where('id', $sequence->id)->update(['last_number' => $number, 'updated_at' => now()]);

        return sprintf('%s-%s-%05d', strtoupper($type), $period, $number);
    }
}
