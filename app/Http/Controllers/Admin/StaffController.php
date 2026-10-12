<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\User;
use App\Support\StaffProfileService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StaffController extends Controller
{
    public function index(Request $request)
    {
        $staff = User::staff()->approved()
            ->when($request->search, function ($q, $s) {
                $q->where(fn ($q) => $q->where('name', 'like', "%$s%")
                    ->orWhere('phone', 'like', "%$s%")
                    ->orWhere('email', 'like', "%$s%")
                    ->orWhere('designation', 'like', "%$s%")
                    ->orWhere('city', 'like', "%$s%"));
            })
            ->when($request->city, fn ($q, $c) => $q->where('city', $c))
            ->when($request->filled('status'), fn ($q) => $q->where('is_active', $request->status === 'active'))
            ->withCount(['assignments as active_assignments_count' => fn ($q) => $q->current()])
            ->orderBy('name')
            ->get();

        $open = Attendance::with('client:id,name')
            ->whereIn('staff_id', $staff->pluck('id'))
            ->where('status', '!=', 'completed')
            ->get()
            ->keyBy('staff_id');

        $staff->each(function ($s) use ($open) {
            $a = $open->get($s->id);
            $s->duty_status = $a?->status ?? 'off_duty';
            $s->duty_client = $a?->client?->name;
        });

        return response()->json($staff);
    }

    public function store(Request $request, StaffProfileService $service)
    {
        $data = $service->validate($request, selfRegistration: false);
        $user = $service->save($request, $data, extraUser: ['status' => 'approved', 'approved_at' => now(), 'registered_via' => 'admin']);

        return response()->json($user, 201);
    }

    /** Self-registered staff waiting for review (or rejected). */
    public function applications(Request $request)
    {
        $status = $request->input('status', 'pending');

        return response()->json(
            User::staff()->where('status', $status)->with('profile')->latest()->get()
        );
    }

    public function approve(Request $request, User $staff)
    {
        abort_if($staff->role !== 'staff', 404);
        $data = $request->validate([
            'designation' => ['nullable', 'string', 'max:80'],
            'joining_date' => ['nullable', 'date'],
        ]);

        $staff->update([
            'status' => 'approved',
            'approved_at' => now(),
            'rejection_reason' => null,
            'is_active' => true,
            'designation' => $data['designation'] ?? $staff->designation,
            'joining_date' => $data['joining_date'] ?? $staff->joining_date ?? now()->toDateString(),
        ]);

        return response()->json($staff);
    }

    public function reject(Request $request, User $staff)
    {
        abort_if($staff->role !== 'staff', 404);
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);

        $staff->update(['status' => 'rejected', 'rejection_reason' => $data['reason'] ?? null]);
        $staff->tokens()->delete();

        return response()->json($staff);
    }

    /** Stream a private document (selfie / Aadhaar) to the admin. */
    public function document(User $staff, string $type)
    {
        $path = $staff->profile?->{$type.'_path'};
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, ['Cache-Control' => 'private, max-age=300']);
    }

    public function show(User $staff)
    {
        abort_if($staff->role !== 'staff', 404);

        $staff->load(['profile', 'assignments' => fn ($q) => $q->with('client')->latest()]);

        $monthStart = now()->startOfMonth()->toDateString();
        $staff->stats = [
            'month_minutes' => (int) $staff->attendances()->where('duty_date', '>=', $monthStart)->where('status', 'completed')->sum('worked_minutes'),
            'month_days' => $staff->attendances()->where('duty_date', '>=', $monthStart)->distinct('duty_date')->count('duty_date'),
            'total_minutes' => (int) $staff->attendances()->where('status', 'completed')->sum('worked_minutes'),
        ];
        $staff->recent_attendance = $staff->attendances()->with('client:id,name')->latest('clock_in')->limit(15)->get();
        $staff->finance = [
            'month_earned' => round((float) $staff->attendances()->where('duty_date', '>=', $monthStart)->where('status', 'completed')->sum('staff_amount'), 2),
            'unsettled' => round((float) $staff->attendances()->where('status', 'completed')->whereNull('payout_id')->whereNotNull('approved_at')->sum('staff_amount'), 2),
            'processing' => round((float) $staff->payouts()->where('status', 'pending')->sum('amount'), 2),
            'paid_total' => round((float) $staff->payouts()->where('status', 'paid')->sum('amount'), 2),
        ];
        $staff->payouts_list = $staff->payouts()->latest('period_to')->limit(12)->get();
        $staff->current = $staff->activeAttendance()?->load('client:id,name,address');
        $staff->makeVisible('password_plain');

        return response()->json($staff);
    }

    public function update(Request $request, User $staff, StaffProfileService $service)
    {
        abort_if($staff->role !== 'staff', 404);

        $data = $service->validate($request, selfRegistration: false, user: $staff);
        $staff = $service->save($request, $data, $staff);

        return response()->json($staff);
    }

    public function destroy(User $staff)
    {
        abort_if($staff->role !== 'staff', 404);
        $staff->tokens()->delete();
        Storage::disk('local')->deleteDirectory("staff-docs/{$staff->id}");
        Storage::disk('local')->deleteDirectory("duty-selfies/{$staff->id}");
        $staff->delete();

        return response()->json(['message' => 'Staff deleted']);
    }
}
