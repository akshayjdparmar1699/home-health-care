<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Day or night shift, chosen by the admin on the assignment and copied onto each duty.
     */
    public function up(): void
    {
        Schema::table('assignments', function (Blueprint $table) {
            $table->enum('shift_type', ['day', 'night'])->default('day')->after('shift_hours');
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->enum('shift_type', ['day', 'night'])->nullable()->after('shift_hours');
        });

        // Existing assignments: a shift starting between 6 PM and 6 AM is a night shift.
        DB::table('assignments')
            ->whereNotNull('shift_start')
            ->where(fn ($q) => $q->where('shift_start', '>=', '18:00:00')->orWhere('shift_start', '<', '06:00:00'))
            ->update(['shift_type' => 'night']);

        DB::statement('UPDATE attendances a JOIN assignments s ON s.id = a.assignment_id SET a.shift_type = s.shift_type');
    }

    public function down(): void
    {
        Schema::table('attendances', fn (Blueprint $table) => $table->dropColumn('shift_type'));
        Schema::table('assignments', fn (Blueprint $table) => $table->dropColumn('shift_type'));
    }
};
