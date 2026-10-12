<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    public const KEYS = [
        'business_name', 'business_address', 'business_phone', 'business_email',
        'gstin', 'bank_details', 'invoice_terms',
    ];

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['key', 'value'];

    /** All business settings as key => value (missing keys are null). */
    public static function allValues(): array
    {
        $stored = static::pluck('value', 'key')->all();

        return collect(self::KEYS)->mapWithKeys(fn ($k) => [$k => $stored[$k] ?? null])
            ->put('business_name', $stored['business_name'] ?? 'Yours Home Healthcare')
            ->all();
    }
}
