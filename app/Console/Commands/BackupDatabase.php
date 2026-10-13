<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use PDO;

/**
 * Written in plain PHP (no mysqldump / proc_open) so it also runs on shared hosting
 * such as Hostinger, where shell commands are disabled.
 */
#[Signature('db:backup {--keep=14 : How many days of backups to keep}')]
#[Description('Save a gzipped MySQL dump in storage/app/private/backups and delete old ones.')]
class BackupDatabase extends Command
{
    private const INSERT_BATCH = 200;

    public function handle(): int
    {
        $connection = DB::connection();
        if ($connection->getDriverName() !== 'mysql') {
            $this->error('Only MySQL databases can be backed up with this command.');

            return self::FAILURE;
        }

        $dir = storage_path('app/private/backups');
        File::ensureDirectoryExists($dir);
        $file = $dir.'/db-'.now()->format('Y-m-d-His').'.sql.gz';

        try {
            $tables = $this->dump($connection->getPdo(), $file);
        } catch (\Throwable $e) {
            File::delete($file);
            $this->error('Backup failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $cutoff = now()->subDays((int) $this->option('keep'))->getTimestamp();
        foreach (File::glob($dir.'/db-*.sql.gz') as $old) {
            if (File::lastModified($old) < $cutoff) {
                File::delete($old);
            }
        }

        $this->info("Backup saved: {$file} ({$tables} tables, ".round(File::size($file) / 1024).' KB)');

        return self::SUCCESS;
    }

    /**
     * Write every table's structure and rows to a gzipped SQL file and return the table count.
     */
    private function dump(PDO $pdo, string $file): int
    {
        $gz = gzopen($file, 'wb6');
        if ($gz === false) {
            throw new \RuntimeException("Cannot write {$file}");
        }

        gzwrite($gz, "-- Yours Home Healthcare backup\n-- ".now()->toDateTimeString()."\n\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n");

        $tables = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")->fetchAll(PDO::FETCH_COLUMN);

        foreach ($tables as $table) {
            $create = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_NUM)[1];
            gzwrite($gz, "DROP TABLE IF EXISTS `{$table}`;\n{$create};\n\n");

            // Unbuffered so large tables are streamed instead of loaded into memory.
            $pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, false);
            $rows = $pdo->query("SELECT * FROM `{$table}`", PDO::FETCH_ASSOC);
            $batch = [];
            $columns = null;
            foreach ($rows as $row) {
                $columns ??= '(`'.implode('`, `', array_keys($row)).'`)';
                $batch[] = '('.implode(', ', array_map(fn ($value) => $this->quote($pdo, $value), $row)).')';
                if (count($batch) === self::INSERT_BATCH) {
                    gzwrite($gz, "INSERT INTO `{$table}` {$columns} VALUES\n".implode(",\n", $batch).";\n");
                    $batch = [];
                }
            }
            if ($batch) {
                gzwrite($gz, "INSERT INTO `{$table}` {$columns} VALUES\n".implode(",\n", $batch).";\n");
            }
            $rows->closeCursor();
            $pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);
            gzwrite($gz, "\n");
        }

        gzwrite($gz, "SET FOREIGN_KEY_CHECKS=1;\n");
        gzclose($gz);

        return count($tables);
    }

    private function quote(PDO $pdo, mixed $value): string
    {
        if ($value === null) {
            return 'NULL';
        }
        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return $pdo->quote((string) $value);
    }
}
