# N8N Automations

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![GitHub Created](https://img.shields.io/badge/Created-April%202026-blue)
![Language](https://img.shields.io/badge/Languages-Blade%20%7C%20PHP%20%7C%20Python-informational)

Repositori ini berisi koleksi automasi menggunakan **n8n** - platform workflow automation no-code/low-code yang powerful. Project ini mengintegrasikan berbagai workflow dan backend services untuk mengotomatisasi proses bisnis.

---

## 📋 Daftar Isi

- [Tentang Project](#tentang-project)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Project](#struktur-project)
- [Instalasi](#instalasi)
- [Penggunaan](#penggunaan)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

---

## 🎯 Tentang Project

**n8n-automations** adalah repository yang berisi berbagai workflow automasi untuk mengotomatisasi tugas-tugas repetitif dalam bisnis. Dengan menggunakan n8n sebagai orchestration platform, project ini memungkinkan integrasi seamless antar aplikasi dan service.

### Fitur Utama:
- ✅ Workflow automasi berbasis n8n
- 🔄 Integrasi multi-service dan API
- 📊 Proses automasi financial recording
- 🌐 Web demo untuk showcase dan testing
- 💡 Clean code dan dokumentasi yang baik

---

## 🛠️ Teknologi yang Digunakan

| Teknologi | Persentase | Deskripsi |
|-----------|-----------|-----------|
| **Blade** | 53.4% | Template engine untuk Laravel, digunakan untuk UI/view |
| **PHP** | 44.4% | Backend logic dan server-side processing |
| **Python** | 1.7% | Scripting dan automation tasks |
| **Other** | 0.5% | File konfigurasi dan assets lainnya |

### Teknologi Tambahan:
- **n8n** - Workflow automation platform
- **Laravel** - Framework PHP untuk backend
- **Git** - Version control

---

## 📁 Struktur Project

```
n8n-automations/
├── automation_financial_recording/    # Module untuk automasi pencatatan keuangan
├── demo-web/                         # Web demo untuk showcase automasi
├── .vscode/                          # Konfigurasi VS Code
├── .gitignore                        # File gitignore
├── LICENSE                           # Lisensi MIT
└── README.md                         # Dokumentasi (file ini)
```

### Penjelasan Folder:

#### `automation_financial_recording/`
Modul dedicated untuk mengotomatisasi proses pencatatan keuangan:
- Menangkap data transaksi dari berbagai sumber
- Memproses dan validasi data financial
- Recording ke sistem akuntansi
- Reporting dan audit trail

#### `demo-web/`
Aplikasi web demo untuk:
- Showcase kemampuan automasi
- Testing workflow secara real-time
- UI untuk monitoring status automasi
- Dashboard analytics

---

## 🚀 Instalasi

### Prerequisites:
- PHP >= 8.0
- Composer
- Node.js & npm (untuk frontend)
- n8n instance (self-hosted atau cloud)
- Python 3.8+ (untuk Python scripts)

### Steps:

1. **Clone Repository**
```bash
git clone https://github.com/mahes765/n8n-automations.git
cd n8n-automations
```

2. **Install Dependencies**
```bash
# PHP dependencies
composer install

# Node.js dependencies (jika ada)
npm install
```

3. **Konfigurasi Environment**
```bash
# Copy file .env example (jika ada)
cp .env.example .env

# Update konfigurasi sesuai kebutuhan
# - N8N API credentials
# - Database connection
# - API endpoints
```

4. **Setup Database**
```bash
# Jalankan migrations (jika menggunakan Laravel)
php artisan migrate
```

5. **Jalankan Application**
```bash
# Start Laravel development server
php artisan serve

# Atau gunakan Docker jika tersedia
docker-compose up -d
```

---

## 💻 Penggunaan

### Workflow Automasi:

#### 1. Financial Recording Automation
Untuk menggunakan module automasi keuangan:

```bash
# Akses via n8n dashboard
# 1. Buka workflow "Financial Recording"
# 2. Konfigurasi data source
# 3. Test workflow
# 4. Deploy ke production
```

#### 2. Demo Web
Untuk menjalankan demo web:

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

### API Endpoints:

```
GET  /api/automations        - Daftar semua automation
GET  /api/automations/{id}   - Detail automation tertentu
POST /api/automations        - Trigger automation
GET  /api/status             - Status automasi real-time
```

---

## 🤝 Kontribusi

Kami menerima kontribusi! Silakan:

1. **Fork** repository ini
2. Buat **branch** fitur baru (`git checkout -b feature/AmazingFeature`)
3. **Commit** perubahan Anda (`git commit -m 'Add some AmazingFeature'`)
4. **Push** ke branch (`git push origin feature/AmazingFeature`)
5. Buka **Pull Request**

### Panduan Kontribusi:
- Ikuti coding standards yang ada
- Tambahkan test untuk fitur baru
- Update dokumentasi yang relevan
- Pastikan tidak ada breaking changes

---

## 📄 Lisensi

Project ini dilisensikan di bawah **MIT License** - lihat file [LICENSE](LICENSE) untuk detail lengkap.

---

## 👤 Penulis & Maintainer

- **mahes765** - GitHub: [@mahes765](https://github.com/mahes765)

---

## 📞 Support & Contact

Jika Anda memiliki pertanyaan atau menemukan bug:

- 📧 Buka [GitHub Issues](https://github.com/mahes765/n8n-automations/issues)
- 💬 Diskusi di [GitHub Discussions](https://github.com/mahes765/n8n-automations/discussions)

---

## 🎓 Resources Tambahan

- [n8n Documentation](https://docs.n8n.io/)
- [Laravel Documentation](https://laravel.com/docs)
- [PHP Best Practices](https://www.php.net/manual/en/index.php)
- [Python Documentation](https://docs.python.org/3/)

---

**⭐ Jika project ini membantu Anda, berikan star!**

Last Updated: April 24, 2026
