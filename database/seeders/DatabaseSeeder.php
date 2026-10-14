<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Only the owner / admin account. Sample data lives in DemoSeeder.
     */
    public function run(): void
    {
        User::updateOrCreate(['phone' => '9227306545'], [
            'name' => 'Admin',
            'email' => 'baradnilesh2000@gmail.com',
            'role' => 'admin',
            'status' => 'approved',
            'designation' => 'Owner',
            'is_active' => true,
            'password' => 'Barad@123',
        ]);
    }
}
