/**
 * =====================================================
 * FARMIFY — Database Configuration & Global UI Logic
 * v2.0 — Cross-dashboard connectivity + Activity Log
 * Client-Side: LocalStorage simulation
 * =====================================================
 */

const FarmifyDB = {
  // ---- CORE DATABASE INIT ----
  init() {
    if (!localStorage.getItem('farmify_users')) {
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
          farm_name: 'Sido Makmur Farm', city: 'Malang', province: 'jawa_timur',
          farm_size: '2.5', exp_years: '15', commodities: ['vegetable', 'spice'],
          bank_name: 'BRI', bank_account: '1234567890',
          created_at: new Date().toISOString()
        },
        {
          id: 'buyer-001', full_name: 'PT Jaya Foods', email: 'ptjaya@farmify.id',
          phone: '0215559876', password: btoa('Buyer@123'), role: 'buyer',
          status: 'active', email_verified: true, setup_complete: true,
          company_name: 'PT Jaya Foods Indonesia', business_type: 'manufacturer',
          company_address: 'Surabaya, Jawa Timur', npwp: '01.234.567.8-000.000',
          bank_name: 'BCA', bank_account: '0987654321',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('farmify_users', JSON.stringify(demoUsers));
    }

    // Seed demo commodities if none
    if (!localStorage.getItem('farmify_commodities')) {
      const demoCommodities = [
        { id: 'com-001', farmer_id: 'farmer-001', name: 'Cabai Merah', category: 'Sayuran', unit: 'kg', price: 45000, stock: 1200, is_preorder: false, is_available: true, emoji: '🌶️', created_at: new Date().toISOString() },
        { id: 'com-002', farmer_id: 'farmer-001', name: 'Bawang Merah', category: 'Rempah', unit: 'kg', price: 38000, stock: 800, is_preorder: false, is_available: true, emoji: '🧅', created_at: new Date().toISOString() },
        { id: 'com-003', farmer_id: 'farmer-001', name: 'Bayam Organik', category: 'Sayuran', unit: 'kg', price: 12000, stock: 0, is_preorder: true, harvest_date: '2025-06-01', is_available: true, emoji: '🥬', created_at: new Date().toISOString() }
      ];
      localStorage.setItem('farmify_commodities', JSON.stringify(demoCommodities));
    }

    // Seed activity log if none
    if (!localStorage.getItem('farmify_activity')) {
      const demoActivity = [
        { id: 'act-001', user_id: 'farmer-001', user_name: 'Pak Sido Makmur', role: 'farmer', action: 'login', detail: 'Login berhasil', created_at: new Date(Date.now() - 5*60000).toISOString() },
        { id: 'act-002', user_id: 'buyer-001', user_name: 'PT Jaya Foods', role: 'buyer', action: 'order_created', detail: 'Membuat order ORD-2025-001 — Cabai Merah 500 kg', created_at: new Date(Date.now() - 30*60000).toISOString() },
        { id: 'act-003', user_id: 'farmer-001', user_name: 'Pak Sido Makmur', role: 'farmer', action: 'commodity_added', detail: 'Menambahkan komoditas: Bayam Organik', created_at: new Date(Date.now() - 2*3600000).toISOString() },
      ];
      localStorage.setItem('farmify_activity', JSON.stringify(demoActivity));
    }
  },

  // ---- USER CRUD ----
  getUsers()          { return JSON.parse(localStorage.getItem('farmify_users') || '[]'); },
  findByEmail(email)  { return this.getUsers().find(u => u.email === email.toLowerCase()); },
  findById(id)        { return this.getUsers().find(u => u.id === id); },

  createUser(userData) {
    const users = this.getUsers();
    if (this.findByEmail(userData.email)) return { success: false, message: 'Email sudah terdaftar.' };
    const newUser = {
      id: `${userData.role}-${Date.now()}`,
      ...userData,
      email: userData.email.toLowerCase(),
      password: btoa(userData.password),
      status: 'pending',
      email_verified: false,
      setup_complete: false,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('farmify_users', JSON.stringify(users));
    this.addActivity(newUser.id, newUser.full_name, newUser.role, 'register', `Akun baru terdaftar sebagai ${newUser.role}`);
    return { success: true, user: newUser };
  },

  authenticate(email, password) {
    const user = this.findByEmail(email);
    if (!user) return { success: false, message: 'Email tidak ditemukan.' };
    if (user.password !== btoa(password)) return { success: false, message: 'Password salah.' };

    const demoEmails = ['sido@farmify.id', 'ptjaya@farmify.id', 'admin@farmify.id'];
    if (demoEmails.includes(user.email)) {
      user.email_verified = true; user.status = 'active'; user.setup_complete = true;
      this.updateUser(user.id, { email_verified: true, status: 'active', setup_complete: true });
    }

    if (!user.email_verified) return { success: false, message: 'Email belum diverifikasi.' };
    if (user.status === 'pending') return { success: false, message: 'Akun sedang diproses admin.' };
    if (user.status === 'suspended') return { success: false, message: 'Akun ditangguhkan. Hubungi admin.' };

    this.addActivity(user.id, user.full_name, user.role, 'login', 'Login berhasil');
    return { success: true, user };
  },

  updateUser(userId, data) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return false;
    users[idx] = { ...users[idx], ...data, updated_at: new Date().toISOString() };
    localStorage.setItem('farmify_users', JSON.stringify(users));
    return true;
  },

  updateUserStatus(userId, status) {
    const result = this.updateUser(userId, { status });
    if (result) {
      const user = this.findById(userId);
      if (user) this.addActivity(userId, user.full_name, user.role, 'status_change', `Status akun diubah menjadi: ${status}`);
    }
    return result;
  },

  getUsersByRole(role) { return this.getUsers().filter(u => u.role === role); },

  completeSetup(userId, data) {
    const result = this.updateUser(userId, { ...data, setup_complete: true, status: 'pending' });
    if (result) {
      const user = this.findById(userId);
      if (user) this.addActivity(userId, user.full_name, user.role, 'setup_complete', 'Setup profil awal selesai, menunggu verifikasi admin');
    }
    return result;
  },

  // ---- SESSION ----
  setSession(user) {
    const session = {
      id: user.id, full_name: user.full_name, email: user.email,
      role: user.role, status: user.status, setup_complete: user.setup_complete,
      logged_in_at: new Date().toISOString()
    };
    sessionStorage.setItem('farmify_session', JSON.stringify(session));
    return session;
  },
  getSession()    { return JSON.parse(sessionStorage.getItem('farmify_session') || 'null'); },
  clearSession()  { sessionStorage.removeItem('farmify_session'); },
  isLoggedIn()    { return !!this.getSession(); },

  // ---- OTP ----
  generateOTP(email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const otps = JSON.parse(localStorage.getItem('farmify_otps') || '[]');
    const filtered = otps.filter(o => o.email !== email.toLowerCase());
    filtered.push({ email: email.toLowerCase(), code, expires, used: false });
    localStorage.setItem('farmify_otps', JSON.stringify(filtered));
    return code;
  },

  verifyOTP(email, code) {
    const otps = JSON.parse(localStorage.getItem('farmify_otps') || '[]');
    const otp = otps.find(o => o.email === email.toLowerCase() && !o.used);
    if (!otp) return { success: false, message: 'Kode OTP tidak ditemukan.' };
    if (new Date() > new Date(otp.expires)) return { success: false, message: 'Kode OTP sudah kedaluwarsa.' };
    if (otp.code !== code) return { success: false, message: 'Kode OTP salah.' };
    otp.used = true;
    localStorage.setItem('farmify_otps', JSON.stringify(otps));
    return { success: true };
  },

  // ---- COMMODITIES (Cross-dashboard) ----
  getCommodities(farmerId) {
    const all = JSON.parse(localStorage.getItem('farmify_commodities') || '[]');
    if (farmerId) return all.filter(c => c.farmer_id === farmerId);
    return all;
  },

  getAvailableCommodities() {
    // All commodities with farmer info — used by buyer dashboard
    const commodities = this.getCommodities();
    const users = this.getUsers();
    return commodities
      .filter(c => c.is_available)
      .map(c => {
        const farmer = users.find(u => u.id === c.farmer_id);
        return { ...c, farmer_name: farmer ? farmer.full_name : 'Unknown', farm_name: farmer ? (farmer.farm_name || farmer.full_name) : 'Unknown', farmer_city: farmer ? farmer.city : '', farmer_rating: 4.8 };
      });
  },

  getCommoditiesByFarmer() {
    // Group commodities by farmer — used by buyer's supplier list
    const commodities = this.getCommodities();
    const users = this.getUsers();
    const farmers = users.filter(u => u.role === 'farmer' && u.status === 'active');
    return farmers.map(f => ({
      ...f,
      items: commodities.filter(c => c.farmer_id === f.id && c.is_available)
    })).filter(f => f.items.length > 0);
  },

  addCommodity(data) {
    const commodities = this.getCommodities();
    const newCom = {
      id: `com-${Date.now()}`,
      ...data,
      is_available: true,
      emoji: data.emoji || '🌿',
      created_at: new Date().toISOString()
    };
    commodities.push(newCom);
    localStorage.setItem('farmify_commodities', JSON.stringify(commodities));
    const user = this.findById(data.farmer_id);
    if (user) this.addActivity(data.farmer_id, user.full_name, 'farmer', 'commodity_added', `Menambahkan komoditas: ${data.name}`);
    return { success: true, commodity: newCom };
  },

  updateCommodity(id, data) {
    const commodities = this.getCommodities();
    const idx = commodities.findIndex(c => c.id === id);
    if (idx === -1) return false;
    commodities[idx] = { ...commodities[idx], ...data, updated_at: new Date().toISOString() };
    localStorage.setItem('farmify_commodities', JSON.stringify(commodities));
    return true;
  },

  deleteCommodity(id) {
    const commodities = this.getCommodities().filter(c => c.id !== id);
    localStorage.setItem('farmify_commodities', JSON.stringify(commodities));
    return true;
  },

  // ---- ORDERS (Cross-dashboard) ----
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
      id: `order-${Date.now()}`, order_code: code, ...data,
      platform_fee: data.total_price * 0.07, status: 'pending',
      payment_status: 'unpaid', created_at: new Date().toISOString()
    };
    orders.push(newOrder);
    localStorage.setItem('farmify_orders', JSON.stringify(orders));

    const buyer = this.findById(data.buyer_id);
    const farmer = this.findById(data.farmer_id);
    if (buyer) this.addActivity(data.buyer_id, buyer.full_name, 'buyer', 'order_created', `Membuat order ${code} kepada ${farmer ? farmer.full_name : 'Petani'}`);
    if (farmer) this.addNotification(data.farmer_id, `🎉 Order baru dari ${buyer ? buyer.full_name : 'Pembeli'} — ${code}`, 'info');
    this.addNotification('admin-001', `Transaksi baru: ${code} senilai ${formatRp(data.total_price)}`, 'info');

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

  // ---- NOTIFICATIONS ----
  getNotifications(userId) {
    const all = JSON.parse(localStorage.getItem('farmify_notifs') || '[]');
    return all.filter(n => n.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  addNotification(userId, text, type = 'info') {
    const notifs = JSON.parse(localStorage.getItem('farmify_notifs') || '[]');
    notifs.push({ id: `notif-${Date.now()}-${Math.random()}`, user_id: userId, text, type, read: false, created_at: new Date().toISOString() });
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
  },

  // ---- ACTIVITY LOG (Admin monitoring) ----
  getActivity(filter) {
    const all = JSON.parse(localStorage.getItem('farmify_activity') || '[]');
    if (!filter) return all.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return all
      .filter(a => {
        if (filter.user_id && a.user_id !== filter.user_id) return false;
        if (filter.role && a.role !== filter.role) return false;
        if (filter.action && a.action !== filter.action) return false;
        return true;
      })
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  },

  addActivity(userId, userName, role, action, detail) {
    const log = JSON.parse(localStorage.getItem('farmify_activity') || '[]');
    log.push({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      user_id: userId, user_name: userName, role, action, detail,
      created_at: new Date().toISOString()
    });
    // Keep last 200 entries
    if (log.length > 200) log.splice(0, log.length - 200);
    localStorage.setItem('farmify_activity', JSON.stringify(log));
  },

  getUserActivity(userId) {
    return this.getActivity({ user_id: userId });
  }
};

FarmifyDB.init();

// =====================================================
// GLOBAL HELPERS
// =====================================================

function requireAuth(allowedRoles) {
  const session = FarmifyDB.getSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    window.location.href = getDashboardUrl(session.role); return null;
  }
  // Check if setup is required (redirect to setup page if not complete)
  if (!session.setup_complete && window.location.pathname.indexOf('setup') === -1) {
    window.location.href = `setup-profile.html?role=${session.role}`;
    return null;
  }
  return session;
}

function getDashboardUrl(role) {
  const map = { farmer: 'farmer-dashboard.html', buyer: 'buyer-dashboard.html', admin: 'admin-dashboard.html' };
  return map[role] || 'login.html';
}

function logout() {
  const session = FarmifyDB.getSession();
  if (session) FarmifyDB.addActivity(session.id, session.full_name, session.role, 'logout', 'Logout dari sistem');
  FarmifyDB.clearSession();
  window.location.href = 'login.html';
}

function formatRp(num) {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day:'numeric', month:'short' });
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

function showToast(msg, type = 'success') {
  const colors = { success: 'var(--forest)', error: 'var(--terracotta)', info: 'var(--moss)' };
  const toast = document.createElement('div');
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
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---- Shared Profile Components ----
// Reusable profile section HTML builder
function buildProfileSection(session, fullUser) {
  const initials = session.full_name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
  const roleMap = { farmer: '🌾 Petani', buyer: '🏭 Pembeli', admin: '⚙️ Admin' };
  const badgeMap = {
    farmer: `<span class="profile-badge">🌿 ${fullUser.farm_name || 'Farm Saya'}</span><span class="profile-badge">📍 ${fullUser.city || 'Lokasi'}</span>`,
    buyer:  `<span class="profile-badge">🏭 ${fullUser.company_name || 'Perusahaan'}</span><span class="profile-badge">📍 ${fullUser.company_address || 'Lokasi'}</span>`,
    admin:  `<span class="profile-badge">⚙️ Super Admin</span>`
  };
  return { initials, roleLabel: roleMap[session.role] || session.role, badges: badgeMap[session.role] || '' };
}

// ---- Notifications ----
function renderNotifications() {
  const user = FarmifyDB.getSession();
  if (!user) return;
  const notifs = FarmifyDB.getNotifications(user.id);
  const unreadCount = notifs.filter(n => !n.read).length;
  document.querySelectorAll('[data-notif-badge]').forEach(b => {
    b.textContent = unreadCount;
    b.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (FarmifyDB.isLoggedIn()) renderNotifications();
});
