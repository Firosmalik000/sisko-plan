<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('auth:clear-resets')->daily();
Schedule::command('telescope:prune --hours=48')->daily();

Schedule::command('intelligence:sync-units')->daily()->withoutOverlapping();

Schedule::command('intelligence:sync-categories')->daily()->withoutOverlapping();
