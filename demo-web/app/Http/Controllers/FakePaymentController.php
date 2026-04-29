<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Services\FakeMidtransService;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FakePaymentController extends Controller
{
    public function show(Transaction $transaction, FakeMidtransService $fakeMidtransService): View
    {
        $transaction->load(['plan', 'user']);

        return view('fake-payment', [
            'transaction' => $transaction,
            'payloads' => collect([
                'settlement' => ['label' => 'Bayar Sukses', 'status_code' => '200', 'class' => 'paid'],
                'deny' => ['label' => 'Gagal', 'status_code' => '202', 'class' => 'failed'],
                'expire' => ['label' => 'Expired', 'status_code' => '407', 'class' => 'expired'],
            ])->map(function (array $meta, string $status) use ($transaction, $fakeMidtransService) {
                $payload = [
                    'order_id' => $transaction->midtrans_order_id,
                    'transaction_status' => $status,
                    'payment_type' => $status === 'settlement' ? 'credit_card' : 'bank_transfer',
                    'gross_amount' => $transaction->gross_amount,
                    'status_code' => $meta['status_code'],
                    'settlement_time' => now()->toDateTimeString(),
                ];

                $payload['signature_key'] = $fakeMidtransService->signatureFor(
                    $transaction->midtrans_order_id,
                    $meta['status_code'],
                    $transaction->gross_amount,
                );

                return [
                    'label' => $meta['label'],
                    'class' => $meta['class'],
                    'payload' => $payload,
                ];
            }),
        ]);
    }

    public function process(Request $request, FakeMidtransService $fakeMidtransService): RedirectResponse
    {
        $result = $fakeMidtransService->handleWebhook(
            $request->all(),
            $request->input('signature_key'),
        );

        $transaction = $result['transaction'];

        if ($transaction->status === Transaction::STATUS_PAID) {
            return redirect()->route('payment.success');
        }

        return redirect()->route('payment.failed');
    }
}
