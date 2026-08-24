<?php

namespace App\Support;

use App\Models\User;

final class PlatformPermission
{
    public const DASHBOARD_VIEW = 'platform.dashboard.view';

    public const USERS_VIEW = 'platform.users.view';

    public const USERS_STATUS_UPDATE = 'platform.users.status.update';

    public const USERS_IMPERSONATE = 'platform.users.impersonate';

    public const USERS_DELETE = 'platform.users.delete';

    public const STORES_VIEW = 'platform.stores.view';

    public const STORES_STATUS_UPDATE = 'platform.stores.status.update';

    public const SUBSCRIPTIONS_VIEW = 'platform.subscriptions.view';

    public const PLANS_MANAGE = 'platform.plans.manage';

    public const SUBSCRIPTIONS_MANAGE = 'platform.subscriptions.manage';

    public const PAYMENTS_CREATE = 'platform.payments.create';

    public const PAYMENTS_VIEW = 'platform.payments.view';

    public const SUBSCRIPTIONS_ACTIVATE_ALL = 'platform.subscriptions.activate-all';

    public const ADMINS_VIEW = 'platform.admins.view';

    public const ADMINS_MANAGE = 'platform.admins.manage';

    /** @return list<string> */
    public static function all(): array
    {
        return array_merge(...array_map(
            fn (array $group): array => array_column($group['permissions'], 'name'),
            self::groups(),
        ));
    }

    /** @return list<string> */
    public static function defaultAdmin(): array
    {
        return [
            self::DASHBOARD_VIEW,
            self::USERS_VIEW,
            self::USERS_STATUS_UPDATE,
            self::STORES_VIEW,
            self::STORES_STATUS_UPDATE,
            self::SUBSCRIPTIONS_VIEW,
            self::PLANS_MANAGE,
            self::SUBSCRIPTIONS_MANAGE,
            self::PAYMENTS_CREATE,
            self::PAYMENTS_VIEW,
        ];
    }

    /** @return list<array{label:string,permissions:list<array{name:string,label:string}>}> */
    public static function groups(): array
    {
        return [
            ['label' => 'Ringkasan', 'permissions' => [
                ['name' => self::DASHBOARD_VIEW, 'label' => 'Lihat dashboard'],
            ]],
            ['label' => 'Pengguna', 'permissions' => [
                ['name' => self::USERS_VIEW, 'label' => 'Lihat pengguna'],
                ['name' => self::USERS_STATUS_UPDATE, 'label' => 'Ubah status pengguna'],
                ['name' => self::USERS_IMPERSONATE, 'label' => 'Masuk sebagai pengguna'],
                ['name' => self::USERS_DELETE, 'label' => 'Hapus pengguna'],
            ]],
            ['label' => 'Toko', 'permissions' => [
                ['name' => self::STORES_VIEW, 'label' => 'Lihat toko'],
                ['name' => self::STORES_STATUS_UPDATE, 'label' => 'Ubah status toko'],
            ]],
            ['label' => 'Subscription', 'permissions' => [
                ['name' => self::SUBSCRIPTIONS_VIEW, 'label' => 'Lihat subscription'],
                ['name' => self::PLANS_MANAGE, 'label' => 'Kelola paket'],
                ['name' => self::SUBSCRIPTIONS_MANAGE, 'label' => 'Kelola subscription'],
                ['name' => self::PAYMENTS_CREATE, 'label' => 'Catat pembayaran'],
                ['name' => self::SUBSCRIPTIONS_ACTIVATE_ALL, 'label' => 'Aktifkan semua subscription'],
            ]],
            ['label' => 'Pembayaran', 'permissions' => [
                ['name' => self::PAYMENTS_VIEW, 'label' => 'Lihat riwayat pembayaran'],
            ]],
            ['label' => 'Admin Platform', 'permissions' => [
                ['name' => self::ADMINS_VIEW, 'label' => 'Lihat admin platform'],
                ['name' => self::ADMINS_MANAGE, 'label' => 'Kelola admin dan akses'],
            ]],
        ];
    }

    public static function landingRoute(User $user): string
    {
        foreach ([
            self::DASHBOARD_VIEW => 'super-admin.dashboard',
            self::USERS_VIEW => 'super-admin.users.index',
            self::STORES_VIEW => 'super-admin.stores.index',
            self::SUBSCRIPTIONS_VIEW => 'super-admin.subscriptions.index',
            self::PAYMENTS_VIEW => 'super-admin.payments.index',
            self::ADMINS_VIEW => 'super-admin.platform-admins.index',
        ] as $permission => $route) {
            if ($user->can($permission)) {
                return $route;
            }
        }

        return 'super-admin.security.index';
    }
}
