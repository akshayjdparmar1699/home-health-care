<?php

namespace App\Notifications;

use App\Models\Assignment;
use App\Notifications\Channels\WebPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

class DutyReminder extends Notification
{
    use Queueable;

    public function __construct(public Assignment $assignment, public Carbon $shiftStart, public int $minutesLate) {}

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
        $client = $this->assignment->client?->name;
        $shift = $this->assignment->shift_hours.' hr '.ucfirst($this->assignment->shift_type ?? 'day').' shift';
        $time = $this->shiftStart->format('g:i A');

        return [
            'title' => $this->minutesLate < 1 ? 'Time to start your duty' : "Duty not started ({$this->minutesLate} min late)",
            'body' => "Your {$shift}".($client ? " at {$client}" : '')." started at {$time}. Open the app and start duty with a selfie.",
            'url' => '/staff',
            'tag' => "duty-reminder-{$this->assignment->id}-{$this->shiftStart->format('Ymd')}",
        ];
    }

    /**
     * @return array{type: string, assignment_id: int, client_name: ?string, shift_start: string, minutes_late: int}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'duty_reminder',
            'assignment_id' => $this->assignment->id,
            'client_name' => $this->assignment->client?->name,
            'shift_start' => $this->shiftStart->toIso8601String(),
            'minutes_late' => $this->minutesLate,
        ];
    }
}
