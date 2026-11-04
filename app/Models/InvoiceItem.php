<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    /** Duty headings on a bill, in the order they are printed. */
    public const SECTIONS = [
        'day' => 'Day duty',
        'night' => 'Night duty',
        'full' => 'Full day duty (24 hrs)',
    ];

    protected $fillable = ['invoice_id', 'description', 'section', 'staff_id', 'minutes', 'quantity', 'unit', 'rate', 'amount', 'sort'];

    protected $appends = ['section_label'];

    protected function casts(): array
    {
        return ['minutes' => 'integer', 'quantity' => 'float', 'rate' => 'float', 'amount' => 'float'];
    }

    /** Which bill heading a duty belongs under: a full 24 hr shift, otherwise night or day. */
    public static function sectionFor(?int $shiftHours, ?string $shiftType): string
    {
        if ($shiftHours !== null && $shiftHours >= 24) {
            return 'full';
        }

        return $shiftType === 'night' ? 'night' : 'day';
    }

    public function getSectionLabelAttribute(): ?string
    {
        return self::SECTIONS[$this->section] ?? null;
    }
}
