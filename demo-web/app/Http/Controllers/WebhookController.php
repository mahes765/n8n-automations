<?php

namespace App\Http\Controllers;

use App\Http\Requests\PaymentWebhookRequest;
use App\Services\MidtransServiceInterface;
use Illuminate\Http\JsonResponse;

class WebhookController extends Controller
{
    public function handleMidtrans(PaymentWebhookRequest $request, MidtransServiceInterface $midtransService): JsonResponse
    {
        $midtransService->handleWebhook(
            $request->all(),
            $request->header('X-Midtrans-Signature') ?: $request->input('signature_key'),
        );

        return response()->json([
            'status' => 'ok',
        ]);
    }
}
