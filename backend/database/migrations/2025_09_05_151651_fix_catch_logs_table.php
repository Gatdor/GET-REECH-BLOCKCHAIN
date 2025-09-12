<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class FixCatchLogsTable extends Migration
{
    public function up()
    {
        Schema::table('catch_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('catch_logs', 'catch_id')) {
                $table->string('catch_id', 255)->unique()->first();
            }
            if (!Schema::hasColumn('catch_logs', 'user_id')) {
                $table->string('user_id', 255);
            }
            if (!Schema::hasColumn('catch_logs', 'species')) {
                $table->string('species', 255);
            }
            if (!Schema::hasColumn('catch_logs', 'drying_method')) {
                $table->string('drying_method', 255);
            }
            if (!Schema::hasColumn('catch_logs', 'batch_size')) {
                $table->float('batch_size');
            }
            if (!Schema::hasColumn('catch_logs', 'weight')) {
                $table->float('weight');
            }
            if (!Schema::hasColumn('catch_logs', 'harvest_date')) {
                $table->date('harvest_date');
            }
            if (!Schema::hasColumn('catch_logs', 'location')) {
                $table->json('location')->nullable();
            }
            if (!Schema::hasColumn('catch_logs', 'shelf_life')) {
                $table->integer('shelf_life');
            }
            if (!Schema::hasColumn('catch_logs', 'price')) {
                $table->float('price');
            }
            if (!Schema::hasColumn('catch_logs', 'image_urls')) {
                $table->json('image_urls')->nullable();
            }
            if (!Schema::hasColumn('catch_logs', 'quality_score')) {
                $table->float('quality_score')->nullable();
            }
            if (!Schema::hasColumn('catch_logs', 'status')) {
                $table->string('status', 255)->default('pending');
            }
            if (!Schema::hasColumn('catch_logs', 'blockchain_transaction_hash')) {
                $table->string('blockchain_transaction_hash', 255)->nullable();
            }
            if (!Schema::hasColumn('catch_logs', 'blockchain_block_number')) {
                $table->integer('blockchain_block_number')->nullable();
            }
            if (!Schema::hasColumn('catch_logs', 'created_at')) {
                $table->timestamps();
            }
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::table('catch_logs', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn([
                'catch_id', 'user_id', 'species', 'drying_method', 'batch_size', 'weight',
                'harvest_date', 'location', 'shelf_life', 'price', 'image_urls',
                'quality_score', 'status', 'blockchain_transaction_hash', 'blockchain_block_number'
            ]);
        });
    }
}