<?php

namespace App\Http\Requests\Api\V1\Reports;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi rentang tanggal laporan (Req 20.1). `start_date`/`end_date` format
 * Y-m-d dalam zona waktu toko; `end_date` tidak boleh sebelum `start_date`.
 * Interpretasi rentang → jendela UTC ditangani `BusinessMetrics::period`.
 */
class ReportRangeRequest extends FormRequest
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
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
        ];
    }
}
