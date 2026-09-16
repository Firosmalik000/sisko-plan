<?php

namespace App\Models;

use Database\Factories\RegisterFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable(['store_id', 'name', 'cash_financial_account_id', 'status'])]
class Register extends Model
{
    /** @use HasFactory<RegisterFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(fn (Register $register) => $register->public_id ??= (string) Str::ulid());
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<FinancialAccount, $this> */
    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(FinancialAccount::class, 'cash_financial_account_id');
    }

    /** @return HasMany<RegisterSession, $this> */
    public function sessions(): HasMany
    {
        return $this->hasMany(RegisterSession::class);
    }
}
