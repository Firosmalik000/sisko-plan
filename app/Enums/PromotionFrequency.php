<?php

namespace App\Enums;

enum PromotionFrequency: string
{
    case OncePerSession = 'once_per_session';
    case OncePerDay = 'once_per_day';
    case OncePerCampaign = 'once_per_campaign';
    case EveryAppOpen = 'every_app_open';
}
