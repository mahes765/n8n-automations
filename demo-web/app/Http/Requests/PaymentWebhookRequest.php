<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PaymentWebhookRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->has('signature_key') && $this->header('X-Midtrans-Signature')) {
            $this->merge([
                'signature_key' => $this->header('X-Midtrans-Signature'),
            ]);
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'order_id' => ['required', 'string', 'exists:transactions,midtrans_order_id'],
            'transaction_status' => ['required', 'string'],
            'payment_type' => ['nullable', 'string'],
            'settlement_time' => ['nullable', 'date'],
            'gross_amount' => ['required', 'numeric'],
            'status_code' => ['required', 'string'],
            'signature_key' => ['required', 'string'],
        ];
    }
}
