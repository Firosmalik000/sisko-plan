<?php

namespace App\Enums;

enum PushProvider: string
{
    case Fcm = 'fcm';
    case Apns = 'apns';
}
