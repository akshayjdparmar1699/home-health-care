<?php

namespace App\Notifications;

use App\Models\Attendance;
use App\Notifications\Channels\WebPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DutyApproved extends Notification
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
     * Push to the staff member's phone. Never includes the client charge.
     *
     * @return array{title: string, body: string, url: string, tag: string}
     */
    public function toWebPush(object $notifiable): array
    {
        $attendance = $this->attendance->loadMissing('client:id,name');
        $date = $attendance->duty_date->format('d M');

        return [
            'title' => 'Payment approved: ₹'.number_format($attendance->staff_amount),
            'body' => "Your duty on {$date}".($attendance->client ? " at {$attendance->client->name}" : '').' is approved and added to your earnings.',
            'url' => '/staff/earnings',
            'tag' => "approved-{$attendance->id}",
        ];
    }

    /**
     * @return array{type: string, attendance_id: int, duty_date: string, client_name: ?string, staff_amount: float}
     */
    public function toArray(object $notifiable): array
    {
        $attendance = $this->attendance->loadMissing('client:id,name');

        return [
            'type' => 'duty_approved',
            'attendance_id' => $attendance->id,
            'duty_date' => $attendance->duty_date->toDateString(),
            'client_name' => $attendance->client?->name,
            'staff_amount' => $attendance->staff_amount,
        ];
    }
}
