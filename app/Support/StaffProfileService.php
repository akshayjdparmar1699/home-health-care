<?php

namespace App\Support;

use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/** Shared validation + persistence of a staff member's full profile (self-registration and admin). */
class StaffProfileService
{
    private const USER_FIELDS = ['name', 'email', 'phone', 'gender', 'address', 'city', 'pincode', 'designation', 'joining_date', 'is_active', 'password'];

    private const PROFILE_FIELDS = [
        'father_name', 'dob', 'blood_group', 'whatsapp', 'aadhaar_number', 'pan_number', 'permanent_address',
        'emergency_name', 'emergency_relation', 'emergency_phone',
        'qualification', 'institute', 'institute_year', 'ssc_school', 'ssc_year', 'hsc_school', 'hsc_year',
        'nursing_qualification', 'other_qualification', 'registration_number',
        'previous_organization', 'experience_years', 'experience_months', 'skills', 'skills_other',
        'bank_account_name', 'bank_name', 'bank_account_number', 'bank_ifsc', 'upi_id',
        'has_illness', 'illness_details',
    ];

    /**
     * @param  bool  $selfRegistration  stricter rules: most fields, documents and terms are required
     */
    public function validate(Request $request, bool $selfRegistration, ?User $user = null): array
    {
        $this->normalize($request);
        $req = $selfRegistration ? 'required' : 'nullable';
        $year = ['nullable', 'digits:4', 'integer', 'min:1950', 'max:'.now()->year];
        $image = ['image', 'mimes:jpg,jpeg,png,webp', 'max:2048'];
        $hasFile = fn ($type) => $user?->profile?->{$type.'_path'};

        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'digits:10', Rule::unique('users')->ignore($user?->id)],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users')->ignore($user?->id)],
            'gender' => [$req, Rule::in(['male', 'female', 'other'])],
            'address' => [$req, 'string', 'max:1000'],
            'city' => [$req, 'string', 'max:80'],
            'designation' => ['nullable', 'string', 'max:80'],
            'pincode' => ['nullable', 'digits:6'],
            'joining_date' => ['nullable', 'date'],
            'is_active' => ['boolean'],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:6', $selfRegistration ? 'confirmed' : 'nullable'],

            'father_name' => [$req, 'string', 'max:255'],
            'dob' => [$req, 'date', 'before:-16 years'],
            'blood_group' => ['nullable', Rule::in(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])],
            'whatsapp' => ['nullable', 'digits:10'],
            'aadhaar_number' => [$req, 'digits:12'],
            'pan_number' => ['nullable', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]$/'],
            'permanent_address' => [$req, 'string', 'max:1000'],
            'emergency_name' => [$req, 'string', 'max:255'],
            'emergency_relation' => [$req, 'string', 'max:60'],
            'emergency_phone' => [$req, 'digits:10'],

            'qualification' => ['nullable', 'string', 'max:255'],
            'institute' => ['nullable', 'string', 'max:255'],
            'institute_year' => $year,
            'ssc_school' => ['nullable', 'string', 'max:255'],
            'ssc_year' => $year,
            'hsc_school' => ['nullable', 'string', 'max:255'],
            'hsc_year' => $year,
            'nursing_qualification' => ['nullable', 'string', 'max:255'],
            'other_qualification' => ['nullable', 'string', 'max:255'],
            'registration_number' => ['nullable', 'string', 'max:60'],

            'previous_organization' => ['nullable', 'string', 'max:255'],
            'experience_years' => ['nullable', 'integer', 'min:0', 'max:60'],
            'experience_months' => ['nullable', 'integer', 'min:0', 'max:11'],
            'skills' => ['nullable', 'array'],
            'skills.*' => [Rule::in(StaffProfile::SKILLS)],
            'skills_other' => ['nullable', 'string', 'max:255'],

            'bank_account_name' => ['nullable', 'string', 'max:255'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'bank_account_number' => ['nullable', 'regex:/^[0-9]{6,20}$/'],
            'bank_ifsc' => ['nullable', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/'],
            'upi_id' => ['nullable', 'regex:/^[\w.\-]{2,}@[a-zA-Z]{2,}$/'],

            'has_illness' => [$req, 'boolean'],
            'illness_details' => ['nullable', 'required_if:has_illness,1', 'string', 'max:1000'],

            'selfie' => [$selfRegistration && ! $hasFile('selfie') ? 'required' : 'nullable', ...$image],
            'aadhaar_front' => [$selfRegistration && ! $hasFile('aadhaar_front') ? 'required' : 'nullable', ...$image],
            'aadhaar_back' => [$selfRegistration && ! $hasFile('aadhaar_back') ? 'required' : 'nullable', ...$image],

            'terms' => [$selfRegistration ? 'accepted' : 'nullable'],
        ], [
            'phone.unique' => 'This mobile number is already registered. Please log in instead.',
            'email.unique' => 'This email is already registered.',
            'dob.before' => 'Staff must be at least 16 years old.',
            'pincode.digits' => 'Pincode must be 6 digits.',
            'pan_number.regex' => 'Enter a valid PAN number (e.g. ABCDE1234F).',
            'bank_ifsc.regex' => 'Enter a valid IFSC code (e.g. HDFC0001234).',
            'bank_account_number.regex' => 'Account number should contain only digits.',
            'upi_id.regex' => 'Enter a valid UPI ID (e.g. name@upi).',
            'terms.accepted' => 'Please accept the rules and regulations to continue.',
            'illness_details.required_if' => 'Please give details of the illness.',
        ]);
    }

    /** Create or update the user + profile + documents. */
    public function save(Request $request, array $data, ?User $user = null, array $extraUser = []): User
    {
        return DB::transaction(function () use ($request, $data, $user, $extraUser) {
            $userData = array_merge(array_intersect_key($data, array_flip(self::USER_FIELDS)), $extraUser);
            if (empty($userData['password'])) {
                unset($userData['password']);
            } else {
                $userData['password_plain'] = $userData['password'];
            }

            if ($user) {
                $user->update($userData);
            } else {
                $user = User::create($userData + ['role' => 'staff']);
            }

            $profileData = array_intersect_key($data, array_flip(self::PROFILE_FIELDS));
            if (! empty($data['terms'])) {
                $profileData['terms_accepted_at'] = now();
            }

            $profile = $user->profile ?? new StaffProfile(['user_id' => $user->id]);
            $profile->fill($profileData);

            foreach (StaffProfile::DOCUMENTS as $doc) {
                if ($request->hasFile($doc)) {
                    $old = $profile->{$doc.'_path'};
                    $profile->{$doc.'_path'} = $request->file($doc)->store("staff-docs/{$user->id}", 'local');
                    if ($old) {
                        Storage::disk('local')->delete($old);
                    }
                }
            }

            $profile->save();

            return $user->load('profile');
        });
    }

    private function normalize(Request $request): void
    {
        $clean = [];
        foreach (['phone', 'whatsapp', 'emergency_phone', 'aadhaar_number'] as $f) {
            if ($request->filled($f)) {
                $clean[$f] = preg_replace('/\D/', '', $request->input($f));
            }
        }
        foreach (['pan_number', 'bank_ifsc'] as $f) {
            if ($request->filled($f)) {
                $clean[$f] = strtoupper(preg_replace('/\s/', '', $request->input($f)));
            }
        }
        if ($request->filled('bank_account_number')) {
            $clean['bank_account_number'] = preg_replace('/\s/', '', $request->input('bank_account_number'));
        }
        if ($request->filled('city')) {
            $clean['city'] = ucwords(strtolower(trim($request->input('city'))));
        }
        if ($request->filled('email')) {
            $clean['email'] = strtolower(trim($request->input('email')));
        }
        $request->merge($clean);
    }
}
