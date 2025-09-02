<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        // \App\Models\User::factory(10)->create();

        // Users
        User::create([
            'id' => 'fc2428f5-1f32-44fa-ad66-eaeaa393a0d8',
            'email' => 'management@gmail.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'name' => 'management',
            'national_id' => '12345678',
            'phone' => '+254712345677',
        ]);
        User::create([
            'id' => 'user-uuid-2',
            'email' => 'pakacat@gmail.com',
            'password' => Hash::make('password123'),
            'role' => 'fisherman',
            'name' => 'Pakacat',
            'national_id' => '87654321',
            'phone' => '+254712345678',
        ]);
        User::create([
            'id' => 'buyer-uuid-1',
            'email' => 'buyer@gmail.com',
            'password' => Hash::make('password123'),
            'role' => 'buyer',
            'name' => 'Wholesaler',
            'national_id' => '98765432',
            'phone' => '+254712345679',
        ]);

        // Products
        Product::create([
            'user_id' => 'user-uuid-2',
            'species' => 'Tilapia',
            'type' => 'smoked',
            'quantity' => 100.00,
            'price' => 500.00,
            'location' => 'Mombasa',
            'image' => 'https://via.placeholder.com/150',
        ]);
    }
}