<?php

namespace App\Support\Authentication;

use App\Enums\MembershipRole;
use App\Models\User;

/**
 * Pemetaan role membership → Sanctum token abilities (design §3.4).
 *
 * Ability = fast gate saat request; server tetap re-check membership + policy
 * per store (otoritatif) di controller. Menyembunyikan menu bukan authorization.
 *
 * | ability          | owner | admin | cashier |
 * |------------------|:-----:|:-----:|:-------:|
 * | store.read       |   ✓   |   ✓   |    ✓    |
 * | sale.create      |   ✓   |   ✓   |    ✓    |
 * | scan.use         |   ✓   |   ✓   |    ✓    |
 * | product.write    |   ✓   |   ✓   |    ✗    |
 * | catalog.write    |   ✓   |   ✓   |    ✗    |
 * | purchasing.write |   ✓   |   ✓   |    ✗    |
 * | inventory.write  |   ✓   |   ✓   |    ✗    |
 * | finance.write    |   ✓   |   ✓   |    ✗    |
 * | store.settings   |   ✓   |   ✓   |    ✗    |
 * | sale.reconcile   |   ✓   |   ✗   |    ✗    |
 */
class TokenAbilities
{
    /**
     * Ability per role sesuai matrix design §3.4.
     *
     * @var array<string, list<string>>
     */
    private const MATRIX = [
        MembershipRole::Owner->value => [
            'store.read',
            'sale.create',
            'scan.use',
            'product.write',
            'catalog.write',
            'purchasing.write',
            'inventory.write',
            'finance.write',
            'store.settings',
            'sale.reconcile',
        ],
        MembershipRole::Admin->value => [
            'store.read',
            'sale.create',
            'scan.use',
            'product.write',
            'catalog.write',
            'purchasing.write',
            'inventory.write',
            'finance.write',
            'store.settings',
        ],
        MembershipRole::Cashier->value => [
            'store.read',
            'sale.create',
            'scan.use',
        ],
    ];

    /**
     * Abilities untuk satu role membership.
     *
     * @return list<string>
     */
    public static function forRole(string $role): array
    {
        return self::MATRIX[$role] ?? [];
    }

    /**
     * Union abilities dari seluruh membership toko aktif milik user.
     *
     * User anggota banyak toko dengan role berbeda mendapat gabungan ability;
     * server tetap re-check per store saat request store-scoped.
     *
     * @return list<string>
     */
    public static function forUser(User $user): array
    {
        $abilities = [];

        foreach ($user->activeStores()->get() as $store) {
            $role = $store->pivot->role;

            if (is_string($role)) {
                $abilities = array_merge($abilities, self::forRole($role));
            }
        }

        return array_values(array_unique($abilities));
    }
}
