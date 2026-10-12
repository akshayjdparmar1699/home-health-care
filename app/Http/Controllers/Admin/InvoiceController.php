<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Setting;
use App\Support\ShareLinks;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $invoices = Invoice::with('client:id,name,city,phone')
            ->when($request->client_id, fn ($q, $id) => $q->where('client_id', $id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->city, fn ($q, $c) => $q->whereHas('client', fn ($q) => $q->where('city', $c)))
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q->where('invoice_no', 'like', "%$s%")
                ->orWhereHas('client', fn ($q) => $q->where('name', 'like', "%$s%"))))
            ->latest('issue_date')->latest('id')
            ->get();

        // Work done but not billed yet, per client.
        $unbilled = Attendance::query()
            ->select('client_id', DB::raw('COUNT(*) as sessions'), DB::raw('SUM(worked_minutes) as minutes'),
                DB::raw('SUM(client_amount) as amount'), DB::raw('MIN(duty_date) as from_date'), DB::raw('MAX(duty_date) as to_date'))
            ->where('status', 'completed')
            ->whereNull('invoice_id')->whereNotNull('approved_at')
            ->whereNotNull('client_id')
            ->groupBy('client_id')
            ->with('client:id,name,city')
            ->get()
            ->map(fn ($r) => [
                'client_id' => $r->client_id,
                'client' => $r->client,
                'sessions' => (int) $r->sessions,
                'minutes' => (int) $r->minutes,
                'amount' => round((float) $r->amount, 2),
                'from' => $r->from_date,
                'to' => $r->to_date,
            ])
            ->sortByDesc('amount')->values();

        return response()->json([
            'invoices' => $invoices,
            'unbilled' => $unbilled,
            'summary' => [
                'unbilled' => round($unbilled->sum('amount'), 2),
                'unpaid' => round($invoices->where('status', 'unpaid')->sum('total'), 2),
                'paid_this_month' => round($invoices->where('status', 'paid')
                    ->filter(fn ($i) => $i->paid_at && $i->paid_at->isSameMonth(now()))->sum('total'), 2),
            ],
        ]);
    }

    /** Line items a bill for this client and period would contain. */
    public function preview(Request $request)
    {
        $data = $this->periodRules($request);
        $rows = $this->unbilledQuery($data)->with('staff:id,name,designation')->get();

        return response()->json([
            'client' => Client::find($data['client_id'], ['id', 'name', 'city']),
            'sessions' => $rows->count(),
            'minutes' => (int) $rows->sum('worked_minutes'),
            'items' => $this->buildItems($rows),
            'subtotal' => round($rows->sum('client_amount'), 2),
            'missing_rate' => $rows->where('client_amount', '<=', 0)->count(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->periodRules($request) + $request->validate([
            'issue_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:issue_date'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'extra_items' => ['array'],
            'extra_items.*.description' => ['required', 'string', 'max:255'],
            'extra_items.*.amount' => ['required', 'numeric'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $invoice = DB::transaction(function () use ($data) {
            $rows = $this->unbilledQuery($data)->with('staff:id,name,designation')->lockForUpdate()->get();
            $extras = collect($data['extra_items'] ?? []);

            if ($rows->isEmpty() && $extras->isEmpty()) {
                throw ValidationException::withMessages(['period' => 'No unbilled duties for this client in the selected period.']);
            }

            $items = $this->buildItems($rows);
            $subtotal = round($rows->sum('client_amount') + $extras->sum('amount'), 2);
            $discount = round((float) ($data['discount'] ?? 0), 2);

            $invoice = Invoice::create([
                'invoice_no' => Invoice::nextNumber(),
                'client_id' => $data['client_id'],
                'period_from' => $data['from'],
                'period_to' => $data['to'],
                'issue_date' => $data['issue_date'],
                'due_date' => $data['due_date'] ?? null,
                'minutes' => (int) $rows->sum('worked_minutes'),
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => max(0, $subtotal - $discount),
                'status' => 'unpaid',
                'notes' => $data['notes'] ?? null,
            ]);

            $sort = 0;
            foreach ($items as $item) {
                $invoice->items()->create($item + ['sort' => $sort++]);
            }
            foreach ($extras as $extra) {
                $invoice->items()->create(['description' => $extra['description'], 'amount' => $extra['amount'], 'sort' => $sort++]);
            }

            Attendance::whereIn('id', $rows->pluck('id'))->update(['invoice_id' => $invoice->id]);

            return $invoice;
        });

        return response()->json($invoice, 201);
    }

    public function show(Invoice $invoice)
    {
        $invoice->load(['client', 'items', 'attendances' => fn ($q) => $q->with('staff:id,name')->orderBy('clock_in')]);
        $invoice->attendances->each->makeHidden(['staff_rate', 'staff_amount', 'live_staff_amount']);

        return response()->json([
            'invoice' => $invoice,
            'business' => Setting::allValues(),
            'cost' => round((float) Attendance::where('invoice_id', $invoice->id)->sum('staff_amount'), 2),
            'share_url' => ShareLinks::invoice($invoice),
        ]);
    }

    public function update(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['unpaid', 'paid'])],
            'due_date' => ['nullable', 'date'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'string', 'max:40'],
            'reference' => ['nullable', 'string', 'max:120'],
            'paid_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $discount = round((float) ($data['discount'] ?? $invoice->discount), 2);
        $invoice->fill([
            'status' => $data['status'],
            'due_date' => array_key_exists('due_date', $data) ? $data['due_date'] : $invoice->due_date,
            'discount' => $discount,
            'total' => max(0, $invoice->subtotal - $discount),
            'payment_method' => $data['payment_method'] ?? $invoice->payment_method,
            'reference' => $data['reference'] ?? $invoice->reference,
            'notes' => $data['notes'] ?? $invoice->notes,
            'paid_at' => $data['status'] === 'paid' ? ($data['paid_at'] ?? $invoice->paid_at ?? now()) : null,
        ])->save();

        return response()->json($invoice);
    }

    /** Deleting a bill releases its duties so they can be billed again. */
    public function destroy(Invoice $invoice)
    {
        DB::transaction(function () use ($invoice) {
            $invoice->attendances()->update(['invoice_id' => null]);
            $invoice->delete();
        });

        return response()->json(['message' => 'Bill deleted']);
    }

    /** One line per staff member, shift (length + day / night) and per-shift rate. */
    private function buildItems($rows): array
    {
        return $rows->groupBy(fn ($r) => $r->staff_id.'|'.$r->shift_hours.'|'.$r->shift_type.'|'.$r->client_rate)
            ->map(function ($group) {
                $first = $group->first();
                $staff = $first->staff;
                $count = $group->count();
                $shift = $first->shift_hours
                    ? $first->shift_hours.'-hour '.($first->shift_type ? ucfirst($first->shift_type).' ' : '').'shift'
                    : 'Duty';

                return [
                    'description' => $shift.' - '.trim(($staff?->designation ? $staff->designation.' ' : '').($staff?->name ?? 'Staff')),
                    'staff_id' => $first->staff_id,
                    'minutes' => (int) $group->sum('worked_minutes'),
                    'quantity' => $count,
                    'unit' => $count === 1 ? 'shift' : 'shifts',
                    'rate' => $first->client_rate,
                    'amount' => round($group->sum('client_amount'), 2),
                ];
            })
            ->values()->all();
    }

    private function periodRules(Request $request): array
    {
        return $request->validate([
            'client_id' => ['required', 'exists:clients,id'],
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);
    }

    private function unbilledQuery(array $data)
    {
        return Attendance::where('client_id', $data['client_id'])
            ->where('status', 'completed')
            ->whereNull('invoice_id')->whereNotNull('approved_at')
            ->whereBetween('duty_date', [$data['from'], $data['to']]);
    }
}
