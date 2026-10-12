<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // An assignment is either active or closed (work with that client finished). Closed ones are kept as history.
        DB::table('assignments')->whereIn('status', ['completed', 'cancelled'])->update(['status' => 'active']);
        DB::statement("ALTER TABLE assignments MODIFY status ENUM('active', 'closed') NOT NULL DEFAULT 'active'");

        Schema::table('assignments', function (Blueprint $table) {
            $table->timestamp('closed_at')->nullable()->after('status');
            $table->string('close_note', 500)->nullable()->after('closed_at');
        });
    }

    public function down(): void
    {
        Schema::table('assignments', fn (Blueprint $t) => $t->dropColumn(['closed_at', 'close_note']));
        DB::statement("ALTER TABLE assignments MODIFY status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active'");
    }
};
