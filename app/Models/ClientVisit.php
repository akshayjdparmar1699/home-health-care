<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A charge for a visit to the client's home (e.g. the owner / nurse visiting), billed on the
 * client's next invoice together with the staff duties.
 */
class ClientVisit extends Model
{
    use HasFactory;

    protected $fillable = ['client_id', 'visit_date', 'amount', 'description', 'invoice_id', 'created_by'];

    protected function casts(): array
    {
        return ['visit_date' => 'date:Y-m-d', 'amount' => 'float'];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
