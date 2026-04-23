from flask import Flask, request, redirect, render_template_string
import logging
import uuid
from datetime import datetime

app = Flask(__name__)

# Simulasi database
visit_log = []

# Template HTML
LANDING_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bantend Bot - Akses Cepat</title>
    <style>
        body { font-family: Arial; text-align: center; padding: 50px; }
        button { background: #0088cc; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 18px; cursor: pointer; }
        button:hover { background: #006699; }
        .info { margin-bottom: 30px; color: #333; }
    </style>
</head>
<body>
    <div class="info">
        <h1>🤖 Bantend Bot</h1>
        <p>Klik tombol di bawah untuk membuka Telegram dan memulai bot</p>
        <p><small>ID sesi Anda: {{ session_id }}</small></p>
    </div>
    <button onclick="window.location.href='{{ bot_link }}'">🚀 Buka Bot di Telegram</button>
</body>
</html>
"""

@app.route('/go-to-bot')
def go_to_bot():
    # Ambil parameter opsional dari URL (misal ?ref=n8n)
    ref = request.args.get('ref', 'unknown')
    user_ip = request.remote_addr
    
    # Buat ID sesi unik untuk pelacakan
    session_id = str(uuid.uuid4())[:8]
    
    # Catat kunjungan (bisa dikirim ke n8n via webhook nanti)
    log_entry = {
        'session_id': session_id,
        'timestamp': datetime.now().isoformat(),
        'ip': user_ip,
        'referrer': ref,
        'user_agent': request.headers.get('User-Agent')
    }
    visit_log.append(log_entry)
    print(f"[LOG] {log_entry}")  # Bisa diganti dengan kirim ke n8n
    
    # Tentukan link bot Telegram (dengan parameter start unik jika perlu)
    bot_username = "bantend_bot"
    start_param = f"landing_{session_id}"  # Opsional: untuk tracking di bot
    bot_link = f"https://t.me/{bot_username}?start={start_param}"
    
    # Tampilkan halaman dengan tombol (bisa juga redirect langsung setelah delay)
    # Di sini kita tampilkan halaman, pengguna harus klik tombol
    return render_template_string(LANDING_TEMPLATE, session_id=session_id, bot_link=bot_link)

@app.route('/auto-redirect')
def auto_redirect():
    """Versi otomatis redirect tanpa tombol (dengan delay via meta refresh)"""
    bot_link = f"https://t.me/bantend_bot?start=auto_{uuid.uuid4().hex[:6]}"
    # Kirim HTML dengan meta refresh 2 detik
    return f"""
    <html><head><meta http-equiv="refresh" content="2;url={bot_link}"></head>
    <body><p>Mengarahkan ke Telegram bot...</p></body></html>
    """

if __name__ == '__main__':
    # Jalankan server (ganti host/port sesuai kebutuhan)
    app.run(host='0.0.0.0', port=5000, debug=True)