<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/** @property list<string> $roles */
#[Fillable(['code', 'name', 'symbol', 'roles', 'dimension', 'allows_fraction', 'is_active', 'catalog_version'])]
class UnitReference extends Model
{
    protected $primaryKey = 'code';

    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return ['roles' => 'array', 'allows_fraction' => 'boolean', 'is_active' => 'boolean'];
    }
}
