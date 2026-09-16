<?php

return [
    'device_cookie' => 'pos_device_token',
    'actor_idle_timeout_seconds' => (int) env('POS_ACTOR_IDLE_TIMEOUT', 900),
    'pin_max_attempts' => (int) env('POS_PIN_MAX_ATTEMPTS', 5),
    'pin_decay_seconds' => (int) env('POS_PIN_DECAY_SECONDS', 300),
];
