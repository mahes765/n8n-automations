<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Contracts\View\View;

class PaymentGatewayController extends Controller
{
    public function show(Transaction $transaction): View
    {
        $transaction->load(['plan', 'user']);

        return view('payment-gateway.show', [
            'transaction' => $transaction,
            'signature' => config('services.payment_gateway.webhook_signature'),
        ]);
    }
}
