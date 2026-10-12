<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Attendance extends Model
{
    protected $fillable = [
        'staff_id', 'client_id', 'assignment_id', 'duty_date', 'clock_in', 'clock_out',
        'clock_in_lat', 'clock_in_lng', 'clock_in_selfie_path', 'clock_in_address', 'clock_in_accuracy',
        'clock_out_lat', 'clock_out_lng',
        'break_minutes', 'worked_minutes', 'shift_hours', 'shift_type', 'staff_rate', 'client_rate', 'staff_amount', 'client_amount',
        'manual_amount', 'approved_at', 'approved_by', 'payout_id', 'invoice_id', 'status', 'notes',
    ];

    protected $appends = ['live_break_minutes', 'live_worked_minutes', 'current_break_start', 'live_staff_amount', 'live_client_amount', 'has_selfie'];

    /** The selfie file is only served through the admin selfie route. */
    protected $hidden = ['clock_in_selfie_path'];

    /** Fields a staff member must never see (client pricing). */
    public const CLIENT_FINANCE = ['client_rate', 'client_amount', 'live_client_amount', 'invoice_id'];

    protected function casts(): array
    {
        return [
            'duty_date' => 'date:Y-m-d',
            'clock_in' => 'datetime',
            'clock_out' => 'datetime',
            'break_minutes' => 'integer',
            'worked_minutes' => 'integer',
            'clock_in_lat' => 'float',
            'clock_in_lng' => 'float',
            'clock_in_accuracy' => 'integer',
            'shift_hours' => 'integer',
            'manual_amount' => 'boolean',
            'approved_at' => 'datetime',
            'staff_rate' => 'float',
            'client_rate' => 'float',
            'staff_amount' => 'float',
            'client_amount' => 'float',
        ];
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class);
    }

    public function payout(): BelongsTo
    {
        return $this->belongsTo(StaffPayout::class, 'payout_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function breaks(): HasMany
    {
        return $this->hasMany(AttendanceBreak::class)->orderBy('break_start');
    }

    public function openBreak(): ?AttendanceBreak
    {
        return $this->breaks()->whereNull('break_end')->latest('break_start')->first();
    }

    /** Total break minutes, including a break that is still running. */
    public function getLiveBreakMinutesAttribute(): int
    {
        if ($this->status === 'completed') {
            return $this->break_minutes;
        }

        $end = now();
        $breaks = $this->relationLoaded('breaks') ? $this->breaks : $this->breaks()->get();

        return (int) $breaks->sum(fn ($b) => $b->break_start->diffInMinutes($b->break_end ?? $end, true));
    }

    /** Worked minutes (duty time minus breaks), calculated live for open sessions. */
    public function getLiveWorkedMinutesAttribute(): int
    {
        if ($this->status === 'completed') {
            return $this->worked_minutes;
        }

        $total = (int) $this->clock_in->diffInMinutes(now(), true);

        return max(0, $total - $this->live_break_minutes);
    }

    public function getCurrentBreakStartAttribute(): ?string
    {
        if ($this->status !== 'on_break') {
            return null;
        }

        $breaks = $this->relationLoaded('breaks') ? $this->breaks : $this->breaks()->get();
        $open = $breaks->firstWhere('break_end', null);

        return $open?->break_start?->toIso8601String();
    }

    /** Close the session and persist final totals. */
    public function finalize(Carbon $at): void
    {
        $this->breaks()->whereNull('break_end')->update(['break_end' => $at]);
        $this->load('breaks');

        $breakMinutes = (int) $this->breaks->sum(fn ($b) => $b->break_start->diffInMinutes($b->break_end, true));
        $total = (int) $this->clock_in->diffInMinutes($at, true);

        $this->clock_out = $at;
        $this->break_minutes = $breakMinutes;
        $this->worked_minutes = max(0, $total - $breakMinutes);
        $this->status = 'completed';
        $this->recalculateAmounts();
        $this->save();
    }

    public function getHasSelfieAttribute(): bool
    {
        return (bool) $this->clock_in_selfie_path;
    }

    /** For an open duty this is what the shift will pay once completed. */
    public function getLiveStaffAmountAttribute(): float
    {
        return $this->status === 'completed' || $this->manual_amount ? $this->staff_amount : $this->staff_rate;
    }

    public function getLiveClientAmountAttribute(): float
    {
        return $this->status === 'completed' || $this->manual_amount ? $this->client_amount : $this->client_rate;
    }

    /**
     * Payment is per shift: copy the assignment's shift and per-shift rates onto the duty.
     * A side that is already paid out / invoiced, or a manually set amount, is left untouched.
     */
    public function applyRates(): static
    {
        if ($this->manual_amount) {
            return $this;
        }

        $this->loadMissing('assignment');
        $this->shift_hours = $this->assignment?->shift_hours ?? $this->shift_hours;
        $this->shift_type = $this->assignment?->shift_type ?? $this->shift_type;

        if (! $this->payout_id) {
            $this->staff_rate = $this->assignment?->staff_rate ?? 0;
        }
        if (! $this->invoice_id) {
            $this->client_rate = $this->assignment?->client_rate ?? 0;
        }

        return $this->recalculateAmounts();
    }

    /** One completed duty = one shift = the full per-shift rate. */
    public function recalculateAmounts(): static
    {
        if ($this->manual_amount) {
            return $this;
        }

        $done = $this->status === 'completed';

        if (! $this->payout_id) {
            $this->staff_amount = $done ? $this->staff_rate : 0;
        }
        if (! $this->invoice_id) {
            $this->client_amount = $done ? $this->client_rate : 0;
        }

        return $this;
    }

    /** Re-apply current rates to every unlocked duty matched by the query. */
    public static function reprice($query): void
    {
        $query->with('assignment')
            ->where('manual_amount', false)
            ->where(fn ($q) => $q->whereNull('payout_id')->orWhereNull('invoice_id'))
            ->get()
            ->each(fn (self $a) => $a->applyRates()->save());
    }
}
