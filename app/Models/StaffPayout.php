<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StaffPayout extends Model
{
    protected $fillable = [
        'staff_id', 'period_from', 'period_to', 'sessions', 'minutes', 'earned', 'adjustment',
        'amount', 'status', 'paid_at', 'payment_method', 'reference', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'period_from' => 'date:Y-m-d',
            'period_to' => 'date:Y-m-d',
            'paid_at' => 'datetime',
            'sessions' => 'integer',
            'minutes' => 'integer',
            'earned' => 'float',
            'adjustment' => 'float',
            'amount' => 'float',
        ];
    }

    /**
     * Human friendly slip number, e.g. PAY-00012.
     */
    public function slipNumber(): string
    {
        return 'PAY-'.str_pad((string) $this->id, 5, '0', STR_PAD_LEFT);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'payout_id');
    }
}
