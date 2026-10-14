<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Clients are contacted through a relative: "phone" becomes the relative's name and
 * "alt_phone" the relative's mobile number.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->renameColumn('phone', 'relative_name');
            $table->renameColumn('alt_phone', 'relative_phone');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->string('relative_name')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->renameColumn('relative_name', 'phone');
            $table->renameColumn('relative_phone', 'alt_phone');
        });
    }
};
