<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('pincode', 10)->nullable()->after('city');
            // Staff password kept encrypted (APP_KEY) so the admin can tell a staff member who forgets it.
            $table->text('password_plain')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['pincode', 'password_plain']));
    }
};
