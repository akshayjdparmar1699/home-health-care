<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

#[Signature('db:backup {--keep=14 : How many days of backups to keep}')]
#[Description('Save a gzipped MySQL dump in storage/app/private/backups and delete old ones.')]
class BackupDatabase extends Command
{
    public function handle(): int
    {
        $db = config('database.connections.'.config('database.default'));
        if (($db['driver'] ?? null) !== 'mysql') {
            $this->error('Only MySQL databases can be backed up with this command.');

            return self::FAILURE;
        }

        $dir = storage_path('app/private/backups');
        File::ensureDirectoryExists($dir);
        $file = $dir.'/db-'.now()->format('Y-m-d-His').'.sql.gz';

        // Password goes through the environment, never on the command line.
        $result = Process::env(['MYSQL_PWD' => (string) $db['password']])->timeout(600)->run([
            'sh', '-c',
            'mysqldump --single-transaction --quick --no-tablespaces -h "$0" -P "$1" -u "$2" "$3" | gzip > "$4"',
            $db['host'], (string) $db['port'], $db['username'], $db['database'], $file,
        ]);

        if (! $result->successful() || ! File::exists($file) || File::size($file) < 100) {
            File::delete($file);
            $this->error('Backup failed: '.trim($result->errorOutput() ?: 'mysqldump not available'));

            return self::FAILURE;
        }

        $cutoff = now()->subDays((int) $this->option('keep'))->getTimestamp();
        foreach (File::glob($dir.'/db-*.sql.gz') as $old) {
            if (File::lastModified($old) < $cutoff) {
                File::delete($old);
            }
        }

        $this->info('Backup saved: '.$file.' ('.round(File::size($file) / 1024).' KB)');

        return self::SUCCESS;
    }
}
