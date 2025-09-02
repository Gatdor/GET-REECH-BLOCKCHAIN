<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateBatchesTable extends Migration
{
    public function up()
    {
        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->string('batch_id')->unique();
            $table->unsignedBigInteger('user_id'); // Changed from string to unsignedBigInteger
            $table->unsignedBigInteger('catch_id');
            $table->decimal('batch_size', 8, 2);
            $table->string('description')->nullable();
            $table->json('image_urls')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('catch_id')->references('id')->on('catch_logs')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('batches');
    }
}