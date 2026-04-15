/**
 * =====================================================
 * FARMIFY — Firebase Firestore Database Layer
 * v3.0 — Replaces localStorage with Firebase Firestore
 * Realtime multi-user support for Admin, Farmer, Buyer
 * =====================================================
 *
 * SETUP INSTRUCTIONS:
 * 1. Buka https://console.firebase.google.com
 * 2. Buat project baru → "Farmify"
 * 3. Klik "Add App" → pilih Web (</>)
 * 4. Copy firebaseConfig dan paste di bawah (ganti bagian FIREBASE CONFIG)
 * 5. Di Firebase Console → Build → Firestore Database → Create database
 *    Pilih "Start in test mode" untuk development
 * 6. Di Firebase Console → Build → Authentication → Get started
 *    Enable "Email/Password" provider
 * 7. Selesai! Semua data sekarang tersimpan di cloud Firebase
 *
 * COLLECTIONS di Firestore:
 *  - users        → data semua user (farmer, buyer, admin)
 *  - commodities  → data komoditas dari farmer
 *  - orders       → data transaksi/pesanan
 *  - activity     → log aktivitas untuk admin monitoring
 *  - notifications→ notifikasi per user
 *  - otps         → kode OTP verifikasi email
 * =====================================================
 */

// =====================================================
// 🔥 FIREBASE CONFIG — GANTI DENGAN MILIK KAMU
// =====================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// =====================================================
// FIREBASE INIT
// =====================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs,
  setDoc, addDoc, updateDoc, deleteDoc, query,
  where, orderBy, limit, onSnapshot, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const _app  = initializeApp(firebaseConfig);
const _db   = getFirestore(_app);
const _auth = getAuth(_app);

// =====================================================
// FARMIFY DB — PUBLIC API (sama persis seperti versi lama)
// Semua fungsi async sekarang, gunakan await saat memanggil
// =====================================================
const FarmifyDB = {

  // ---- SEED DEMO DATA (jalankan sekali saat init) ----
  async seedDemoDataIfEmpty() {
    const snap = await getDocs(query(collection(_db, 'users'), limit(1)));
    if (!snap.empty) return; // Sudah ada data, skip

    const batch = writeBatch(_db);

    const demoUsers = [
      {
        id: 'admin-001', full_name: 'Admin Farmify', email: 'admin@farmify.id',
        phone: '08123456789', password: btoa('Admin@Farmify2024'), role: 'admin',
        status: 'active', email_verified: true, setup_complete: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'farmer-001', full_name: 'Pak Sido Makmur', email: 'sido@farmify.id',
        phone: '08111234567', password: btoa('Petani@123'), role: 'farmer',
        status: 'active', email_verified: true, setup_complete: true,
        farm_name: 'Sido Makmur Farm', city: 'Malang', province: 'East Java',
        farm_size: '2.5', exp_years: '15', commodities: ['vegetable', 'spice'],
        bank_name: 'BRI', bank_account: '1234567890',
        created_at: new Date().toISOString()
      },
      {
        id: 'buyer-001', full_name: 'PT Jaya Foods', email: 'ptjaya@farmify.id',
        phone: '0215559876', password: btoa('Buyer@123'), role: 'buyer',
        status: 'active', email_verified: true, setup_complete: true,
        company_name: 'PT Jaya Foods Indonesia', business_type: 'manufacturer',
        company_address: 'Surabaya, East Java', npwp: '01.234.567.8-000.000',
        bank_name: 'BCA', bank_account: '0987654321',
        created_at: new Date().toISOString()
      }
    ];

    for (const u of demoUsers) {
      batch.set(doc(_db, 'users', u.id), u);
    }

    const demoCommodities = [
      { id: 'com-001', farmer_id: 'farmer-001', name: 'Red Chili', category: 'Vegetables', unit: 'kg', price: 45000, stock: 1200, is_preorder: false, is_available: true, emoji: '🌶️', created_at: new Date().toISOString() },
      { id: 'com-002', farmer_id: 'farmer-001', name: 'Red Onion', category: 'Spices', unit: 'kg', price: 38000, stock: 800, is_preorder: false, is_available: true, emoji: '🧅', created_at: new Date().toISOString() },
      { id: 'com-003', farmer_id: 'farmer-001', name: 'Organic Spinach', category: 'Vegetables', unit: 'kg', price: 12000, stock: 0, is_preorder: true, harvest_date: '2025-06-01', is_available: true, emoji: '🥬', created_at: new Date().toISOString() }
    ];

    for (const c of demoCommodities) {
      batch.set(doc(_db, 'commodities', c.id), c);
    }

    await batch.commit();
    console.log('[Farmify] ✅ Demo data seeded to Firestore.');
  },

  // ---- USER CRUD ----
  async getUsers() {
    const snap = await getDocs(collection(_db, 'users'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async findByEmail(email) {
    const q = query(collection(_db, 'users'), where('email', '==', email.toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  },

  async findById(id) {
    const snap = await getDoc(doc(_db, 'users', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  async createUser(userData) {
    const existing = await this.findByEmail(userData.email);
    if (existing) return { success: false, message: 'Email already registered.' };

    const id = `${userData.role}-${Date.now()}`;
    const newUser = {
      ...userData,
      id,
      email: userData.email.toLowerCase(),
      password: btoa(userData.password),
      status: 'pending',
      email_verified: false,
      setup_complete: false,
      created_at: new Date().toISOString()
    };

    await setDoc(doc(_db, 'users', id), newUser);
    await this.addActivity(id, newUser.full_name, newUser.role, 'register', `New account registered as ${newUser.role}`);
    return { success: true, user: newUser };
  },

  async authenticate(email, password) {
    const user = await this.findByEmail(email);
    if (!user) return { success: false, message: 'Email not found.' };
    if (user.password !== btoa(password)) return { success: false, message: 'Incorrect password.' };

    // Demo accounts always active
    const demoEmails = ['sido@farmify.id', 'ptjaya@farmify.id', 'admin@farmify.id'];
    if (demoEmails.includes(user.email)) {
      await this.updateUser(user.id, { email_verified: true, status: 'active', setup_complete: true });
      user.email_verified = true; user.status = 'active'; user.setup_complete = true;
    }

    if (!user.email_verified)   return { success: false, message: 'Email not yet verified.' };
    if (user.status === 'pending')   return { success: false, message: 'Account is pending admin approval.' };
    if (user.status === 'suspended') return { success: false, message: 'Account suspended. Please contact admin.' };

    await this.addActivity(user.id, user.full_name, user.role, 'login', 'Login successful');
    return { success: true, user };
  },

  async updateUser(userId, data) {
    await updateDoc(doc(_db, 'users', userId), { ...data, updated_at: new Date().toISOString() });
    return true;
  },

  async updateUserStatus(userId, status) {
    await this.updateUser(userId, { status });
    const user = await this.findById(userId);
    if (user) await this.addActivity(userId, user.full_name, user.role, 'status_change', `Account status changed to: ${status}`);
    return true;
  },

  async getUsersByRole(role) {
    const q = query(collection(_db, 'users'), where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async completeSetup(userId, data) {
    await this.updateUser(userId, { ...data, setup_complete: true, status: 'pending' });
    const user = await this.findById(userId);
    if (user) await this.addActivity(userId, user.full_name, user.role, 'setup_complete', 'Initial profile setup complete, awaiting admin verification');
    return true;
  },

  // ---- SESSION (tetap pakai sessionStorage — per tab browser) ----
  setSession(user) {
    const session = {
      id: user.id, full_name: user.full_name, email: user.email,
      role: user.role, status: user.status, setup_complete: user.setup_complete,
      logged_in_at: new Date().toISOString()
    };
    sessionStorage.setItem('farmify_session', JSON.stringify(session));
    return session;
  },
  getSession()   { return JSON.parse(sessionStorage.getItem('farmify_session') || 'null'); },
  clearSession() { sessionStorage.removeItem('farmify_session'); },
  isLoggedIn()   { return !!this.getSession(); },

  // ---- OTP ----
  async generateOTP(email) {
    const code    = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const id      = email.toLowerCase().replace(/[@.]/g, '_');
    await setDoc(doc(_db, 'otps', id), { email: email.toLowerCase(), code, expires, used: false });
    return code;
  },

  async verifyOTP(email, code) {
    const id   = email.toLowerCase().replace(/[@.]/g, '_');
    const snap = await getDoc(doc(_db, 'otps', id));
    if (!snap.exists()) return { success: false, message: 'OTP code not found.' };
    const otp = snap.data();
    if (otp.used)                        return { success: false, message: 'OTP already used.' };
    if (new Date() > new Date(otp.expires)) return { success: false, message: 'OTP code has expired.' };
    if (otp.code !== code)               return { success: false, message: 'Incorrect OTP code.' };
    await updateDoc(doc(_db, 'otps', id), { used: true });
    return { success: true };
  },

  // ---- COMMODITIES ----
  async getCommodities(farmerId) {
    let q;
    if (farmerId) {
      q = query(collection(_db, 'commodities'), where('farmer_id', '==', farmerId));
    } else {
      q = collection(_db, 'commodities');
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getAvailableCommodities() {
    const q    = query(collection(_db, 'commodities'), where('is_available', '==', true));
    const snap = await getDocs(q);
    const commodities = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const farmerIds = [...new Set(commodities.map(c => c.farmer_id))];
    const farmerMap = {};
    for (const fid of farmerIds) {
      const f = await this.findById(fid);
      if (f) farmerMap[fid] = f;
    }

    return commodities.map(c => {
      const farmer = farmerMap[c.farmer_id];
      return {
        ...c,
        farmer_name: farmer ? farmer.full_name : 'Unknown',
        farm_name:   farmer ? (farmer.farm_name || farmer.full_name) : 'Unknown',
        farmer_city: farmer ? farmer.city : '',
        farmer_rating: 4.8
      };
    });
  },

  async getCommoditiesByFarmer() {
    const farmers    = await this.getUsersByRole('farmer');
    const activeFarmers = farmers.filter(f => f.status === 'active');
    const result = [];

    for (const f of activeFarmers) {
      const items = await this.getCommodities(f.id);
      const available = items.filter(c => c.is_available);
      if (available.length > 0) result.push({ ...f, items: available });
    }
    return result;
  },

  async addCommodity(data) {
    const id  = `com-${Date.now()}`;
    const newCom = {
      ...data, id,
      is_available: true,
      emoji: data.emoji || '🌿',
      created_at: new Date().toISOString()
    };
    await setDoc(doc(_db, 'commodities', id), newCom);
    const user = await this.findById(data.farmer_id);
    if (user) await this.addActivity(data.farmer_id, user.full_name, 'farmer', 'commodity_added', `Added commodity: ${data.name}`);
    return { success: true, commodity: newCom };
  },

  async updateCommodity(id, data) {
    await updateDoc(doc(_db, 'commodities', id), { ...data, updated_at: new Date().toISOString() });
    return true;
  },

  async deleteCommodity(id) {
    await deleteDoc(doc(_db, 'commodities', id));
    return true;
  },

  // ---- ORDERS ----
  async getOrders(filter) {
    let q = collection(_db, 'orders');

    if (filter?.farmer_id) {
      q = query(q, where('farmer_id', '==', filter.farmer_id));
    } else if (filter?.buyer_id) {
      q = query(q, where('buyer_id', '==', filter.buyer_id));
    } else if (filter?.status) {
      q = query(q, where('status', '==', filter.status));
    }

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async createOrder(data) {
    const allOrders = await this.getOrders();
    const code = `ORD-${new Date().getFullYear()}-${String(allOrders.length + 1).padStart(3, '0')}`;
    const id   = `order-${Date.now()}`;

    const newOrder = {
      ...data, id, order_code: code,
      platform_fee: data.total_price * 0.07,
      status: 'pending', payment_status: 'unpaid',
      created_at: new Date().toISOString()
    };

    await setDoc(doc(_db, 'orders', id), newOrder);

    const buyer  = await this.findById(data.buyer_id);
    const farmer = await this.findById(data.farmer_id);

    if (buyer)  await this.addActivity(data.buyer_id, buyer.full_name, 'buyer', 'order_created', `Created order ${code} from ${farmer ? farmer.full_name : 'Farmer'}`);
    if (farmer) await this.addNotification(data.farmer_id, `🎉 New order from ${buyer ? buyer.full_name : 'Buyer'} — ${code}`, 'info');
    await this.addNotification('admin-001', `New transaction: ${code} worth ${formatIDR(data.total_price)}`, 'info');

    return { success: true, order: newOrder };
  },

  async updateOrderStatus(orderId, status) {
    await updateDoc(doc(_db, 'orders', orderId), { status, updated_at: new Date().toISOString() });
    return true;
  },

  // ---- NOTIFICATIONS ----
  async getNotifications(userId) {
    const q    = query(collection(_db, 'notifications'), where('user_id', '==', userId), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addNotification(userId, text, type = 'info') {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    await setDoc(doc(_db, 'notifications', id), {
      id, user_id: userId, text, type, read: false,
      created_at: new Date().toISOString()
    });
  },

  async markNotifRead(notifId) {
    await updateDoc(doc(_db, 'notifications', notifId), { read: true });
  },

  async markAllNotifsRead(userId) {
    const notifs = await this.getNotifications(userId);
    const batch  = writeBatch(_db);
    for (const n of notifs) {
      if (!n.read) batch.update(doc(_db, 'notifications', n.id), { read: true });
    }
    await batch.commit();
  },

  // ---- REALTIME LISTENER — dipanggil dari dashboard ----
  // Contoh: FarmifyDB.listenCommodities('farmer-001', (data) => renderCards(data))
  listenCommodities(farmerId, callback) {
    const q = farmerId
      ? query(collection(_db, 'commodities'), where('farmer_id', '==', farmerId))
      : collection(_db, 'commodities');
    return onSnapshot(q, snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  },

  listenOrders(filter, callback) {
    let q = collection(_db, 'orders');
    if (filter?.farmer_id) q = query(q, where('farmer_id', '==', filter.farmer_id));
    if (filter?.buyer_id)  q = query(q, where('buyer_id',  '==', filter.buyer_id));
    return onSnapshot(q, snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  },

  listenNotifications(userId, callback) {
    const q = query(collection(_db, 'notifications'), where('user_id', '==', userId), orderBy('created_at', 'desc'));
    return onSnapshot(q, snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  },

  listenUsers(callback) {
    return onSnapshot(collection(_db, 'users'), snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  },

  // ---- ACTIVITY LOG ----
  async getActivity(filter) {
    let q = query(collection(_db, 'activity'), orderBy('created_at', 'desc'), limit(200));
    const snap = await getDocs(q);
    let all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (filter?.user_id) all = all.filter(a => a.user_id === filter.user_id);
    if (filter?.role)    all = all.filter(a => a.role === filter.role);
    if (filter?.action)  all = all.filter(a => a.action === filter.action);
    return all;
  },

  async addActivity(userId, userName, role, action, detail) {
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    await setDoc(doc(_db, 'activity', id), {
      id, user_id: userId, user_name: userName, role, action, detail,
      created_at: new Date().toISOString()
    });
  },

  async getUserActivity(userId) {
    return this.getActivity({ user_id: userId });
  },

  // ---- EMAIL OTP via EmailJS ----
  async sendOTPEmail(email, name, code) {
    try {
      await emailjs.send('service_farmify', 'template_otp', {
        to_email: email, to_name: name, otp_code: code
      });
    } catch (e) {
      console.warn('[Farmify] EmailJS not configured — OTP:', code);
    }
  }
};

// =====================================================
// AUTO-INIT: seed demo data jika Firestore masih kosong
// =====================================================
FarmifyDB.seedDemoDataIfEmpty().catch(console.error);

// =====================================================
// GLOBAL HELPERS (sama seperti versi lama)
// =====================================================

async function requireAuth(allowedRoles) {
  const session = FarmifyDB.getSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    window.location.href = getDashboardUrl(session.role); return null;
  }
  if (!session.setup_complete && window.location.pathname.indexOf('setup') === -1) {
    window.location.href = `setup-profile.html?role=${session.role}`; return null;
  }
  return session;
}

function getDashboardUrl(role) {
  const map = { farmer: 'farmer-dashboard.html', buyer: 'buyer-dashboard.html', admin: 'admin-dashboard.html' };
  return map[role] || 'login.html';
}

async function logout() {
  const session = FarmifyDB.getSession();
  if (session) await FarmifyDB.addActivity(session.id, session.full_name, session.role, 'logout', 'Logged out');
  FarmifyDB.clearSession();
  window.location.href = 'login.html';
}

function formatIDR(num) { return 'IDR ' + Number(num).toLocaleString('en-US'); }
function formatRp(num)  { return formatIDR(num); }

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { day:'numeric', month:'short' });
}

function closeModal(id)  { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

function showToast(msg, type = 'success') {
  const colors = { success: 'var(--forest)', error: 'var(--terracotta)', info: 'var(--moss)' };
  const toast  = document.createElement('div');
  toast.textContent = msg;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '90px', left: '50%',
    transform: 'translateX(-50%) translateY(20px)',
    background: colors[type] || colors.success,
    color: 'white', padding: '12px 24px',
    borderRadius: '100px', fontSize: '14px', fontWeight: '600',
    boxShadow: '0 8px 32px rgba(28,58,42,0.25)',
    zIndex: '99999', whiteSpace: 'nowrap',
    transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.3s'
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.transform = 'translateX(-50%) translateY(0)'; });
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function renderNotifications() {
  const user = FarmifyDB.getSession();
  if (!user) return;
  const notifs     = await FarmifyDB.getNotifications(user.id);
  const unreadCount = notifs.filter(n => !n.read).length;
  document.querySelectorAll('[data-notif-badge]').forEach(b => {
    b.textContent  = unreadCount;
    b.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (FarmifyDB.isLoggedIn()) await renderNotifications();
});
