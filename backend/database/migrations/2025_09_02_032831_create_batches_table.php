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
            $table->string('batch_id', 255)->unique();
            $table->string('user_id', 255);
            $table->string('catch_id', 255)->nullable();
            $table->float('batch_size');
            $table->text('description')->nullable();
            $table->json('image_urls')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('catch_id')->references('catch_id')->on('catch_logs')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::dropIfExists('batches');
    }
}