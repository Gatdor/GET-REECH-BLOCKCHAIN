<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCatchLogsTable extends Migration
{
    public function up()
    {
        Schema::create('catch_logs', function (Blueprint $table) {
            $table->string('catch_id', 255)->unique();
            $table->string('user_id', 255);
            $table->string('species', 255);
            $table->string('drying_method', 255);
            $table->float('batch_size');
            $table->float('weight');
            $table->date('harvest_date');
            $table->json('location')->nullable();
            $table->integer('shelf_life');
            $table->float('price');
            $table->json('image_urls')->nullable();
            $table->float('quality_score')->nullable();
            $table->string('status', 255)->default('pending');
            $table->string('blockchain_transaction_hash', 255)->nullable();
            $table->integer('blockchain_block_number')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('catch_logs');
    }
}