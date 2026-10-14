<?php

namespace App\Notifications;

use App\Models\Attendance;
use App\Notifications\Channels\WebPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Tells a staff member that the office started (or recorded) a duty for them,
 * so they know to end it in the app or can report a mistake.
 */
class DutyRecordedByAdmin extends Notification
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
     * @return array{title: string, body: string, url: string, tag: string}
     */
    public function toWebPush(object $notifiable): array
    {
        $at = $this->attendance->client?->name ? " at {$this->attendance->client->name}" : '';
        $in = $this->attendance->clock_in->format('j M, g:i A');

        if ($this->attendance->status === 'completed') {
            return [
                'title' => 'Duty added by the office',
                'body' => "Your duty{$at} from {$in} to {$this->attendance->clock_out->format('g:i A')} was recorded by the office.",
                'url' => '/staff/history',
                'tag' => "duty-recorded-{$this->attendance->id}",
            ];
        }

        return [
            'title' => 'Your duty was started by the office',
            'body' => "Duty{$at} started at {$in}. Open the app and tap End Duty when your shift is over.",
            'url' => '/staff',
            'tag' => "duty-recorded-{$this->attendance->id}",
        ];
    }

    /**
     * @return array{type: string, attendance_id: int, client_name: ?string, clock_in: string, clock_out: ?string}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'duty_recorded_by_admin',
            'attendance_id' => $this->attendance->id,
            'client_name' => $this->attendance->client?->name,
            'clock_in' => $this->attendance->clock_in->toIso8601String(),
            'clock_out' => $this->attendance->clock_out?->toIso8601String(),
        ];
    }
}
