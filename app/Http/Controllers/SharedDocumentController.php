<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Setting;
use App\Models\StaffPayout;
use Illuminate\Contracts\View\View;

/**
 * Bill and payment slip pages opened from a shared (signed) link, no login needed.
 */
class SharedDocumentController extends Controller
{
    public function invoice(Invoice $invoice): View
    {
        $invoice->load(['client', 'items', 'attendances' => fn ($q) => $q->with('staff:id,name')->orderBy('clock_in')]);

        return view('share.invoice', ['invoice' => $invoice, 'business' => Setting::allValues()]);
    }

    public function payslip(StaffPayout $payout): View
    {
        $payout->load([
            'staff:id,name,designation,phone,city',
            'staff.profile:id,user_id,bank_name,bank_account_number,bank_ifsc,upi_id',
            'attendances' => fn ($q) => $q->with('client:id,name')->orderBy('clock_in'),
        ]);

        return view('share.payslip', ['payout' => $payout, 'business' => Setting::allValues()]);
    }
}
