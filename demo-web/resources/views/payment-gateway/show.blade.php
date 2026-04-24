<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Fake Payment Gateway</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #f6f8fb;
            color: #172033;
        }

        main {
            width: min(440px, calc(100vw - 32px));
            background: #fff;
            border: 1px solid #dbe3ef;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 12px 32px rgba(23, 32, 51, .08);
        }

        dl {
            display: grid;
            grid-template-columns: 128px 1fr;
            gap: 8px 12px;
            margin: 20px 0;
        }

        dt {
            color: #667085;
        }

        dd {
            margin: 0;
            font-weight: 600;
        }

        form {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        button {
            border: 0;
            border-radius: 6px;
            padding: 10px 14px;
            font-weight: 700;
            cursor: pointer;
        }

        .paid { background: #0f9f6e; color: #fff; }
        .failed { background: #d92d20; color: #fff; }
        .expired { background: #667085; color: #fff; }
    </style>
</head>
<body>
<main>
    <h1>Fake Payment Gateway</h1>

    <dl>
        <dt>Transaction</dt>
        <dd>#{{ $transaction->id }}</dd>
        <dt>External ID</dt>
        <dd>{{ $transaction->external_id }}</dd>
        <dt>User</dt>
        <dd>{{ $transaction->user->email }}</dd>
        <dt>Plan</dt>
        <dd>{{ $transaction->plan->name }}</dd>
        <dt>Amount</dt>
        <dd>Rp {{ number_format($transaction->plan->price, 0, ',', '.') }}</dd>
        <dt>Status</dt>
        <dd>{{ $transaction->status }}</dd>
    </dl>

    <form method="POST" action="{{ route('webhook.payment') }}">
        <input type="hidden" name="transaction_id" value="{{ $transaction->id }}">
        <input type="hidden" name="signature" value="{{ $signature }}">
        <button class="paid" name="status" value="paid">Bayar Sukses</button>
        <button class="failed" name="status" value="failed">Gagal</button>
        <button class="expired" name="status" value="expired">Expired</button>
    </form>
</main>
</body>
</html>
