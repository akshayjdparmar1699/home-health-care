<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AssignmentController extends Controller
{
    /** Staff / client details needed to show an assignment and share it on WhatsApp. */
    private const WITH = [
        'staff:id,name,phone,designation',
        'staff.profile:id,user_id,whatsapp',
        'client:id,name,phone,age,address,city,pincode',
    ];

    public function index(Request $request)
    {
        $assignments = Assignment::with(self::WITH)
            ->withCount(['attendances as shifts_count' => fn ($q) => $q->where('status', 'completed')])
            ->withSum(['attendances as staff_total' => fn ($q) => $q->where('status', 'completed')], 'staff_amount')
            ->withSum(['attendances as client_total' => fn ($q) => $q->where('status', 'completed')], 'client_amount')
            ->withMin(['attendances as first_duty' => fn ($q) => $q->where('status', 'completed')], 'duty_date')
            ->withMax(['attendances as last_duty' => fn ($q) => $q->where('status', 'completed')], 'duty_date')
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->staff_id, fn ($q, $id) => $q->where('staff_id', $id))
            ->when($request->client_id, fn ($q, $id) => $q->where('client_id', $id))
            ->when($request->city, fn ($q, $c) => $q->whereHas('client', fn ($q) => $q->where('city', $c)))
            ->when($request->search, function ($q, $s) {
                $q->where(fn ($q) => $q->whereHas('staff', fn ($q) => $q->where('name', 'like', "%$s%"))
                    ->orWhereHas('client', fn ($q) => $q->where('name', 'like', "%$s%")));
            })
            ->orderByRaw("status = 'closed'")
            ->orderByDesc($request->status === 'closed' ? 'closed_at' : 'created_at')
            ->get();

        return response()->json($assignments);
    }

    public function store(Request $request)
    {
        $assignment = Assignment::create($this->validated($request) + ['status' => 'active']);

        return response()->json($assignment->load(self::WITH), 201);
    }

    public function update(Request $request, Assignment $assignment)
    {
        $assignment->update($this->validated($request));

        // New shift / rates apply to duties started from now on. Past duties keep the rate they were
        // done at, unless the admin asks to correct unpaid / unbilled ones too.
        if ($request->boolean('apply_to_past')) {
            Attendance::reprice(Attendance::where('assignment_id', $assignment->id));
        }

        return response()->json($assignment->load(self::WITH));
    }

    /** Work with this client is finished: hide it from the staff app but keep it as history. */
    public function close(Request $request, Assignment $assignment)
    {
        $data = $request->validate([
            'closed_on' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $onDuty = Attendance::where('assignment_id', $assignment->id)->where('status', '!=', 'completed')->exists();
        if ($onDuty) {
            throw ValidationException::withMessages([
                'assignment' => 'This staff is on duty for this client right now. End the duty first (Attendance page), then close.',
            ]);
        }

        $closedAt = ! empty($data['closed_on']) ? Carbon::parse($data['closed_on'])->setTimeFrom(now()) : now();
        $assignment->update([
            'status' => 'closed',
            'closed_at' => $closedAt,
            'end_date' => $closedAt->toDateString(),
            'close_note' => $data['note'] ?? null,
        ]);

        return response()->json($assignment);
    }

    public function reopen(Assignment $assignment)
    {
        $assignment->update(['status' => 'active', 'closed_at' => null, 'end_date' => null, 'close_note' => null]);

        return response()->json($assignment);
    }

    public function destroy(Assignment $assignment)
    {
        $assignment->delete();

        return response()->json(['message' => 'Assignment removed']);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'staff_id' => ['required', Rule::exists('users', 'id')->where('role', 'staff')->where('status', 'approved')],
            'client_id' => ['required', 'exists:clients,id'],
            'start_date' => ['nullable', 'date'],
            'shift_start' => ['nullable', 'date_format:H:i,H:i:s'],
            'shift_end' => ['nullable', 'date_format:H:i,H:i:s'],
            'shift_hours' => ['required', Rule::in([8, 12, 24])],
            'shift_type' => ['required', Rule::in(['day', 'night'])],
            'staff_rate' => ['required', 'numeric', 'min:0'],
            'client_rate' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ], [
            'shift_hours.required' => 'Please choose the shift (8, 12 or 24 hours).',
            'shift_type.required' => 'Please choose Day or Night shift.',
            'staff_rate.required' => 'Enter how much the staff gets per shift.',
            'client_rate.required' => 'Enter how much the client pays per shift.',
        ]);

        $data['start_date'] = $data['start_date'] ?? now()->toDateString();

        // Shift end follows from the start time and shift length.
        if (! empty($data['shift_start'])) {
            $data['shift_end'] = Carbon::createFromFormat('H:i', substr($data['shift_start'], 0, 5))
                ->addHours((int) $data['shift_hours'])->format('H:i');
        }

        return $data;
    }
}
