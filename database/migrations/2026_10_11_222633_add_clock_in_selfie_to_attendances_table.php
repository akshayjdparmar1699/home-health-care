<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Selfie (with location stamp) taken when staff start a duty.
     */
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->string('clock_in_selfie_path')->nullable()->after('clock_in_lng');
            $table->string('clock_in_address', 500)->nullable()->after('clock_in_selfie_path');
            $table->unsignedInteger('clock_in_accuracy')->nullable()->after('clock_in_address');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn(['clock_in_selfie_path', 'clock_in_address', 'clock_in_accuracy']);
        });
    }
};
