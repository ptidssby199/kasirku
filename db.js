/**
 * KasirPro - Database Layer (localStorage)
 * Struktur data lengkap untuk sistem POS
 */

const DB = {

  // ─── SCHEMA / DEFAULT DATA ───────────────────────────────────────────────

  defaults: {
    settings: {
      storeName: 'Toko Saya',
      address: 'Jl. Contoh No. 1',
      phone: '08123456789',
      footer: 'Terima kasih telah berbelanja!',
      taxRate: 0.11,
      currency: 'IDR',
    },
    cashiers: [
      { id: 'c1', name: 'Admin', pin: '1234', role: 'admin' },
      { id: 'c2', name: 'Kasir 1', pin: '1111', role: 'kasir' },
    ],
    products: [
      { id: 'p1', name: 'Nasi Goreng', category: 'Makanan', price: 15000, modal: 8000, stock: 50, minStock: 5, emoji: '🍳', code: 'MKN-001' },
      { id: 'p2', name: 'Mie Ayam', category: 'Makanan', price: 12000, modal: 6000, stock: 40, minStock: 5, emoji: '🍜', code: 'MKN-002' },
      { id: 'p3', name: 'Es Teh Manis', category: 'Minuman', price: 5000, modal: 2000, stock: 100, minStock: 10, emoji: '🧊', code: 'MIN-001' },
      { id: 'p4', name: 'Es Jeruk', category: 'Minuman', price: 7000, modal: 3000, stock: 80, minStock: 10, emoji: '🍊', code: 'MIN-002' },
      { id: 'p5', name: 'Kopi Hitam', category: 'Minuman', price: 6000, modal: 2500, stock: 60, minStock: 10, emoji: '☕', code: 'MIN-003' },
      { id: 'p6', name: 'Gorengan', category: 'Snack', price: 2000, modal: 800, stock: 200, minStock: 20, emoji: '🥟', code: 'SNK-001' },
      { id: 'p7', name: 'Kerupuk', category: 'Snack', price: 3000, modal: 1200, stock: 150, minStock: 20, emoji: '🍘', code: 'SNK-002' },
      { id: 'p8', name: 'Air Mineral', category: 'Minuman', price: 4000, modal: 2000, stock: 200, minStock: 30, emoji: '💧', code: 'MIN-004' },
      { id: 'p9', name: 'Roti Bakar', category: 'Makanan', price: 10000, modal: 5000, stock: 30, minStock: 5, emoji: '🍞', code: 'MKN-003' },
      { id: 'p10', name: 'Bakso', category: 'Makanan', price: 14000, modal: 7000, stock: 35, minStock: 5, emoji: '🍲', code: 'MKN-004' },
    ],
    transactions: [],
    cancelled_transactions: [],
    hutang: [],
    members: [],
    vouchers: [],
    shifts: [],
    purchases: [],
    expenses: [],
    returns: [],
    transactionCounter: 1,
  },

  // ─── INIT ─────────────────────────────────────────────────────────────────

  init() {
    const APP_VERSION = '2.1';

    // First time setup
    if (!localStorage.getItem('kasirpro_initialized')) {
      this.setAll('settings', this.defaults.settings);
      this.setAll('cashiers', this.defaults.cashiers);
      this.setAll('products', this.defaults.products);
      this.setAll('transactions', []);
      this.setAll('cancelled_transactions', []);
      this.setAll('hutang', []);
      this.setAll('members', []);
      this.setAll('vouchers', []);
      this.setAll('shifts', []);
      this.setAll('purchases', []);
      this.setAll('expenses', []);
      this.setAll('returns', []);
      localStorage.setItem('kasirpro_counter', this.defaults.transactionCounter);
      localStorage.setItem('kasirpro_initialized', 'true');
      localStorage.setItem('kasirpro_version', APP_VERSION);
    }

    // Version migration - runs every time, ensures new tables always exist
    const ARRAY_TABLES = [
      'transactions', 'cancelled_transactions', 'cashiers', 'products',
      'hutang', 'members', 'vouchers', 'shifts', 'purchases', 'expenses', 'returns'
    ];
    ARRAY_TABLES.forEach(table => {
      try {
        const raw = localStorage.getItem('kasirpro_' + table);
        if (raw === null || raw === undefined) {
          // Table doesn't exist - create it
          this.setAll(table, table === 'cashiers' ? this.defaults.cashiers : []);
          console.log('[KasirPro] Created missing table:', table);
        } else {
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            this.setAll(table, []);
            console.log('[KasirPro] Fixed corrupted table:', table);
          }
        }
      } catch(e) {
        this.setAll(table, []);
        console.warn('[KasirPro] Reset corrupted table:', table, e);
      }
    });

    // Ensure settings exist
    if (!localStorage.getItem('kasirpro_settings')) {
      this.setAll('settings', this.defaults.settings);
    }
    if (!localStorage.getItem('kasirpro_counter')) {
      localStorage.setItem('kasirpro_counter', this.defaults.transactionCounter);
    }

    localStorage.setItem('kasirpro_version', APP_VERSION);
    console.log('[KasirPro] DB initialized v' + APP_VERSION);
  },

  // ─── GENERIC GET/SET ─────────────────────────────────────────────────────

  getAll(key) {
    const ARRAY_KEYS = ['transactions','cancelled_transactions','cashiers','products','hutang','members','vouchers','shifts','purchases','expenses','returns'];
    try {
      const data = localStorage.getItem('kasirpro_' + key);
      if (!data) return ARRAY_KEYS.includes(key) ? [] : (this.defaults[key] || {});
      const parsed = JSON.parse(data);
      if (ARRAY_KEYS.includes(key) && !Array.isArray(parsed)) return [];
      return parsed;
    } catch { return ARRAY_KEYS.includes(key) ? [] : {}; }
  },

  setAll(key, value) {
    localStorage.setItem('kasirpro_' + key, JSON.stringify(value));
  },

  // ─── SETTINGS ─────────────────────────────────────────────────────────────

  getSettings() { return this.getAll('settings'); },
  saveSettings(s) { this.setAll('settings', s); },

  // ─── CASHIERS ─────────────────────────────────────────────────────────────

  getCashiers() { return this.getAll('cashiers'); },

  getCashierByPin(pin) {
    return this.getCashiers().find(c => c.pin === pin) || null;
  },

  addCashier(cashier) {
    const list = this.getCashiers();
    cashier.id = 'c' + Date.now();
    list.push(cashier);
    this.setAll('cashiers', list);
    return cashier;
  },

  deleteCashier(id) {
    const list = this.getCashiers().filter(c => c.id !== id);
    this.setAll('cashiers', list);
  },

  // ─── PRODUCTS ─────────────────────────────────────────────────────────────

  getProducts() { return this.getAll('products'); },

  getProductById(id) {
    return this.getProducts().find(p => p.id === id) || null;
  },

  addProduct(product) {
    const list = this.getProducts();
    product.id = 'p' + Date.now();
    list.push(product);
    this.setAll('products', list);
    return product;
  },

  updateProduct(id, updates) {
    const list = this.getProducts().map(p => p.id === id ? { ...p, ...updates } : p);
    this.setAll('products', list);
  },

  deleteProduct(id) {
    const list = this.getProducts().filter(p => p.id !== id);
    this.setAll('products', list);
  },

  deductStock(id, qty) {
    const list = this.getProducts().map(p => {
      if (p.id === id) return { ...p, stock: Math.max(0, p.stock - qty) };
      return p;
    });
    this.setAll('products', list);
  },

  restoreStock(id, qty) {
    const list = this.getProducts().map(p => {
      if (p.id === id) return { ...p, stock: p.stock + qty };
      return p;
    });
    this.setAll('products', list);
  },

  getCategories() {
    const products = this.getProducts();
    return [...new Set(products.map(p => p.category))].sort();
  },

  getLowStockProducts() {
    return this.getProducts().filter(p => p.stock <= p.minStock);
  },

  // ─── TRANSACTIONS ─────────────────────────────────────────────────────────

  getTransactions() { return this.getAll('transactions'); },

  getNextTransactionId() {
    const counter = parseInt(localStorage.getItem('kasirpro_counter') || '1');
    localStorage.setItem('kasirpro_counter', counter + 1);
    return 'TRX-' + String(counter).padStart(4, '0');
  },

  saveTransaction(trx) {
    const list = this.getTransactions();
    list.unshift(trx); // newest first
    this.setAll('transactions', list);
    // deduct stock
    trx.items.forEach(item => this.deductStock(item.id, item.qty));
    return trx;
  },

  getTransactionsByDateRange(start, end) {
    return this.getTransactions().filter(t => {
      const d = new Date(t.createdAt);
      return d >= start && d <= end;
    });
  },

  getTodayTransactions() {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    return this.getTransactionsByDateRange(today, tomorrow);
  },

  getWeekTransactions() {
    const now = new Date();
    const start = new Date(now); start.setDate(start.getDate()-7); start.setHours(0,0,0,0);
    return this.getTransactionsByDateRange(start, now);
  },

  getMonthTransactions() {
    const now = new Date();
    const start = new Date(now); start.setDate(start.getDate()-30); start.setHours(0,0,0,0);
    return this.getTransactionsByDateRange(start, now);
  },

  // ─── ANALYTICS ────────────────────────────────────────────────────────────

  calcStats(transactions) {
    const totalRevenue = transactions.reduce((s, t) => s + t.total, 0);
    const totalModal = transactions.reduce((s, t) =>
      s + t.items.reduce((ss, i) => ss + ((i.modal||0) * i.qty), 0), 0);
    const totalTax = transactions.reduce((s, t) => s + (t.tax||0), 0);
    const totalDiscount = transactions.reduce((s, t) => s + (t.discountAmount||0), 0);
    const itemsSold = transactions.reduce((s, t) => s + t.items.reduce((ss,i)=>ss+i.qty,0), 0);

    return {
      totalRevenue,
      totalModal,
      grossProfit: totalRevenue - totalModal,
      totalTax,
      totalDiscount,
      totalTransactions: transactions.length,
      itemsSold,
      avgTransaction: transactions.length ? totalRevenue / transactions.length : 0,
    };
  },

  getTopProducts(transactions, limit = 5) {
    const map = {};
    transactions.forEach(t => {
      t.items.forEach(item => {
        if (!map[item.id]) map[item.id] = { name: item.name, emoji: item.emoji||'📦', qty: 0, revenue: 0 };
        map[item.id].qty += item.qty;
        map[item.id].revenue += item.price * item.qty;
      });
    });
    return Object.values(map).sort((a,b) => b.qty - a.qty).slice(0, limit);
  },

  // ─── CANCELLED TRANSACTIONS ──────────────────────────────────────────────────

  getCancelledTransactions() {
    const data = this.getAll('cancelled_transactions');
    return Array.isArray(data) ? data : [];
  },

  saveCancelledTransaction(trx) {
    const list = this.getCancelledTransactions(); // always array now
    list.unshift(trx);
    this.setAll('cancelled_transactions', list);
    // Restore stock for each item
    if (trx.items && trx.items.length) {
      trx.items.forEach(item => {
        try { this.restoreStock(item.id, item.qty); } catch(e) { console.warn('restoreStock error', e); }
      });
    }
    return trx;
  },

  // ─── HUTANG/PIUTANG ──────────────────────────────────────────────────────────

  getHutang() {
    const data = this.getAll('hutang');
    return Array.isArray(data) ? data : [];
  },

  addHutang(h) {
    const list = this.getHutang();
    h.id = 'h' + Date.now();
    h.createdAt = new Date().toISOString();
    h.status = 'belum'; // belum | lunas
    h.payments = [];
    h.sisaTagihan = h.jumlah;
    list.unshift(h);
    this.setAll('hutang', list);
    return h;
  },

  updateHutang(id, updates) {
    const list = this.getHutang().map(h => h.id === id ? { ...h, ...updates } : h);
    this.setAll('hutang', list);
  },

  deleteHutang(id) {
    this.setAll('hutang', this.getHutang().filter(h => h.id !== id));
  },

  addPayment(hutangId, payment) {
    const list = this.getHutang().map(h => {
      if (h.id !== hutangId) return h;
      const payments = [...(h.payments || []), { ...payment, id: 'p' + Date.now(), date: new Date().toISOString() }];
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const sisaTagihan = Math.max(0, h.jumlah - totalPaid);
      const status = sisaTagihan <= 0 ? 'lunas' : 'belum';
      return { ...h, payments, sisaTagihan, status };
    });
    this.setAll('hutang', list);
  },

  getHutangStats() {
    const list = this.getHutang();
    const aktif = list.filter(h => h.status !== 'lunas');
    const totalHutang = aktif.filter(h => h.jenis === 'hutang').reduce((s, h) => s + h.sisaTagihan, 0);
    const totalPiutang = aktif.filter(h => h.jenis === 'piutang').reduce((s, h) => s + h.sisaTagihan, 0);
    const jatuhTempo = aktif.filter(h => h.tempo && new Date(h.tempo) < new Date()).length;
    return { totalHutang, totalPiutang, jatuhTempo, totalAktif: aktif.length };
  },

  // ─── MEMBERS ──────────────────────────────────────────────────────────────────
  getMembers() { const d = this.getAll('members'); return Array.isArray(d) ? d : []; },
  addMember(m) {
    const list = this.getMembers();
    m.id = 'mbr' + Date.now();
    m.createdAt = new Date().toISOString();
    m.totalPoints = 0; m.totalSpend = 0; m.visitCount = 0;
    list.unshift(m); this.setAll('members', list); return m;
  },
  updateMember(id, updates) {
    this.setAll('members', this.getMembers().map(m => m.id === id ? { ...m, ...updates } : m));
  },
  deleteMember(id) { this.setAll('members', this.getMembers().filter(m => m.id !== id)); },
  getMemberByPhone(phone) { return this.getMembers().find(m => m.phone === phone); },
  getMemberByCode(code) { return this.getMembers().find(m => m.code === code.toUpperCase()); },
  addMemberPoints(id, pts, spend) {
    const list = this.getMembers().map(m => {
      if (m.id !== id) return m;
      return { ...m, totalPoints: (m.totalPoints||0)+pts, totalSpend: (m.totalSpend||0)+spend, visitCount: (m.visitCount||0)+1, lastVisit: new Date().toISOString() };
    });
    this.setAll('members', list);
  },
  redeemPoints(id, pts) {
    const list = this.getMembers().map(m => {
      if (m.id !== id) return m;
      return { ...m, totalPoints: Math.max(0, (m.totalPoints||0)-pts) };
    });
    this.setAll('members', list);
  },
  getMemberTier(totalSpend) {
    if (totalSpend >= 5000000) return { tier:'Platinum', color:'#a78bfa', icon:'💎' };
    if (totalSpend >= 1000000) return { tier:'Gold', color:'#f59e0b', icon:'🥇' };
    if (totalSpend >= 300000) return { tier:'Silver', color:'#94a3b8', icon:'🥈' };
    return { tier:'Bronze', color:'#b45309', icon:'🥉' };
  },

  // ─── VOUCHERS ─────────────────────────────────────────────────────────────────
  getVouchers() { const d = this.getAll('vouchers'); return Array.isArray(d) ? d : []; },
  addVoucher(v) {
    const list = this.getVouchers();
    v.id = 'vch' + Date.now();
    v.createdAt = new Date().toISOString();
    v.usedCount = 0;
    v.code = v.code.toUpperCase();
    list.unshift(v); this.setAll('vouchers', list); return v;
  },
  updateVoucher(id, updates) {
    this.setAll('vouchers', this.getVouchers().map(v => v.id === id ? { ...v, ...updates } : v));
  },
  deleteVoucher(id) { this.setAll('vouchers', this.getVouchers().filter(v => v.id !== id)); },
  getVoucherByCode(code) {
    const now = new Date();
    return this.getVouchers().find(v =>
      v.code === code.toUpperCase() && v.active &&
      (!v.validFrom || new Date(v.validFrom) <= now) &&
      (!v.validTo || new Date(v.validTo) >= now) &&
      (!v.maxUse || v.usedCount < v.maxUse)
    );
  },
  useVoucher(id) {
    this.setAll('vouchers', this.getVouchers().map(v => v.id === id ? { ...v, usedCount: (v.usedCount||0)+1 } : v));
  },

  // ─── SHIFTS ───────────────────────────────────────────────────────────────────
  getShifts() { const d = this.getAll('shifts'); return Array.isArray(d) ? d : []; },
  getActiveShift() { return this.getShifts().find(s => s.status === 'open'); },
  openShift(cashierId, cashierName, openingCash) {
    const shift = {
      id: 'shf' + Date.now(),
      cashierId, cashierName,
      openingCash, openedAt: new Date().toISOString(),
      status: 'open', closingCash: 0, closedAt: null, notes: ''
    };
    const list = this.getShifts(); list.unshift(shift);
    this.setAll('shifts', list); return shift;
  },
  closeShift(id, closingCash, notes) {
    const trx = this.getTransactions().filter(t => {
      const shift = this.getShifts().find(s => s.id === id);
      return shift && new Date(t.createdAt) >= new Date(shift.openedAt);
    });
    const revenue = trx.reduce((s,t) => s+t.total, 0);
    this.setAll('shifts', this.getShifts().map(s => s.id === id ? {
      ...s, status:'closed', closingCash, closedAt: new Date().toISOString(), notes, revenue, trxCount: trx.length
    } : s));
  },

  // ─── PURCHASE ORDERS ──────────────────────────────────────────────────────────
  getPurchases() { const d = this.getAll('purchases'); return Array.isArray(d) ? d : []; },
  addPurchase(po) {
    const list = this.getPurchases();
    po.id = 'PO-' + String(list.length+1).padStart(4,'0');
    po.createdAt = new Date().toISOString();
    po.status = 'pending'; // pending | received | cancelled
    list.unshift(po); this.setAll('purchases', list); return po;
  },
  receivePurchase(id) {
    const po = this.getPurchases().find(p => p.id === id);
    if (!po || po.status !== 'pending') return;
    // Add stock for each item
    po.items.forEach(item => {
      try { this.restoreStock(item.productId, item.qty); } catch(e) {}
    });
    this.setAll('purchases', this.getPurchases().map(p => p.id === id ? { ...p, status:'received', receivedAt: new Date().toISOString() } : p));
  },
  cancelPurchase(id) {
    this.setAll('purchases', this.getPurchases().map(p => p.id === id ? { ...p, status:'cancelled' } : p));
  },

  // ─── EXPENSES (Pengeluaran) ────────────────────────────────────────────────────
  getExpenses() { const d = this.getAll('expenses'); return Array.isArray(d) ? d : []; },
  addExpense(e) {
    const list = this.getExpenses();
    e.id = 'exp' + Date.now();
    e.createdAt = new Date().toISOString();
    list.unshift(e); this.setAll('expenses', list); return e;
  },
  deleteExpense(id) { this.setAll('expenses', this.getExpenses().filter(e => e.id !== id)); },
  getExpenseCategories() { return ['Gaji/Upah','Sewa','Listrik/Air','Bahan Baku','Transportasi','Lain-lain']; },

  // ─── RETURNS ──────────────────────────────────────────────────────────────────
  getReturns() { const d = this.getAll('returns'); return Array.isArray(d) ? d : []; },
  addReturn(r) {
    const list = this.getReturns();
    r.id = 'RTN-' + String(list.length+1).padStart(4,'0');
    r.createdAt = new Date().toISOString();
    // Restore stock
    r.items.forEach(item => { try { this.restoreStock(item.productId, item.qty); } catch(e) {} });
    list.unshift(r); this.setAll('returns', list); return r;
  },

  // ─── EXPORT/RESET ─────────────────────────────────────────────────────────

  exportJSON() {
    return JSON.stringify({
      settings: this.getSettings(),
      cashiers: this.getCashiers(),
      products: this.getProducts(),
      transactions: this.getTransactions(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  },

  resetAll() {
    localStorage.removeItem('kasirpro_initialized');
    localStorage.removeItem('kasirpro_settings');
    localStorage.removeItem('kasirpro_cashiers');
    localStorage.removeItem('kasirpro_products');
    localStorage.removeItem('kasirpro_transactions');
    localStorage.removeItem('kasirpro_cancelled_transactions');
    localStorage.removeItem('kasirpro_hutang');
    localStorage.removeItem('kasirpro_members');
    localStorage.removeItem('kasirpro_vouchers');
    localStorage.removeItem('kasirpro_shifts');
    localStorage.removeItem('kasirpro_purchases');
    localStorage.removeItem('kasirpro_expenses');
    localStorage.removeItem('kasirpro_returns');
    localStorage.removeItem('kasirpro_counter');
    this.init();
  },
};

// Initialize DB
DB.init();
