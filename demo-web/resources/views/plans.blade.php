<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Paket Subscription</title>
    <style>
        body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #f7f8fa; color: #172033; }
        main { width: min(980px, calc(100vw - 32px)); margin: 48px auto; }
        h1 { font-size: 32px; margin: 0 0 8px; }
        .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 24px; }
        .card { background: #fff; border: 1px solid #dbe3ef; border-radius: 8px; padding: 20px; }
        .price { font-size: 28px; font-weight: 800; margin: 12px 0; }
        label { display: block; font-size: 14px; color: #526070; margin: 14px 0 6px; }
        input { box-sizing: border-box; width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }
        button { width: 100%; margin-top: 14px; border: 0; border-radius: 6px; padding: 11px 14px; font-weight: 800; color: #fff; background: #1261a6; cursor: pointer; }
    </style>
</head>
<body>
<main>
    <h1>Paket Subscription</h1>
    <p>Pilih paket, lalu pembayaran akan diarahkan ke gateway.</p>

    <div class="grid">
        @foreach ($plans as $plan)
            <section class="card">
                <h2>{{ $plan->name }}</h2>
                <div class="price">Rp {{ number_format($plan->price, 0, ',', '.') }}</div>
                <p>Aktif {{ $plan->duration_days }} hari setelah webhook sukses diterima.</p>

                <form method="POST" action="{{ route('subscribe.store') }}">
                    @csrf
                    <input type="hidden" name="plan_id" value="{{ $plan->id }}">
                    @guest
                        <label for="user-{{ $plan->id }}">User ID</label>
                        <input id="user-{{ $plan->id }}" name="user_id" value="{{ request('user_id', 1) }}" required>
                    @endguest
                    <button>Subscribe</button>
                </form>
            </section>
        @endforeach
    </div>
</main>
</body>
</html>
