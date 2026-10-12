<?php

namespace Database\Seeders;

use App\Models\Assignment;
use App\Models\Attendance;
use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(['email' => 'admin@homecare.com'], [
            'name' => 'Admin',
            'phone' => '9999999999',
            'role' => 'admin',
            'designation' => 'Owner',
            'password' => 'admin123',
        ]);

        if (app()->environment('production')) {
            return;
        }

        $this->seedDemoData();
    }

    private function seedDemoData(): void
    {
        $staffData = [
            ['Priya Sharma', '9876500001', 'Staff Nurse', 'female'],
            ['Rahul Verma', '9876500002', 'Caretaker', 'male'],
            ['Neha Patel', '9876500003', 'Nanny', 'female'],
            ['Amit Singh', '9876500004', 'Physiotherapist', 'male'],
            ['Sneha Joshi', '9876500005', 'ICU Nurse', 'female'],
        ];

        $staff = collect($staffData)->map(fn ($s) => User::updateOrCreate(['phone' => $s[1]], [
            'name' => $s[0],
            'role' => 'staff',
            'designation' => $s[2],
            'gender' => $s[3],
            'joining_date' => now()->subMonths(rand(1, 18))->toDateString(),
            'password' => 'staff123',
        ]));

        $clientData = [
            ['Ramesh Gupta', '9812300001', 78, 'male', '12, Shanti Nagar, Near City Hospital', 'Ahmedabad', 'Elderly Care', 'Diabetic, needs insulin at 8 AM & 8 PM'],
            ['Kamla Devi', '9812300002', 84, 'female', 'B-203, Sunrise Apartments, SG Highway', 'Ahmedabad', 'Post-Surgery Care', 'Hip replacement recovery, assist walking'],
            ['Baby Aarav (Mehta)', '9812300003', 1, 'male', '45, Green Park Society, Satellite', 'Ahmedabad', 'Baby Care', 'Newborn care, mother recovering'],
            ['Suresh Shah', '9812300004', 65, 'male', '7, Lake View Bungalows, Bopal', 'Ahmedabad', 'Physiotherapy', 'Stroke rehab, daily exercises'],
        ];

        $clients = collect($clientData)->map(fn ($c) => Client::updateOrCreate(['phone' => $c[1]], [
            'name' => $c[0],
            'age' => $c[2],
            'gender' => $c[3],
            'address' => $c[4],
            'city' => $c[5],
            'service_type' => $c[6],
            'medical_notes' => $c[7],
            'emergency_contact_name' => 'Family Member',
            'emergency_contact_phone' => '98'.rand(10000000, 99999999),
        ]));

        if (Assignment::exists()) {
            return;
        }

        // [staff, client, shift start, shift hours, staff pay per shift, client charge per shift]
        $pairs = [[0, 0, '08:00', 12, 700, 1000], [1, 1, '09:00', 8, 500, 750], [2, 2, '07:00', 12, 650, 950], [3, 3, '10:00', 8, 600, 900], [4, 0, '20:00', 12, 750, 1100]];
        foreach ($pairs as [$s, $c, $from, $hours, $pay, $charge]) {
            $assignment = Assignment::create([
                'staff_id' => $staff[$s]->id,
                'client_id' => $clients[$c]->id,
                'start_date' => now()->subDays(20)->toDateString(),
                'shift_start' => $from,
                'shift_end' => now()->setTimeFromTimeString($from)->addHours($hours)->format('H:i'),
                'shift_hours' => $hours,
                'staff_rate' => $pay,
                'client_rate' => $charge,
                'status' => 'active',
            ]);

            // Past completed duties for the last 10 days.
            for ($d = 10; $d >= 1; $d--) {
                if (rand(1, 10) > 8) {
                    continue;
                }
                $in = now()->subDays($d)->setTimeFromTimeString($from)->addMinutes(rand(-10, 15));
                $att = Attendance::create([
                    'staff_id' => $assignment->staff_id,
                    'client_id' => $assignment->client_id,
                    'assignment_id' => $assignment->id,
                    'duty_date' => $in->toDateString(),
                    'clock_in' => $in,
                    'status' => 'on_duty',
                ]);
                $att->applyRates();
                $breakStart = $in->copy()->addHours(rand(2, 4));
                $att->breaks()->create(['break_start' => $breakStart, 'break_end' => $breakStart->copy()->addMinutes(rand(15, 45))]);
                $att->finalize($in->copy()->addHours($hours)->addMinutes(rand(-20, 20)));
            }
        }

        // Two staff currently on duty, one of them on a break.
        Attendance::create([
            'staff_id' => $staff[0]->id, 'client_id' => $clients[0]->id, 'duty_date' => now()->toDateString(),
            'clock_in' => now()->subHours(3)->subMinutes(12), 'status' => 'on_duty',
        ]);
        $onBreak = Attendance::create([
            'staff_id' => $staff[1]->id, 'client_id' => $clients[1]->id, 'duty_date' => now()->toDateString(),
            'clock_in' => now()->subHours(2), 'status' => 'on_break',
        ]);
        $onBreak->breaks()->create(['break_start' => now()->subMinutes(10)]);
    }
}
