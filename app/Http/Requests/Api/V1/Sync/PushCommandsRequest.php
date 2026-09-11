<?php

namespace App\Http\Requests\Api\V1\Sync;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi envelope batch `sync/push` (design §3.3, Req 7.2).
 *
 * Hanya bentuk batch yang divalidasi di sini (batch-level). Validasi payload
 * per-operation dilakukan handler masing-masing agar kegagalan satu command
 * menjadi error per-command, bukan menggagalkan seluruh batch.
 */
class PushCommandsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'batch_id' => ['required', 'string', 'max:64'],
            'commands' => ['required', 'array', 'min:1', 'max:100'],
            'commands.*.client_operation_id' => ['required', 'string', 'max:64'],
            'commands.*.operation_type' => ['required', 'string', 'max:64'],
            'commands.*.payload_hash' => ['nullable', 'string', 'max:128'],
            'commands.*.payload' => ['required', 'array'],
        ];
    }
}
