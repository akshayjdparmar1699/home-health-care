<?php

namespace App\Notifications;

use App\Models\Attendance;
use App\Notifications\Channels\WebPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DutyCompleted extends Notification
{
    use Queueable;

    public function __construct(public Attendance $attendance) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', WebPushChannel::class];
    }

    /**
     * Phone / desktop push, delivered even when the app is closed.
     *
     * @return array{title: string, body: string, url: string, tag: string}
     */
    public function toWebPush(object $notifiable): array
    {
        $d = $this->toArray($notifiable);
        $money = fn (float $value): string => '₹'.number_format($value);

        return [
            'title' => $d['staff_name'].' ended duty'.($d['client_name'] ? ' · '.$d['client_name'] : ''),
            'body' => 'Staff pay '.$money($d['staff_amount']).' · Client charge '.$money($d['client_amount']).' · Profit '.$money($d['profit']).'. Tap to approve.',
            'url' => "/admin/attendance?approve={$d['attendance_id']}",
            'tag' => "duty-{$d['attendance_id']}",
        ];
    }

    /**
     * Stored in the admin's notification feed.
     *
     * @return array{type: string, attendance_id: int, staff_id: int, staff_name: ?string, client_name: ?string, shift_hours: ?int, shift_type: ?string, clock_in: ?string, clock_out: ?string, worked_minutes: int, staff_amount: float, client_amount: float, profit: float}
     */
    public function toArray(object $notifiable): array
    {
        $attendance = $this->attendance->loadMissing(['staff:id,name', 'client:id,name']);

        return [
            'type' => 'duty_completed',
            'attendance_id' => $attendance->id,
            'staff_id' => $attendance->staff_id,
            'staff_name' => $attendance->staff?->name,
            'client_name' => $attendance->client?->name,
            'shift_hours' => $attendance->shift_hours,
            'shift_type' => $attendance->shift_type,
            'clock_in' => $attendance->clock_in?->toIso8601String(),
            'clock_out' => $attendance->clock_out?->toIso8601String(),
            'worked_minutes' => $attendance->worked_minutes,
            'staff_amount' => $attendance->staff_amount,
            'client_amount' => $attendance->client_amount,
            'profit' => round($attendance->client_amount - $attendance->staff_amount, 2),
        ];
    }
}
