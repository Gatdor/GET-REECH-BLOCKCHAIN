<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Batch extends Model
{
    protected $fillable = [
        'batch_id',
        'user_id',
        'catch_id',
        'batch_size',
        'description',
        'image_urls',
        'status',
    ];

    protected $casts = [
        'image_urls' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function catchLog()
    {
        return $this->belongsTo(CatchLog::class, 'catch_id', 'catch_id');
    }
}