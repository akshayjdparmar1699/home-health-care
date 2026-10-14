<?php

namespace App\Notifications;

use App\Models\Client;
use App\Notifications\Channels\WebPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Phone notification to the admin when a client fills in the public form. Push only: the
 * admin bell lists duty payments to approve, and the new client shows in the Clients list.
 */
class ClientRegistered extends Notification
{
    use Queueable;

    public function __construct(public Client $client) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return [WebPushChannel::class];
    }

    /**
     * @return array{title: string, body: string, url: string, tag: string}
     */
    public function toWebPush(object $notifiable): array
    {
        $details = array_filter([$this->client->service_type, $this->client->city, $this->client->relative_phone]);

        return [
            'title' => "New client: {$this->client->name}",
            'body' => 'Filled the client form'.($details ? ' · '.implode(' · ', $details) : '').'. Tap to view and assign staff.',
            'url' => "/admin/clients/{$this->client->id}",
            'tag' => "client-registered-{$this->client->id}",
        ];
    }
}
