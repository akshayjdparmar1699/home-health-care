@php
    $money = fn ($v) => \Illuminate\Support\Number::currency((float) $v, 'INR', 'en_IN', precision: fmod((float) $v, 1) ? 2 : 0);
    $staff = $payout->staff;
    $profile = $staff?->profile;
    $paid = $payout->status === 'paid';
    $account = $profile?->bank_account_number ? str_repeat('•', max(0, strlen($profile->bank_account_number) - 4)).substr($profile->bank_account_number, -4) : null;
    $hours = intdiv($payout->minutes, 60).'h'.($payout->minutes % 60 ? ' '.($payout->minutes % 60).'m' : '');
@endphp
@extends('share.layout')

@section('title', 'Payment slip '.$payout->slipNumber())
@section('summary', 'Payment slip '.$payout->slipNumber().' for '.($staff?->name ?? 'staff').' · '.$money($payout->amount).($paid ? ' paid' : ' (processing)'))

@section('content')
    <div class="flex flex-col justify-between gap-6 sm:flex-row">
        <div>
            <img src="/brand/logo.png" alt="{{ $business['business_name'] }}" class="mb-3 h-14 w-auto">
            <p class="text-lg font-extrabold text-brand-700">{{ $business['business_name'] }}</p>
            @if ($business['business_address'])
                <p class="mt-1 max-w-xs whitespace-pre-line text-sm text-slate-500">{{ $business['business_address'] }}</p>
            @endif
            <p class="text-sm text-slate-500">{{ collect([$business['business_phone'], $business['business_email']])->filter()->join(' · ') }}</p>
        </div>
        <div class="sm:text-right">
            <p class="text-2xl font-extrabold tracking-tight text-slate-900">PAYMENT SLIP</p>
            <p class="mt-1 font-semibold text-slate-700">{{ $payout->slipNumber() }}</p>
            <p class="text-sm text-slate-500">Period: {{ $payout->period_from->format('d M Y') }} - {{ $payout->period_to->format('d M Y') }}</p>
            <span class="mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold {{ $paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700' }}">{{ $paid ? 'PAID' : 'PROCESSING' }}</span>
        </div>
    </div>

    <div class="mt-8 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 print:bg-transparent print:p-0">
        <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Paid to</p>
            <p class="mt-1 font-bold text-slate-900">{{ $staff?->name }}</p>
            <p class="text-sm text-slate-600">{{ collect([$staff?->designation, $staff?->city])->filter()->join(' · ') }}</p>
            <p class="text-sm text-slate-600">{{ $staff?->phone }}</p>
        </div>
        <div class="sm:text-right">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Payment</p>
            @if ($paid)
                <p class="mt-1 font-semibold text-slate-800">{{ $payout->paid_at?->format('d M Y') }} {{ $payout->payment_method ? 'via '.$payout->payment_method : '' }}</p>
                @if ($payout->reference)<p class="text-sm text-slate-600">Ref: {{ $payout->reference }}</p>@endif
            @else
                <p class="mt-1 font-semibold text-amber-700">Payment is being processed</p>
            @endif
            @if ($profile?->upi_id)<p class="text-sm text-slate-600">UPI: {{ $profile->upi_id }}</p>@endif
            @if ($account)<p class="text-sm text-slate-600">{{ $profile->bank_name ? $profile->bank_name.' · ' : '' }}A/c {{ $account }}</p>@endif
        </div>
    </div>

    <div class="mt-6 overflow-x-auto">
        <table class="w-full text-sm">
            <thead>
                <tr class="border-b-2 border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th class="py-2">Date</th>
                    <th class="py-2">Client</th>
                    <th class="py-2">Shift</th>
                    <th class="py-2 text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($payout->attendances as $a)
                    <tr class="border-b border-slate-100">
                        <td class="py-2.5 pr-2 font-medium text-slate-800">{{ $a->duty_date->format('d M Y') }}</td>
                        <td class="py-2.5 pr-2 text-slate-600">{{ $a->client?->name ?? 'General duty' }}</td>
                        <td class="py-2.5 pr-2 text-slate-600">{{ $a->shift_hours ? $a->shift_hours.' hr'.($a->shift_type ? ' '.ucfirst($a->shift_type) : '') : '-' }} <span class="text-xs text-slate-400">({{ $a->clock_in?->format('h:i A') }} - {{ $a->clock_out?->format('h:i A') }})</span></td>
                        <td class="py-2.5 text-right font-semibold text-slate-900">{{ $money($a->staff_amount) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="mt-4 flex justify-end">
        <div class="w-full max-w-xs space-y-2 text-sm">
            <div class="flex justify-between text-slate-600"><span>{{ $payout->sessions }} shift{{ $payout->sessions === 1 ? '' : 's' }} · {{ $hours }}</span><span>{{ $money($payout->earned) }}</span></div>
            @if ($payout->adjustment != 0)
                <div class="flex justify-between text-slate-600"><span>{{ $payout->adjustment > 0 ? 'Bonus' : 'Deduction' }}</span><span>{{ $payout->adjustment > 0 ? '+' : '-' }} {{ $money(abs($payout->adjustment)) }}</span></div>
            @endif
            <div class="flex justify-between border-t-2 border-slate-200 pt-2 text-lg font-extrabold text-slate-900"><span>{{ $paid ? 'Total paid' : 'Total' }}</span><span>{{ $money($payout->amount) }}</span></div>
        </div>
    </div>

    @if ($payout->notes)
        <div class="mt-6 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 print:bg-transparent print:p-0">
            <span class="font-semibold text-slate-700">Note:</span> {{ $payout->notes }}
        </div>
    @endif

    <p class="mt-10 text-center text-xs text-slate-400">This is a computer generated payment slip from {{ $business['business_name'] }}.</p>
@endsection
