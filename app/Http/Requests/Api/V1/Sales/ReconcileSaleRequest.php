<?php

namespace App\Http\Requests\Api\V1\Sales;

use App\Models\Store;
use App\Rules\UnicodeSafeText;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi `POST /stores/{store}/sales/{sale}/reconcile` (Req 9.2, 9.3, 9.4, 9.5).
 *
 * Owner (ability `sale.reconcile`) menyelesaikan sale yang ditandai
 * `needs_attention`:
 * - `accept-snapshot`: menerima harga otoritatif server apa adanya (mencatat
 *   snapshot harga lokal + alasan + actor untuk audit) TANPA mengubah jumlah
 *   dibayar dan TANPA membuat produk/stok bayangan.
 * - `reversal`: memposting reversal penuh via Action `PostSaleReturn` yang sama
 *   dengan pencatatan harga/alasan/actor/revision.
 *
 * `client_recorded_at` = timestamp transaksi asli klien (disimpan bersama
 * timestamp posting server, Req 9.5). Membership + tenant sudah divalidasi
 * middleware `store.membership`; ability dicek controller.
 */
class ReconcileSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $store = $this->route('store');
        $storeId = $store instanceof Store ? $store->id : 0;
        $isReversal = $this->input('action') === 'reversal';

        return [
            'action' => ['required', Rule::in(['accept-snapshot', 'reversal'])],
            'reason' => ['required', 'string', 'min:1', 'max:500', new UnicodeSafeText],
            'client_recorded_at' => ['required', 'date'],
            'client_operation_id' => ['required', 'string', 'max:64'],

            // Snapshot harga lokal untuk audit (Req 9.6) — string decimal scale
            // 4 (bukan float). Regex menjaga bentuk agar `max` tetap panjang string.
            'local_price_snapshot' => ['sometimes', 'nullable', 'string', 'max:32', 'regex:/^\d{1,15}(\.\d{1,4})?$/'],
            'catalog_revision' => ['sometimes', 'nullable', 'integer', 'min:0'],

            // Reversal → akun pengembalian kas.
            'account_public_id' => [
                Rule::requiredIf($isReversal),
                Rule::prohibitedIf(! $isReversal),
                'nullable',
                'string',
                Rule::exists('financial_accounts', 'public_id')->where(fn ($query) => $query
                    ->where('store_id', $storeId)
                    ->where('is_active', true)),
            ],
            'occurred_at' => [
                Rule::requiredIf($isReversal),
                Rule::prohibitedIf(! $isReversal),
                'nullable',
                'date',
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $headerIdempotency = $this->header('Idempotency-Key');
        $clientOperationId = $this->input('client_operation_id');

        if ((! is_string($clientOperationId) || trim($clientOperationId) === '') && is_string($headerIdempotency) && trim($headerIdempotency) !== '') {
            $clientOperationId = trim($headerIdempotency);
        }

        $this->merge([
            'client_operation_id' => is_string($clientOperationId) && trim($clientOperationId) !== '' ? trim($clientOperationId) : null,
            'reason' => is_string($this->input('reason')) ? trim($this->input('reason')) : $this->input('reason'),
        ]);
    }
}
