<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffProfile extends Model
{
    public const SKILLS = [
        'ICU', 'Ventilator Care', 'Tracheostomy Care', 'Ryles Tube Feeding', 'Catheter Care',
        'Elderly Care', 'Baby Care', 'Bedridden Patient Care', 'Stroke Care', 'Dementia Care', 'Other',
    ];

    public const DOCUMENTS = ['selfie', 'aadhaar_front', 'aadhaar_back'];

    protected $fillable = [
        'user_id', 'father_name', 'dob', 'blood_group', 'whatsapp', 'aadhaar_number', 'pan_number',
        'permanent_address', 'emergency_name', 'emergency_relation', 'emergency_phone',
        'qualification', 'institute', 'institute_year', 'ssc_school', 'ssc_year', 'hsc_school', 'hsc_year',
        'nursing_qualification', 'other_qualification', 'registration_number',
        'previous_organization', 'experience_years', 'experience_months', 'skills', 'skills_other',
        'bank_account_name', 'bank_name', 'bank_account_number', 'bank_ifsc', 'upi_id',
        'has_illness', 'illness_details', 'selfie_path', 'aadhaar_front_path', 'aadhaar_back_path', 'terms_accepted_at',
    ];

    /** File paths are served through an admin-only route, never directly. */
    protected $hidden = ['selfie_path', 'aadhaar_front_path', 'aadhaar_back_path'];

    protected $appends = ['documents'];

    protected function casts(): array
    {
        return [
            'dob' => 'date:Y-m-d',
            'skills' => 'array',
            'has_illness' => 'boolean',
            'experience_years' => 'integer',
            'experience_months' => 'integer',
            'terms_accepted_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Which documents are uploaded (true / false per type). */
    public function getDocumentsAttribute(): array
    {
        return collect(self::DOCUMENTS)->mapWithKeys(fn ($d) => [$d => (bool) $this->{$d.'_path'}])->all();
    }
}
