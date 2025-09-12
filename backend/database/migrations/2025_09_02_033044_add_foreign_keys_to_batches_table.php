<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AddForeignKeysToBatchesTable extends Migration
{
    public function up()
    {
        Schema::table('batches', function (Blueprint $table) {
            // Check if foreign key constraints exist
            $foreignKeys = DB::select("
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'batches' 
                AND constraint_type = 'FOREIGN KEY'
            ");

            $userIdForeignExists = false;
            $catchIdForeignExists = false;

            foreach ($foreignKeys as $fk) {
                if ($fk->constraint_name === 'batches_user_id_foreign') {
                    $userIdForeignExists = true;
                }
                if ($fk->constraint_name === 'batches_catch_id_foreign') {
                    $catchIdForeignExists = true;
                }
            }

            if (!$userIdForeignExists) {
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            }
            if (!$catchIdForeignExists) {
                $table->foreign('catch_id')->references('catch_id')->on('catch_logs')->onDelete('set null');
            }
        });
    }

    public function down()
    {
        Schema::table('batches', function (Blueprint $table) {
            $foreignKeys = DB::select("
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'batches' 
                AND constraint_type = 'FOREIGN KEY'
            ");

            foreach ($foreignKeys as $fk) {
                if ($fk->constraint_name === 'batches_user_id_foreign') {
                    $table->dropForeign(['user_id']);
                }
                if ($fk->constraint_name === 'batches_catch_id_foreign') {
                    $table->dropForeign(['catch_id']);
                }
            }
        });
    }
}