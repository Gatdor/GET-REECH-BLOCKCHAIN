<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CatchLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_id',
        'user_id',
        'species',
        'drying_method',
        'batch_size',
        'weight',
        'harvest_date',
        'location',
        'shelf_life',
        'price',
        'image_urls',
        'quality_score',
        'status',
        'lat',
        'lng',
        'blockchain_transaction_hash',
        'blockchain_block_number',
    ];

    protected $casts = [
        'user_id' => 'string',
        'batch_id' => 'string',
        'species' => 'string',
        'drying_method' => 'string',
        'batch_size' => 'float',
        'weight' => 'float',
        'harvest_date' => 'date',
        'location' => 'array',
        'shelf_life' => 'integer',
        'price' => 'float',
        'image_urls' => 'array',
        'quality_score' => 'float',
        'status' => 'string',
        'lat' => 'float',
        'lng' => 'float',
        'blockchain_transaction_hash' => 'string',
        'blockchain_block_number' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => 'pending',
        'image_urls' => '[]',
        'quality_score' => 0.0,
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }
}