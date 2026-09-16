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

    public const BRANDING_VIEW = 'platform.branding.view';

    public const BRANDING_MANAGE = 'platform.branding.manage';

    public const GEOGRAPHY_VIEW = 'platform.geography.view';

    public const GEOGRAPHY_MANAGE = 'platform.geography.manage';

    public const BUSINESSES_VIEW = 'platform.businesses.view';

    public const BUSINESSES_STATUS_UPDATE = 'platform.businesses.status.update';

    public const BUSINESSES_DEVICE_REVOKE = 'platform.businesses.devices.revoke';

    public const BUSINESSES_OWNERSHIP_RECOVER = 'platform.businesses.ownership.recover';

    public const COMMERCE_VIEW = 'platform.commerce.view';

    public const COMMERCE_MANAGE = 'platform.commerce.manage';

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
            self::BUSINESSES_VIEW,
            self::BUSINESSES_STATUS_UPDATE,
            self::BUSINESSES_DEVICE_REVOKE,
            self::BUSINESSES_OWNERSHIP_RECOVER,
            self::SUBSCRIPTIONS_VIEW,
            self::PLANS_MANAGE,
            self::SUBSCRIPTIONS_MANAGE,
            self::PAYMENTS_CREATE,
            self::PAYMENTS_VIEW,
            self::BRANDING_VIEW,
            self::BRANDING_MANAGE,
            self::GEOGRAPHY_VIEW,
            self::GEOGRAPHY_MANAGE,
            self::COMMERCE_VIEW,
            self::COMMERCE_MANAGE,
        ];
    }

    /** @return list<array{label:string,permissions:list<array{name:string,label:string}>}> */
    public static function groups(): array
    {
        return [
            ['label' => 'Overview', 'permissions' => [
                ['name' => self::DASHBOARD_VIEW, 'label' => 'View dashboard'],
            ]],
            ['label' => 'Users', 'permissions' => [
                ['name' => self::USERS_VIEW, 'label' => 'View users'],
                ['name' => self::USERS_STATUS_UPDATE, 'label' => 'Change user status'],
                ['name' => self::USERS_IMPERSONATE, 'label' => 'Sign in as user'],
                ['name' => self::USERS_DELETE, 'label' => 'Delete users'],
            ]],
            ['label' => 'Stores', 'permissions' => [
                ['name' => self::STORES_VIEW, 'label' => 'View stores'],
                ['name' => self::STORES_STATUS_UPDATE, 'label' => 'Change store status'],
            ]],
            ['label' => 'Businesses', 'permissions' => [
                ['name' => self::BUSINESSES_VIEW, 'label' => 'View businesses'],
                ['name' => self::BUSINESSES_STATUS_UPDATE, 'label' => 'Change business status'],
                ['name' => self::BUSINESSES_DEVICE_REVOKE, 'label' => 'Revoke cashier devices'],
                ['name' => self::BUSINESSES_OWNERSHIP_RECOVER, 'label' => 'Recover business ownership'],
            ]],
            ['label' => 'Subscriptions', 'permissions' => [
                ['name' => self::SUBSCRIPTIONS_VIEW, 'label' => 'View subscriptions'],
                ['name' => self::PLANS_MANAGE, 'label' => 'Manage plans'],
                ['name' => self::SUBSCRIPTIONS_MANAGE, 'label' => 'Manage subscriptions'],
                ['name' => self::PAYMENTS_CREATE, 'label' => 'Record payments'],
                ['name' => self::SUBSCRIPTIONS_ACTIVATE_ALL, 'label' => 'Activate all subscriptions'],
            ]],
            ['label' => 'Payments', 'permissions' => [
                ['name' => self::PAYMENTS_VIEW, 'label' => 'View payment history'],
            ]],
            ['label' => 'Platform Admins', 'permissions' => [
                ['name' => self::ADMINS_VIEW, 'label' => 'View platform admins'],
                ['name' => self::ADMINS_MANAGE, 'label' => 'Manage admins and access'],
            ]],
            ['label' => 'Brand & SEO', 'permissions' => [
                ['name' => self::BRANDING_VIEW, 'label' => 'View brand and SEO settings'],
                ['name' => self::BRANDING_MANAGE, 'label' => 'Manage brand and SEO'],
            ]],
            ['label' => 'Countries & Currencies', 'permissions' => [
                ['name' => self::GEOGRAPHY_VIEW, 'label' => 'View countries and currencies'],
                ['name' => self::GEOGRAPHY_MANAGE, 'label' => 'Manage countries and currencies'],
            ]],
            ['label' => 'Commerce references', 'permissions' => [
                ['name' => self::COMMERCE_VIEW, 'label' => 'View commerce references'],
                ['name' => self::COMMERCE_MANAGE, 'label' => 'Manage commerce references'],
            ]],
        ];
    }

    public static function landingRoute(User $user): string
    {
        foreach ([
            self::DASHBOARD_VIEW => 'super-admin.dashboard',
            self::USERS_VIEW => 'super-admin.users.index',
            self::BUSINESSES_VIEW => 'super-admin.businesses.index',
            self::STORES_VIEW => 'super-admin.stores.index',
            self::SUBSCRIPTIONS_VIEW => 'super-admin.subscriptions.index',
            self::PAYMENTS_VIEW => 'super-admin.payments.index',
            self::ADMINS_VIEW => 'super-admin.platform-admins.index',
            self::BRANDING_VIEW => 'super-admin.brand-seo.index',
            self::GEOGRAPHY_VIEW => 'super-admin.geography.index',
            self::COMMERCE_VIEW => 'super-admin.commerce.index',
        ] as $permission => $route) {
            if ($user->can($permission)) {
                return $route;
            }
        }

        return 'super-admin.security.index';
    }
}
