<?php

namespace App\Http\Controllers\Admin;

use App\Models\LeadStaff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Staff inquiries (people asking for a job). */
class LeadStaffController extends LeadController
{
    protected function model(): string
    {
        return LeadStaff::class;
    }

    protected function extraRules(): array
    {
        return [
            'role' => ['nullable', 'string', 'max:80'],
            'experience' => ['nullable', 'string', 'max:80'],
        ];
    }

    protected function searchable(): array
    {
        return ['role', 'notes'];
    }

    public function update(Request $request, LeadStaff $staff): JsonResponse
    {
        return $this->updateLead($request, $staff);
    }

    public function destroy(LeadStaff $staff): JsonResponse
    {
        return $this->deleteLead($staff);
    }
}
