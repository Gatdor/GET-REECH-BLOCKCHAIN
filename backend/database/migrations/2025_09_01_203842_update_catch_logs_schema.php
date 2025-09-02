<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class UpdateCatchLogsSchema extends Migration
{
    public function up()
    {
        Schema::table('catch_logs', function (Blueprint $table) {
            $table->float('lat')->nullable()->change();
            $table->float('lng')->nullable()->change();
            $table->string('blockchain_transaction_hash')->nullable()->after('lng');
            $table->integer('blockchain_block_number')->nullable()->after('blockchain_transaction_hash');
        });
    }

    public function down()
    {
        Schema::table('catch_logs', function (Blueprint $table) {
            $table->float('lat')->nullable(false)->change();
            $table->float('lng')->nullable(false)->change();
            $table->dropColumn(['blockchain_transaction_hash', 'blockchain_block_number']);
        });
    }
}