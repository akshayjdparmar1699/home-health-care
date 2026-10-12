<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Remind staff to start their duty when the shift time comes (repeats every 5 min until started).
Schedule::command('duty:remind')->everyMinute()->withoutOverlapping();
