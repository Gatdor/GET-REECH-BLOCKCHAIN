<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CatchLogSeeder extends Seeder
{
    public function run()
    {
        DB::table('catch_logs')->insert([
            [
                'fish_type' => 'Salmon',
                'weight' => 5.2,
                'location' => 'Pacific Ocean',
                'caught_at' => Carbon::now()->subDays(2),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'fish_type' => 'Tuna',
                'weight' => 12.7,
                'location' => 'Atlantic Ocean',
                'caught_at' => Carbon::now()->subDays(5),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
