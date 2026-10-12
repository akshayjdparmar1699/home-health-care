<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\StaffPayout;
use App\Support\ShareLinks;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PayoutController extends Controller
{
    public function index(Request $request)
    {
        $payouts = StaffPayout::with('staff:id,name,designation,phone')
            ->when($request->staff_id, fn ($q, $id) => $q->where('staff_id', $id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest('period_to')->latest('id')
            ->get();

        // Completed duties not yet included in any payout, per staff.
        $unsettled = Attendance::query()
            ->select('staff_id', DB::raw('COUNT(*) as sessions'), DB::raw('SUM(worked_minutes) as minutes'),
                DB::raw('SUM(staff_amount) as amount'), DB::raw('MIN(duty_date) as from_date'), DB::raw('MAX(duty_date) as to_date'))
            ->where('status', 'completed')
            ->whereNull('payout_id')->whereNotNull('approved_at')
            ->groupBy('staff_id')
            ->with('staff:id,name,designation')
            ->get()
            ->map(fn ($r) => [
                'staff_id' => $r->staff_id,
                'staff' => $r->staff,
                'sessions' => (int) $r->sessions,
                'minutes' => (int) $r->minutes,
                'amount' => round((float) $r->amount, 2),
                'from' => $r->from_date,
                'to' => $r->to_date,
            ])
            ->sortByDesc('amount')->values();

        return response()->json([
            'payouts' => $payouts,
            'unsettled' => $unsettled,
            'summary' => [
                'unsettled' => round($unsettled->sum('amount'), 2),
                'pending' => round($payouts->where('status', 'pending')->sum('amount'), 2),
                'paid_this_month' => round($payouts->where('status', 'paid')
                    ->filter(fn ($p) => $p->paid_at && $p->paid_at->isSameMonth(now()))->sum('amount'), 2),
            ],
        ]);
    }

    /** What a payout for this staff and period would contain. */
    public function preview(Request $request)
    {
        $data = $this->periodRules($request);
        $rows = $this->unsettledQuery($data)->with('client:id,name')->orderBy('clock_in')->get();

        return response()->json([
            'sessions' => $rows->count(),
            'minutes' => (int) $rows->sum('worked_minutes'),
            'earned' => round($rows->sum('staff_amount'), 2),
            'records' => $rows->map(fn ($r) => [
                'id' => $r->id,
                'duty_date' => $r->duty_date->toDateString(),
                'client' => $r->client?->name,
                'worked_minutes' => $r->worked_minutes,
                'shift_hours' => $r->shift_hours,
                'shift_type' => $r->shift_type,
                'staff_rate' => $r->staff_rate,
                'staff_amount' => $r->staff_amount,
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->periodRules($request) + $request->validate([
            'adjustment' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'mark_paid' => ['boolean'],
            'payment_method' => ['nullable', 'string', 'max:40'],
            'reference' => ['nullable', 'string', 'max:120'],
        ]);

        $payout = DB::transaction(function () use ($data) {
            $rows = $this->unsettledQuery($data)->lockForUpdate()->get();
            if ($rows->isEmpty()) {
                throw ValidationException::withMessages(['period' => 'No unpaid duties found for this staff in the selected period.']);
            }

            $earned = round($rows->sum('staff_amount'), 2);
            $adjustment = round((float) ($data['adjustment'] ?? 0), 2);
            $paid = ! empty($data['mark_paid']);

            $payout = StaffPayout::create([
                'staff_id' => $data['staff_id'],
                'period_from' => $data['from'],
                'period_to' => $data['to'],
                'sessions' => $rows->count(),
                'minutes' => (int) $rows->sum('worked_minutes'),
                'earned' => $earned,
                'adjustment' => $adjustment,
                'amount' => max(0, $earned + $adjustment),
                'status' => $paid ? 'paid' : 'pending',
                'paid_at' => $paid ? now() : null,
                'payment_method' => $data['payment_method'] ?? null,
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            Attendance::whereIn('id', $rows->pluck('id'))->update(['payout_id' => $payout->id]);

            return $payout;
        });

        return response()->json($payout->load('staff:id,name'), 201);
    }

    public function show(StaffPayout $payout)
    {
        $payout->load(['staff:id,name,designation,phone', 'staff.profile:id,user_id,whatsapp', 'attendances' => fn ($q) => $q->with('client:id,name')->orderBy('clock_in')]);

        return response()->json($payout->toArray() + [
            'slip_no' => $payout->slipNumber(),
            'share_url' => ShareLinks::payslip($payout),
            'whatsapp' => $payout->staff?->profile?->whatsapp ?: $payout->staff?->phone,
        ]);
    }

    public function update(Request $request, StaffPayout $payout)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'paid'])],
            'adjustment' => ['nullable', 'numeric'],
            'payment_method' => ['nullable', 'string', 'max:40'],
            'reference' => ['nullable', 'string', 'max:120'],
            'paid_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $adjustment = round((float) ($data['adjustment'] ?? $payout->adjustment), 2);
        $payout->fill([
            'status' => $data['status'],
            'adjustment' => $adjustment,
            'amount' => max(0, $payout->earned + $adjustment),
            'payment_method' => $data['payment_method'] ?? $payout->payment_method,
            'reference' => $data['reference'] ?? $payout->reference,
            'notes' => $data['notes'] ?? $payout->notes,
            'paid_at' => $data['status'] === 'paid' ? ($data['paid_at'] ?? $payout->paid_at ?? now()) : null,
        ])->save();

        return response()->json($payout->load('staff:id,name'));
    }

    /** Deleting a payout releases its duties so they can be paid again. */
    public function destroy(StaffPayout $payout)
    {
        DB::transaction(function () use ($payout) {
            $payout->attendances()->update(['payout_id' => null]);
            $payout->delete();
        });

        return response()->json(['message' => 'Payout deleted']);
    }

    private function periodRules(Request $request): array
    {
        return $request->validate([
            'staff_id' => ['required', Rule::exists('users', 'id')->where('role', 'staff')],
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);
    }

    private function unsettledQuery(array $data)
    {
        return Attendance::where('staff_id', $data['staff_id'])
            ->where('status', 'completed')
            ->whereNull('payout_id')->whereNotNull('approved_at')
            ->whereBetween('duty_date', [$data['from'], $data['to']]);
    }
}
