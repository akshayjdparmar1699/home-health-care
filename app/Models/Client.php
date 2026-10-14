<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\Rule;

class Client extends Model
{
    protected $fillable = [
        'name', 'phone', 'alt_phone', 'gender', 'age', 'address', 'city', 'pincode', 'map_link',
        'service_type', 'hourly_charge', 'medical_notes', 'emergency_contact_name', 'emergency_contact_phone', 'is_active', 'source',
    ];

    /** Only map links are accepted: they are shown to staff as the "Directions" button. */
    public const MAP_LINK_PATTERN = '#^https://(www\.)?(google\.[a-z.]+/maps|maps\.google\.[a-z.]+/|maps\.app\.goo\.gl/|goo\.gl/maps/|maps\.apple\.com/|maps\.apple/)#i';

    /**
     * Validation rules shared by the admin form and the public client form.
     *
     * @return array<string, array<int, mixed>>
     */
    public static function detailRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'alt_phone' => ['nullable', 'string', 'max:20'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'age' => ['nullable', 'integer', 'min:0', 'max:130'],
            'address' => ['required', 'string', 'max:1000'],
            'city' => ['required', 'string', 'max:80'],
            'pincode' => ['nullable', 'digits:6'],
            'map_link' => ['nullable', 'string', 'max:500', 'regex:'.self::MAP_LINK_PATTERN],
            'service_type' => ['nullable', 'string', 'max:80'],
            'medical_notes' => ['nullable', 'string', 'max:3000'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:20'],
        ];
    }

    /**
     * Normalise form input: tidy the city name and pull the URL out of shared text such as
     * "Ramesh Home https://maps.app.goo.gl/abc" (what Google Maps' Share button copies).
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function normaliseInput(array $input): array
    {
        if (filled($input['city'] ?? null)) {
            $input['city'] = ucwords(strtolower(trim($input['city'])));
        }
        if (filled($input['map_link'] ?? null)) {
            $input['map_link'] = preg_match('#https?://\S+#i', $input['map_link'], $m)
                ? preg_replace('#^http://#i', 'https://', rtrim($m[0], '.,)'))
                : trim($input['map_link']);
        }

        return $input;
    }

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'age' => 'integer', 'hourly_charge' => 'float'];
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(ClientVisit::class);
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
