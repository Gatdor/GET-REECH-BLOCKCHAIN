<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class UpdateCatchLogsImageUrlsToJsonb extends Migration
{
    public function up()
    {
        Schema::table('catch_logs', function (Blueprint $table) {
            $table->jsonb('image_urls')->nullable()->change();
        });
    }

    public function down()
    {
        Schema::table('catch_logs', function (Blueprint $table) {
            $table->json('image_urls')->nullable()->change();
        });
    }
}