<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Support\WebPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    /**
     * Public VAPID key the browser needs to subscribe.
     */
    public function key(WebPushService $push): JsonResponse
    {
        return response()->json(['key' => $push->publicKey()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'url', 'max:500'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
        ]);

        PushSubscription::updateOrCreate(['endpoint' => $data['endpoint']], [
            'user_id' => $request->user()->id,
            'public_key' => $data['keys']['p256dh'],
            'auth_token' => $data['keys']['auth'],
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        return response()->json(['message' => 'Notifications enabled'], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate(['endpoint' => ['required', 'string']]);
        PushSubscription::where('endpoint', $data['endpoint'])->where('user_id', $request->user()->id)->delete();

        return response()->json(['message' => 'Notifications disabled']);
    }
}
