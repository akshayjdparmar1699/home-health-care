<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('approved')->after('role')->index();
            $table->text('rejection_reason')->nullable()->after('status');
            $table->timestamp('approved_at')->nullable()->after('rejection_reason');
            $table->enum('registered_via', ['admin', 'self'])->default('admin')->after('approved_at');
        });

        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();

            // Personal
            $table->string('father_name')->nullable();
            $table->date('dob')->nullable();
            $table->string('blood_group', 5)->nullable();
            $table->string('whatsapp', 20)->nullable();
            $table->string('aadhaar_number', 14)->nullable();
            $table->string('pan_number', 10)->nullable();
            $table->text('permanent_address')->nullable();
            $table->string('emergency_name')->nullable();
            $table->string('emergency_relation', 60)->nullable();
            $table->string('emergency_phone', 20)->nullable();

            // Education
            $table->string('qualification')->nullable();
            $table->string('institute')->nullable();
            $table->string('institute_year', 4)->nullable();
            $table->string('ssc_school')->nullable();
            $table->string('ssc_year', 4)->nullable();
            $table->string('hsc_school')->nullable();
            $table->string('hsc_year', 4)->nullable();
            $table->string('nursing_qualification')->nullable();
            $table->string('other_qualification')->nullable();
            $table->string('registration_number', 60)->nullable();

            // Experience
            $table->string('previous_organization')->nullable();
            $table->unsignedTinyInteger('experience_years')->nullable();
            $table->unsignedTinyInteger('experience_months')->nullable();
            $table->json('skills')->nullable();
            $table->string('skills_other')->nullable();

            // Bank
            $table->string('bank_account_name')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('bank_account_number', 30)->nullable();
            $table->string('bank_ifsc', 15)->nullable();
            $table->string('upi_id', 80)->nullable();

            // Medical declaration
            $table->boolean('has_illness')->nullable();
            $table->text('illness_details')->nullable();

            // Private documents (storage/app/private)
            $table->string('selfie_path')->nullable();
            $table->string('aadhaar_front_path')->nullable();
            $table->string('aadhaar_back_path')->nullable();

            $table->timestamp('terms_accepted_at')->nullable();
            $table->timestamps();
        });

        // Payment is per shift (8 / 12 / 24 hours); staff_rate & client_rate now mean "per shift".
        Schema::table('assignments', function (Blueprint $table) {
            $table->unsignedTinyInteger('shift_hours')->nullable()->after('shift_end');
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->unsignedTinyInteger('shift_hours')->nullable()->after('worked_minutes');
            $table->boolean('manual_amount')->default(false)->after('client_amount');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->decimal('quantity', 8, 2)->nullable()->after('minutes');
            $table->string('unit', 30)->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('invoice_items', fn (Blueprint $t) => $t->dropColumn(['quantity', 'unit']));
        Schema::table('attendances', fn (Blueprint $t) => $t->dropColumn(['shift_hours', 'manual_amount']));
        Schema::table('assignments', fn (Blueprint $t) => $t->dropColumn('shift_hours'));
        Schema::dropIfExists('staff_profiles');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['status', 'rejection_reason', 'approved_at', 'registered_via']));
    }
};
