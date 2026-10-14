<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientVisit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Visit charges on a client (date, amount, description). Unbilled visits are added to the
 * client's next bill along with the staff duties; billed ones are locked.
 */
class ClientVisitController extends Controller
{
    public function index(Client $client): JsonResponse
    {
        return response()->json(
            $client->visits()->with('invoice:id,invoice_no,status')->latest('visit_date')->latest('id')->get()
        );
    }

    public function store(Request $request, Client $client): JsonResponse
    {
        $visit = $client->visits()->create($this->validated($request) + ['created_by' => $request->user()->id]);

        return response()->json($visit, 201);
    }

    public function update(Request $request, ClientVisit $visit): JsonResponse
    {
        $this->ensureNotBilled($visit);
        $visit->update($this->validated($request));

        return response()->json($visit);
    }

    public function destroy(ClientVisit $visit): JsonResponse
    {
        $this->ensureNotBilled($visit);
        $visit->delete();

        return response()->json(['message' => 'Visit deleted']);
    }

    /**
     * @return array{visit_date: string, amount: float|string, description: string}
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'visit_date' => ['required', 'date', 'before_or_equal:'.now()->addDay()->toDateString()],
            'amount' => ['required', 'numeric', 'min:0', 'max:9999999'],
            'description' => ['required', 'string', 'max:255'],
        ], [
            'visit_date.before_or_equal' => 'The visit date cannot be in the future.',
        ]);
    }

    private function ensureNotBilled(ClientVisit $visit): void
    {
        if ($visit->invoice_id) {
            throw ValidationException::withMessages(['visit' => 'This visit is already on a bill. Delete that bill first to change it.']);
        }
    }
}
