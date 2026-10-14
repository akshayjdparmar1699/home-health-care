<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Shared list / add / edit / delete for staff and client inquiries (leads).
 */
abstract class LeadController extends Controller
{
    /** @return class-string<Model> */
    abstract protected function model(): string;

    /**
     * Rules for the fields only this kind of lead has.
     *
     * @return array<string, array<int, mixed>>
     */
    abstract protected function extraRules(): array;

    /** Columns the search box looks in, besides name, phone and city. */
    abstract protected function searchable(): array;

    public function index(Request $request): JsonResponse
    {
        $model = $this->model();

        $leads = $model::query()
            ->when($request->search, function ($q, $s) {
                $q->where(function ($q) use ($s) {
                    foreach (['name', 'phone', 'city', ...$this->searchable()] as $column) {
                        $q->orWhere($column, 'like', "%{$s}%");
                    }
                });
            })
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->get();

        return response()->json([
            'leads' => $leads,
            'counts' => $model::query()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $model = $this->model();
        $lead = $model::create($this->validated($request) + ['created_by' => $request->user()->id]);

        return response()->json($lead, 201);
    }

    protected function updateLead(Request $request, Model $lead): JsonResponse
    {
        $lead->update($this->validated($request));

        return response()->json($lead);
    }

    protected function deleteLead(Model $lead): JsonResponse
    {
        $lead->delete();

        return response()->json(['message' => 'Lead deleted']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $model = $this->model();
        if ($request->filled('city')) {
            $request->merge(['city' => ucwords(strtolower(trim($request->city)))]);
        }

        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:80'],
            'source' => ['nullable', 'string', 'max:40'],
            'status' => ['required', Rule::in($model::STATUSES)],
            'follow_up_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:3000'],
            ...$this->extraRules(),
        ]);
    }
}
