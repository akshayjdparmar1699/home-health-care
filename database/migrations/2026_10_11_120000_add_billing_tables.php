<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('city', 80)->nullable()->after('address');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->decimal('hourly_charge', 10, 2)->nullable()->after('service_type');
            $table->index('city');
        });

        // Optional per-assignment overrides of the default staff pay / client charge.
        Schema::table('assignments', function (Blueprint $table) {
            $table->decimal('staff_rate', 10, 2)->nullable()->after('shift_end');
            $table->decimal('client_rate', 10, 2)->nullable()->after('staff_rate');
        });

        Schema::create('staff_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('users')->cascadeOnDelete();
            $table->date('period_from');
            $table->date('period_to');
            $table->unsignedInteger('sessions')->default(0);
            $table->unsignedInteger('minutes')->default(0);
            $table->decimal('earned', 12, 2)->default(0);
            $table->decimal('adjustment', 12, 2)->default(0);
            $table->decimal('amount', 12, 2)->default(0);
            $table->enum('status', ['pending', 'paid'])->default('pending')->index();
            $table->dateTime('paid_at')->nullable();
            $table->string('payment_method', 40)->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_no', 30)->unique();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->date('period_from');
            $table->date('period_to');
            $table->date('issue_date');
            $table->date('due_date')->nullable();
            $table->unsignedInteger('minutes')->default(0);
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->enum('status', ['unpaid', 'paid'])->default('unpaid')->index();
            $table->dateTime('paid_at')->nullable();
            $table->string('payment_method', 40)->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('description');
            $table->foreignId('staff_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('minutes')->nullable();
            $table->decimal('rate', 10, 2)->nullable();
            $table->decimal('amount', 12, 2);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->decimal('staff_rate', 10, 2)->default(0)->after('worked_minutes');
            $table->decimal('client_rate', 10, 2)->default(0)->after('staff_rate');
            $table->decimal('staff_amount', 12, 2)->default(0)->after('client_rate');
            $table->decimal('client_amount', 12, 2)->default(0)->after('staff_amount');
            $table->foreignId('payout_id')->nullable()->after('client_amount')->constrained('staff_payouts')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->after('payout_id')->constrained('invoices')->nullOnDelete();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
        });

        // Price existing duties with the staff's current pay rate.
        DB::statement('UPDATE attendances a JOIN users u ON u.id = a.staff_id
            SET a.staff_rate = COALESCE(u.hourly_rate, 0),
                a.staff_amount = ROUND(a.worked_minutes / 60 * COALESCE(u.hourly_rate, 0), 2)');
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payout_id');
            $table->dropConstrainedForeignId('invoice_id');
            $table->dropColumn(['staff_rate', 'client_rate', 'staff_amount', 'client_amount']);
        });
        Schema::dropIfExists('settings');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('staff_payouts');
        Schema::table('assignments', fn (Blueprint $t) => $t->dropColumn(['staff_rate', 'client_rate']));
        Schema::table('clients', function (Blueprint $t) {
            $t->dropIndex(['city']);
            $t->dropColumn('hourly_charge');
        });
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('city'));
    }
};
