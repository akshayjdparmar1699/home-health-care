<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A staff inquiry (someone asking for a job). Rough, temporary data kept apart from real staff
 * accounts; it can be deleted once handled.
 */
class LeadStaff extends Model
{
    use HasFactory;

    public const STATUSES = ['new', 'follow_up', 'converted', 'not_interested'];

    protected $table = 'lead_staff';

    protected $fillable = ['name', 'phone', 'city', 'role', 'experience', 'source', 'status', 'follow_up_date', 'notes', 'created_by'];

    protected function casts(): array
    {
        return ['follow_up_date' => 'date:Y-m-d'];
    }
}
