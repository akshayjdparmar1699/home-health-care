<?php

namespace App\Notifications\Channels;

use App\Models\User;
use App\Support\WebPushService;
use Illuminate\Notifications\Notification;

/**
 * Notification channel: sends the notification's toWebPush() message to the user's devices.
 * Delivery runs after the HTTP response so the staff / admin does not wait for push services.
 */
class WebPushChannel
{
    public function __construct(private WebPushService $push) {}

    public function send(User $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toWebPush')) {
            return;
        }

        $message = $notification->toWebPush($notifiable);
        defer(fn () => $this->push->send($notifiable, $message));
    }
}
