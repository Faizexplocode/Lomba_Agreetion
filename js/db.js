/**
 * =====================================================
 * FARMIFY - Database Configuration & Global UI Logic
 * Client-Side: LocalStorage simulation
 * =====================================================
 */

const FarmifyDB = {
  // ---- CORE DATABASE PAKEM (TIDAK DIUBAH) ----
  init() {
    if (!localStorage.getItem('farmify_users')) {
      const demoUsers = [
        { id: 'admin-001', full_name: 'Admin Farmify', email: 'admin@farmify.id', phone: '08123456789', password: btoa('Admin@Farmify2024'), role: 'admin', status: 'active', email_verified: true, created_at: new Date().toISOString() },
        { id: 'farmer-001', full_name: 'Pak Sido Makmur', email: 'sido@farmify.id', phone: '08111234567', password: btoa('Petani@123'), role: 'farmer', status: 'active', email_verified: true, farm_name: 'Sido Makmur Farm', city: 'Malang', province: 'jawa_timur', farm_size: '2.5', exp_years: '15', commodities: ['vegetable', 'spice'], bank_name: 'BRI', bank_account: '1234567890', created_at: new Date().toISOString() },
        { id: 'buyer-001', full_name: 'PT Jaya Foods', email: 'ptjaya@farmify.id', phone: '0215559876', password: btoa('Buyer@123'), role: 'buyer', status: 'active', email_verified: true, company_name: 'PT Jaya Foods Indonesia', business_type: 'manufacturer', created_at: new Date().toISOString() }
      ];
      localStorage.setItem('farmify_users', JSON.stringify(demoUsers));
    }
  },

  getUsers() { return JSON.parse(localStorage.getItem('farmify_users') || '[]'); },
  findByEmail(email) { return this.getUsers().find(u => u.email === email.toLowerCase()); },

  createUser(userData) {
    const users = this.getUsers();
    if (this.findByEmail(userData.email)) return { success: false, message: 'Email sudah terdaftar.' };
    const newUser = { id: `${userData.role}-${Date.now()}`, ...userData, email: userData.email.toLowerCase(), password: btoa(userData.password), status: 'active', email_verified: true, created_at: new Date().toISOString() };
    users.push(newUser); localStorage.setItem('farmify_users', JSON.stringify(users));
    return { success: true, user: newUser };
  },

  authenticate(email, password) {
    const user = this.findByEmail(email);
    if (!user) return { success: false, message: 'Email tidak ditemukan.' };
    if (user.password !== btoa(password)) return { success: false, message: 'Password salah.' };
    
    const demoEmails = ['sido@farmify.id', 'ptjaya@farmify.id', 'admin@farmify.id'];
    if (demoEmails.includes(user.email)) {
        user.email_verified = true; user.status = 'active';
        this.updateUser(user.id, { email_verified: true, status: 'active' });
    }

    if (!user.email_verified) return { success: false, message: 'Email belum diverifikasi.' };
    if (user.status === 'pending') return { success: false, message: 'Akun sedang diproses.' };
    if (user.status === 'suspended') return { success: false, message: 'Akun ditangguhkan. Hubungi admin.' };
    return { success: true, user };
  },

  generateOTP(email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 2 * 60 * 1000).toISOString(); 
    const otps = JSON.parse(localStorage.getItem('farmify_otps') || '[]');
    const filtered = otps.filter(o => o.email !== email.toLowerCase());
    filtered.push({ email: email.toLowerCase(), code, expires, used: false });
    localStorage.setItem('farmify_otps', JSON.stringify(filtered)); return code;
  },

  verifyOTP(email, code) {
    const otps = JSON.parse(localStorage.getItem('farmify_otps') || '[]');
    const otp = otps.find(o => o.email === email.toLowerCase() && !o.used);
    if (!otp) return { success: false, message: 'Kode OTP tidak ditemukan.' };
    if (new Date() > new Date(otp.expires)) return { success: false, message: 'Kode OTP sudah kedaluwarsa.' };
    if (otp.code !== code) return { success: false, message: 'Kode OTP salah.' };
    otp.used = true; localStorage.setItem('farmify_otps', JSON.stringify(otps)); return { success: true };
  },

  async sendOTPEmail(email, name, otp) {
    const serviceID = "service_m6luo94"; const templateID = "template_c0dmscx";
    try {
      await emailjs.send(serviceID, templateID, { to_name: name, to_email: email, otp_code: otp });
      return { success: true };
    } catch (error) { return { success: false, message: "Gagal mengirim email verifikasi." }; }
  },

  setSession(user) {
    const session = { id: user.id, full_name: user.full_name, email: user.email, role: user.role, status: user.status, logged_in_at: new Date().toISOString() };
    sessionStorage.setItem('farmify_session', JSON.stringify(session)); return session;
  },
  getSession() { return JSON.parse(sessionStorage.getItem('farmify_session') || 'null'); },
  clearSession() { sessionStorage.removeItem('farmify_session'); },
  isLoggedIn() { return !!this.getSession(); },

  updateUserStatus(userId, status) {
    const users = this.getUsers(); const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return false; users[idx].status = status; localStorage.setItem('farmify_users', JSON.stringify(users)); return true;
  },
  updateUser(userId, data) {
    const users = this.getUsers(); const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return false; users[idx] = { ...users[idx], ...data, updated_at: new Date().toISOString() };
    localStorage.setItem('farmify_users', JSON.stringify(users)); return true;
  },
  getUsersByRole(role) { return this.getUsers().filter(u => u.role === role); },

  getCommodities(farmerId) {
    const all = JSON.parse(localStorage.getItem('farmify_commodities') || '[]'); return farmerId ? all.filter(c => c.farmer_id === farmerId) : all;
  },
  addCommodity(data) {
    const commodities = this.getCommodities();
    const newCom = { id: `com-${Date.now()}`, ...data, is_available: true, created_at: new Date().toISOString() };
    commodities.push(newCom); localStorage.setItem('farmify_commodities', JSON.stringify(commodities)); return { success: true, commodity: newCom };
  },
  updateCommodity(id, data) {
    const commodities = this.getCommodities(); const idx = commodities.findIndex(c => c.id === id);
    if (idx === -1) return false; commodities[idx] = { ...commodities[idx], ...data };
    localStorage.setItem('farmify_commodities', JSON.stringify(commodities)); return true;
  },
  deleteCommodity(id) {
    const commodities = this.getCommodities().filter(c => c.id !== id); localStorage.setItem('farmify_commodities', JSON.stringify(commodities)); return true;
  },

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
    const orders = this.getOrders(); const code = `ORD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;
    const newOrder = { id: `order-${Date.now()}`, order_code: code, ...data, platform_fee: data.total_price * 0.07, status: 'pending', payment_status: 'unpaid', created_at: new Date().toISOString() };
    orders.push(newOrder); localStorage.setItem('farmify_orders', JSON.stringify(orders)); return { success: true, order: newOrder };
  },
  updateOrderStatus(orderId, status) {
    const orders = this.getOrders(); const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return false; orders[idx].status = status; orders[idx].updated_at = new Date().toISOString();
    localStorage.setItem('farmify_orders', JSON.stringify(orders)); return true;
  },

  getNotifications(userId) {
    const all = JSON.parse(localStorage.getItem('farmify_notifs') || '[]');
    return all.filter(n => n.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  addNotification(userId, text, type = 'info') {
    const notifs = JSON.parse(localStorage.getItem('farmify_notifs') || '[]');
    notifs.push({ id: `notif-${Date.now()}`, user_id: userId, text, type, read: false, created_at: new Date().toISOString() });
    localStorage.setItem('farmify_notifs', JSON.stringify(notifs));
  },
  markNotifRead(notifId) {
    const notifs = JSON.parse(localStorage.getItem('farmify_notifs') || '[]'); const idx = notifs.findIndex(n => n.id === notifId);
    if (idx >= 0) notifs[idx].read = true; localStorage.setItem('farmify_notifs', JSON.stringify(notifs));
  },
  markAllNotifsRead(userId) {
    const notifs = JSON.parse(localStorage.getItem('farmify_notifs') || '[]');
    notifs.forEach(n => { if (n.user_id === userId) n.read = true; }); localStorage.setItem('farmify_notifs', JSON.stringify(notifs));
  }
};

FarmifyDB.init();

// ---- BANTUAN AUTH & FORMAT ----
function requireAuth(allowedRoles) {
  const session = FarmifyDB.getSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  if (allowedRoles && !allowedRoles.includes(session.role)) { window.location.href = getDashboardUrl(session.role); return null; }
  return session;
}

function getDashboardUrl(role) {
  const map = { farmer: 'farmer-dashboard.html', buyer: 'buyer-dashboard.html', admin: 'admin-dashboard.html' };
  return map[role] || 'login.html';
}

function logout() { FarmifyDB.clearSession(); window.location.href = 'login.html'; }
function formatRp(num) { return 'Rp ' + Number(num).toLocaleString('id-ID'); }
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime(); const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja'; if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}

/**
 * =====================================================
 * TAMBAHAN: GLOBAL UI & INTERACTIVITY HANDLERS
 * Fungsi ini akan otomatis berjalan di semua dashboard
 * =====================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  if (FarmifyDB.isLoggedIn()) {
    renderNotifications();
    setupGlobalNavigation();
  }
});

// Setup klik otomatis untuk Sidebar & Bottom Nav
function setupGlobalNavigation() {
  document.querySelectorAll('.sidebar-nav a, .bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.closest('a') && e.target.closest('a').classList.contains('active')) return;
      
      const text = e.target.innerText.toLowerCase();
      e.preventDefault();
      
      if(text.includes('pengaturan') || text.includes('akun') || text.includes('profil')) {
        openSettings();
      } else if(text.includes('keluar') || text.includes('logout')) {
        logout();
      } else {
        alert(`Fitur "${e.target.innerText.trim()}" sedang dalam pengembangan.`);
      }
    });
  });
}

// Logika Modal Profil Terpusat
function openSettings() {
  const user = FarmifyDB.getSession();
  if (!user) return;
  const fullUser = FarmifyDB.getUsers().find(u => u.id === user.id);
  
  const elAvatar = document.getElementById('profileAvatar');
  const elName = document.getElementById('profileName');
  const elEmail = document.getElementById('profileEmail');
  const elRole = document.getElementById('profileRole');
  const elEditName = document.getElementById('editName');
  const elEditPhone = document.getElementById('editPhone');
  const elExtraField = document.getElementById('extraProfileField');
  const modal = document.getElementById('settingsModal');

  if(elAvatar) elAvatar.textContent = user.full_name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
  if(elName) elName.textContent = user.full_name;
  if(elEmail) elEmail.textContent = user.email;
  if(elRole) elRole.textContent = user.role.toUpperCase();
  if(elEditName) elEditName.value = user.full_name;
  if(elEditPhone) elEditPhone.value = fullUser.phone || '';
  
  if(elExtraField) {
    if(user.role === 'farmer') {
      elExtraField.innerHTML = `<label class="form-label">Nama Farm</label><input type="text" class="form-input" id="editExtra" value="${fullUser.farm_name || ''}" />`;
    } else if (user.role === 'buyer') {
      elExtraField.innerHTML = `<label class="form-label">Nama Perusahaan</label><input type="text" class="form-input" id="editExtra" value="${fullUser.company_name || ''}" />`;
    } else {
      elExtraField.innerHTML = '';
    }
  }
  
  if(window.innerWidth <= 768) toggleSidebar();
  if(modal) modal.style.display = 'flex';
}

function saveProfile() {
  const user = FarmifyDB.getSession();
  const newName = document.getElementById('editName').value;
  const newPhone = document.getElementById('editPhone').value;
  const elExtra = document.getElementById('editExtra');
  const extraVal = elExtra ? elExtra.value : null;
  
  let updateData = { full_name: newName, phone: newPhone };
  if(user.role === 'farmer') updateData.farm_name = extraVal;
  if(user.role === 'buyer') updateData.company_name = extraVal;

  FarmifyDB.updateUser(user.id, updateData);
  
  user.full_name = newName;
  sessionStorage.setItem('farmify_session', JSON.stringify(user));
  
  alert('✅ Profil berhasil diperbarui!');
  location.reload(); 
}

function closeModal(id) { 
  const el = document.getElementById(id);
  if(el) el.style.display = 'none'; 
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if(sidebar) sidebar.classList.toggle('open');
  if(overlay) overlay.classList.toggle('open');
}

// Logika Render Notifikasi Live
function renderNotifications() {
  const user = FarmifyDB.getSession();
  if (!user) return;
  
  const notifs = FarmifyDB.getNotifications(user.id);
  const unreadCount = notifs.filter(n => !n.read).length;
  
  // Update Badge di Sidebar (Cari badge notifikasi)
  document.querySelectorAll('.sidebar-nav span[style*="background:var(--terracotta)"]').forEach(badge => {
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  });

  // Render ke list HTML jika container notifikasi ada di halaman
  const notifContainer = document.getElementById('notificationList');
  if(notifContainer && notifs.length > 0) {
    notifContainer.innerHTML = notifs.map(n => `
      <div class="notification-item" style="cursor:pointer;" onclick="FarmifyDB.markNotifRead('${n.id}'); renderNotifications();">
        <div class="notif-dot ${n.read ? 'read' : 'new'}"></div>
        <div>
          <div class="notif-text">${n.text}</div>
          <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>
      </div>
    `).join('');
  }
}

// Contoh Trigger Lintas Dashboard: Buat Order
function triggerOrder(farmerId, buyerId, total) {
  const result = FarmifyDB.createOrder({ farmer_id: farmerId, buyer_id: buyerId, total_price: total });
  if(result.success) {
    FarmifyDB.addNotification(farmerId, `🎉 Order Baru masuk senilai ${formatRp(total)}! Mohon segera konfirmasi.`, 'info');
    FarmifyDB.addNotification('admin-001', `Transaksi baru terbuat: ${result.order.order_code}`, 'info');
    alert('Pesanan berhasil dibuat! Notifikasi telah dikirim ke Petani dan Admin.');
  }
}