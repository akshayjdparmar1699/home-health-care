<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\StaffProfileService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** Login with email or phone number. */
    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
            'portal' => ['nullable', 'in:admin,staff'],
        ]);

        $login = trim($data['login']);
        $user = str_contains($login, '@')
            ? User::where('email', strtolower($login))->first()
            : User::where('phone', preg_replace('/\D/', '', $login))->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['login' => 'Invalid login details. Please check and try again.']);
        }

        // The owner and the staff have separate login pages; each only accepts its own accounts.
        if (! empty($data['portal']) && $user->role !== $data['portal']) {
            throw ValidationException::withMessages([
                'login' => $data['portal'] === 'staff'
                    ? 'This login is only for staff. Please use your staff mobile number.'
                    : 'This login is only for the owner / admin.',
            ]);
        }

        if ($user->status === 'pending') {
            return response()->json([
                'code' => 'pending',
                'name' => $user->name,
                'message' => 'Your application and documents are under review. You can log in once the admin approves your account.',
            ], 403);
        }

        if ($user->status === 'rejected') {
            return response()->json([
                'code' => 'rejected',
                'name' => $user->name,
                'message' => 'Your application was not approved.',
                'reason' => $user->rejection_reason,
            ], 403);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages(['login' => 'Your account is inactive. Please contact the admin.']);
        }

        $token = $user->createToken('web')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user]);
    }

    /** Public staff self-registration. The account stays pending until an admin approves it. */
    public function register(Request $request, StaffProfileService $service)
    {
        $data = $service->validate($request, selfRegistration: true);

        $user = $service->save($request, $data, extraUser: [
            'status' => 'pending',
            'registered_via' => 'self',
            'is_active' => true,
        ]);

        return response()->json(['message' => 'Application submitted', 'name' => $user->name], 201);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        // Staff can see their own saved password on the profile page, in case they forget it.
        if ($user->role === 'staff' && $request->boolean('with_password')) {
            $user->makeVisible('password_plain');
        }

        return response()->json($user);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = $request->user();
        $user->update(['password' => $data['password']] + ($user->role === 'staff' ? ['password_plain' => $data['password']] : []));

        return response()->json(['message' => 'Password changed successfully']);
    }
}
