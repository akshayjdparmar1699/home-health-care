<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Attendance;
use App\Models\StaffPayout;
use App\Models\User;
use App\Notifications\DutyCompleted;
use App\Support\ShareLinks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

class DutyController extends Controller
{
    /** Everything the staff home screen needs in one call. */
    public function status(Request $request)
    {
        $user = $request->user();
        $today = now()->toDateString();

        $current = $user->attendances()
            ->with(['client:id,name,relative_name,relative_phone,address,city,map_link', 'breaks'])
            ->where('status', '!=', 'completed')
            ->latest('clock_in')
            ->first();

        $todayRecords = $user->attendances()->with('breaks')->whereDate('duty_date', $today)->get();

        $assignments = Assignment::current()
            ->where('staff_id', $user->id)
            ->with('client')
            ->get();

        return response()->json([
            'current' => $current ? $this->forStaff($current) : null,
            'assignments' => $assignments->each(fn ($a) => $this->forStaffAssignment($a)),
            'today' => [
                'worked_minutes' => $todayRecords->sum('live_worked_minutes'),
                'break_minutes' => $todayRecords->sum('live_break_minutes'),
                'sessions' => $todayRecords->count(),
                'earned' => round($todayRecords->whereNotNull('approved_at')->sum('staff_amount'), 2),
                'pending_approval' => $todayRecords->where('status', 'completed')->whereNull('approved_at')->count(),
            ],
            'server_time' => now()->toIso8601String(),
        ]);
    }

    public function start(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'assignment_id' => ['nullable', 'integer'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'accuracy' => ['nullable', 'numeric', 'min:0'],
            'address' => ['nullable', 'string', 'max:500'],
            'selfie' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ], [
            'selfie.required' => 'Please take a selfie to start your duty.',
        ]);

        if ($user->activeAttendance()) {
            throw ValidationException::withMessages(['duty' => 'You are already on duty.']);
        }

        $assignment = null;
        if (! empty($data['assignment_id'])) {
            $assignment = Assignment::current()->where('staff_id', $user->id)->find($data['assignment_id']);
            if (! $assignment) {
                throw ValidationException::withMessages(['assignment_id' => 'This assignment is not active for you.']);
            }
        }

        $attendance = new Attendance([
            'staff_id' => $user->id,
            'client_id' => $assignment?->client_id,
            'assignment_id' => $assignment?->id,
            'duty_date' => now()->toDateString(),
            'clock_in' => now(),
            'clock_in_lat' => $data['lat'] ?? null,
            'clock_in_lng' => $data['lng'] ?? null,
            'clock_in_accuracy' => isset($data['accuracy']) ? (int) round($data['accuracy']) : null,
            'clock_in_address' => $data['address'] ?? null,
            'clock_in_selfie_path' => $request->file('selfie')->store("duty-selfies/{$user->id}", 'local'),
            'status' => 'on_duty',
        ]);
        $attendance->applyRates()->save();

        return response()->json($this->forStaff($attendance), 201);
    }

    public function breakStart(Request $request)
    {
        $attendance = $this->current($request);

        if ($attendance->status === 'on_break') {
            throw ValidationException::withMessages(['duty' => 'You are already on a break.']);
        }

        $attendance->breaks()->create(['break_start' => now()]);
        $attendance->update(['status' => 'on_break']);

        return response()->json($this->forStaff($attendance));
    }

    public function breakEnd(Request $request)
    {
        $attendance = $this->current($request);

        if ($attendance->status !== 'on_break') {
            throw ValidationException::withMessages(['duty' => 'You are not on a break.']);
        }

        $attendance->breaks()->whereNull('break_end')->update(['break_end' => now()]);
        $attendance->update(['status' => 'on_duty']);

        return response()->json($this->forStaff($attendance));
    }

    public function end(Request $request)
    {
        $data = $request->validate([
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $attendance = $this->current($request);
        $attendance->clock_out_lat = $data['lat'] ?? null;
        $attendance->clock_out_lng = $data['lng'] ?? null;
        $attendance->notes = $data['notes'] ?? null;
        $attendance->finalize(now());

        Notification::send(User::where('role', 'admin')->where('is_active', true)->get(), new DutyCompleted($attendance));

        return response()->json($this->forStaff($attendance));
    }

    public function history(Request $request)
    {
        $from = $request->input('from', now()->subDays(29)->toDateString());
        $to = $request->input('to', now()->toDateString());

        $records = $request->user()->attendances()
            ->with(['client:id,name', 'breaks'])
            ->whereBetween('duty_date', [$from, $to])
            ->latest('clock_in')
            ->get();

        return response()->json([
            'records' => $records->each(function ($r) {
                $r->makeHidden(Attendance::CLIENT_FINANCE);
                if ($r->status === 'completed' && ! $r->approved_at) {
                    $r->makeHidden(['staff_amount', 'live_staff_amount', 'staff_rate']);
                }
            }),
            'summary' => [
                'earned' => round($records->whereNotNull('approved_at')->sum('staff_amount'), 2),
                'pending_approval' => $records->where('status', 'completed')->whereNull('approved_at')->count(),
                'worked_minutes' => $records->sum('live_worked_minutes'),
                'break_minutes' => $records->sum('live_break_minutes'),
                'days' => $records->pluck('duty_date')->map(fn ($d) => $d->toDateString())->unique()->count(),
            ],
        ]);
    }

    /** The staff member's own pay: earned, paid and pending. Never exposes client pricing. */
    public function earnings(Request $request)
    {
        $user = $request->user();
        // Only duties the admin has approved count as earnings.
        $completed = $user->attendances()->where('status', 'completed')->whereNotNull('approved_at');

        $awaiting = $user->attendances()->where('status', 'completed')->whereNull('approved_at')
            ->with('client:id,name')->latest('clock_in')->get(['id', 'client_id', 'duty_date', 'clock_in', 'clock_out', 'worked_minutes', 'shift_hours', 'shift_type', 'status']);

        $unsettled = (clone $completed)->whereNull('payout_id')
            ->with('client:id,name')->latest('clock_in')->get()
            ->each(fn ($r) => $r->makeHidden(Attendance::CLIENT_FINANCE));

        $payouts = $user->payouts()->latest('period_to')->get();

        return response()->json([
            'rate' => $user->hourly_rate,
            'summary' => [
                'month_earned' => round((float) (clone $completed)->where('duty_date', '>=', now()->startOfMonth()->toDateString())->sum('staff_amount'), 2),
                'month_minutes' => (int) (clone $completed)->where('duty_date', '>=', now()->startOfMonth()->toDateString())->sum('worked_minutes'),
                'unsettled' => round($unsettled->sum('staff_amount'), 2),
                'processing' => round($payouts->where('status', 'pending')->sum('amount'), 2),
                'paid_total' => round($payouts->where('status', 'paid')->sum('amount'), 2),
            ],
            'payouts' => $payouts,
            'unsettled' => $unsettled,
            'awaiting_approval' => $awaiting->map(fn ($r) => [
                'id' => $r->id,
                'duty_date' => $r->duty_date->toDateString(),
                'client' => $r->client?->name,
                'shift_hours' => $r->shift_hours,
                'shift_type' => $r->shift_type,
                'worked_minutes' => $r->worked_minutes,
            ]),
        ]);
    }

    /**
     * The staff member's own payment slip link (for viewing / sharing).
     */
    public function payslip(Request $request, StaffPayout $payout): JsonResponse
    {
        abort_unless($payout->staff_id === $request->user()->id, 404);

        return response()->json([
            'id' => $payout->id,
            'slip_no' => $payout->slipNumber(),
            'amount' => $payout->amount,
            'status' => $payout->status,
            'period_from' => $payout->period_from->toDateString(),
            'period_to' => $payout->period_to->toDateString(),
            'share_url' => ShareLinks::payslip($payout),
        ]);
    }

    /** Strip client pricing and unrelated relations before returning a duty to staff. */
    private function forStaff(Attendance $attendance): Attendance
    {
        $attendance->unsetRelations()->load(['client:id,name,relative_name,relative_phone,address,city,map_link', 'breaks']);

        return $attendance->makeHidden(Attendance::CLIENT_FINANCE);
    }

    private function forStaffAssignment($assignment)
    {
        $assignment->makeHidden('client_rate');
        $assignment->client?->makeHidden('hourly_charge');

        return $assignment;
    }

    private function current(Request $request): Attendance
    {
        $attendance = $request->user()->activeAttendance();

        if (! $attendance) {
            throw ValidationException::withMessages(['duty' => 'You are not on duty right now.']);
        }

        return $attendance;
    }
}
