<?php

namespace App\Support;

use App\Models\Invoice;
use App\Models\StaffPayout;
use Illuminate\Support\Facades\URL;

/**
 * Public, tamper-proof links to a bill or a payment slip, for sharing on WhatsApp etc.
 * Signed as relative URLs so the same link works on any host the app is opened from.
 */
class ShareLinks
{
    public static function invoice(Invoice $invoice): string
    {
        return self::absolute(URL::signedRoute('share.invoice', ['invoice' => $invoice->id], absolute: false));
    }

    public static function payslip(StaffPayout $payout): string
    {
        return self::absolute(URL::signedRoute('share.payslip', ['payout' => $payout->id], absolute: false));
    }

    private static function absolute(string $path): string
    {
        return request()->getSchemeAndHttpHost().$path;
    }
}
