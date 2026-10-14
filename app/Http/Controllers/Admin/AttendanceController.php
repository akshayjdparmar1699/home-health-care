<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Attendance;
use App\Notifications\DutyApproved;
use App\Notifications\DutyRecordedByAdmin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $records = $this->filtered($request)->get();

        $summary = [
            'sessions' => $records->count(),
            'worked_minutes' => $records->sum('live_worked_minutes'),
            'break_minutes' => $records->sum('live_break_minutes'),
            'staff_count' => $records->pluck('staff_id')->unique()->count(),
            'staff_amount' => round($records->sum('live_staff_amount'), 2),
            'client_amount' => round($records->sum('live_client_amount'), 2),
            'pending_approval' => Attendance::where('status', 'completed')->whereNull('approved_at')->count(),
        ];

        // Per-staff totals for the selected range.
        $byStaff = $records->groupBy('staff_id')->map(fn ($rows) => [
            'staff_id' => $rows->first()->staff_id,
            'name' => $rows->first()->staff?->name,
            'designation' => $rows->first()->staff?->designation,
            'days' => $rows->pluck('duty_date')->map(fn ($d) => $d->toDateString())->unique()->count(),
            'sessions' => $rows->count(),
            'worked_minutes' => $rows->sum('live_worked_minutes'),
            'break_minutes' => $rows->sum('live_break_minutes'),
            'staff_amount' => round($rows->sum('live_staff_amount'), 2),
            'client_amount' => round($rows->sum('live_client_amount'), 2),
        ])->values()->sortByDesc('worked_minutes')->values();

        return response()->json(['records' => $records, 'summary' => $summary, 'by_staff' => $byStaff]);
    }

    public function export(Request $request)
    {
        $records = $this->filtered($request)->get();
        $filename = 'attendance-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($records) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Date', 'Staff', 'Designation', 'Client', 'City', 'Shift (hrs)', 'Clock In', 'Clock Out', 'Break (min)', 'Worked (hrs)', 'Staff Pay', 'Client Charge', 'Status']);
            foreach ($records as $r) {
                fputcsv($out, [
                    $r->duty_date->toDateString(),
                    $r->staff?->name,
                    $r->staff?->designation,
                    $r->client?->name,
                    $r->client?->city,
                    $r->shift_hours,
                    $r->clock_in->format('d-m-Y h:i A'),
                    $r->clock_out?->format('d-m-Y h:i A') ?? '-',
                    $r->live_break_minutes,
                    round($r->live_worked_minutes / 60, 2),
                    $r->live_staff_amount,
                    $r->live_client_amount,
                    str_replace('_', ' ', $r->status),
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /** Admin correction of clock-in / clock-out times. */
    public function update(Request $request, Attendance $attendance)
    {
        $data = $request->validate([
            'clock_in' => ['required', 'date'],
            'clock_out' => ['nullable', 'date', 'after:clock_in'],
            'notes' => ['nullable', 'string'],
            'staff_amount' => ['nullable', 'numeric', 'min:0'],
            'client_amount' => ['nullable', 'numeric', 'min:0'],
            'auto_amount' => ['boolean'],
        ]);

        $attendance->clock_in = Carbon::parse($data['clock_in']);
        $attendance->duty_date = $attendance->clock_in->toDateString();
        $attendance->notes = $data['notes'] ?? $attendance->notes;
        $attendance->recalculateAmounts();
        $attendance->save();

        $clockOut = ! empty($data['clock_out']) ? Carbon::parse($data['clock_out'])
            : ($attendance->status === 'completed' ? $attendance->clock_out : null);

        if ($clockOut) {
            $attendance->finalize($clockOut);
        }

        // Manual pay / charge for this duty (e.g. half shift), or back to the assignment's shift rate.
        if (! empty($data['auto_amount'])) {
            $attendance->manual_amount = false;
            $attendance->applyRates()->save();
        } elseif (isset($data['staff_amount']) || isset($data['client_amount'])) {
            if (isset($data['staff_amount']) && ! $attendance->payout_id) {
                $attendance->staff_amount = $data['staff_amount'];
            }
            if (isset($data['client_amount']) && ! $attendance->invoice_id) {
                $attendance->client_amount = $data['client_amount'];
            }
            $attendance->manual_amount = true;
            $attendance->save();
        }

        return response()->json($attendance->fresh(['staff:id,name', 'client:id,name', 'breaks']));
    }

    /**
     * Start a duty for a staff member who could not do it from the app (no selfie). With an end
     * time the whole duty is recorded at once, e.g. one that was missed earlier.
     */
    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'assignment_id' => ['required', 'integer'],
            'clock_in' => ['nullable', 'date', 'before_or_equal:'.now()->addMinutes(5)->toDateTimeString()],
            'clock_out' => ['nullable', 'date', 'after:clock_in', 'before_or_equal:'.now()->addMinutes(5)->toDateTimeString()],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'clock_in.before_or_equal' => 'The start time cannot be in the future.',
            'clock_out.before_or_equal' => 'The end time cannot be in the future.',
            'clock_out.after' => 'The end time must be after the start time.',
        ]);

        $assignment = Assignment::current()->with(['staff', 'client:id,name'])->find($data['assignment_id']);
        if (! $assignment) {
            throw ValidationException::withMessages(['assignment_id' => 'Choose an active assignment.']);
        }

        $clockIn = isset($data['clock_in']) ? Carbon::parse($data['clock_in']) : now();
        $clockOut = isset($data['clock_out']) ? Carbon::parse($data['clock_out']) : null;

        // Only one open duty per staff member; a finished duty may be added any time.
        if (! $clockOut && $assignment->staff->activeAttendance()) {
            throw ValidationException::withMessages(['assignment_id' => "{$assignment->staff->name} is already on duty. End that duty first."]);
        }

        $attendance = new Attendance([
            'staff_id' => $assignment->staff_id,
            'client_id' => $assignment->client_id,
            'assignment_id' => $assignment->id,
            'duty_date' => $clockIn->toDateString(),
            'clock_in' => $clockIn,
            'status' => 'on_duty',
            'notes' => $data['notes'] ?? null,
            'started_by' => $request->user()->id,
        ]);
        $attendance->applyRates()->save();

        if ($clockOut) {
            $attendance->ended_by = $request->user()->id;
            $attendance->finalize($clockOut);
        }

        $assignment->staff->notify(new DutyRecordedByAdmin($attendance));

        return response()->json($attendance->fresh(['staff:id,name', 'client:id,name']), 201);
    }

    /** End a duty that a staff member forgot to close. */
    public function close(Request $request, Attendance $attendance)
    {
        if ($attendance->status !== 'completed') {
            $attendance->ended_by = $request->user()->id;
            $attendance->finalize(now());
        }

        return response()->json($attendance->fresh(['staff:id,name', 'client:id,name']));
    }

    /**
     * Approve a completed duty's payment (optionally with changed amounts). Only approved duties
     * count as staff earnings and can be paid out / billed. The staff member is notified.
     */
    public function approve(Request $request, Attendance $attendance): JsonResponse
    {
        $data = $request->validate([
            'staff_amount' => ['required', 'numeric', 'min:0'],
            'client_amount' => ['required', 'numeric', 'min:0'],
        ]);

        if ($attendance->status !== 'completed') {
            throw ValidationException::withMessages(['duty' => 'End the duty before approving its payment.']);
        }
        if ($attendance->payout_id) {
            throw ValidationException::withMessages(['duty' => 'This duty is already paid out and cannot be changed.']);
        }

        $attendance->fill([
            'staff_amount' => round((float) $data['staff_amount'], 2),
            'client_amount' => $attendance->invoice_id ? $attendance->client_amount : round((float) $data['client_amount'], 2),
            'manual_amount' => true,
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
        ])->save();

        $attendance->staff?->notify(new DutyApproved($attendance));

        return response()->json($attendance->fresh(['staff:id,name', 'client:id,name']));
    }

    /**
     * Stream the check-in selfie of a duty to the admin.
     */
    public function selfie(Attendance $attendance): StreamedResponse
    {
        $path = $attendance->clock_in_selfie_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, ['Cache-Control' => 'private, max-age=600']);
    }

    public function destroy(Attendance $attendance)
    {
        if ($attendance->clock_in_selfie_path) {
            Storage::disk('local')->delete($attendance->clock_in_selfie_path);
        }
        $attendance->delete();

        return response()->json(['message' => 'Record deleted']);
    }

    private function filtered(Request $request)
    {
        $from = $request->input('from', now()->startOfMonth()->toDateString());
        $to = $request->input('to', now()->toDateString());

        return Attendance::with(['staff:id,name,designation', 'client:id,name,city', 'breaks'])
            ->whereBetween('duty_date', [$from, $to])
            ->when($request->staff_id, fn ($q, $id) => $q->where('staff_id', $id))
            ->when($request->client_id, fn ($q, $id) => $q->where('client_id', $id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->approval === 'pending', fn ($q) => $q->where('status', 'completed')->whereNull('approved_at'))
            ->when($request->city, fn ($q, $c) => $q->whereHas('client', fn ($q) => $q->where('city', $c)))
            ->latest('clock_in');
    }
}
