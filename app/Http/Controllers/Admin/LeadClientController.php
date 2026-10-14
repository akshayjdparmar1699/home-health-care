<?php

namespace App\Http\Controllers\Admin;

use App\Models\LeadClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Client inquiries (families asking about care). */
class LeadClientController extends LeadController
{
    protected function model(): string
    {
        return LeadClient::class;
    }

    protected function extraRules(): array
    {
        return [
            'patient_name' => ['nullable', 'string', 'max:255'],
            'service' => ['nullable', 'string', 'max:80'],
        ];
    }

    protected function searchable(): array
    {
        return ['patient_name', 'service', 'notes'];
    }

    public function update(Request $request, LeadClient $client): JsonResponse
    {
        return $this->updateLead($request, $client);
    }

    public function destroy(LeadClient $client): JsonResponse
    {
        return $this->deleteLead($client);
    }
}
