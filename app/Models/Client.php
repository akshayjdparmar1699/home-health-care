<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $fillable = [
        'name', 'phone', 'alt_phone', 'gender', 'age', 'address', 'city', 'pincode',
        'service_type', 'hourly_charge', 'medical_notes', 'emergency_contact_name', 'emergency_contact_phone', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'age' => 'integer', 'hourly_charge' => 'float'];
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }
}
