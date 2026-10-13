<?php

use App\Http\Controllers\SharedDocumentController;
use App\Http\Controllers\SiteController;
use Illuminate\Support\Facades\Route;

// Shared bill / payment slip pages (signed links, no login).
Route::middleware('signed:relative')->group(function () {
    Route::get('/share/invoice/{invoice}', [SharedDocumentController::class, 'invoice'])->name('share.invoice');
    Route::get('/share/payslip/{payout}', [SharedDocumentController::class, 'payslip'])->name('share.payslip');
});

// Public website on the main domain.
Route::get('/', [SiteController::class, 'home'])->name('home');

// The React SPA handles every other non-API route.
Route::view('/{any?}', 'app')->where('any', '^(?!api|up|share/).*$');
