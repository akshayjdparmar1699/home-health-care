<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function show()
    {
        return response()->json(Setting::allValues());
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'business_name' => ['required', 'string', 'max:255'],
            'business_address' => ['nullable', 'string', 'max:1000'],
            'business_phone' => ['nullable', 'string', 'max:40'],
            'business_email' => ['nullable', 'email', 'max:255'],
            'gstin' => ['nullable', 'string', 'max:30'],
            'bank_details' => ['nullable', 'string', 'max:1000'],
            'invoice_terms' => ['nullable', 'string', 'max:1000'],
        ]);

        foreach ($data as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        return response()->json(Setting::allValues());
    }
}
