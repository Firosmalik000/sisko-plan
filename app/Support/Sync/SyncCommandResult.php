<?php

namespace App\Support\Sync;

/**
 * Hasil pemrosesan satu command pada `sync/push` (design §3.3, Req 7.2).
 *
 * Batch selalu mengembalikan HTTP 200 dengan daftar hasil per-command; status
 * sukses/gagal berada di tiap entri, bukan di status HTTP batch.
 */
final class SyncCommandResult
{
    /**
     * @param  array<string, mixed>|null  $sale  Ringkasan sale bila sukses.
     * @param  array{code:string,message:string,fields:array<string,mixed>,retryable:bool}|null  $error  Detail error bila gagal.
     */
    private function __construct(
        public string $clientOperationId,
        public string $status,
        public ?array $sale = null,
        public ?array $error = null,
    ) {}

    /**
     * @param  array<string, mixed>  $sale
     */
    public static function synced(string $clientOperationId, array $sale): self
    {
        return new self($clientOperationId, 'synced', sale: $sale);
    }

    /**
     * @param  array<string, mixed>  $fields
     */
    public static function error(
        string $clientOperationId,
        string $code,
        string $message,
        array $fields = [],
        bool $retryable = false,
    ): self {
        return new self($clientOperationId, 'error', error: [
            'code' => $code,
            'message' => $message,
            'fields' => $fields,
            'retryable' => $retryable,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $payload = [
            'client_operation_id' => $this->clientOperationId,
            'status' => $this->status,
        ];

        if ($this->sale !== null) {
            $payload['sale'] = $this->sale;
        }

        if ($this->error !== null) {
            $payload['error'] = [
                'code' => $this->error['code'],
                'message' => $this->error['message'],
                'fields' => (object) $this->error['fields'],
                'retryable' => $this->error['retryable'],
            ];
        }

        return $payload;
    }
}
