<?php

namespace App\Enums;

enum MembershipRole: string
{
    /** @deprecated Migrated to BusinessRole::Owner by the tenancy backfill. */
    case Owner = 'owner';

    /** @deprecated Migrated to Manager by the tenancy backfill. */
    case Admin = 'admin';

    case Manager = 'manager';
    case Cashier = 'cashier';
}
