<?php

namespace Tests\Feature;

use App\Http\Controllers\Admin\InvoiceController;
use App\Models\Attendance;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\User;
use Illuminate\Support\Collection;
use ReflectionMethod;
use Tests\TestCase;

class BillingSectionsTest extends TestCase
{
    private function duty(string $staffName, int $staffId, ?int $hours, ?string $type, float $charge): Attendance
    {
        $attendance = new Attendance([
            'staff_id' => $staffId, 'shift_hours' => $hours, 'shift_type' => $type,
            'client_amount' => $charge, 'worked_minutes' => 720,
        ]);
        $attendance->setRelation('staff', new User(['name' => $staffName]));

        return $attendance;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildItems(Collection $rows): array
    {
        $method = new ReflectionMethod(InvoiceController::class, 'buildItems');

        return $method->invoke(new InvoiceController, $rows);
    }

    public function test_section_follows_shift_length_then_day_or_night(): void
    {
        $this->assertSame('day', InvoiceItem::sectionFor(12, 'day'));
        $this->assertSame('day', InvoiceItem::sectionFor(10, null));
        $this->assertSame('night', InvoiceItem::sectionFor(12, 'night'));
        $this->assertSame('night', InvoiceItem::sectionFor(8, 'night'));
        $this->assertSame('full', InvoiceItem::sectionFor(24, 'day'));
        $this->assertSame('full', InvoiceItem::sectionFor(24, 'night'));
    }

    public function test_duties_are_grouped_into_day_night_and_full_day_lines(): void
    {
        $rows = collect([
            $this->duty('Asha', 1, 12, 'day', 1000),
            $this->duty('Asha', 1, 12, 'day', 1000),
            $this->duty('Asha', 1, 12, 'day', 1000),
            $this->duty('Ravi', 2, 12, 'night', 1200),
            $this->duty('Ravi', 2, 10, 'night', 1000),
            $this->duty('Asha', 1, 24, 'day', 2000),
        ]);

        $items = collect($this->buildItems($rows));

        $this->assertSame(['day', 'night', 'night', 'full'], $items->pluck('section')->all());

        $day = $items->first();
        $this->assertSame('Asha (12 hrs)', $day['description']);
        $this->assertSame(3, $day['quantity']);
        $this->assertSame('duties', $day['unit']);
        $this->assertSame(1000.0, $day['rate']);
        $this->assertSame(3000.0, $day['amount']);

        $full = $items->last();
        $this->assertSame('Asha', $full['description']);
        $this->assertSame(1, $full['quantity']);
        $this->assertSame('duty', $full['unit']);
        $this->assertSame(2000.0, $full['amount']);

        $this->assertSame(7200.0, $items->sum('amount'));
    }

    public function test_a_duty_with_a_different_charge_gets_its_own_line_so_quantity_times_rate_is_exact(): void
    {
        $rows = collect([
            $this->duty('Asha', 1, 12, 'day', 1000),
            $this->duty('Asha', 1, 12, 'day', 500), // half shift edited by the admin
        ]);

        $items = collect($this->buildItems($rows));

        $this->assertCount(2, $items);
        $items->each(fn (array $item) => $this->assertSame($item['quantity'] * $item['rate'], $item['amount']));
    }

    public function test_shared_bill_shows_sections_and_no_day_wise_entries(): void
    {
        $invoice = new Invoice([
            'invoice_no' => 'INV-1', 'subtotal' => 3000, 'discount' => 0, 'total' => 3000, 'status' => 'unpaid',
            'issue_date' => '2026-11-30', 'period_from' => '2026-11-01', 'period_to' => '2026-11-30',
        ]);
        $invoice->setRelation('client', new Client(['name' => 'Mr Shah']));
        $invoice->setRelation('items', collect([
            new InvoiceItem(['description' => 'Asha (12 hrs)', 'section' => 'day', 'quantity' => 3, 'unit' => 'duties', 'rate' => 1000, 'amount' => 3000]),
        ]));

        $business = ['business_name' => 'Yours Home', 'business_address' => null, 'business_phone' => null, 'business_email' => null, 'gstin' => null, 'bank_details' => null, 'invoice_terms' => null];

        $html = view('share.invoice', ['invoice' => $invoice, 'business' => $business])->render();

        $this->assertStringContainsString('Day duty', $html);
        $this->assertStringContainsString('Asha (12 hrs)', $html);
        $this->assertStringContainsString('3 duties', $html);
        $this->assertStringNotContainsString('Visit details', $html);
    }
}
