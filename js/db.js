/**
 * =====================================================
 * FARMIFY - Database Configuration
 * Backend: Node.js + pg (node-postgres)
 * DB Tool: DBeaver / PostgreSQL
 * =====================================================
 *
 * CARA SETUP:
 * 1. Install dependencies:
 *    npm install pg bcryptjs jsonwebtoken dotenv express cors
 *
 * 2. Buat file .env di root project:
 *    DB_HOST=localhost
 *    DB_PORT=5432
 *    DB_NAME=farmify_db
 *    DB_USER=postgres
 *    DB_PASSWORD=your_password
 *    JWT_SECRET=farmify_secret_key_ganti_ini
 *    PORT=3000
 *
 * 3. Di DBeaver: Create new database "farmify_db"
 *    lalu jalankan file setup/schema.sql
 *
 * 4. Jalankan: node js/db.js (untuk test koneksi)
 * =====================================================
 */

// =====================================================
// SQL SCHEMA - Jalankan di DBeaver
// =====================================================

/*
-- ============ SETUP FARMIFY DATABASE ============

CREATE DATABASE farmify_db;
\c farmify_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('farmer', 'buyer', 'admin')),
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  email_verified BOOLEAN DEFAULT FALSE,
  profile_img   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_verifications (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  otp_code    VARCHAR(6) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- (skema lain tetap sama seperti sebelumnya...)

INSERT INTO users (full_name, email, password_hash, role, status, email_verified)
VALUES (
  'Admin Farmify',
  'admin@farmify.id',
  '$2a$12$LVj7N1c.V9mT8gDuK3nXKOabT/xZ7p3VnRkwM.cJdZIRe4kQFgzKm',
  'admin',
  'active',
  true
);
*/

// =====================================================
// CLIENT-SIDE: LocalStorage simulation
// (untuk development tanpa server)
// =====================================================

const FarmifyDB = {

  // ---- Inisialisasi dummy data jika kosong ----
  init() {
    if (!localStorage.getItem('farmify_users')) {
      const demoUsers = [
        {
          id: 'admin-001',
          full_name: 'Admin Farmify',
          email: 'admin@farmify.id',
          phone: '08123456789',
          password: btoa('Admin@Farmify2024'),
          role: 'admin',
          status: 'active',
          email_verified: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'farmer-001',
          full_name: 'Pak Sido Makmur',
          email: 'sido@farmify.id',
          phone: '08111234567',
          password: btoa('Petani@123'),
          role: 'farmer',
          status: 'active',
          email_verified: true,
          farm_name: 'Sido Makmur Farm',
          city: 'Malang',
          province: 'jawa_timur',
          farm_size: '2.5',
          exp_years: '15',
          commodities: ['vegetable', 'spice'],
          bank_name: 'BRI',
          bank_account: '1234567890',
          created_at: new Date().toISOString()
        },
        {
          id: 'buyer-001',
          full_name: 'PT Jaya Foods',
          email: 'ptjaya@farmify.id',
          phone: '0215559876',
          password: btoa('Buyer@123'),
          role: 'buyer',
          status: 'active',
          email_verified: true,
          company_name: 'PT Jaya Foods Indonesia',
          business_type: 'manufacturer',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('farmify_users', JSON.stringify(demoUsers));
    }
  },

  // ---- Get all users ----
  getUsers() {
    return JSON.parse(localStorage.getItem('farmify_users') || '[]');
  },

  // ---- Find user by email ----
  findByEmail(email) {
    return this.getUsers().find(u => u.email === email.toLowerCase());
  },

  // 1. Pastikan createUser langsung memberikan status 'active'
createUser(userData) {
  const users = this.getUsers();
  if (this.findByEmail(userData.email)) {
    return { success: false, message: 'Email sudah terdaftar.' };
  }
  const newUser = {
    id: `${userData.role}-${Date.now()}`,
    ...userData,
    email: userData.email.toLowerCase(),
    password: btoa(userData.password), // Base64 simulation
    status: 'active', // <--- Diubah dari 'pending' ke 'active'
    email_verified: true,
    created_at: new Date().toISOString()
  };
  users.push(newUser);
  localStorage.setItem('farmify_users', JSON.stringify(users));
  return { success: true, user: newUser };
},

  // ---- Authenticate user ----
  authenticate(email, password) {
    const user = this.findByEmail(email);
    if (!user) return { success: false, message: 'Email tidak ditemukan.' };
    if (user.password !== btoa(password)) return { success: false, message: 'Password salah.' };
    if (!user.email_verified) return { success: false, message: 'Email belum diverifikasi. Cek inbox Anda.' };
    if (user.status === 'pending') return { success: false, message: 'Akun sedang diproses.' };
    if (user.status === 'suspended') return { success: false, message: 'Akun ditangguhkan. Hubungi admin.' };
    return { success: true, user };
  },

  // ---- OTP Management ----
  generateOTP(email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 menit
    const otps = JSON.parse(localStorage.getItem('farmify_otps') || '[]');
    // Hapus OTP lama untuk email ini
    const filtered = otps.filter(o => o.email !== email.toLowerCase());
    filtered.push({ email: email.toLowerCase(), code, expires, used: false });
    localStorage.setItem('farmify_otps', JSON.stringify(filtered));
    return code;
  },

  verifyOTP(email, code) {
    const otps = JSON.parse(localStorage.getItem('farmify_otps') || '[]');
    const otp = otps.find(o => o.email === email.toLowerCase() && !o.used);
    if (!otp) return { success: false, message: 'Kode OTP tidak ditemukan. Minta ulang.' };
    if (new Date() > new Date(otp.expires)) return { success: false, message: 'Kode OTP sudah kedaluwarsa. Minta ulang.' };
    if (otp.code !== code) return { success: false, message: 'Kode OTP salah.' };
    // Tandai sebagai terpakai
    otp.used = true;
    localStorage.setItem('farmify_otps', JSON.stringify(otps));
    return { success: true };
  },

  // ---- Send OTP via Gmail (using Anthropic API / Claude) ----
  async sendOTPEmail(email, name, otp) {
    // Gunakan Anthropic API untuk generate konten email yang baik
    // lalu "kirim" via Gmail MCP (jika tersedia di production)
    // Di sini kita simulate dengan menampilkan OTP di console & alert
    // Di production: integrasikan dengan Gmail API / Nodemailer / SendGrid

    const emailContent = `
Halo ${name}!

Terima kasih telah mendaftar di Farmify — Platform Farm-to-Business.

Kode Verifikasi Email Anda:

  ┌─────────────────┐
  │   ${otp}   │
  └─────────────────┘

Kode ini berlaku selama 10 menit.
Jangan bagikan kode ini kepada siapapun.

Jika Anda tidak mendaftar di Farmify, abaikan email ini.

Salam,
Tim Farmify
farmify.id · Jawa Timur, Indonesia
    `.trim();

    // ⚠️ SIMULASI: Tampilkan OTP di console (untuk dev/demo)
    console.log(`📧 [FARMIFY EMAIL SIMULATOR]`);
    console.log(`To: ${email}`);
    console.log(`Subject: Kode Verifikasi Farmify — ${otp}`);
    console.log(emailContent);

    // Di production dengan Gmail MCP / Nodemailer:
    // await sendGmail({ to: email, subject: `Kode Verifikasi Farmify`, body: emailContent });

    return { success: true, otp_for_demo: otp };
  },

  // ---- Session management ----
  setSession(user) {
    const session = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      logged_in_at: new Date().toISOString()
    };
    sessionStorage.setItem('farmify_session', JSON.stringify(session));
    return session;
  },

  getSession() {
    return JSON.parse(sessionStorage.getItem('farmify_session') || 'null');
  },

  clearSession() {
    sessionStorage.removeItem('farmify_session');
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  // ---- Update user status (for admin) ----
  updateUserStatus(userId, status) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return false;
    users[idx].status = status;
    localStorage.setItem('farmify_users', JSON.stringify(users));
    return true;
  },

  // ---- Update user data ----
  updateUser(userId, data) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return false;
    users[idx] = { ...users[idx], ...data, updated_at: new Date().toISOString() };
    localStorage.setItem('farmify_users', JSON.stringify(users));
    return true;
  },

  // ---- Get users by role ----
  getUsersByRole(role) {
    return this.getUsers().filter(u => u.role === role);
  },

  // ---- Commodity management ----
  getCommodities(farmerId) {
    const all = JSON.parse(localStorage.getItem('farmify_commodities') || '[]');
    return farmerId ? all.filter(c => c.farmer_id === farmerId) : all;
  },

  addCommodity(data) {
    const commodities = this.getCommodities();
    const newCom = {
      id: `com-${Date.now()}`,
      ...data,
      is_available: true,
      created_at: new Date().toISOString()
    };
    commodities.push(newCom);
    localStorage.setItem('farmify_commodities', JSON.stringify(commodities));
    return { success: true, commodity: newCom };
  },

  updateCommodity(id, data) {
    const commodities = this.getCommodities();
    const idx = commodities.findIndex(c => c.id === id);
    if (idx === -1) return false;
    commodities[idx] = { ...commodities[idx], ...data };
    localStorage.setItem('farmify_commodities', JSON.stringify(commodities));
    return true;
  },

  deleteCommodity(id) {
    const commodities = this.getCommodities().filter(c => c.id !== id);
    localStorage.setItem('farmify_commodities', JSON.stringify(commodities));
    return true;
  },

  // ---- Order management ----
  getOrders(filter) {
    const all = JSON.parse(localStorage.getItem('farmify_orders') || '[]');
    if (!filter) return all;
    return all.filter(o => {
      if (filter.farmer_id && o.farmer_id !== filter.farmer_id) return false;
      if (filter.buyer_id && o.buyer_id !== filter.buyer_id) return false;
      if (filter.status && o.status !== filter.status) return false;
      return true;
    });
  },

  createOrder(data) {
    const orders = this.getOrders();
    const code = `ORD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;
    const newOrder = {
      id: `order-${Date.now()}`,
      order_code: code,
      ...data,
      platform_fee: data.total_price * 0.07,
      status: 'pending',
      payment_status: 'unpaid',
      created_at: new Date().toISOString()
    };
    orders.push(newOrder);
    localStorage.setItem('farmify_orders', JSON.stringify(orders));
    return { success: true, order: newOrder };
  },

  updateOrderStatus(orderId, status) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return false;
    orders[idx].status = status;
    orders[idx].updated_at = new Date().toISOString();
    localStorage.setItem('farmify_orders', JSON.stringify(orders));
    return true;
  },

  // ---- Notification management ----
  getNotifications(userId) {
    const all = JSON.parse(localStorage.getItem('farmify_notifs') || '[]');
    return all.filter(n => n.user_id === userId).sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );
  },

  addNotification(userId, text, type = 'info') {
    const notifs = JSON.parse(localStorage.getItem('farmify_notifs') || '[]');
    notifs.push({
      id: `notif-${Date.now()}`,
      user_id: userId,
      text,
      type,
      read: false,
      created_at: new Date().toISOString()
    });
    localStorage.setItem('farmify_notifs', JSON.stringify(notifs));
  },

  markNotifRead(notifId) {
    const notifs = JSON.parse(localStorage.getItem('farmify_notifs') || '[]');
    const idx = notifs.findIndex(n => n.id === notifId);
    if (idx >= 0) notifs[idx].read = true;
    localStorage.setItem('farmify_notifs', JSON.stringify(notifs));
  },

  markAllNotifsRead(userId) {
    const notifs = JSON.parse(localStorage.getItem('farmify_notifs') || '[]');
    notifs.forEach(n => { if (n.user_id === userId) n.read = true; });
    localStorage.setItem('farmify_notifs', JSON.stringify(notifs));
  }
};

// Inisialisasi saat script dimuat
FarmifyDB.init();

// ---- Auth Guard ----
function requireAuth(allowedRoles) {
  const session = FarmifyDB.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    window.location.href = getDashboardUrl(session.role);
    return null;
  }
  return session;
}

function getDashboardUrl(role) {
  const map = {
    farmer: 'farmer-dashboard.html',
    buyer:  'buyer-dashboard.html',
    admin:  'admin-dashboard.html'
  };
  return map[role] || 'login.html';
}

function logout() {
  FarmifyDB.clearSession();
  window.location.href = 'login.html';
}

// ---- Format currency ----
function formatRp(num) {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

// ---- Time ago ----
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}