<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Fake Midtrans</title>
    <style>
        body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f6f8fb; color: #172033; }
        main { width: min(460px, calc(100vw - 32px)); background: #fff; border: 1px solid #dbe3ef; border-radius: 8px; padding: 24px; box-shadow: 0 12px 32px rgba(23, 32, 51, .08); }
        dl { display: grid; grid-template-columns: 140px 1fr; gap: 8px 12px; margin: 20px 0; }
        dt { color: #667085; }
        dd { margin: 0; font-weight: 650; overflow-wrap: anywhere; }
        form { display: flex; gap: 8px; flex-wrap: wrap; }
        button { border: 0; border-radius: 6px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
        .paid { background: #0f9f6e; color: #fff; }
        .failed { background: #d92d20; color: #fff; }
        .expired { background: #667085; color: #fff; }
    </style>
</head>
<body>
<main>
    <h1>Fake Midtrans</h1>

    <dl>
        <dt>Transaction</dt>
        <dd>#{{ $transaction->id }}</dd>
        <dt>Order ID</dt>
        <dd>{{ $transaction->midtrans_order_id }}</dd>
        <dt>User</dt>
        <dd>{{ $transaction->user->email }}</dd>
        <dt>Plan</dt>
        <dd>{{ $transaction->plan->name }}</dd>
        <dt>Amount</dt>
        <dd>Rp {{ number_format($transaction->gross_amount, 0, ',', '.') }}</dd>
        <dt>Status</dt>
        <dd>{{ $transaction->status }}</dd>
    </dl>

    <form method="POST" action="{{ route('webhook.midtrans') }}">
        @foreach ($payloads['settlement']['payload'] as $name => $value)
            <input type="hidden" data-status="settlement" name="{{ $name }}" value="{{ $value }}">
        @endforeach

        @foreach ($payloads as $status => $button)
            <button class="{{ $button['class'] }}" name="transaction_status" value="{{ $status }}"
                formaction="{{ route('webhook.midtrans') }}"
                onclick='for (const [key, value] of Object.entries(@json($button["payload"]))) { let input = this.form.elements[key]; if (input) input.value = value; }'>
                {{ $button['label'] }}
            </button>
        @endforeach
    </form>
</main>
</body>
</html>
