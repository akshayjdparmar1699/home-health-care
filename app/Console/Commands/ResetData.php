<?php

namespace App\Console\Commands;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

/**
 * Start fresh: back up the database, empty every data table, delete uploaded photos and create
 * the admin account again. Settings (business details and the push notification keys) are kept
 * so installed apps keep receiving notifications.
 */
#[Signature('app:reset-data {--force : Do not ask for confirmation}')]
#[Description('Delete ALL staff, clients, duties, bills, leads and uploaded photos, then create the admin account.')]
class ResetData extends Command
{
    /** Tables that are never emptied. */
    private const KEEP_TABLES = ['migrations', 'settings'];

    /** Uploaded files under storage/app/private (backups are kept). */
    private const UPLOAD_FOLDERS = ['staff-docs', 'duty-selfies'];

    public function handle(): int
    {
        $this->warn('This deletes ALL data: staff, clients, duties, bills, payments, leads, notifications, logins and uploaded photos.');
        if (! $this->option('force') && ! $this->confirm('Are you sure? Type "yes" to continue', false)) {
            $this->info('Cancelled. Nothing was deleted.');

            return self::SUCCESS;
        }

        $this->info('Taking a database backup first...');
        if (Artisan::call('db:backup') !== self::SUCCESS) {
            $this->error('Backup failed, so nothing was deleted: '.trim(Artisan::output()));

            return self::FAILURE;
        }
        $this->line(trim(Artisan::output()));

        // Only this app's database: the MySQL user may also see other databases' tables.
        $tables = collect(Schema::getTables(DB::connection()->getDatabaseName()))
            ->pluck('name')
            ->reject(fn (string $t) => in_array($t, self::KEEP_TABLES, true))
            ->values();

        Schema::disableForeignKeyConstraints();
        foreach ($tables as $table) {
            DB::table($table)->truncate();
        }
        Schema::enableForeignKeyConstraints();
        $this->info("Emptied {$tables->count()} tables.");

        $files = 0;
        foreach (self::UPLOAD_FOLDERS as $folder) {
            $path = storage_path("app/private/{$folder}");
            if (File::isDirectory($path)) {
                $files += count(File::allFiles($path));
                File::deleteDirectory($path);
            }
        }
        $this->info("Deleted {$files} uploaded photos.");

        $this->call('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true]);

        $this->info('Done. Log in at /admin/login with the admin account from DatabaseSeeder.');

        return self::SUCCESS;
    }
}
