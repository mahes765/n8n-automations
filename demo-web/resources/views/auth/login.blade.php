<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Login</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'DM Sans', system-ui, sans-serif;
            background: #f4f5f7;
            color: #172033;
            display: grid;
            place-items: center;
            padding: 24px;
        }
        main {
            width: min(420px, 100%);
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 28px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, .06);
        }
        h1 {
            font-family: 'DM Serif Display', serif;
            font-size: 30px;
            font-weight: 400;
            line-height: 1.1;
            margin: 0 0 6px;
        }
        p { margin: 0 0 24px; color: #64748b; font-size: 14px; }
        label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 6px;
        }
        input[type="text"],
        input[type="email"],
        input[type="password"] {
            width: 100%;
            padding: 11px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #f8fafc;
            color: #172033;
            font: inherit;
            outline: none;
            transition: border-color .15s, box-shadow .15s;
        }
        input:focus {
            border-color: #1d4ed8;
            box-shadow: 0 0 0 3px rgba(29, 78, 216, .1);
        }
        .field { margin-bottom: 16px; }
        .remember {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 2px 0 18px;
            color: #475569;
            font-size: 13px;
        }
        .remember input { width: 16px; height: 16px; }
        .error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            color: #b91c1c;
            font-size: 13px;
            padding: 10px 12px;
            margin-bottom: 16px;
        }
        button {
            width: 100%;
            padding: 11px 14px;
            border: 0;
            border-radius: 8px;
            background: #1d4ed8;
            color: #fff;
            cursor: pointer;
            font: inherit;
            font-weight: 600;
        }
        button:hover { background: #1e40af; }
        .auth-link {
            margin: 18px 0 0;
            text-align: center;
            font-size: 13px;
        }
        .auth-link a {
            color: #1d4ed8;
            font-weight: 600;
            text-decoration: none;
        }
        .auth-link a:hover { text-decoration: underline; }
    </style>
</head>
<body>
<main>
    <h1>Login</h1>
    <p>Masuk terlebih dahulu untuk melihat paket subscription.</p>

    @if ($errors->any())
        <div class="error">{{ $errors->first() }}</div>
    @endif

    <form method="POST" action="{{ route('login.store') }}">
        @csrf

        <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" name="email" value="{{ old('email') }}" autocomplete="email" required autofocus>
        </div>

        <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" name="password" autocomplete="current-password" required>
        </div>

        <label class="remember">
            <input type="checkbox" name="remember" value="1">
            Ingat saya
        </label>

        <button type="submit">Masuk</button>
    </form>

    <p class="auth-link">
        Belum punya akun? <a href="{{ route('register') }}">Daftar sekarang</a>
    </p>
</main>
</body>
</html>
