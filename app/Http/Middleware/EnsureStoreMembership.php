<?php

namespace App\Http\Middleware;

use App\Enums\MembershipStatus;
use App\Models\Store;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Verifikasi membership aktif pengguna terhadap {store} pada route store-scoped
 * (Req 4.5, 4.6, 5.6). Menolak akses lintas-tenant. Membership yang tervalidasi
 * disimpan di request attribute `store_membership_role` untuk dipakai policy
 * per-aksi di controller (ability = fast gate, membership+role = otoritatif).
 *
 * Opsional: middleware menerima daftar role yang diizinkan, mis.
 * `store.membership:owner` atau `store.membership:owner,admin`.
 */
class EnsureStoreMembership
{
    public function handle(Request $request, Closure $next, string ...$allowedRoles): Response
    {
        $routeStore = $request->route('store');

        $store = $routeStore instanceof Store
            ? $routeStore
            : Store::query()->where('public_id', (string) $routeStore)->first();

        if (! $store instanceof Store) {
            throw new NotFoundHttpException('Toko tidak ditemukan.');
        }

        $user = $request->user();

        if (! $user instanceof User) {
            throw new AccessDeniedHttpException('Membership toko tidak valid.');
        }

        /** @var Store|null $membershipStore */
        $membershipStore = $user->activeStores()
            ->where('stores.id', $store->id)
            ->first();

        if ($membershipStore === null) {
            // Jangan bocorkan keberadaan toko lintas-tenant: perlakukan sebagai 404.
            throw new NotFoundHttpException('Toko tidak ditemukan.');
        }

        $role = (string) $membershipStore->pivot->role;

        if ($allowedRoles !== [] && ! in_array($role, $allowedRoles, true)) {
            throw new AccessDeniedHttpException('Peran Anda tidak diizinkan untuk tindakan ini.');
        }

        $request->attributes->set('store_membership_role', $role);
        $request->attributes->set('store_membership_status', MembershipStatus::Active->value);

        return $next($request);
    }
}
