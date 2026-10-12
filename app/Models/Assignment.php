<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assignment extends Model
{
    protected $fillable = [
        'staff_id', 'client_id', 'start_date', 'end_date', 'shift_start', 'shift_end', 'shift_hours', 'shift_type', 'staff_rate', 'client_rate', 'notes', 'status', 'closed_at', 'close_note',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'closed_at' => 'datetime',
            'end_date' => 'date:Y-m-d',
            'shift_hours' => 'integer',
            'staff_rate' => 'float',
            'client_rate' => 'float',
        ];
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** An assignment stays active until the admin removes it (no automatic expiry by date). */
    public function scopeCurrent($query)
    {
        return $query->where('status', 'active');
    }
}
