<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'invoice_no', 'client_id', 'period_from', 'period_to', 'issue_date', 'due_date', 'minutes',
        'subtotal', 'discount', 'total', 'status', 'paid_at', 'payment_method', 'reference', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'period_from' => 'date:Y-m-d',
            'period_to' => 'date:Y-m-d',
            'issue_date' => 'date:Y-m-d',
            'due_date' => 'date:Y-m-d',
            'paid_at' => 'datetime',
            'minutes' => 'integer',
            'subtotal' => 'float',
            'discount' => 'float',
            'total' => 'float',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('sort');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public static function nextNumber(): string
    {
        $prefix = 'INV-'.now()->format('Y').'-';
        $last = static::where('invoice_no', 'like', $prefix.'%')->orderByDesc('id')->value('invoice_no');
        $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
