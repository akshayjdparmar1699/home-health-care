<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Public one-page website on the main domain. Server-rendered (no React) so it loads fast
 * and search engines can read it. Contact details come from the admin's business Settings.
 */
class SiteController extends Controller
{
    public function home(Request $request): View|RedirectResponse
    {
        // Phones that installed the app before it opened on /staff still start at "/?source=pwa".
        if ($request->query('source') === 'pwa') {
            return redirect('/staff');
        }

        // The website should still open if the database is briefly unavailable.
        $settings = rescue(fn () => Setting::allValues(), ['business_name' => 'Yours Home Healthcare', 'business_phone' => null, 'business_address' => null, 'business_email' => null], report: false);
        $phone = preg_replace('/\D/', '', (string) $settings['business_phone']);

        return view('site.home', [
            'name' => $settings['business_name'],
            'address' => $settings['business_address'],
            'email' => $settings['business_email'],
            'phone' => $settings['business_phone'],
            'telLink' => $phone ? 'tel:+'.(strlen($phone) === 10 ? '91'.$phone : $phone) : null,
            'whatsappLink' => $phone ? 'https://wa.me/'.(strlen($phone) === 10 ? '91'.$phone : $phone).'?text='.rawurlencode('Hello, I would like to know about home care services.') : null,
        ]);
    }
}
