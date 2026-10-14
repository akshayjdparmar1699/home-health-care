<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\ClientVisit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClientVisit>
 */
class ClientVisitFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'client_id' => fn () => Client::create([
                'name' => fake()->name(),
                'phone' => fake()->numerify('9#########'),
                'address' => fake()->streetAddress(),
                'city' => 'Ahmedabad',
            ])->id,
            'visit_date' => fake()->dateTimeBetween('-20 days')->format('Y-m-d'),
            'amount' => fake()->randomElement([300, 500, 800, 1000]),
            'description' => fake()->randomElement(['Doctor visit', 'Nurse home visit', 'Dressing change', 'Injection at home']),
        ];
    }
}
