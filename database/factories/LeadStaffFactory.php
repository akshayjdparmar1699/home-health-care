<?php

namespace Database\Factories;

use App\Models\LeadStaff;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadStaff>
 */
class LeadStaffFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => fake()->numerify('9#########'),
            'city' => fake()->randomElement(['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot']),
            'role' => fake()->randomElement(['Staff Nurse', 'Caretaker', 'Nanny', 'Attendant']),
            'experience' => fake()->randomElement(['Fresher', '1 year', '3 years']),
            'source' => fake()->randomElement(['Call', 'WhatsApp', 'Reference']),
            'status' => 'new',
        ];
    }
}
