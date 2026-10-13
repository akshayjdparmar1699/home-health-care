<?php

namespace App\Notifications;

use App\Models\Attendance;
use App\Notifications\Channels\WebPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

class DutyEndReminder extends Notification
{
    use Queueable;

    public function __construct(public Attendance $attendance, public Carbon $shiftEnd, public int $minutesOver) {}

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
     * Push to the staff member's phone (also when the app is closed).
     *
     * @return array{title: string, body: string, url: string, tag: string}
     */
    public function toWebPush(object $notifiable): array
    {
        $client = $this->attendance->client?->name;
        $time = $this->shiftEnd->format('g:i A');

        return [
            'title' => $this->minutesOver < 1 ? 'Shift over: please end your duty' : "End your duty ({$this->minutesOver} min past shift end)",
            'body' => 'Your shift'.($client ? " at {$client}" : '')." ended at {$time}. Open the app and tap End Duty so your hours and payment are correct.",
            'url' => '/staff',
            'tag' => "duty-end-reminder-{$this->attendance->id}",
        ];
    }

    /**
     * @return array{type: string, attendance_id: int, client_name: ?string, shift_end: string, minutes_over: int}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'duty_end_reminder',
            'attendance_id' => $this->attendance->id,
            'client_name' => $this->attendance->client?->name,
            'shift_end' => $this->shiftEnd->toIso8601String(),
            'minutes_over' => $this->minutesOver,
        ];
    }
}
