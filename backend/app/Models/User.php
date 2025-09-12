<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory; // Correct import
use Illuminate\Support\Str;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'name', 'email', 'password', 'role', 'national_id', 'phone',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'id' => 'string',
        'name' => 'string',
        'email' => 'string',
        'role' => 'string',
        'national_id' => 'string',
        'phone' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function catchLogs()
    {
        return $this->hasMany(CatchLog::class, 'user_id', 'id');
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'user_id', 'id');
    }
}