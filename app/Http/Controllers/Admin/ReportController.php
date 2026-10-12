<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\StaffPayout;
use App\Models\User;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /** Revenue, staff cost and profit for completed duties, broken down by city, client and staff. */
    public function index(Request $request)
    {
        $from = $request->input('from', now()->startOfMonth()->toDateString());
        $to = $request->input('to', now()->toDateString());
        $city = $request->input('city');

        $rows = Attendance::with(['client:id,name,city', 'staff:id,name,designation'])
            ->where('status', 'completed')
            ->whereBetween('duty_date', [$from, $to])
            ->when($city, fn ($q) => $q->whereHas('client', fn ($q) => $q->where('city', $city)))
            ->get();

        $totals = fn ($group) => [
            'sessions' => $group->count(),
            'minutes' => (int) $group->sum('worked_minutes'),
            'revenue' => round($group->sum('client_amount'), 2),
            'cost' => round($group->sum('staff_amount'), 2),
            'profit' => round($group->sum('client_amount') - $group->sum('staff_amount'), 2),
        ];

        $activeClientsByCity = Client::where('is_active', true)
            ->selectRaw("COALESCE(city, '') as c, COUNT(*) as n")->groupBy('c')->pluck('n', 'c');

        $byCity = $rows->groupBy(fn ($r) => $r->client?->city ?? '')
            ->map(fn ($g, $c) => ['city' => $c ?: null,
                'clients' => $g->pluck('client_id')->filter()->unique()->count(),
                'active_clients' => (int) ($activeClientsByCity[$c] ?? 0),
                'staff' => $g->pluck('staff_id')->unique()->count(),
            ] + $totals($g))
            ->sortByDesc('revenue')->values();

        $byClient = $rows->groupBy('client_id')
            ->map(fn ($g) => ['client_id' => $g->first()->client_id, 'name' => $g->first()->client?->name ?? 'No client',
                'city' => $g->first()->client?->city,
                'unbilled' => round($g->whereNull('invoice_id')->whereNotNull('approved_at')->sum('client_amount'), 2),
            ] + $totals($g))
            ->sortByDesc('revenue')->values();

        $byStaff = $rows->groupBy('staff_id')
            ->map(fn ($g) => ['staff_id' => $g->first()->staff_id, 'name' => $g->first()->staff?->name,
                'designation' => $g->first()->staff?->designation,
                'unsettled' => round($g->whereNull('payout_id')->whereNotNull('approved_at')->sum('staff_amount'), 2),
            ] + $totals($g))
            ->sortByDesc('minutes')->values();

        return response()->json([
            'from' => $from,
            'to' => $to,
            'totals' => $totals($rows),
            'by_city' => $byCity,
            'by_client' => $byClient,
            'by_staff' => $byStaff,
            'outstanding' => [
                'client_unpaid' => round((float) Invoice::where('status', 'unpaid')->sum('total'), 2),
                'client_unbilled' => round((float) Attendance::where('status', 'completed')->whereNull('invoice_id')->whereNotNull('approved_at')->sum('client_amount'), 2),
                'staff_pending' => round((float) StaffPayout::where('status', 'pending')->sum('amount'), 2),
                'staff_unsettled' => round((float) Attendance::where('status', 'completed')->whereNull('payout_id')->whereNotNull('approved_at')->sum('staff_amount'), 2),
            ],
        ]);
    }

    /** Distinct cities used by clients and staff (for filters and suggestions). */
    public function cities()
    {
        return response()->json(
            Client::whereNotNull('city')->distinct()->pluck('city')
                ->merge(User::whereNotNull('city')->distinct()->pluck('city'))
                ->map(fn ($c) => trim($c))->filter()->unique()->sort()->values()
        );
    }
}
