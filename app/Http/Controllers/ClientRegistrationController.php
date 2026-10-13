<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\User;
use App\Notifications\ClientRegistered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

/**
 * Public form where a patient / family fills in their own details. The client is created
 * straight away (marked as self-registered) and the admin gets a phone notification.
 */
class ClientRegistrationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        // Hidden field that only bots fill in.
        if (filled($request->input('website'))) {
            return response()->json(['message' => 'Thank you'], 201);
        }

        $request->replace(Client::normaliseInput($request->except('website')));
        $data = $request->validate(Client::detailRules(), [
            'map_link.regex' => 'Please paste a Google Maps link (open your home in Google Maps, tap Share, then Copy link).',
        ]);

        $client = Client::create([...$data, 'source' => 'self', 'is_active' => true]);

        Notification::send(User::where('role', 'admin')->where('is_active', true)->get(), new ClientRegistered($client));

        return response()->json(['message' => 'Thank you', 'name' => $client->name], 201);
    }
}
