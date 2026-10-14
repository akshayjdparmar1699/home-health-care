<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $clients = Client::query()
            ->when($request->search, function ($q, $s) {
                $q->where(fn ($q) => $q->where('name', 'like', "%$s%")
                    ->orWhere('relative_name', 'like', "%$s%")
                    ->orWhere('relative_phone', 'like', "%$s%")
                    ->orWhere('city', 'like', "%$s%")
                    ->orWhere('address', 'like', "%$s%"));
            })
            ->when($request->filled('status'), fn ($q) => $q->where('is_active', $request->status === 'active'))
            ->when($request->city, fn ($q, $c) => $c === '__none' ? $q->whereNull('city') : $q->where('city', $c))
            ->with(['assignments' => fn ($q) => $q->current()->with('staff:id,name,designation')])
            ->orderBy('name')
            ->get();

        return response()->json($clients);
    }

    public function store(Request $request)
    {
        return response()->json(Client::create($this->validated($request)), 201);
    }

    public function show(Client $client)
    {
        $client->load(['assignments' => fn ($q) => $q->with(['staff:id,name,phone,designation', 'staff.profile:id,user_id,whatsapp'])->latest()]);
        $client->recent_attendance = $client->attendances()->with('staff:id,name')->latest('clock_in')->limit(15)->get();
        $client->month_minutes = (int) $client->attendances()
            ->where('duty_date', '>=', now()->startOfMonth()->toDateString())
            ->where('status', 'completed')->sum('worked_minutes');
        $unbilledVisits = (float) $client->visits()->whereNull('invoice_id')->sum('amount');
        $client->finance = [
            'unbilled' => round((float) $client->attendances()->where('status', 'completed')->whereNull('invoice_id')->whereNotNull('approved_at')->sum('client_amount') + $unbilledVisits, 2),
            'unbilled_visits' => round($unbilledVisits, 2),
            'unbilled_minutes' => (int) $client->attendances()->where('status', 'completed')->whereNull('invoice_id')->whereNotNull('approved_at')->sum('worked_minutes'),
            'billed_unpaid' => round((float) $client->invoices()->where('status', 'unpaid')->sum('total'), 2),
            'paid_total' => round((float) $client->invoices()->where('status', 'paid')->sum('total'), 2),
        ];
        $client->invoices_list = $client->invoices()->latest('issue_date')->limit(12)->get();
        $client->visit_charges = $client->visits()->with('invoice:id,invoice_no,status')->latest('visit_date')->latest('id')->limit(50)->get();

        return response()->json($client);
    }

    public function update(Request $request, Client $client)
    {
        $client->update($this->validated($request));

        if ($client->wasChanged('hourly_charge')) {
            Attendance::reprice(Attendance::where('client_id', $client->id)->whereNull('invoice_id'));
        }

        return response()->json($client);
    }

    public function destroy(Client $client)
    {
        $client->delete();

        return response()->json(['message' => 'Client deleted']);
    }

    private function validated(Request $request): array
    {
        $request->replace(Client::normaliseInput($request->all()));

        return $request->validate([
            ...Client::detailRules(),
            'hourly_charge' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ], ['map_link.regex' => 'Please paste a Google Maps link (open the location in Google Maps, tap Share, then Copy link).']);
    }
}
