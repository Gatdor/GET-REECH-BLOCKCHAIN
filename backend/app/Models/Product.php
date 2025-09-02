<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'catch_log_id', // Foreign key to CatchLog
        'species',
        'type',
        'quantity',
        'price',
        'location',
        'image_urls', // Changed from image to support multiple URLs
    ];

    protected $casts = [
        'user_id' => 'string',
        'catch_log_id' => 'integer',
        'species' => 'string',
        'type' => 'string',
        'quantity' => 'float',
        'price' => 'float',
        'location' => 'array', // For PostGIS GeoJSON
        'image_urls' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $attributes = [
        'image_urls' => '[]', // Default empty array
    ];

    // Relationship to User
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    // Relationship to CatchLog
    public function catchLog()
    {
        return $this->belongsTo(CatchLog::class, 'catch_log_id');
    }
}