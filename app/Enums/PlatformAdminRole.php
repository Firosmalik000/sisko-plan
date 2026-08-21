<?php

namespace App\Enums;

enum PlatformAdminRole: string
{
    case SuperAdmin = 'super_admin';
    case Admin = 'admin';
}
