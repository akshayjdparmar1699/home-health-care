<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== $role) {
            return response()->json(['message' => 'You are not allowed to access this section.'], 403);
        }

        if ($user->status !== 'approved') {
            return response()->json(['message' => 'Your account is waiting for admin approval.'], 403);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'Your account is inactive. Please contact the admin.'], 403);
        }

        return $next($request);
    }
}
