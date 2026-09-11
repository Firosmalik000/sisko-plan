<?php

namespace App\Enums;

/**
 * Kategori notification center mobile — memetakan ke channel push terpisah
 * (design §10, Req 15.3). Mematikan `Promo` tidak memengaruhi `Operational`
 * maupun `Security`.
 */
enum NotificationCategory: string
{
    case Operational = 'operational';
    case Promo = 'promo';
    case Security = 'security';
}
