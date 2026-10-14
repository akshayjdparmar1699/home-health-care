<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientRegistrationController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\Staff\DutyController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:20,1');
Route::post('/client-register', [ClientRegistrationController::class, 'store'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::get('/push/key', [PushSubscriptionController::class, 'key']);
    Route::post('/push/subscribe', [PushSubscriptionController::class, 'store']);
    Route::post('/push/unsubscribe', [PushSubscriptionController::class, 'destroy']);

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/dashboard', Admin\DashboardController::class);
        Route::get('/notifications', [Admin\NotificationController::class, 'index']);
        Route::post('/notifications/read-all', [Admin\NotificationController::class, 'readAll']);
        Route::post('/notifications/{id}/read', [Admin\NotificationController::class, 'read']);
        Route::get('/applications', [Admin\StaffController::class, 'applications']);
        Route::post('/staff/{staff}/approve', [Admin\StaffController::class, 'approve']);
        Route::post('/staff/{staff}/reject', [Admin\StaffController::class, 'reject']);
        Route::get('/staff/{staff}/documents/{type}', [Admin\StaffController::class, 'document'])->whereIn('type', ['selfie', 'aadhaar_front', 'aadhaar_back']);
        Route::apiResource('staff', Admin\StaffController::class)->parameters(['staff' => 'staff']);
        Route::apiResource('leads/staff', Admin\LeadStaffController::class)->only(['index', 'store', 'update', 'destroy'])->parameters(['staff' => 'staff'])->names('leads.staff');
        Route::apiResource('leads/clients', Admin\LeadClientController::class)->only(['index', 'store', 'update', 'destroy'])->parameters(['clients' => 'client'])->names('leads.clients');
        Route::apiResource('clients', Admin\ClientController::class);
        Route::get('/clients/{client}/visits', [Admin\ClientVisitController::class, 'index']);
        Route::post('/clients/{client}/visits', [Admin\ClientVisitController::class, 'store']);
        Route::put('/visits/{visit}', [Admin\ClientVisitController::class, 'update']);
        Route::delete('/visits/{visit}', [Admin\ClientVisitController::class, 'destroy']);
        Route::apiResource('assignments', Admin\AssignmentController::class)->except('show');
        Route::post('/assignments/{assignment}/close', [Admin\AssignmentController::class, 'close']);
        Route::post('/assignments/{assignment}/reopen', [Admin\AssignmentController::class, 'reopen']);
        Route::get('/attendance', [Admin\AttendanceController::class, 'index']);
        Route::get('/attendance/export', [Admin\AttendanceController::class, 'export']);
        Route::post('/attendance/start', [Admin\AttendanceController::class, 'start']);
        Route::put('/attendance/{attendance}', [Admin\AttendanceController::class, 'update']);
        Route::post('/attendance/{attendance}/close', [Admin\AttendanceController::class, 'close']);
        Route::get('/attendance/{attendance}/selfie', [Admin\AttendanceController::class, 'selfie']);
        Route::post('/attendance/{attendance}/approve', [Admin\AttendanceController::class, 'approve']);
        Route::delete('/attendance/{attendance}', [Admin\AttendanceController::class, 'destroy']);

        Route::get('/payouts/preview', [Admin\PayoutController::class, 'preview']);
        Route::apiResource('payouts', Admin\PayoutController::class);
        Route::get('/invoices/preview', [Admin\InvoiceController::class, 'preview']);
        Route::apiResource('invoices', Admin\InvoiceController::class);
        Route::get('/reports', [Admin\ReportController::class, 'index']);
        Route::get('/cities', [Admin\ReportController::class, 'cities']);
        Route::get('/settings', [Admin\SettingController::class, 'show']);
        Route::put('/settings', [Admin\SettingController::class, 'update']);
    });

    Route::prefix('staff')->middleware('role:staff')->group(function () {
        Route::get('/status', [DutyController::class, 'status']);
        Route::post('/duty/start', [DutyController::class, 'start']);
        Route::post('/duty/break-start', [DutyController::class, 'breakStart']);
        Route::post('/duty/break-end', [DutyController::class, 'breakEnd']);
        Route::post('/duty/end', [DutyController::class, 'end']);
        Route::get('/history', [DutyController::class, 'history']);
        Route::get('/earnings', [DutyController::class, 'earnings']);
        Route::get('/payouts/{payout}', [DutyController::class, 'payslip']);
    });
});
