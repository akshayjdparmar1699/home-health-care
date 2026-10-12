<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Attendance;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\StaffPayout;
use App\Models\User;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $today = now()->toDateString();

        $live = Attendance::with(['staff:id,name,phone,designation', 'client:id,name,address,city', 'breaks'])
            ->where('status', '!=', 'completed')
            ->orderBy('clock_in')
            ->get();

        $todayRecords = Attendance::with('breaks')->whereDate('duty_date', $today)->get();

        // Hours worked per day for the last 7 days.
        $week = collect(range(6, 0))->map(function ($daysAgo) {
            $date = now()->subDays($daysAgo);

            return [
                'date' => $date->toDateString(),
                'label' => $date->format('D'),
                'minutes' => (int) Attendance::whereDate('duty_date', $date->toDateString())->where('status', 'completed')->sum('worked_minutes'),
            ];
        })->values();

        // Active staff with a current assignment but no duty started today.
        $staffWithDutyToday = $todayRecords->pluck('staff_id')->merge($live->pluck('staff_id'))->unique();
        $notStarted = Assignment::current()
            ->with(['staff:id,name,phone,designation', 'client:id,name'])
            ->whereNotIn('staff_id', $staffWithDutyToday)
            ->whereHas('staff', fn ($q) => $q->where('is_active', true))
            ->get()
            ->unique('staff_id')
            ->values();

        return response()->json([
            'stats' => [
                'total_staff' => User::staff()->approved()->where('is_active', true)->count(),
                'total_clients' => Client::where('is_active', true)->count(),
                'active_assignments' => Assignment::current()->count(),
                'on_duty' => $live->where('status', 'on_duty')->count(),
                'on_break' => $live->where('status', 'on_break')->count(),
                'today_minutes' => $todayRecords->sum('live_worked_minutes'),
                'pending_applications' => User::staff()->where('status', 'pending')->count(),
                'pending_approvals' => Attendance::where('status', 'completed')->whereNull('approved_at')->count(),
            ],
            'finance' => $this->finance(),
            'live' => $live,
            'not_started' => $notStarted,
            'week' => $week,
            'recent' => Attendance::with(['staff:id,name', 'client:id,name'])
                ->where('status', 'completed')->latest('clock_out')->limit(8)->get(),
        ]);
    }

    private function finance(): array
    {
        $month = Attendance::where('status', 'completed')->where('duty_date', '>=', now()->startOfMonth()->toDateString());
        $revenue = (float) (clone $month)->sum('client_amount');
        $cost = (float) (clone $month)->sum('staff_amount');

        return [
            'month_revenue' => round($revenue, 2),
            'month_cost' => round($cost, 2),
            'month_profit' => round($revenue - $cost, 2),
            'client_unpaid' => round((float) Invoice::where('status', 'unpaid')->sum('total'), 2),
            'client_unbilled' => round((float) Attendance::where('status', 'completed')->whereNull('invoice_id')->whereNotNull('approved_at')->sum('client_amount'), 2),
            'staff_payable' => round((float) Attendance::where('status', 'completed')->whereNull('payout_id')->whereNotNull('approved_at')->sum('staff_amount')
                + (float) StaffPayout::where('status', 'pending')->sum('amount'), 2),
        ];
    }
}
