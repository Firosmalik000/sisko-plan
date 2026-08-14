<?php

namespace App\Http\Requests\MasterData;

use App\Support\Authentication\AuthenticatedUser;
use App\Support\CurrentStore;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

abstract class MasterDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        $store = app(CurrentStore::class)->get();

        return AuthenticatedUser::optional($this)?->can('manageMasterData', $store) ?? false;
    }

    protected function routeModelId(string $table, string $parameter): ?int
    {
        $publicId = $this->route($parameter);

        if (! is_string($publicId)) {
            return null;
        }

        return DB::table($table)
            ->where('store_id', app(CurrentStore::class)->id())
            ->where('public_id', $publicId)
            ->value('id');
    }
}
