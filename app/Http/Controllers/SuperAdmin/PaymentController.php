<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPayment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'method' => ['nullable', Rule::in(['cash', 'bank_transfer', 'qris', 'other'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);
        $search = trim((string) ($filters['search'] ?? ''));
        $method = (string) ($filters['method'] ?? '');
        $from = $filters['from'] ?? null;
        $to = $filters['to'] ?? null;

        $query = SubscriptionPayment::query()
            ->with(['store:id,public_id,name', 'creator:id,name'])
            ->when($search !== '', fn ($builder) => $builder->where(function ($builder) use ($search): void {
                $builder->where('receipt_number', 'like', "%{$search}%")
                    ->orWhere('external_reference', 'like', "%{$search}%")
                    ->orWhereHas('store', fn ($store) => $store->where('name', 'like', "%{$search}%"));
            }))
            ->when($method !== '', fn ($builder) => $builder->where('payment_method', $method))
            ->when($from !== null, fn ($builder) => $builder->whereDate('paid_at', '>=', $from))
            ->when($to !== null, fn ($builder) => $builder->whereDate('paid_at', '<=', $to));

        return Inertia::render('super-admin/payments/index', [
            'summary' => [
                'transactions' => (clone $query)->count(),
                'amount' => (clone $query)->sum('amount'),
                'this_month' => SubscriptionPayment::query()
                    ->whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()])
                    ->sum('amount'),
            ],
            'payments' => $query->latest('paid_at')->paginate(20)->withQueryString()
                ->through(fn (SubscriptionPayment $payment): array => [
                    ...$payment->only([
                        'public_id', 'receipt_number', 'amount', 'period_start', 'period_end',
                        'payment_method', 'external_reference', 'paid_at', 'notes',
                    ]),
                    'store' => $payment->store->only(['public_id', 'name']),
                    'created_by' => $payment->creator?->name,
                ]),
            'filters' => compact('search', 'method', 'from', 'to'),
        ]);
    }
}
