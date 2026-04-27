<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;

class PaymentGatewayController extends Controller
{
    public function show(Transaction $transaction): RedirectResponse
    {
        return redirect()->route('fake-payment.show', $transaction);
    }
}
