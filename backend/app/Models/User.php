<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'national_id',
        'phone',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'id' => 'string', // Match catch_logs.user_id
        'name' => 'string',
        'email' => 'string',
        'role' => 'string', // Enum-like: fisherman, admin, etc.
        'national_id' => 'string',
        'phone' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationship to CatchLog
    public function catchLogs()
    {
        return $this->hasMany(CatchLog::class, 'user_id', 'id');
    }

    // Relationship to Product
    public function products()
    {
        return $this->hasMany(Product::class, 'user_id', 'id');
    }
}