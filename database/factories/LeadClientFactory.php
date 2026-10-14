<?php

namespace Database\Factories;

use App\Models\LeadClient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadClient>
 */
class LeadClientFactory extends Factory
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
            'patient_name' => fake()->name(),
            'service' => fake()->randomElement(['Elderly Care', 'Nursing Care', 'Baby Care']),
            'source' => fake()->randomElement(['Call', 'WhatsApp', 'Website']),
            'status' => 'new',
        ];
    }
}
