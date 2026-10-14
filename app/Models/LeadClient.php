<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A client inquiry (a family asking about care). Rough, temporary data kept apart from real
 * clients; it can be deleted once handled.
 */
class LeadClient extends Model
{
    use HasFactory;

    public const STATUSES = ['new', 'follow_up', 'converted', 'not_interested'];

    protected $fillable = ['name', 'phone', 'city', 'patient_name', 'service', 'source', 'status', 'follow_up_date', 'notes', 'created_by'];

    protected function casts(): array
    {
        return ['follow_up_date' => 'date:Y-m-d'];
    }
}
