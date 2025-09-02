<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCatchLogsTable extends Migration
{
    public function up()
    {
        Schema::create('catch_logs', function (Blueprint $table) {
            $table->id();
            $table->string('batch_id')->unique();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('species');
            $table->string('drying_method');
            $table->decimal('batch_size', 8, 2);
            $table->decimal('weight', 8, 2);
            $table->date('harvest_date');
            $table->json('location')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->integer('shelf_life');
            $table->decimal('price', 10, 2);
            $table->json('image_urls')->nullable();
            $table->decimal('quality_score', 5, 2)->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->string('blockchain_transaction_hash')->nullable();
            $table->bigInteger('blockchain_block_number')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('catch_logs');
    }
}