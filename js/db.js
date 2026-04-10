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

// ---- Untuk dipakai di server-side (Node.js) ----
// Uncomment bagian ini jika menjalankan via Node.js

/*
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'farmify_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL - Farmify DB');
});

pool.on('error', (err) => {
  console.error('❌ DB Connection Error:', err);
});

module.exports = pool;
*/

// =====================================================
// SQL SCHEMA - Jalankan di DBeaver
// =====================================================

/*
-- ============ SETUP FARMIFY DATABASE ============

CREATE DATABASE farmify_db;

\c farmify_db;

-- Extension untuk UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- TABEL USERS ----
CREATE TABLE users (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('farmer', 'buyer', 'admin')),
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  profile_img   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- TABEL FARMER PROFILE ----
CREATE TABLE farmer_profiles (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  farm_name       VARCHAR(255) NOT NULL,
  farm_size_ha    DECIMAL(8,2),
  province        VARCHAR(100),
  city            VARCHAR(100),
  address         TEXT,
  gapoktan_name   VARCHAR(255),
  commodities     TEXT[], -- array of commodity types
  farming_exp_yr  INTEGER,
  nik             VARCHAR(20) UNIQUE,
  bank_name       VARCHAR(100),
  bank_account    VARCHAR(50),
  is_verified     BOOLEAN DEFAULT FALSE,
  rating          DECIMAL(3,2) DEFAULT 0.00,
  total_reviews   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---- TABEL BUYER PROFILE ----
CREATE TABLE buyer_profiles (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name    VARCHAR(255) NOT NULL,
  business_type   VARCHAR(100), -- restaurant, manufacturer, HoReCa, etc.
  npwp            VARCHAR(25) UNIQUE,
  siup            VARCHAR(50),
  province        VARCHAR(100),
  city            VARCHAR(100),
  address         TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  loyalty_points  INTEGER DEFAULT 0,
  wallet_balance  DECIMAL(15,2) DEFAULT 0.00,
  subscription    VARCHAR(20) DEFAULT 'free' CHECK (subscription IN ('free', 'premium')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---- TABEL COMMODITIES (produk petani) ----
CREATE TABLE commodities (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  farmer_id       UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(50) CHECK (category IN ('vegetable','fruit','grain','spice','tuber','herb','other')),
  unit            VARCHAR(20) NOT NULL DEFAULT 'kg',
  price_per_unit  DECIMAL(12,2) NOT NULL,
  stock_quantity  DECIMAL(12,2) DEFAULT 0,
  min_order_qty   DECIMAL(12,2) DEFAULT 1,
  grade           VARCHAR(10) DEFAULT 'A',
  harvest_date    DATE,
  description     TEXT,
  is_available    BOOLEAN DEFAULT TRUE,
  is_pre_order    BOOLEAN DEFAULT FALSE,
  images          TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---- TABEL ORDERS ----
CREATE TABLE orders (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_code      VARCHAR(20) UNIQUE NOT NULL,
  buyer_id        UUID REFERENCES buyer_profiles(id),
  farmer_id       UUID REFERENCES farmer_profiles(id),
  commodity_id    UUID REFERENCES commodities(id),
  quantity        DECIMAL(12,2) NOT NULL,
  unit_price      DECIMAL(12,2) NOT NULL,
  total_price     DECIMAL(15,2) NOT NULL,
  platform_fee    DECIMAL(12,2) NOT NULL,  -- 7% transaction fee
  status          VARCHAR(30) DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','processing','shipped','delivered','completed','cancelled','refunded')),
  is_pre_order    BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  delivery_address TEXT,
  payment_status  VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','escrowed','released','refunded')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---- TABEL LOGISTICS ----
CREATE TABLE logistics (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES users(id),
  company_name    VARCHAR(255) NOT NULL,
  sk_number       VARCHAR(50) UNIQUE NOT NULL,
  fleet_size      INTEGER,
  max_capacity_kg DECIMAL(10,2),
  coverage_area   TEXT[],
  is_verified     BOOLEAN DEFAULT FALSE,
  subscription    VARCHAR(20) DEFAULT 'free',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---- INDEX untuk performance ----
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_role     ON users(role);
CREATE INDEX idx_commodities_farmer ON commodities(farmer_id);
CREATE INDEX idx_orders_buyer   ON orders(buyer_id);
CREATE INDEX idx_orders_farmer  ON orders(farmer_id);
CREATE INDEX idx_orders_status  ON orders(status);

-- ---- SAMPLE ADMIN USER (password: Admin@Farmify2024) ----
INSERT INTO users (full_name, email, password_hash, role, status)
VALUES (
  'Admin Farmify',
  'admin@farmify.id',
  '$2a$12$LVj7N1c.V9mT8gDuK3nXKOabT/xZ7p3VnRkwM.cJdZIRe4kQFgzKm',
  'admin',
  'active'
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
      const adminHash = btoa('Admin@Farmify2024'); // simplified for demo
      const demoUsers = [
        {
          id: 'admin-001',
          full_name: 'Admin Farmify',
          email: 'admin@farmify.id',
          phone: '08123456789',
          password: adminHash,
          role: 'admin',
          status: 'active',
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
          farm_name: 'Sido Makmur Farm',
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
          company_name: 'PT Jaya Foods',
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

  // ---- Create new user ----
  createUser(userData) {
    const users = this.getUsers();

    // Check email exists
    if (this.findByEmail(userData.email)) {
      return { success: false, message: 'Email sudah terdaftar.' };
    }

    const newUser = {
      id: `${userData.role}-${Date.now()}`,
      ...userData,
      email: userData.email.toLowerCase(),
      password: btoa(userData.password), // In production: use bcrypt
      status: userData.role === 'admin' ? 'active' : 'pending',
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
    if (user.status === 'pending') return { success: false, message: 'Akun belum diverifikasi admin.' };
    if (user.status === 'suspended') return { success: false, message: 'Akun ditangguhkan. Hubungi admin.' };
    return { success: true, user };
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

  // ---- Get users by role ----
  getUsersByRole(role) {
    return this.getUsers().filter(u => u.role === role);
  }
};

// Inisialisasi saat script dimuat
FarmifyDB.init();

// Redirect guard - panggil di setiap dashboard page
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
