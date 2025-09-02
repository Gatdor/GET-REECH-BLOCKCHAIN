<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('catch_logs', function (Blueprint $table) {
            $table->float('lat')->nullable()->after('harvest_date');
            $table->float('lng')->nullable()->after('lat');
        });
    }

    public function down()
    {
        Schema::table('catch_logs', function (Blueprint $table) {
            $table->dropColumn(['lat', 'lng']);
        });
    }
};