<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddForeignKeysToBatchesTable extends Migration
{
    public function up()
    {
        Schema::table('batches', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('catch_id')->references('catch_id')->on('catch_logs')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::table('batches', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['catch_id']);
        });
    }
}
