<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Paket Subscription</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: 'DM Sans', system-ui, sans-serif; background: #f4f5f7; color: #172033; }

        main { width: min(1020px, calc(100vw - 32px)); margin: 52px auto; }

        .page-header { margin-bottom: 28px; }
        .page-header h1 { font-family: 'DM Serif Display', serif; font-size: 30px; font-weight: 400; margin: 0 0 6px; }
        .page-header p { font-size: 14px; color: #64748b; margin: 0; }

        .info-bar {
            background: #eff6ff; border: 1px solid #bfdbfe;
            border-radius: 8px; padding: 10px 16px; font-size: 13px;
            color: #1e40af; margin-bottom: 24px;
            display: flex; align-items: center; gap: 8px;
        }

        .plans-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
        }

        .plan-card {
            background: #fff; border: 1px solid #e2e8f0;
            border-radius: 12px; padding: 22px;
            display: flex; flex-direction: column;
            transition: box-shadow 0.2s, border-color 0.2s;
        }
        .plan-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.06); border-color: #cbd5e1; }
        .plan-card.featured { border: 2px solid #1d4ed8; }

        .badge {
            display: inline-block; font-size: 11px; font-weight: 600;
            background: #eff6ff; color: #1d4ed8;
            padding: 3px 10px; border-radius: 20px; margin-bottom: 14px;
            letter-spacing: 0.04em;
        }
        .plan-tier { font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 4px; }
        .plan-price { font-family: 'DM Serif Display', serif; font-size: 28px; font-weight: 400; margin: 0 0 2px; line-height: 1.1; }
        .plan-price small { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 400; color: #94a3b8; }
        .plan-duration { font-size: 12px; color: #94a3b8; margin: 0 0 16px; }

        hr.divider { border: none; border-top: 1px solid #f1f5f9; margin: 0 0 16px; }

        .features { list-style: none; padding: 0; margin: 0 0 20px; flex: 1; }
        .features li { font-size: 13px; color: #475569; padding: 4px 0; display: flex; align-items: center; gap: 8px; }
        .features li svg { flex-shrink: 0; }

        label { display: block; font-size: 12px; font-weight: 500; color: #64748b; margin-bottom: 5px; }
        input[type="text"], input:not([type]) {
            width: 100%; padding: 9px 11px; font-size: 13px; font-family: 'DM Sans', sans-serif;
            border: 1px solid #e2e8f0; border-radius: 7px;
            background: #f8fafc; color: #172033;
            outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        input:focus { border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29,78,216,.1); }

        .btn {
            width: 100%; margin-top: 12px; padding: 10px;
            border: none; border-radius: 8px;
            font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
            color: #fff; background: #1d4ed8; cursor: pointer;
            transition: background 0.15s, transform 0.1s;
        }
        .btn:hover { background: #1e40af; }
        .btn:active { transform: scale(0.98); }

        .plan-meta { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 10px; }
        .btn[disabled] { opacity: 0.7; cursor: wait; }
    </style>

    @if (($midtrans['mode'] ?? 'fake') !== 'fake' && ! empty($midtrans['client_key']))
        <script
            src="{{ ($midtrans['is_production'] ?? false) ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js' }}"
            data-client-key="{{ $midtrans['client_key'] }}"
        ></script>
    @endif
</head>
<body>
<main>
    <div class="page-header">
        <h1>Paket Subscription</h1>
        <p>Pilih paket yang sesuai kebutuhan Anda. Akses aktif setelah pembayaran dikonfirmasi.</p>
    </div>

    <div class="info-bar">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#1d4ed8" stroke-width="1.3"/>
            <path d="M8 7v4M8 5.5v.5" stroke="#1d4ed8" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        Pembayaran aman melalui payment gateway. Anda masuk sebagai {{ $user->name }} #{{ $user->id }}.
    </div>

    <div class="plans-grid">
        @foreach ($plans as $plan)
            @php $isFeatured = $plan->is_featured ?? false; @endphp
            <article class="plan-card {{ $isFeatured ? 'featured' : '' }}">
                @if ($isFeatured)
                    <span class="badge">Paling Populer</span>
                @endif

                <p class="plan-tier">{{ $plan->name }}</p>
                <p class="plan-price">
                    Rp {{ number_format($plan->price, 0, ',', '.') }}
                    <small>/ periode</small>
                </p>
                <p class="plan-duration">Aktif {{ $plan->duration_days }} hari setelah konfirmasi</p>

                <hr class="divider">

                <ul class="features">
                    @foreach ($plan->features ?? [] as $feature)
                        <li>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2.5 7.5l3 3 6-6" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            {{ $feature }}
                        </li>
                    @endforeach
                </ul>

                <form method="POST" action="{{ route('subscribe.store') }}">
                    @csrf
                    <input type="hidden" name="plan_id" value="{{ $plan->id }}">
                    <button type="submit" class="btn">Pilih {{ $plan->name }}</button>
                </form>

                <p class="plan-meta">ID: {{ $plan->id }}</p>
            </article>
        @endforeach
    </div>
</main>

@if (($midtrans['mode'] ?? 'fake') !== 'fake' && ! empty($midtrans['client_key']))
    <script>
        (function () {
            if (!window.snap) {
                return;
            }

            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            const forms = document.querySelectorAll('form[action="{{ route('subscribe.store') }}"]');

            forms.forEach((form) => {
                form.addEventListener('submit', async (event) => {
                    event.preventDefault();

                    const submitButton = form.querySelector('button[type="submit"]');
                    if (submitButton?.disabled) {
                        return;
                    }

                    if (submitButton) {
                        submitButton.disabled = true;
                    }

                    try {
                        const response = await fetch(form.action, {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                                'X-CSRF-TOKEN': csrfToken || '',
                            },
                            body: new FormData(form),
                            credentials: 'same-origin',
                        });

                        const payload = await response.json().catch(() => null);

                        if (!response.ok || !payload?.snap_token) {
                            throw new Error(payload?.message || 'Gagal membuat transaksi Midtrans.');
                        }

                        window.snap.pay(payload.snap_token, {
                            onSuccess: function () {
                                window.location.href = "{{ route('payment.success') }}";
                            },
                            onPending: function () {
                                window.location.href = "{{ route('payment.success') }}";
                            },
                            onError: function () {
                                window.location.href = "{{ route('payment.failed') }}";
                            },
                            onClose: function () {
                                if (submitButton) {
                                    submitButton.disabled = false;
                                }
                            },
                        });
                    } catch (error) {
                        if (submitButton) {
                            submitButton.disabled = false;
                        }

                        // Fallback ke flow redirect server-side jika popup tidak bisa dibuka.
                        form.submit();
                    }
                });
            });
        })();
    </script>
@endif
</body>
</html>
