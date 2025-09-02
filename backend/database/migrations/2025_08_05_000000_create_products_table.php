<?php

// backend/database/migrations/2025_08_14_000000_create_catch_logs_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('catch_logs', function (Blueprint $table) {
            $table->id();
            $table->string('batch_id')->unique();
            $table->string('user_id');
            $table->string('species');
            $table->string('drying_method');
            $table->float('batch_size');
            $table->float('weight');
            $table->date('harvest_date');
            $table->jsonb('location');
            $table->integer('shelf_life');
            $table->float('price');
            $table->json('image_urls')->default('[]');
            $table->string('quality_score')->default('N/A');
            $table->string('status')->default('pending');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('catch_logs');
    }
};