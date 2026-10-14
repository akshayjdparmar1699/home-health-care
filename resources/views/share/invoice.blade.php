@php
    $money = fn ($v) => \Illuminate\Support\Number::currency((float) $v, 'INR', 'en_IN', precision: fmod((float) $v, 1) ? 2 : 0);
    $client = $invoice->client;
    $paid = $invoice->status === 'paid';
@endphp
@extends('share.layout')

@section('title', 'Bill '.$invoice->invoice_no)
@section('summary', 'Bill '.$invoice->invoice_no.' for '.($client?->name ?? 'client').' · '.$money($invoice->total).($paid ? ' · Paid' : ''))

@section('content')
    <div class="flex flex-col justify-between gap-6 sm:flex-row">
        <div>
            <img src="/brand/logo.png" alt="{{ $business['business_name'] }}" class="mb-3 h-14 w-auto">
            <p class="text-lg font-extrabold text-brand-700">{{ $business['business_name'] }}</p>
            @if ($business['business_address'])
                <p class="mt-1 max-w-xs whitespace-pre-line text-sm text-slate-500">{{ $business['business_address'] }}</p>
            @endif
            <p class="text-sm text-slate-500">{{ collect([$business['business_phone'], $business['business_email']])->filter()->join(' · ') }}</p>
            @if ($business['gstin'])
                <p class="text-sm text-slate-500">GSTIN: {{ $business['gstin'] }}</p>
            @endif
        </div>
        <div class="sm:text-right">
            <p class="text-3xl font-extrabold tracking-tight text-slate-900">BILL</p>
            <p class="mt-1 font-semibold text-slate-700">{{ $invoice->invoice_no }}</p>
            <p class="text-sm text-slate-500">Date: {{ $invoice->issue_date->format('d M Y') }}</p>
            @if ($invoice->due_date)
                <p class="text-sm text-slate-500">Due: {{ $invoice->due_date->format('d M Y') }}</p>
            @endif
            <span class="mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold {{ $paid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700' }}">{{ $paid ? 'PAID' : 'UNPAID' }}</span>
        </div>
    </div>

    <div class="mt-8 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 print:bg-transparent print:p-0">
        <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Bill to</p>
            <p class="mt-1 font-bold text-slate-900">{{ $client?->name }}</p>
            <p class="text-sm text-slate-600">{{ collect([$client?->address, $client?->city, $client?->pincode])->filter()->join(', ') }}</p>
            <p class="text-sm text-slate-600">{{ collect([$client?->relative_name, $client?->relative_phone])->filter()->join(' · ') }}</p>
        </div>
        <div class="sm:text-right">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Service period</p>
            <p class="mt-1 font-semibold text-slate-800">{{ $invoice->period_from->format('d M Y') }} - {{ $invoice->period_to->format('d M Y') }}</p>
        </div>
    </div>

    <div class="mt-6 overflow-x-auto">
        <table class="w-full text-sm">
            <thead>
                <tr class="border-b-2 border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th class="py-2">Description</th>
                    <th class="py-2 text-right">Qty</th>
                    <th class="py-2 text-right">Rate</th>
                    <th class="py-2 text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($invoice->items as $item)
                    <tr class="border-b border-slate-100">
                        <td class="py-3 pr-2 font-medium text-slate-800">{{ $item->description }}</td>
                        <td class="py-3 text-right text-slate-600">{{ $item->quantity ? rtrim(rtrim(number_format($item->quantity, 2), '0'), '.').' '.$item->unit : '-' }}</td>
                        <td class="py-3 text-right text-slate-600">{{ $item->rate ? $money($item->rate) : '-' }}</td>
                        <td class="py-3 text-right font-semibold text-slate-900">{{ $money($item->amount) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="mt-4 flex justify-end">
        <div class="w-full max-w-xs space-y-2 text-sm">
            <div class="flex justify-between text-slate-600"><span>Subtotal</span><span>{{ $money($invoice->subtotal) }}</span></div>
            @if ($invoice->discount > 0)
                <div class="flex justify-between text-slate-600"><span>Discount</span><span>- {{ $money($invoice->discount) }}</span></div>
            @endif
            <div class="flex justify-between border-t-2 border-slate-200 pt-2 text-lg font-extrabold text-slate-900"><span>Total</span><span>{{ $money($invoice->total) }}</span></div>
            @if ($paid)
                <p class="text-right text-xs text-emerald-700">Paid on {{ $invoice->paid_at?->format('d M Y') }} {{ $invoice->payment_method ? 'via '.$invoice->payment_method : '' }}</p>
            @endif
        </div>
    </div>

    @if ($invoice->notes || $business['bank_details'] || $business['invoice_terms'])
        <div class="mt-8 grid gap-4 border-t border-slate-100 pt-6 text-sm sm:grid-cols-2">
            @if ($business['bank_details'])
                <div>
                    <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Payment details</p>
                    <p class="mt-1 whitespace-pre-line text-slate-600">{{ $business['bank_details'] }}</p>
                </div>
            @endif
            @if ($invoice->notes || $business['invoice_terms'])
                <div>
                    <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Notes</p>
                    @if ($invoice->notes)<p class="mt-1 whitespace-pre-line text-slate-600">{{ $invoice->notes }}</p>@endif
                    @if ($business['invoice_terms'])<p class="mt-1 whitespace-pre-line text-slate-500">{{ $business['invoice_terms'] }}</p>@endif
                </div>
            @endif
        </div>
    @endif

    @if ($invoice->attendances->isNotEmpty())
        <div class="mt-8 border-t border-slate-100 pt-6">
            <p class="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Visit details</p>
            <table class="w-full text-xs">
                <tbody>
                    @foreach ($invoice->attendances as $a)
                        <tr class="border-b border-slate-50">
                            <td class="py-1.5 text-slate-600">{{ $a->duty_date->format('d M Y') }}</td>
                            <td class="py-1.5 text-slate-600">{{ $a->staff?->name }}</td>
                            <td class="py-1.5 text-slate-600">{{ $a->clock_in?->format('h:i A') }} - {{ $a->clock_out?->format('h:i A') }}</td>
                            <td class="py-1.5 text-right text-slate-600">{{ $a->shift_hours ? $a->shift_hours.' hr '.($a->shift_type ? ucfirst($a->shift_type).' ' : '').'shift' : '' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif

    <p class="mt-10 text-center text-xs text-slate-400">Thank you for trusting {{ $business['business_name'] }} with your care.</p>
@endsection
