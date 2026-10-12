<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'phone', 'role', 'status', 'rejection_reason', 'approved_at', 'registered_via', 'designation', 'gender',
        'address', 'city', 'pincode', 'joining_date', 'hourly_rate', 'is_active', 'password', 'password_plain',
    ];

    protected $hidden = ['password', 'password_plain', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'joining_date' => 'date:Y-m-d',
            'hourly_rate' => 'float',
            'is_active' => 'boolean',
            'approved_at' => 'datetime',
            'password' => 'hashed',
            'password_plain' => 'encrypted',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function profile(): HasOne
    {
        return $this->hasOne(StaffProfile::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class, 'staff_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'staff_id');
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(StaffPayout::class, 'staff_id');
    }

    public function scopeStaff($query)
    {
        return $query->where('role', 'staff');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /** The open (not yet completed) duty session, if any. */
    public function activeAttendance()
    {
        return $this->attendances()->where('status', '!=', 'completed')->latest('clock_in')->first();
    }
}
