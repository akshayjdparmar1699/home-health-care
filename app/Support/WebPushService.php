<?php

namespace App\Support;

use App\Models\PushSubscription;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\VAPID;
use Minishlink\WebPush\WebPush;
use Throwable;

/**
 * Sends Web Push messages to every device a user has subscribed (works while the app is closed).
 */
class WebPushService
{
    /**
     * VAPID key pair, generated once and kept in the settings table.
     *
     * @return array{publicKey: string, privateKey: string}
     */
    public function keys(): array
    {
        $public = Setting::find('vapid_public_key')?->value;
        $private = Setting::find('vapid_private_key')?->value;

        if (! $public || ! $private) {
            ['publicKey' => $public, 'privateKey' => $private] = VAPID::createVapidKeys();
            Setting::updateOrCreate(['key' => 'vapid_public_key'], ['value' => $public]);
            Setting::updateOrCreate(['key' => 'vapid_private_key'], ['value' => $private]);
        }

        return ['publicKey' => $public, 'privateKey' => $private];
    }

    public function publicKey(): string
    {
        return $this->keys()['publicKey'];
    }

    /**
     * @param  User|Collection<int, User>  $users
     * @param  array{title: string, body: string, url?: string, tag?: string}  $message
     */
    public function send(User|Collection $users, array $message): void
    {
        $userIds = $users instanceof User ? [$users->id] : $users->pluck('id')->all();
        $subscriptions = PushSubscription::whereIn('user_id', $userIds)->get();

        if ($subscriptions->isEmpty()) {
            return;
        }

        try {
            $webPush = new WebPush(['VAPID' => [
                'subject' => config('app.url') ?: 'mailto:admin@example.com',
                ...$this->keys(),
            ]]);

            $payload = json_encode($message + ['icon' => '/icons/icon-192.png', 'url' => '/']);

            foreach ($subscriptions as $sub) {
                $webPush->queueNotification(Subscription::create([
                    'endpoint' => $sub->endpoint,
                    'keys' => ['p256dh' => $sub->public_key, 'auth' => $sub->auth_token],
                ]), $payload, ['TTL' => 86400, 'urgency' => 'high']);
            }

            foreach ($webPush->flush() as $report) {
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint', $report->getEndpoint())->delete();
                } elseif (! $report->isSuccess()) {
                    Log::warning('Web push failed', ['endpoint' => $report->getEndpoint(), 'reason' => $report->getReason()]);
                }
            }
        } catch (Throwable $e) {
            Log::warning('Web push error: '.$e->getMessage());
        }
    }
}
