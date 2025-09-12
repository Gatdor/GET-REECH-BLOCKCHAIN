<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AlterBatchesTable extends Migration
{
    public function up()
    {
        Schema::table('batches', function (Blueprint $table) {
            // Add modifications here, e.g., new columns or changes
            if (!Schema::hasColumn('batches', 'batch_id')) {
                $table->string('batch_id', 255)->unique()->after('id');
            }
            if (!Schema::hasColumn('batches', 'user_id')) {
                $table->string('user_id', 255)->after('batch_id');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            }
            if (!Schema::hasColumn('batches', 'catch_id')) {
                $table->string('catch_id', 255)->nullable()->after('user_id');
                $table->foreign('catch_id')->references('catch_id')->on('catch_logs')->onDelete('set null');
            }
            if (!Schema::hasColumn('batches', 'batch_size')) {
                $table->float('batch_size')->after('catch_id');
            }
            if (!Schema::hasColumn('batches', 'description')) {
                $table->text('description')->nullable()->after('batch_size');
            }
            if (!Schema::hasColumn('batches', 'image_urls')) {
                $table->json('image_urls')->nullable()->after('description');
            }
            if (!Schema::hasColumn('batches', 'status')) {
                $table->string('status')->default('pending')->after('image_urls');
            }
        });
    }

    public function down()
    {
        Schema::table('batches', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['catch_id']);
            $table->dropColumn(['batch_id', 'user_id', 'catch_id', 'batch_size', 'description', 'image_urls', 'status']);
        });
    }
}