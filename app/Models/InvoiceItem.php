<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    protected $fillable = ['invoice_id', 'description', 'staff_id', 'minutes', 'quantity', 'unit', 'rate', 'amount', 'sort'];

    protected function casts(): array
    {
        return ['minutes' => 'integer', 'quantity' => 'float', 'rate' => 'float', 'amount' => 'float'];
    }
}
