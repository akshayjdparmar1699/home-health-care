<?php

namespace App\Console\Commands;

use App\Models\Assignment;
use App\Models\Attendance;
use App\Notifications\DutyReminder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

#[Signature('duty:remind {--at= : Pretend the current time is this (for testing), e.g. "2026-10-12 20:05"}')]
#[Description('Remind staff to start duty (with selfie) when their shift time has come; repeats every 5 minutes until they start.')]
class SendDutyReminders extends Command
{
    /** Minutes between two reminders to the same staff member. */
    private const REPEAT_MINUTES = 5;

    public function handle(): int
    {
        $now = $this->option('at') ? Carbon::parse($this->option('at')) : now();
        $sent = 0;

        $assignments = Assignment::current()
            ->whereNotNull('shift_start')
            ->whereNotNull('shift_hours')
            ->whereDate('start_date', '<=', $now->toDateString())
            ->whereHas('staff', fn ($q) => $q->where('status', 'approved')->where('is_active', true))
            ->with(['staff', 'client:id,name'])
            ->get();

        foreach ($assignments as $assignment) {
            $start = $this->shiftStartFor($assignment, $now);
            if (! $start) {
                continue;
            }

            if ($this->dutyAlreadyStarted($assignment, $start)) {
                continue;
            }

            $key = "duty-reminder:{$assignment->id}:{$start->format('YmdHi')}";
            $lastSent = Cache::get($key);
            if ($lastSent && Carbon::parse($lastSent)->diffInMinutes($now, true) < self::REPEAT_MINUTES) {
                continue;
            }

            $minutesLate = (int) floor($start->diffInMinutes($now, true));
            $assignment->staff->notify(new DutyReminder($assignment, $start, $minutesLate));
            Cache::put($key, $now->toIso8601String(), now()->addDay());
            $sent++;

            $this->line("Reminded {$assignment->staff->name} ({$minutesLate} min after {$start->format('H:i')}) for {$assignment->client?->name}");
        }

        $this->info("Duty reminders sent: {$sent}");

        return self::SUCCESS;
    }

    /**
     * The shift start that is currently running (today's, or yesterday's for a night shift
     * that crosses midnight). Null when no shift of this assignment is running now.
     */
    private function shiftStartFor(Assignment $assignment, Carbon $now): ?Carbon
    {
        foreach ([$now->copy(), $now->copy()->subDay()] as $day) {
            $start = Carbon::parse($day->toDateString().' '.$assignment->shift_start, $now->getTimezone());
            $end = $start->copy()->addHours($assignment->shift_hours);

            if ($now->gte($start) && $now->lt($end) && $start->toDateString() >= $assignment->start_date->toDateString()) {
                return $start;
            }
        }

        return null;
    }

    /**
     * Started this shift already (duty begun up to 2 hours early counts), or is on any duty right now.
     */
    private function dutyAlreadyStarted(Assignment $assignment, Carbon $start): bool
    {
        return Attendance::where('staff_id', $assignment->staff_id)
            ->where(fn ($q) => $q->where('status', '!=', 'completed')
                ->orWhere(fn ($q) => $q->where('assignment_id', $assignment->id)->where('clock_in', '>=', $start->copy()->subHours(2))))
            ->exists();
    }
}
