# 🌿 Farmify — Farm-to-Business Platform

> "Direct Market, Better Income"

## 📁 Struktur File

```
farmify/
├── index.html              ← Landing page (auto-redirect ke dashboard jika sudah login)
├── login.html              ← Halaman login (3 role: farmer, buyer, admin)
├── register.html           ← Halaman registrasi dengan form per role
├── farmer-dashboard.html   ← Dashboard Petani / Seller
├── buyer-dashboard.html    ← Dashboard Pembeli / B2B
├── admin-dashboard.html    ← Dashboard Admin Platform
├── css/
│   └── style.css           ← Global stylesheet (Farmify Design System)
└── js/
    └── db.js               ← Database config + LocalStorage simulation
```

---

## 🚀 Cara Menjalankan (Cepat)

1. Buka folder `farmify/` di VSCode
2. Install extension **Live Server** (ritwickdey.LiveServer)
3. Klik kanan `index.html` → **Open with Live Server**
4. Buka di browser: `http://127.0.0.1:5500/index.html`

---

## 👤 Akun Demo

| Role    | Email               | Password          |
|---------|---------------------|-------------------|
| 🌾 Petani | sido@farmify.id   | Petani@123        |
| 🏭 Pembeli | ptjaya@farmify.id | Buyer@123         |
| ⚙️ Admin  | admin@farmify.id  | Admin@Farmify2024 |

> Kode admin untuk registrasi baru: **FARMIFY2025**

---

## 🗄️ Integrasi Database (DBeaver + PostgreSQL)

### Setup PostgreSQL

1. **Install PostgreSQL** (https://www.postgresql.org/)
2. **Buka DBeaver**, buat koneksi PostgreSQL baru:
   - Host: `localhost`
   - Port: `5432`
   - User: `postgres`
   - Password: (sesuai instalasi)

3. **Buat database baru** bernama `farmify_db`

4. **Jalankan SQL Schema** yang ada di file `js/db.js` (bagian `-- SETUP FARMIFY DATABASE`)
   - Copy semua SQL di dalam komentar `/* ... */`
   - Paste dan jalankan di DBeaver SQL Editor

### Setup Backend Node.js (Opsional, untuk production)

```bash
# Install dependencies
npm init -y
npm install express pg bcryptjs jsonwebtoken dotenv cors

# Buat file .env
cp .env.example .env
# Edit .env sesuai konfigurasi PostgreSQL kamu

# Jalankan server
node server.js
```

### File .env yang diperlukan:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmify_db
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=farmify_super_secret_key_ganti_ini
PORT=3000
```

> **Saat ini:** Data tersimpan di browser `localStorage` (simulasi DB)  
> **Production:** Ganti fungsi di `js/db.js` dengan API call ke backend Node.js

---

## 🎨 Design System

- **Font Display:** Playfair Display (serif, elegant)
- **Font Body:** DM Sans (clean, readable)
- **Primary Color:** Forest Green `#1C3A2A`
- **Accent:** Harvest Gold `#C8972A`
- **Theme:** Organic/Natural — sesuai branding Farmify

---

## 📱 Rencana Pengembangan

- [ ] Backend Node.js + Express API
- [ ] Koneksi PostgreSQL via `pg` library
- [ ] JWT Authentication
- [ ] Upload foto komoditas
- [ ] Real-time notification (WebSocket)
- [ ] Tampilan mobile responsive
- [ ] Export laporan ke PDF/Excel
- [ ] Integrasi payment gateway (Midtrans)
- [ ] AI Chatbot integration

---

## 🔄 Alur Login → Dashboard

```
index.html
    ↓
login.html  ← pilih demo account atau input manual
    ↓
[cek role di FarmifyDB]
    ↓
farmer-dashboard.html  (jika role = farmer)
buyer-dashboard.html   (jika role = buyer)  
admin-dashboard.html   (jika role = admin)
```

---

*Built for Farmify — Enabling Fair and Direct Trade | East Java, Indonesia*
