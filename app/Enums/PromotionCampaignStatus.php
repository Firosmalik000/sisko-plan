<?php

namespace App\Enums;

enum PromotionCampaignStatus: string
{
    case Active = 'active';
    case Paused = 'paused';
    case Ended = 'ended';
}
