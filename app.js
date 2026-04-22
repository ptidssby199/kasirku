// KasirPro - Main Application Logic
// ═══════════════════════════════════════════════════════════════════

const state = {
  currentCashier: null,
  cart: [],
  selectedPayment: 'tunai',
  currentTransactionId: null,
  selectedCategory: '',
  pinBuffer: '',
  lastReportTransactions: [],
  lastReportPeriod: '',
  appliedVoucher: null,
  selectedMember: null,
};

// ─── PIN / LOGIN ──────────────────────────────────────────────────────────────
function enterPin(d) {
  if (state.pinBuffer.length >= 4) return;
  state.pinBuffer += d;
  updatePinDisplay();
  if (state.pinBuffer.length === 4) setTimeout(() => doLogin(), 150);
}
function clearPin() { state.pinBuffer = state.pinBuffer.slice(0,-1); updatePinDisplay(); }
function updatePinDisplay() {
  for (let i=1;i<=4;i++) {
    const dot = document.getElementById('dot'+i);
    if (dot) dot.classList.toggle('filled', i <= state.pinBuffer.length);
  }
}
function updateNavVisibility() {
  const admin = isAdmin();
  const adminOnlyTabs = ['produk','laporan','pengaturan','pengeluaran','po','shift'];
  adminOnlyTabs.forEach(tab => {
    const el = document.getElementById('tab-' + tab);
    if (el) el.style.display = admin ? '' : 'none';
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  } else {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

function closeNavDrawer() { /* no-op: drawer removed */ }
function toggleNavDrawer() { /* no-op: drawer removed */ }

// ─── NAV AUTO-HIDE ON SCROLL ─────────────────────────────────────────────────
(function initNavAutoHide() {
  let lastScrollY = 0;
  let ticking = false;
  let hideTimer = null;

  function handleScroll(el) {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;
    const currentY = el.scrollTop;
    const delta = currentY - lastScrollY;

    // Scroll DOWN lebih dari 10px → hide nav
    if (delta > 10 && currentY > 50) {
      nav.classList.add('nav-hidden');
      // Auto show kembali setelah 2.5 detik
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => nav.classList.remove('nav-hidden'), 2500);
    }
    // Scroll UP → show nav langsung
    else if (delta < -5) {
      nav.classList.remove('nav-hidden');
      clearTimeout(hideTimer);
    }

    lastScrollY = currentY;
    ticking = false;
  }

  // Attach ke semua tab-page scroll containers
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-page, .tab-content').forEach(el => {
      el.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => handleScroll(el));
          ticking = true;
        }
      }, { passive: true });
    });
  });
})();


function doLogin() {
  const cashier = DB.getCashierByPin(state.pinBuffer);
  if (!cashier) {
    state.pinBuffer = '';
    updatePinDisplay();
    shakeLogin();
    showToast('PIN salah!','error');
    return;
  }
  state.pinBuffer = '';
  updatePinDisplay();
  localStorage.setItem('kasirpro_session', cashier.id);
  applyLogin(cashier);
  showToast('👋 Selamat datang, ' + cashier.name + '!');
}

function applyLogin(cashier) {
  state.currentCashier = cashier;
  // Ensure transaction ID is valid
  if (!state.currentTransactionId) {
    state.currentTransactionId = DB.getNextTransactionId();
  }
  // Update top bar
  var nameEl = document.getElementById('cashierName');
  if (nameEl) nameEl.textContent = cashier.name;
  var initEl = document.getElementById('cashierInitial');
  if (initEl) initEl.textContent = cashier.name.charAt(0).toUpperCase();
  // Update transId display
  var transEl = document.getElementById('transId');
  if (transEl) transEl.textContent = '#' + state.currentTransactionId;
  // Update sidebar cashier info
  var sbName = document.getElementById('sidebarName');
  var sbRole = document.getElementById('sidebarRole');
  var sbInit = document.getElementById('sidebarInitial');
  if (sbName) sbName.textContent = cashier.name;
  if (sbRole) sbRole.textContent = cashier.role;
  if (sbInit) sbInit.textContent = cashier.name.charAt(0).toUpperCase();
  // Show app, hide login
  var login = document.getElementById('loginScreen');
  var app   = document.getElementById('mainApp');
  if (login) login.classList.remove('active');
  if (app)   app.classList.add('active');
  // On desktop: show sidebar permanently
  var sidebar = document.getElementById('sidebar');
  var mainContent = document.getElementById('mainContentArea');
  if (window.innerWidth >= 768) {
    if (sidebar) sidebar.classList.add('sidebar-desktop-open');
    if (mainContent) mainContent.classList.add('with-sidebar');
  }
  // Update state
  updateReportAccess();
  updateNavVisibility();
  updateShiftIndicator();
  showTab('dashboard');
}
function logout() {
  localStorage.removeItem('kasirpro_session');
  state.currentCashier = null;
  state.cart = [];
  state.appliedVoucher = null;
  state.selectedMember = null;
  // Close & hide sidebar completely
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  var mainContent = document.getElementById('mainContentArea');
  if (sidebar) {
    sidebar.classList.remove('open');
    sidebar.classList.remove('sidebar-desktop-open');
    sidebar.style.transform = 'translateX(-100%)';
  }
  if (overlay) overlay.classList.remove('open');
  if (mainContent) mainContent.classList.remove('with-sidebar');
  // Show login, hide app
  var login = document.getElementById('loginScreen');
  var app   = document.getElementById('mainApp');
  if (login) login.classList.add('active');
  if (app)   app.classList.remove('active');
  // Reset tabs
  document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
  var dash = document.getElementById('tab-dashboard-content');
  if (dash) dash.classList.add('active');
  document.querySelectorAll('.sidebar-item').forEach(function(el) { el.classList.remove('active'); });
}
function shakeLogin() {
  const card = document.querySelector('.login-card');
  if (card) { card.style.animation='shake 0.4s ease'; setTimeout(()=>card.style.animation='',400); }
}
function isAdmin() { return state.currentCashier?.role === 'admin'; }
function updateReportAccess() {
  const gate = document.getElementById('reportAdminGate');
  const content = document.getElementById('reportContent');
  if (gate && content) { gate.style.display=isAdmin()?'none':'flex'; content.style.display=isAdmin()?'block':'none'; }
  const adminTabs = ['tab-produk','tab-laporan','tab-pengaturan','tab-member','tab-pengeluaran','tab-po','tab-shift'];
  adminTabs.forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.style.opacity = isAdmin()?'1':'0.35';
    el.style.pointerEvents = 'auto';
    el.title = isAdmin()?'':'Khusus Admin';
  });
}

// ─── ADMIN PIN MODAL ──────────────────────────────────────────────────────────
let adminPinBuffer = '', adminPinCallback = null;
function requireAdminPin(message, callback) {
  adminPinBuffer=''; adminPinCallback=callback; updateAdminPinDisplay();
  document.getElementById('adminPinMessage').textContent = message;
  document.getElementById('adminPinModal').classList.add('active');
}
function enterAdminPin(d) {
  if (adminPinBuffer.length>=4) return;
  adminPinBuffer+=d; updateAdminPinDisplay();
  if (adminPinBuffer.length===4) setTimeout(()=>submitAdminPin(),150);
}
function clearAdminPin() { adminPinBuffer=adminPinBuffer.slice(0,-1); updateAdminPinDisplay(); }
function updateAdminPinDisplay() {
  for (let i=1;i<=4;i++) { const dot=document.getElementById('adot'+i); if(dot) dot.classList.toggle('filled',i<=adminPinBuffer.length); }
}
function submitAdminPin() {
  const cashier = DB.getCashierByPin(adminPinBuffer);
  if (!cashier||cashier.role!=='admin') {
    const card=document.querySelector('.admin-pin-card');
    if(card){card.style.animation='shake 0.4s ease';setTimeout(()=>card.style.animation='',400);}
    adminPinBuffer=''; updateAdminPinDisplay(); showToast('❌ PIN Admin salah!','error'); return;
  }
  const cb=adminPinCallback, approved={...cashier};
  adminPinBuffer=''; adminPinCallback=null; updateAdminPinDisplay();
  document.getElementById('adminPinModal').classList.remove('active');
  if (typeof cb==='function') { try{cb(approved);}catch(e){console.error(e);showToast('Terjadi kesalahan!','error');} }
}
function closeAdminPinModal() {
  adminPinBuffer=''; adminPinCallback=null; updateAdminPinDisplay();
  document.getElementById('adminPinModal').classList.remove('active');
}

// ─── CANCEL TRANSACTION ───────────────────────────────────────────────────────
function cancelTransaction() {
  if (state.cart.length===0) { showToast('Keranjang sudah kosong!','error'); return; }
  if (isAdmin()) { confirmCancelTransaction(state.currentCashier); return; }
  requireAdminPin('Masukkan PIN Admin untuk membatalkan transaksi ini', (adminCashier) => confirmCancelTransaction(adminCashier));
}
function confirmCancelTransaction(authorizedBy) {
  const trxId = state.currentTransactionId;
  try {
    DB.saveCancelledTransaction({
      id: trxId+'-BATAL', originalId: trxId, status:'cancelled',
      items: state.cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty})),
      total: parseRp(document.getElementById('totalAmt').textContent),
      cancelledBy: authorizedBy?authorizedBy.name:'Admin',
      cancelledAt: new Date().toISOString(),
      cashier: state.currentCashier?state.currentCashier.name:'-',
    });
  } catch(e) { console.warn('Could not log cancelled transaction:',e); }
  state.cart=[]; state.selectedPayment='tunai'; state.currentTransactionId=DB.getNextTransactionId();
  state.appliedVoucher=null; state.selectedMember=null;
  document.getElementById('cartItems').innerHTML='<div class="cart-empty"><div class="empty-icon">🛒</div><p>Belum ada item</p><small>Ketuk produk untuk menambahkan</small></div>';
  document.getElementById('transId').textContent='#'+state.currentTransactionId;
  document.getElementById('discountInput').value='';
  document.getElementById('taxToggle').checked=false;
  document.getElementById('cashInput').value='';
  document.getElementById('changeAmt').textContent='Rp 0';
  document.getElementById('subtotalAmt').textContent='Rp 0';
  document.getElementById('taxAmt').textContent='Rp 0';
  document.getElementById('totalAmt').textContent='Rp 0';
  document.querySelectorAll('.pay-method').forEach(el=>el.classList.remove('active'));
  document.getElementById('pm-tunai').classList.add('active');
  document.getElementById('cashInputWrap').style.display='block';
  clearMember();
  const vi=document.getElementById('voucherInput'); if(vi) vi.value='';
  const vinfo=document.getElementById('voucherInfo'); if(vinfo){vinfo.style.display='none';}
  renderProductGrid(); renderCategories(); generateQuickCash(0);
  showToast('✅ Transaksi #'+trxId+' dibatalkan oleh '+(authorizedBy?authorizedBy.name:'Admin'));
}

// ─── TABS ────────────────────────────────────────────────────────────────────
function showTab(tab) {
  const adminOnly=['produk','laporan','pengaturan','pengeluaran','po','shift'];
  if (!isAdmin()&&adminOnly.includes(tab)) { showToast('⛔ Akses ditolak! Hanya Admin.','error'); return; }
  closeSidebar();
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
  const tabEl=document.getElementById('tab-'+tab+'-content');
  if(tabEl) tabEl.classList.add('active');
  // Update sidebar active state
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const navEl=document.getElementById('tab-'+tab);
  if(navEl) navEl.classList.add('active');
  if(tab==='dashboard') renderDashboard();
  if(tab==='produk') renderProductList();
  if(tab==='laporan') { updateReportAccess(); if(isAdmin()) renderReport(); }
  if(tab==='pengaturan') renderSettings();
  if(tab==='hutang') renderHutang();
  if(tab==='member') renderMemberList();
  if(tab==='pengeluaran') renderExpenses();
  if(tab==='po') renderPOList();
  if(tab==='shift') renderShiftTab();
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function loadSettings() {
  const s=DB.getSettings();
  document.getElementById('storeName').textContent=s.storeName||'KasirPro';
}
function renderSettings() {
  const s=DB.getSettings();
  document.getElementById('settingStoreName').value=s.storeName||'';
  document.getElementById('settingAddress').value=s.address||'';
  document.getElementById('settingPhone').value=s.phone||'';
  document.getElementById('settingFooter').value=s.footer||'';
  renderCashierList();
}
function saveSettings() {
  const s={
    storeName:document.getElementById('settingStoreName').value.trim()||'Toko Saya',
    address:document.getElementById('settingAddress').value.trim(),
    phone:document.getElementById('settingPhone').value.trim(),
    footer:document.getElementById('settingFooter').value.trim(),
    taxRate:0.11,currency:'IDR'
  };
  DB.saveSettings(s);
  document.getElementById('storeName').textContent=s.storeName;
  showToast('✅ Pengaturan tersimpan!');
}
function renderCashierList() {
  const el=document.getElementById('cashierList');
  if(!el) return;
  const cashiers=DB.getCashiers();
  el.innerHTML=cashiers.map(c=>`
    <div class="cashier-row">
      <div class="cashier-info-item"><strong>${c.name}</strong><span class="role-badge ${c.role}">${c.role}</span></div>
      <div class="cashier-pin">PIN: ••••</div>
      ${cashiers.length>1?`<button class="btn-sm red" onclick="deleteCashier('${c.id}')">🗑</button>`:''}
    </div>`).join('');
}
function addCashier() {
  const name=document.getElementById('newCashierName').value.trim();
  const pin=document.getElementById('newCashierPin').value.trim();
  const role=document.getElementById('newCashierRole').value;
  if(!name||pin.length!==4||isNaN(pin)){showToast('Nama dan PIN 4 angka wajib!','error');return;}
  if(DB.getCashierByPin(pin)){showToast('PIN sudah dipakai!','error');return;}
  DB.addCashier({id:'c'+Date.now(),name,pin,role});
  document.getElementById('newCashierName').value='';
  document.getElementById('newCashierPin').value='';
  renderCashierList();
  showToast('✅ Kasir ditambahkan!');
}
function deleteCashier(id) {
  if(id===state.currentCashier?.id){showToast('Tidak bisa hapus diri sendiri!','error');return;}
  if(!confirm('Hapus kasir ini?'))return;
  DB.deleteCashier(id); renderCashierList();
}
function exportData() {
  const data = {
    _meta: { version: '2.1', exportedAt: new Date().toISOString(), exportedBy: state.currentCashier?.name || '-' },
    settings:      DB.getSettings(),
    cashiers:      DB.getCashiers(),
    products:      DB.getProducts(),
    transactions:  DB.getTransactions(),
    cancelled_transactions: DB.getCancelledTransactions(),
    members:       DB.getMembers(),
    vouchers:      DB.getVouchers(),
    hutang:        DB.getHutang(),
    expenses:      DB.getExpenses(),
    purchases:     DB.getPurchases(),
    shifts:        DB.getShifts(),
    returns:       DB.getReturns(),
    counter:       localStorage.getItem('kasirpro_counter') || '1',
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kasirpro-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  showToast('✅ Data berhasil diekspor!');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.settings && !data.products) throw new Error('File tidak valid');
        if (!confirm('⚠️ Import akan MENGGANTI semua data yang ada sekarang. Lanjutkan?')) return;
        if (data.settings)               DB.setAll('settings', data.settings);
        if (data.cashiers)               DB.setAll('cashiers', data.cashiers);
        if (data.products)               DB.setAll('products', data.products);
        if (data.transactions)           DB.setAll('transactions', data.transactions);
        if (data.cancelled_transactions) DB.setAll('cancelled_transactions', data.cancelled_transactions);
        if (data.members)                DB.setAll('members', data.members);
        if (data.vouchers)               DB.setAll('vouchers', data.vouchers);
        if (data.hutang)                 DB.setAll('hutang', data.hutang);
        if (data.expenses)               DB.setAll('expenses', data.expenses);
        if (data.purchases)              DB.setAll('purchases', data.purchases);
        if (data.shifts)                 DB.setAll('shifts', data.shifts);
        if (data.returns)                DB.setAll('returns', data.returns);
        if (data.counter)                localStorage.setItem('kasirpro_counter', data.counter);
        localStorage.setItem('kasirpro_initialized', 'true');
        showToast('✅ Data berhasil diimport! Halaman akan dimuat ulang...', 'success');
        setTimeout(() => location.reload(), 1500);
      } catch(err) {
        showToast('❌ File tidak valid: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
function resetData() {
  if(!confirm('HAPUS SEMUA DATA? Ini tidak bisa dibatalkan!'))return;
  if(!confirm('Yakin 100%? Semua transaksi, produk, member akan hilang!'))return;
  DB.resetAll(); location.reload();
}

// ─── EMOJI / IMAGE PICKER ─────────────────────────────────────────────────────
const EMOJIS = {
  'Makanan':['🍚','🍜','🍝','🍛','🍲','🥘','🍱','🥗','🥙','🌮','🌯','🥪','🥨','🧀','🍳','🥚','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕'],
  'Minuman':['☕','🍵','🧋','🥤','🍶','🍺','🥛','🍹','🍸','🍷','🥂','🍻','🧃','💧','🫖'],
  'Snack':['🍪','🎂','🍰','🧁','🍩','🍦','🍧','🍨','🍫','🍬','🍭','🍮','🍯','🍡','🧆'],
  'Buah':['🍎','🍊','🍋','🍇','🍓','🫐','🍈','🍉','🍑','🍒','🥭','🍍','🥝','🍌','🍐'],
  'Produk':['📦','🛍️','🧴','🧼','🪥','🧹','🧺','🧻','🪣','🫙','🧂','🥫','🫕','🧃','🥤'],
  'Lainnya':['💊','💉','🩺','🛒','🏷️','💰','💳','🔑','📱','💻','⌨️','🖨️','📷','🎮','🎁']
};
let currentEmojiCat = Object.keys(EMOJIS)[0];
function initEmojiPicker() {
  const catsEl=document.getElementById('emojiCats');
  if(!catsEl)return;
  catsEl.innerHTML=Object.keys(EMOJIS).map(cat=>`<button class="emoji-cat-btn ${cat===currentEmojiCat?'active':''}" onclick="selectEmojiCat('${cat}')">${cat}</button>`).join('');
  renderEmojiGrid();
}
function selectEmojiCat(cat) {
  currentEmojiCat=cat;
  document.querySelectorAll('.emoji-cat-btn').forEach(b=>b.classList.toggle('active',b.textContent===cat));
  renderEmojiGrid();
}
function renderEmojiGrid(emojis=null) {
  const grid=document.getElementById('emojiGrid');
  if(!grid)return;
  const list=emojis||EMOJIS[currentEmojiCat]||[];
  grid.innerHTML=list.map(e=>`<button class="emoji-btn" onclick="selectEmoji('${e}')">${e}</button>`).join('');
}
function filterEmoji() {
  const q=document.getElementById('emojiSearch').value.trim();
  if(!q){renderEmojiGrid();return;}
  const all=Object.values(EMOJIS).flat();
  renderEmojiGrid(all.filter(e=>e.includes(q)));
}
function selectEmoji(e) {
  document.getElementById('prodEmoji').value=e;
  document.getElementById('prodImage').value='';
  document.getElementById('iconPreview').textContent=e;
}
function switchIconTab(tab) {
  document.getElementById('iconPanelEmoji').style.display=tab==='emoji'?'block':'none';
  document.getElementById('iconPanelUpload').style.display=tab==='upload'?'block':'none';
  document.getElementById('tabEmoji').classList.toggle('active',tab==='emoji');
  document.getElementById('tabUpload').classList.toggle('active',tab==='upload');
}
function handleImageFile(e) { if(e.target.files[0]) processImageFile(e.target.files[0]); }
function handleImageDrop(e) {
  e.preventDefault(); document.getElementById('uploadZone').classList.remove('drag-over');
  if(e.dataTransfer.files[0]) processImageFile(e.dataTransfer.files[0]);
}
function processImageFile(file) {
  if(file.size>2*1024*1024){showToast('File terlalu besar (maks 2MB)','error');return;}
  const reader=new FileReader();
  reader.onload=ev=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas'); canvas.width=200; canvas.height=200;
      const ctx=canvas.getContext('2d');
      const s=Math.min(img.width,img.height);
      ctx.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,200,200);
      const dataUrl=canvas.toDataURL('image/jpeg',0.8);
      document.getElementById('prodImage').value=dataUrl;
      document.getElementById('prodEmoji').value='';
      document.getElementById('iconPreview').innerHTML=`<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
      document.getElementById('uploadedImg').src=dataUrl;
      document.getElementById('uploadedImgPreview').style.display='flex';
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
}
function removeUploadedImg() {
  document.getElementById('prodImage').value='';
  document.getElementById('uploadedImgPreview').style.display='none';
  document.getElementById('iconPreview').textContent='📦';
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
function renderCategories() {
  const products=DB.getProducts();
  const cats=[...new Set(products.map(p=>p.category).filter(Boolean))];
  const el=document.getElementById('categoryTabs');
  if(!el)return;
  el.innerHTML=`<button class="cat-tab ${!state.selectedCategory?'active':''}" onclick="selectCategory('')">Semua</button>`+
    cats.map(c=>`<button class="cat-tab ${state.selectedCategory===c?'active':''}" onclick="selectCategory('${c}')">${c}</button>`).join('');
}
function selectCategory(cat) { state.selectedCategory=cat; renderCategories(); renderProductGrid(); }
function filterProducts() { renderProductGrid(); }
function renderProductGrid() {
  const q=(document.getElementById('searchProduk')?.value||'').toLowerCase();
  let products=DB.getProducts();
  if(state.selectedCategory) products=products.filter(p=>p.category===state.selectedCategory);
  if(q) products=products.filter(p=>p.name.toLowerCase().includes(q)||(p.code||'').toLowerCase().includes(q));
  const el=document.getElementById('productGrid');
  if(!el)return;
  if(!products.length){el.innerHTML='<div class="empty-products"><p>Tidak ada produk</p></div>';return;}
  el.innerHTML=products.map(p=>{
    const lowStock=p.stock<=p.minStock&&p.stock>0;
    const noStock=p.stock<=0;
    return `<div class="product-card ${noStock?'out-of-stock':''}" onclick="${noStock?'':'addToCart(\''+p.id+'\')'}" >
      <div class="product-icon">${p.image?`<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`:(p.emoji||'📦')}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-price">${formatCurrency(p.price)}</div>
      <div class="product-stock ${lowStock?'low':noStock?'out':''}">${noStock?'Habis':lowStock?'Stok: '+p.stock:'Stok: '+p.stock}</div>
    </div>`;
  }).join('');
}
function renderProductList() {
  const q=(document.getElementById('searchProdukList')?.value||'').toLowerCase();
  const cat=document.getElementById('filterCategory')?.value||'';
  let products=DB.getProducts();
  if(q) products=products.filter(p=>p.name.toLowerCase().includes(q)||(p.code||'').toLowerCase().includes(q));
  if(cat) products=products.filter(p=>p.category===cat);
  // Populate category filter
  const catSel=document.getElementById('filterCategory');
  if(catSel){
    const currentVal=catSel.value;
    const cats=[...new Set(DB.getProducts().map(p=>p.category).filter(Boolean))];
    catSel.innerHTML='<option value="">Semua Kategori</option>'+cats.map(c=>`<option value="${c}" ${c===currentVal?'selected':''}>${c}</option>`).join('');
  }
  // Stock summary
  const lowStockItems=DB.getLowStockProducts();
  document.getElementById('stockSummary').innerHTML=lowStockItems.length?`<div class="low-stock-alert">⚠️ ${lowStockItems.length} produk stok rendah: ${lowStockItems.map(p=>p.name).join(', ')}</div>`:'';
  const tbody=document.getElementById('productTable')?.querySelector('tbody');
  if(!tbody)return;
  tbody.innerHTML=products.map(p=>`<tr>
    <td><div class="prod-icon-cell">${p.image?`<img src="${p.image}" style="width:32px;height:32px;object-fit:cover;border-radius:6px">`:(p.emoji||'📦')}</div></td>
    <td><strong>${p.name}</strong><br><small>${p.code||''}</small></td>
    <td>${p.category||'-'}</td>
    <td>${formatCurrency(p.price)}</td>
    <td>${formatCurrency(p.modal||0)}</td>
    <td><span class="stock-badge ${p.stock<=0?'out':p.stock<=p.minStock?'low':'ok'}">${p.stock}</span></td>
    <td>
      <button class="btn-sm green" onclick="openProductModal('${p.id}')">✏️</button>
      <button class="btn-sm red" onclick="deleteProduct('${p.id}')">🗑</button>
    </td>
  </tr>`).join('');
}
function openProductModal(id=null) {
  const modal=document.getElementById('productModal');
  const fields=['prodNama','prodKategori','prodKode','prodHarga','prodModal','prodStok','prodMinStok','prodEmoji','prodImage'];
  fields.forEach(f=>{const el=document.getElementById(f);if(el)el.value='';});
  document.getElementById('editProductId').value=id||'';
  document.getElementById('iconPreview').textContent='📦';
  document.getElementById('uploadedImgPreview').style.display='none';
  switchIconTab('emoji');
  initEmojiPicker();
  if(id){
    const p=DB.getProducts().find(x=>x.id===id);
    if(p){
      document.getElementById('prodNama').value=p.name||'';
      document.getElementById('prodKategori').value=p.category||'';
      document.getElementById('prodKode').value=p.code||'';
      document.getElementById('prodHarga').value=p.price||0;
      document.getElementById('prodModal').value=p.modal||0;
      document.getElementById('prodStok').value=p.stock||0;
      document.getElementById('prodMinStok').value=p.minStock||5;
      document.getElementById('prodEmoji').value=p.emoji||'';
      document.getElementById('prodImage').value=p.image||'';
      if(p.image){document.getElementById('iconPreview').innerHTML=`<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;}
      else if(p.emoji){document.getElementById('iconPreview').textContent=p.emoji;}
    }
  }
  modal.classList.add('active');
}
function saveProduct() {
  const name=document.getElementById('prodNama').value.trim();
  const price=parseFloat(document.getElementById('prodHarga').value)||0;
  if(!name||!price){showToast('Nama dan harga wajib!','error');return;}
  const id=document.getElementById('editProductId').value;
  const data={
    name,category:document.getElementById('prodKategori').value.trim(),
    code:document.getElementById('prodKode').value.trim(),price,
    modal:parseFloat(document.getElementById('prodModal').value)||0,
    stock:parseInt(document.getElementById('prodStok').value)||0,
    minStock:parseInt(document.getElementById('prodMinStok').value)||5,
    emoji:document.getElementById('prodEmoji').value||'📦',
    image:document.getElementById('prodImage').value||'',
  };
  if(id){DB.updateProduct(id,data);}else{DB.addProduct(data);}
  closeModal('productModal');
  renderProductList();
  renderProductGrid();
  renderCategories();
  showToast('✅ Produk tersimpan!');
}
function deleteProduct(id) {
  if(!confirm('Hapus produk ini?'))return;
  DB.deleteProduct(id); renderProductList(); renderProductGrid(); renderCategories();
}

// ─── CART ─────────────────────────────────────────────────────────────────────
function addToCart(id) {
  const p=DB.getProducts().find(x=>x.id===id);
  if(!p||p.stock<=0){showToast('Stok habis!','error');return;}
  const existing=state.cart.find(i=>i.id===id);
  if(existing){
    if(existing.qty>=p.stock){showToast('Stok tidak cukup!','error');return;}
    existing.qty++;
  } else {
    state.cart.push({id:p.id,name:p.name,price:p.price,modal:p.modal||0,emoji:p.emoji||'📦',image:p.image||'',qty:1});
  }
  renderCart(); calcTotal();
  // Auto-switch to cart panel on mobile
  if (window.innerWidth <= 600) kasirMobileTab('cart');
}
function updateQty(id,delta) {
  const item=state.cart.find(i=>i.id===id);
  if(!item)return;
  const p=DB.getProducts().find(x=>x.id===id);
  item.qty+=delta;
  if(item.qty<=0){state.cart=state.cart.filter(i=>i.id!==id);}
  else if(p&&item.qty>p.stock){item.qty=p.stock;showToast('Stok tidak cukup!','error');}
  renderCart(); calcTotal();
}
function removeCartItem(id){state.cart=state.cart.filter(i=>i.id!==id);renderCart();calcTotal();}
function clearCart(){if(!confirm('Kosongkan keranjang?'))return;state.cart=[];renderCart();calcTotal();renderProductGrid();}
function renderCart() {
  const el=document.getElementById('cartItems');
  updateCartBadge();
  if(state.cart.length===0){
    el.innerHTML='<div class="cart-empty"><div class="empty-icon">🛒</div><p>Belum ada item</p><small>Ketuk produk untuk menambahkan</small></div>';
    return;
  }
  el.innerHTML=state.cart.map(item=>`
    <div class="cart-item">
      ${item.image?`<div class="cart-item-img" style="background-image:url(${item.image})"></div>`:`<div class="cart-item-emoji">${item.emoji||'📦'}</div>`}
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatCurrency(item.price)} / pcs</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="updateQty('${item.id}',-1)">−</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" onclick="updateQty('${item.id}',1)">+</button>
        <button class="qty-btn remove-btn" onclick="removeCartItem('${item.id}')">✕</button>
      </div>
      <div class="cart-item-subtotal">${formatCurrency(item.price*item.qty)}</div>
    </div>`).join('');
  updateCartBadge();
}
function calcTotal() {
  const subtotal=state.cart.reduce((s,i)=>s+i.price*i.qty,0);
  const discPct=parseFloat(document.getElementById('discountInput').value)||0;
  const discAmt=subtotal*discPct/100;
  let voucherDisc=0;
  if(state.appliedVoucher){const v=state.appliedVoucher;voucherDisc=v.type==='percent'?subtotal*v.value/100:Math.min(v.value,subtotal);}
  let pointsDisc=0;
  const redeemEl=document.getElementById('redeemPointsInput');
  if(redeemEl&&state.selectedMember){const rp=Math.min(parseInt(redeemEl.value)||0,state.selectedMember.totalPoints||0);pointsDisc=rp*10;}
  const taxEnabled=document.getElementById('taxToggle').checked;
  const settings=DB.getSettings();
  const afterDisc=Math.max(0,subtotal-discAmt-voucherDisc-pointsDisc);
  const tax=taxEnabled?afterDisc*settings.taxRate:0;
  const total=afterDisc+tax;
  document.getElementById('subtotalAmt').textContent=formatCurrency(subtotal);
  document.getElementById('taxAmt').textContent=formatCurrency(tax);
  document.getElementById('totalAmt').textContent=formatCurrency(total);
  calcChange(); generateQuickCash(total);
}
function calcChange() {
  const total=parseRp(document.getElementById('totalAmt').textContent);
  const cash=parseFloat(document.getElementById('cashInput').value)||0;
  document.getElementById('changeAmt').textContent=formatCurrency(Math.max(0,cash-total));
}
function generateQuickCash(total) {
  const el=document.getElementById('quickCash'); if(!el)return;
  const amounts=[5000,10000,20000,50000,100000];
  const suggestions=amounts.filter(a=>a>=total).slice(0,4);
  el.innerHTML=suggestions.map(a=>`<button class="quick-cash-btn" onclick="setQuickCash(${a})">${formatCurrencyShort(a)}</button>`).join('');
}
function setQuickCash(a){document.getElementById('cashInput').value=a;calcChange();}
function selectPayment(method) {
  state.selectedPayment=method;
  document.querySelectorAll('.pay-method').forEach(el=>el.classList.remove('active'));
  document.getElementById('pm-'+method).classList.add('active');
  document.getElementById('cashInputWrap').style.display=method==='tunai'?'block':'none';
  calcChange();
}
function checkout() {
  if(state.cart.length===0){showToast('Keranjang kosong!','error');return;}
  if(!state.selectedPayment){showToast('Pilih metode pembayaran!','error');return;}
  if(state.selectedPayment==='tunai'){
    const cash=parseFloat(document.getElementById('cashInput').value)||0;
    const total=parseRp(document.getElementById('totalAmt').textContent);
    if(cash<total){showToast('Uang kurang!','error');return;}
  }
  const trxId=state.currentTransactionId;
  const subtotal=state.cart.reduce((s,i)=>s+i.price*i.qty,0);
  const discPct=parseFloat(document.getElementById('discountInput').value)||0;
  const discAmt=subtotal*discPct/100;
  let voucherDisc=0,voucherId=null;
  if(state.appliedVoucher){const v=state.appliedVoucher;voucherDisc=v.type==='percent'?subtotal*v.value/100:v.value;voucherId=v.id;}
  let pointsRedeemed=0,pointsDisc=0;
  if(state.selectedMember){const rp=parseInt(document.getElementById('redeemPointsInput')?.value)||0;const maxRedeem=Math.min(rp,state.selectedMember.totalPoints||0);pointsRedeemed=maxRedeem;pointsDisc=maxRedeem*10;}
  const taxEnabled=document.getElementById('taxToggle').checked;
  const settings=DB.getSettings();
  const afterDisc=Math.max(0,subtotal-discAmt-voucherDisc-pointsDisc);
  const tax=taxEnabled?afterDisc*settings.taxRate:0;
  const total=afterDisc+tax;
  const cash=parseFloat(document.getElementById('cashInput').value)||0;
  const change=Math.max(0,cash-total);
  if(voucherId) DB.useVoucher(voucherId);
  let pointsEarned=0;
  if(state.selectedMember){
    pointsEarned=Math.floor(total/1000);
    if(pointsRedeemed>0) DB.redeemPoints(state.selectedMember.id,pointsRedeemed);
    if(pointsEarned>0) DB.addMemberPoints(state.selectedMember.id,pointsEarned,total);
  }
  const trx={
    id:trxId,items:[...state.cart],subtotal,discountPct:discPct,discountAmount:discAmt,
    voucherCode:state.appliedVoucher?.code||null,voucherDiscount:voucherDisc,
    pointsRedeemed,pointsDisc,pointsEarned,
    memberId:state.selectedMember?.id||null,memberName:state.selectedMember?.nama||null,
    taxEnabled,tax,total,paymentMethod:state.selectedPayment,
    cashReceived:cash,change,cashier:state.currentCashier?.name||'-',
    createdAt:new Date().toISOString(),
  };
  DB.saveTransaction(trx);
  // Clear cart immediately so next transaction starts fresh
  state.cart = [];
  state.appliedVoucher = null;
  state.selectedMember = null;
  renderCart();
  showReceipt(trx);
}
function showReceipt(trx) {
  window._lastTrx = trx;
  document.getElementById('receiptContent').innerHTML=buildReceiptHTML(trx);
  document.getElementById('receiptModal').classList.add('active');
}
function buildReceiptHTML(trx) {
  const s=DB.getSettings();
  const dt=new Date(trx.createdAt);
  const items=trx.items.map(i=>`<div class="receipt-item"><span>${i.emoji||'📦'} ${i.name} x${i.qty}</span><span>${formatCurrency(i.price*i.qty)}</span></div>`).join('');
  return `
    <div class="receipt-header"><strong>${s.storeName}</strong><br>${s.address||''}<br>${s.phone||''}</div>
    <div class="receipt-divider">================================</div>
    <div class="receipt-meta"><span>No</span><span>#${trx.id}</span></div>
    <div class="receipt-meta"><span>Kasir</span><span>${trx.cashier}</span></div>
    ${trx.memberName?`<div class="receipt-meta"><span>Member</span><span>${trx.memberName}</span></div>`:''}
    <div class="receipt-meta"><span>Waktu</span><span>${dt.toLocaleDateString('id-ID')} ${dt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</span></div>
    <div class="receipt-divider">--------------------------------</div>
    <div class="receipt-items">${items}</div>
    <div class="receipt-divider">--------------------------------</div>
    <div class="receipt-row"><span>Subtotal</span><span>${formatCurrency(trx.subtotal)}</span></div>
    ${trx.discountAmount>0?`<div class="receipt-row discount"><span>Diskon ${trx.discountPct}%</span><span>-${formatCurrency(trx.discountAmount)}</span></div>`:''}
    ${trx.voucherDiscount>0?`<div class="receipt-row discount"><span>Voucher ${trx.voucherCode}</span><span>-${formatCurrency(trx.voucherDiscount)}</span></div>`:''}
    ${trx.pointsDisc>0?`<div class="receipt-row discount"><span>Tukar ${trx.pointsRedeemed} poin</span><span>-${formatCurrency(trx.pointsDisc)}</span></div>`:''}
    ${trx.taxEnabled?`<div class="receipt-row"><span>PPN 11%</span><span>${formatCurrency(trx.tax)}</span></div>`:''}
    <div class="receipt-divider">================================</div>
    <div class="receipt-row total-final"><span>TOTAL</span><span>${formatCurrency(trx.total)}</span></div>
    ${trx.paymentMethod==='tunai'?`<div class="receipt-row"><span>Bayar</span><span>${formatCurrency(trx.cashReceived)}</span></div><div class="receipt-row"><span>Kembali</span><span>${formatCurrency(trx.change)}</span></div>`:''}
    <div class="receipt-row"><span>Metode</span><span>${trx.paymentMethod.toUpperCase()}</span></div>
    ${trx.pointsEarned>0?`<div class="receipt-divider">--------------------------------</div><div class="receipt-row"><span>🎯 Poin Didapat</span><span>+${trx.pointsEarned} poin</span></div>`:''}
    <div class="receipt-divider">================================</div>
    <div class="receipt-footer">${s.footer||'Terima kasih telah berbelanja!'}</div>`;
}
// ─── THERMAL PRINTER (ESC/POS) ────────────────────────────────────────────────

// ESC/POS command bytes
const ESC = 0x1B, GS = 0x1D;
const ESCPOS = {
  INIT:        [ESC, 0x40],
  ALIGN_LEFT:  [ESC, 0x61, 0x00],
  ALIGN_CENTER:[ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON:     [ESC, 0x45, 0x01],
  BOLD_OFF:    [ESC, 0x45, 0x00],
  FONT_SMALL:  [ESC, 0x4D, 0x01],
  FONT_NORMAL: [ESC, 0x4D, 0x00],
  FEED:        [ESC, 0x64, 0x03],
  FEED1:       [0x0A],
  CUT:         [GS,  0x56, 0x41, 0x03],
};

let _btDevice = null, _btChar = null;

async function connectBluetoothPrinter() {
  try {
    if (!navigator.bluetooth) {
      showToast('Web Bluetooth tidak didukung browser ini', 'error');
      return false;
    }
    showToast('🔍 Mencari printer Bluetooth...', 'info');
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
        { namePrefix: 'BT' },
        { namePrefix: 'Printer' },
        { namePrefix: 'RPP' },
        { namePrefix: 'MTP' },
      ],
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000ff00-0000-1000-8000-00805f9b34fb',
      ]
    });
    const server = await device.gatt.connect();
    // Try known printer service UUIDs
    const serviceUUIDs = [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      '0000ff00-0000-1000-8000-00805f9b34fb',
    ];
    let service, characteristic;
    for (const uuid of serviceUUIDs) {
      try {
        service = await server.getPrimaryService(uuid);
        const chars = await service.getCharacteristics();
        characteristic = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
        if (characteristic) break;
      } catch(e) { continue; }
    }
    if (!characteristic) throw new Error('Karakteristik printer tidak ditemukan');
    _btDevice = device;
    _btChar = characteristic;
    device.addEventListener('gattserverdisconnected', () => {
      _btDevice = null; _btChar = null;
      showToast('Printer terputus', 'error');
      updatePrinterStatus();
    });
    showToast('✅ Printer ' + device.name + ' terhubung!');
    updatePrinterStatus();
    return true;
  } catch(e) {
    if (e.name === 'NotFoundError') showToast('Printer tidak ditemukan / dibatalkan', 'error');
    else showToast('Gagal konek: ' + e.message, 'error');
    return false;
  }
}

function disconnectPrinter() {
  if (_btDevice && _btDevice.gatt.connected) {
    _btDevice.gatt.disconnect();
  }
  _btDevice = null; _btChar = null;
  updatePrinterStatus();
  showToast('Printer diputuskan');
}

function updatePrinterStatus() {
  const btn = document.getElementById('printerConnectBtn');
  const status = document.getElementById('printerStatus');
  const connected = _btDevice && _btDevice.gatt.connected;
  if (btn) {
    btn.textContent = connected ? '🖨️ Putuskan Printer' : '🖨️ Hubungkan Printer';
    btn.className = connected ? 'btn-danger' : 'btn-secondary';
    btn.onclick = connected ? disconnectPrinter : connectBluetoothPrinter;
  }
  if (status) {
    status.textContent = connected ? '● ' + _btDevice.name : '○ Tidak terhubung';
    status.className = connected ? 'printer-status connected' : 'printer-status';
  }
}

async function sendToPrinter(bytes) {
  if (!_btChar) return false;
  try {
    const CHUNK = 100;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const chunk = bytes.slice(i, i + CHUNK);
      await _btChar.writeValue(new Uint8Array(chunk));
      await new Promise(r => setTimeout(r, 30));
    }
    return true;
  } catch(e) {
    showToast('Gagal kirim ke printer: ' + e.message, 'error');
    _btDevice = null; _btChar = null;
    updatePrinterStatus();
    return false;
  }
}

function textToBytes(text) {
  return Array.from(new TextEncoder().encode(text));
}

function buildEscposReceipt(trx) {
  const s = DB.getSettings();
  const dt = new Date(trx.createdAt);
  const W = 32; // chars per line for 58mm
  function line(text) { return textToBytes(text + '\n'); }
  function center(text) {
    const pad = Math.max(0, Math.floor((W - text.length) / 2));
    return line(' '.repeat(pad) + text);
  }
  function divider() { return line('-'.repeat(W)); }
  function row(left, right) {
    const space = Math.max(1, W - left.length - right.length);
    return line(left + ' '.repeat(space) + right);
  }

  let bytes = [...ESCPOS.INIT, ...ESCPOS.ALIGN_CENTER];

  // Header
  bytes.push(...ESCPOS.BOLD_ON);
  bytes.push(...center(s.storeName || 'KasirPro'));
  bytes.push(...ESCPOS.BOLD_OFF);
  if (s.address) bytes.push(...center(s.address));
  if (s.phone) bytes.push(...center('Telp: ' + s.phone));
  bytes.push(...divider());

  // Info
  bytes.push(...ESCPOS.ALIGN_LEFT);
  bytes.push(...line('No: ' + trx.id));
  bytes.push(...line('Kasir: ' + (trx.cashier || '-')));
  bytes.push(...line('Tgl: ' + dt.toLocaleDateString('id-ID') + ' ' + dt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})));
  if (trx.memberName) bytes.push(...line('Member: ' + trx.memberName));
  bytes.push(...divider());

  // Items
  trx.items.forEach(item => {
    const name = item.name.substring(0, 20);
    bytes.push(...line(name));
    bytes.push(...row('  ' + item.qty + ' x ' + formatCurrency(item.price), formatCurrency(item.price * item.qty)));
  });
  bytes.push(...divider());

  // Totals
  bytes.push(...row('Subtotal', formatCurrency(trx.subtotal)));
  if (trx.discountAmount > 0) bytes.push(...row('Diskon', '-' + formatCurrency(trx.discountAmount)));
  if (trx.voucherDiscount > 0) bytes.push(...row('Voucher', '-' + formatCurrency(trx.voucherDiscount)));
  if (trx.pointsDisc > 0) bytes.push(...row('Poin', '-' + formatCurrency(trx.pointsDisc)));
  if (trx.taxEnabled && trx.tax > 0) bytes.push(...row('PPN 11%', formatCurrency(trx.tax)));
  bytes.push(...divider());

  bytes.push(...ESCPOS.BOLD_ON);
  bytes.push(...row('TOTAL', formatCurrency(trx.total)));
  bytes.push(...ESCPOS.BOLD_OFF);
  bytes.push(...row('Bayar (' + (trx.paymentMethod||'').toUpperCase() + ')', formatCurrency(trx.cashReceived || trx.total)));
  if (trx.change > 0) bytes.push(...row('Kembali', formatCurrency(trx.change)));
  bytes.push(...divider());

  // Footer
  bytes.push(...ESCPOS.ALIGN_CENTER);
  if (trx.pointsEarned > 0) bytes.push(...line('+' + trx.pointsEarned + ' poin didapat'));
  bytes.push(...line(s.footer || 'Terima kasih!'));
  bytes.push(...ESCPOS.FEED);
  bytes.push(...ESCPOS.CUT);

  return bytes;
}

async function printReceiptBluetooth(trx) {
  if (!_btChar) {
    const ok = await connectBluetoothPrinter();
    if (!ok) return false;
  }
  const bytes = buildEscposReceipt(trx);
  return await sendToPrinter(bytes);
}

async function printReceipt(trx) {
  // Try Bluetooth first if connected
  if (_btChar && _btDevice && _btDevice.gatt.connected) {
    const toPrint = trx || window._lastTrx;
    if (toPrint) {
      const ok = await printReceiptBluetooth(toPrint);
      if (ok) return;
    }
  }
  // Fallback: system print dialog
  const content = document.getElementById('receiptContent')?.innerHTML || '';
  const win = window.open('', '_blank');
  if (!win) { showToast('Popup diblokir browser, izinkan popup', 'error'); return; }
  win.document.write(`<html><head><title>Struk</title><style>
    @page{margin:0;size:58mm auto}
    body{font-family:monospace;font-size:12px;width:58mm;margin:0;padding:4px}
    .receipt-item,.receipt-meta,.receipt-row{display:flex;justify-content:space-between;padding:1px 0}
    .receipt-header{text-align:center;margin-bottom:6px}
    .receipt-footer{text-align:center;margin-top:6px;border-top:1px dashed #000;padding-top:4px}
    .total-final{font-weight:900;font-size:13px}
    .discount{color:#000}
    hr{border:none;border-top:1px dashed #000;margin:4px 0}
  </style></head><body>${content}</body></html>`);
  win.document.close();
  win.print();
}


function newTransaction() {
  closeModal('receiptModal');
  if (window.innerWidth <= 600) kasirMobileTab('produk');
  state.cart=[]; state.currentTransactionId=DB.getNextTransactionId();
  document.getElementById('transId').textContent='#'+state.currentTransactionId;
  document.getElementById('discountInput').value='';
  document.getElementById('taxToggle').checked=false;
  document.getElementById('cashInput').value='';
  document.getElementById('changeAmt').textContent='Rp 0';
  document.getElementById('subtotalAmt').textContent='Rp 0';
  document.getElementById('taxAmt').textContent='Rp 0';
  document.getElementById('totalAmt').textContent='Rp 0';
  document.querySelectorAll('.pay-method').forEach(el=>el.classList.remove('active'));
  document.getElementById('pm-tunai').classList.add('active');
  document.getElementById('cashInputWrap').style.display='block';
  clearMember();
  const vi=document.getElementById('voucherInput'); if(vi) vi.value='';
  const vinfo=document.getElementById('voucherInfo'); if(vinfo){vinfo.style.display='none';vinfo.className='cart-info-strip voucher-strip';}
  state.appliedVoucher=null;
  renderCart(); calcTotal(); renderProductGrid();
}

// ─── REPORT ───────────────────────────────────────────────────────────────────
function renderReport() {
  if(!isAdmin())return;
  const period=document.getElementById('reportPeriod').value;
  let transactions,periodLabel;
  switch(period){
    case 'today':transactions=DB.getTodayTransactions();periodLabel='Hari Ini';break;
    case 'week':transactions=DB.getWeekTransactions();periodLabel='7 Hari Terakhir';break;
    case 'month':transactions=DB.getMonthTransactions();periodLabel='30 Hari Terakhir';break;
    default:transactions=DB.getTransactions();periodLabel='Semua Waktu';
  }
  const s=DB.getSettings();
  const stats=DB.calcStats(transactions);
  const now=new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
  document.getElementById('reportHeader').innerHTML=`<div class="report-store-name">${s.storeName}</div><div class="report-store-addr">${s.address||''}</div><div class="report-period">Periode: ${periodLabel} · Dicetak: ${now}</div><div class="report-admin">Admin: ${state.currentCashier?.name||'-'}</div>`;
  renderStats(stats); renderTopProducts(transactions); renderTransactionList(transactions);
  renderCancelledList(period); renderReportHutang(); renderReportExpenses(period); renderReportMember(transactions); renderChart(transactions,period);
  state.lastReportTransactions=transactions; state.lastReportPeriod=periodLabel;
}
function renderStats(stats) {
  document.getElementById('reportStats').innerHTML=`
    <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-val">${formatCurrency(stats.totalRevenue)}</div><div class="stat-label">Total Omzet</div></div>
    <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-val">${formatCurrency(stats.grossProfit)}</div><div class="stat-label">Laba Kotor</div></div>
    <div class="stat-card"><div class="stat-icon">🧾</div><div class="stat-val">${stats.totalTransactions}</div><div class="stat-label">Transaksi</div></div>
    <div class="stat-card"><div class="stat-icon">🛍️</div><div class="stat-val">${stats.itemsSold}</div><div class="stat-label">Item Terjual</div></div>`;
}
function renderTopProducts(transactions) {
  const top=DB.getTopProducts(transactions,5);
  const el=document.getElementById('topProducts'); if(!el)return;
  el.innerHTML=top.map((p,i)=>`<div class="top-item"><span class="top-rank">${i+1}</span><span class="top-name">${p.emoji} ${p.name}</span><span class="top-qty">${p.qty}x</span><span class="top-rev">${formatCurrency(p.revenue)}</span></div>`).join('')||'<p class="empty-msg">Belum ada data</p>';
}
function renderTransactionList(transactions, filtered) {
  const el=document.getElementById('transactionList'); if(!el)return;
  const list = filtered || transactions;
  if(!list.length){el.innerHTML='<p class="empty-msg">Tidak ada transaksi</p>';return;}
  el.innerHTML=list.slice(0,50).map(t=>{
    const dt=new Date(t.createdAt);
    const itemNames = t.items.slice(0,2).map(i=>i.name).join(', ') + (t.items.length>2?` +${t.items.length-2} lagi`:'');
    return `<div class="trx-row" onclick="viewTransaction('${t.id}')">
      <div class="trx-main">
        <div class="trx-id-row">
          <span class="trx-id">#${t.id}</span>
          <span class="trx-method-badge ${t.paymentMethod}">${t.paymentMethod?.toUpperCase()}</span>
        </div>
        <div class="trx-items-preview">${itemNames}</div>
        <div class="trx-meta">${t.cashier||'-'} · ${dt.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})} ${dt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
      <div class="trx-right">
        <div class="trx-total">${formatCurrency(t.total)}</div>
        <div class="trx-items-count">${t.items.length} item</div>
        <button class="btn-sm" onclick="event.stopPropagation();viewTransaction('${t.id}')" title="Detail">🧾</button>
      </div>
    </div>`;
  }).join('');
  // Store for filtering
  window._lastTrxList = transactions;
}

function filterTransactionList() {
  const q = (document.getElementById('trxSearch')?.value||'').toLowerCase();
  if (!window._lastTrxList) return;
  if (!q) { renderTransactionList(window._lastTrxList); return; }
  const filtered = window._lastTrxList.filter(t =>
    t.id?.toLowerCase().includes(q) ||
    t.cashier?.toLowerCase().includes(q) ||
    t.memberName?.toLowerCase().includes(q) ||
    t.items?.some(i => i.name?.toLowerCase().includes(q)) ||
    t.paymentMethod?.toLowerCase().includes(q)
  );
  renderTransactionList(window._lastTrxList, filtered);
}


function renderCancelledList(period) {
  const el=document.getElementById('cancelledList'); if(!el)return;
  let cancelled=DB.getCancelledTransactions();
  const now=new Date();
  if(period==='today'){const d=new Date();d.setHours(0,0,0,0);cancelled=cancelled.filter(t=>new Date(t.cancelledAt)>=d);}
  else if(period==='week'){const d=new Date(now);d.setDate(d.getDate()-7);d.setHours(0,0,0,0);cancelled=cancelled.filter(t=>new Date(t.cancelledAt)>=d);}
  else if(period==='month'){const d=new Date(now);d.setDate(d.getDate()-30);d.setHours(0,0,0,0);cancelled=cancelled.filter(t=>new Date(t.cancelledAt)>=d);}
  if(!cancelled.length){el.innerHTML='<p class="empty-msg">✅ Tidak ada transaksi yang dibatalkan</p>';return;}
  el.innerHTML=cancelled.map(t=>{
    const dt=new Date(t.cancelledAt);
    const itemSummary=t.items?t.items.map(i=>`${i.name} x${i.qty}`).join(', '):'-';
    return `<div class="trx-row cancelled-row" onclick="viewCancelledTransaction('${t.id}')">
      <div class="trx-icon">❌</div>
      <div class="trx-info"><div class="trx-id">#${t.originalId} <span class="cancelled-badge">BATAL</span></div>
      <div class="trx-time">${dt.toLocaleDateString('id-ID')} ${dt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</div>
      <div class="trx-items-preview">${itemSummary}</div></div>
      <div class="trx-right"><div class="trx-total cancelled-total">${formatCurrency(t.total)}</div><div class="trx-cashier">Kasir: ${t.cashier}</div><div class="trx-cashier cancelled-by">Dibatalkan: ${t.cancelledBy}</div></div>
    </div>`;
  }).join('');
}
function viewCancelledTransaction(id) {
  const t=DB.getCancelledTransactions().find(x=>x.id===id); if(!t)return;
  const dt=new Date(t.cancelledAt);
  const itemRows=t.items?t.items.map(i=>`<div class="receipt-item"><span>📦 ${i.name}</span><span>${formatCurrency(i.price*i.qty)}</span></div><div class="receipt-item-sub">${i.qty} × ${formatCurrency(i.price)}</div>`).join(''):'<p>-</p>';
  document.getElementById('trxDetailContent').innerHTML=`<div style="text-align:center;padding:8px 0 12px"><div style="font-size:32px">❌</div><div style="font-weight:800;font-size:16px;color:#be123c">TRANSAKSI DIBATALKAN</div></div>
    <div class="receipt-divider">================================</div>
    <div class="receipt-meta"><span>ID Asli</span><span>#${t.originalId}</span></div>
    <div class="receipt-meta"><span>Waktu Batal</span><span>${dt.toLocaleDateString('id-ID')} ${dt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</span></div>
    <div class="receipt-meta"><span>Kasir</span><span>${t.cashier}</span></div>
    <div class="receipt-meta"><span>Diotorisasi</span><span>${t.cancelledBy}</span></div>
    <div class="receipt-divider">--------------------------------</div>
    <div class="receipt-items">${itemRows}</div>
    <div class="receipt-divider">--------------------------------</div>
    <div class="receipt-row total-final"><span>TOTAL (dibatalkan)</span><span>${formatCurrency(t.total)}</span></div>
    <div class="receipt-divider">================================</div>
    <div class="receipt-footer" style="color:#be123c">Stok produk telah dikembalikan</div>`;
  document.getElementById('trxDetailModal').classList.add('active');
}
function viewTransaction(id) {
  const t=DB.getTransactions().find(x=>x.id===id); if(!t)return;
  document.getElementById('trxDetailContent').innerHTML=buildReceiptHTML(t);
  // Update reprint button
  const reprintBtn = document.getElementById('reprintBtn');
  if (reprintBtn) reprintBtn.onclick = () => reprintReceipt(id);
  document.getElementById('trxDetailModal').classList.add('active');
}

function reprintReceipt(id) {
  const t = DB.getTransactions().find(x=>x.id===id);
  if (!t) { showToast('Transaksi tidak ditemukan','error'); return; }
  // Show receipt modal with reprint content
  document.getElementById('receiptContent').innerHTML = buildReceiptHTML(t);
  document.getElementById('receiptModal').classList.add('active');
  closeModal('trxDetailModal');
}
function renderChart(transactions,period) {
  const canvas=document.getElementById('salesChart'); if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const days=period==='today'?1:period==='week'?7:14;
  const labels=[],data=[];
  for(let i=days-1;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);d.setHours(0,0,0,0);
    const next=new Date(d);next.setDate(next.getDate()+1);
    const dayTrx=transactions.filter(t=>{const td=new Date(t.createdAt);return td>=d&&td<next;});
    labels.push(d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'}));
    data.push(dayTrx.reduce((s,t)=>s+t.total,0));
  }
  const W=canvas.width=canvas.parentElement.clientWidth-32,H=canvas.height=180;
  ctx.clearRect(0,0,W,H);
  if(!data.some(v=>v>0)){ctx.fillStyle='#94a3b8';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('Belum ada data',W/2,H/2);return;}
  const maxVal=Math.max(...data)||1;
  const pad={top:20,right:10,bottom:40,left:60};
  const cW=W-pad.left-pad.right,cH=H-pad.top-pad.bottom;
  const barW=Math.min(cW/labels.length-4,40);
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  labels.forEach((label,i)=>{
    const x=pad.left+(cW/labels.length)*i+(cW/labels.length-barW)/2;
    const bH=Math.max((data[i]/maxVal)*cH,2);
    const y=pad.top+cH-bH;
    const grad=ctx.createLinearGradient(0,y,0,y+bH);
    grad.addColorStop(0,'#6366f1');grad.addColorStop(1,'#818cf8');
    ctx.fillStyle=data[i]>0?grad:(isDark?'#334155':'#e2e8f0');
    ctx.beginPath();ctx.roundRect(x,y,barW,bH,3);ctx.fill();
    if(data[i]>0){ctx.fillStyle=isDark?'#f1f5f9':'#1e293b';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText(formatCurrencyShort(data[i]),x+barW/2,y-4);}
    ctx.fillStyle=isDark?'#94a3b8':'#64748b';ctx.font='9px sans-serif';ctx.textAlign='center';
    ctx.fillText(label,x+barW/2,H-8);
  });
}
function renderReportHutang() {
  const el=document.getElementById('reportHutangContent'); if(!el)return;
  const all=DB.getHutang(),stats=DB.getHutangStats();
  const aktif=all.filter(h=>h.status!=='lunas'),lunas=all.filter(h=>h.status==='lunas');
  const overdue=aktif.filter(h=>h.tempo&&new Date(h.tempo)<new Date());
  el.innerHTML=`<div class="report-hutang-stats">
    <div class="rh-stat red"><span>🔴 Total Hutang Belum Lunas</span><strong>${formatCurrency(stats.totalHutang)}</strong></div>
    <div class="rh-stat green"><span>🟢 Total Piutang Belum Lunas</span><strong>${formatCurrency(stats.totalPiutang)}</strong></div>
    <div class="rh-stat ${overdue.length>0?'warning':'gray'}"><span>⏰ Melewati Jatuh Tempo</span><strong>${overdue.length} item</strong></div>
    <div class="rh-stat blue"><span>✅ Sudah Lunas</span><strong>${lunas.length} item</strong></div>
  </div>
  ${aktif.length?`<div class="rh-table-wrap"><table class="data-table" style="margin-top:12px">
    <thead><tr><th>Nama</th><th>Jenis</th><th>Keterangan</th><th>Total</th><th>Terbayar</th><th>Sisa</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
    <tbody>${aktif.map(h=>{
      const isOverdue=h.tempo&&new Date(h.tempo)<new Date();
      return `<tr><td><strong>${h.nama}</strong>${h.hp?`<br><small>${h.hp}</small>`:''}</td>
        <td><span class="hc-badge ${h.jenis}">${h.jenis==='hutang'?'🔴 HUTANG':'🟢 PIUTANG'}</span></td>
        <td>${h.keterangan||'-'}</td><td><strong>${formatCurrency(h.jumlah)}</strong></td>
        <td class="green-text">${formatCurrency(h.jumlah-h.sisaTagihan)}</td>
        <td class="red-text"><strong>${formatCurrency(h.sisaTagihan)}</strong></td>
        <td ${isOverdue?'class="overdue-text"':''}>${h.tempo?new Date(h.tempo).toLocaleDateString('id-ID'):'-'}${isOverdue?' ⚠️':''}</td>
        <td><span class="stock-badge ${isOverdue?'out':'low'}">${isOverdue?'Lewat':'Aktif'}</span></td></tr>`;
    }).join('')}</tbody></table></div>`:'<p class="empty-msg">Tidak ada hutang/piutang aktif ✅</p>'}
  ${lunas.length?`<details style="margin-top:12px"><summary style="cursor:pointer;font-size:13px;font-weight:700;padding:8px 0;color:var(--text-muted)">✅ Riwayat Lunas (${lunas.length} item)</summary>
    <table class="data-table" style="margin-top:8px;opacity:0.7"><thead><tr><th>Nama</th><th>Jenis</th><th>Jumlah</th><th>Keterangan</th></tr></thead>
    <tbody>${lunas.map(h=>`<tr><td>${h.nama}</td><td><span class="hc-badge ${h.jenis}">${h.jenis==='hutang'?'🔴':'🟢'} ${h.jenis}</span></td><td>${formatCurrency(h.jumlah)}</td><td>${h.keterangan||'-'}</td></tr>`).join('')}</tbody></table></details>`:''}`;
}
function renderReportExpenses(period) {
  const el=document.getElementById('reportExpensesContent'); if(!el)return;
  let expenses=DB.getExpenses();
  const now=new Date();
  if(period==='today'){const d=new Date();d.setHours(0,0,0,0);expenses=expenses.filter(e=>new Date(e.createdAt)>=d);}
  else if(period==='week'){const d=new Date(now);d.setDate(d.getDate()-7);expenses=expenses.filter(e=>new Date(e.createdAt)>=d);}
  else if(period==='month'){const d=new Date(now);d.setDate(d.getDate()-30);expenses=expenses.filter(e=>new Date(e.createdAt)>=d);}
  const total=expenses.reduce((s,e)=>s+e.amount,0);
  const byCat={};
  expenses.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+e.amount;});
  el.innerHTML=`<div class="report-hutang-stats" style="margin-bottom:12px">
    <div class="rh-stat red"><span>📋 Total Pengeluaran</span><strong>${formatCurrency(total)}</strong></div>
    <div class="rh-stat blue"><span>📝 Jumlah Pos</span><strong>${expenses.length}</strong></div>
    ${Object.entries(byCat).slice(0,2).map(([k,v])=>`<div class="rh-stat gray"><span>${k}</span><strong>${formatCurrency(v)}</strong></div>`).join('')}
  </div>
  ${expenses.length?`<table class="data-table"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Dibayar Oleh</th><th>Jumlah</th></tr></thead>
    <tbody>${expenses.map(e=>`<tr><td>${new Date(e.createdAt).toLocaleDateString('id-ID')}</td><td><span class="cat-badge">${e.category}</span></td><td>${e.description}</td><td>${e.paidBy||'-'}</td><td><strong>${formatCurrency(e.amount)}</strong></td></tr>`).join('')}</tbody></table>`:'<p class="empty-msg">Tidak ada pengeluaran</p>'}`;
}
function renderReportMember(transactions) {
  const el = document.getElementById('reportMemberContent');
  if (!el) return;

  // Group transactions by member
  const memberMap = {};
  transactions.forEach(t => {
    if (!t.memberId && !t.memberName) return;
    const key = t.memberId || t.memberName;
    if (!memberMap[key]) {
      memberMap[key] = {
        id: t.memberId, name: t.memberName || '-',
        trxCount: 0, totalSpend: 0, totalDiscount: 0, pointsEarned: 0, transactions: []
      };
    }
    memberMap[key].trxCount++;
    memberMap[key].totalSpend += t.total;
    memberMap[key].totalDiscount += (t.discountAmount||0) + (t.voucherDiscount||0) + (t.pointsDisc||0);
    memberMap[key].pointsEarned += t.pointsEarned||0;
    memberMap[key].transactions.push(t);
  });

  const rows = Object.values(memberMap).sort((a,b) => b.totalSpend - a.totalSpend);

  if (!rows.length) {
    el.innerHTML = '<p class="empty-msg">Tidak ada transaksi member pada periode ini</p>';
    return;
  }

  const totalMemberSpend = rows.reduce((s,r) => s+r.totalSpend, 0);
  const allTrxTotal = transactions.reduce((s,t) => s+t.total, 0);
  const memberPct = allTrxTotal > 0 ? Math.round(totalMemberSpend/allTrxTotal*100) : 0;

  el.innerHTML = `
    <div class="member-report-summary">
      <div class="mrs-chip"><span>👥 Member Aktif</span><strong>${rows.length}</strong></div>
      <div class="mrs-chip"><span>💰 Total Belanja Member</span><strong>${formatCurrency(totalMemberSpend)}</strong></div>
      <div class="mrs-chip"><span>📊 % dari Total Omzet</span><strong>${memberPct}%</strong></div>
      <div class="mrs-chip"><span>🎯 Total Poin Diberikan</span><strong>${rows.reduce((s,r)=>s+r.pointsEarned,0).toLocaleString()} poin</strong></div>
    </div>
    <table class="data-table" style="margin-top:12px">
      <thead>
        <tr>
          <th>Member</th>
          <th>Tier</th>
          <th>Transaksi</th>
          <th>Total Belanja</th>
          <th>Total Diskon</th>
          <th>Poin Earned</th>
          <th>Rata-rata/Trx</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          const member = DB.getMembers().find(m => m.id === r.id);
          const tier = DB.getMemberTier(member?.totalSpend || 0);
          const avg = r.trxCount > 0 ? r.totalSpend/r.trxCount : 0;
          return `<tr>
            <td>
              <strong>${r.name}</strong>
              ${member?.phone ? `<br><small style="color:var(--text-muted)">${member.phone}</small>` : ''}
            </td>
            <td><span style="color:${tier.color};font-weight:800">${tier.icon} ${tier.tier}</span></td>
            <td style="text-align:center">${r.trxCount}x</td>
            <td><strong>${formatCurrency(r.totalSpend)}</strong></td>
            <td class="green-text">${formatCurrency(r.totalDiscount)}</td>
            <td style="text-align:center">+${r.pointsEarned.toLocaleString()}</td>
            <td>${formatCurrency(avg)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}


function exportExcel() {
  const trx=state.lastReportTransactions||[];
  const expenses=DB.getExpenses();
  let csv='\uFEFF';
  csv+='ID,Tanggal,Kasir,Member,Subtotal,Diskon,Voucher,Poin,Pajak,Total,Metode\n';
  trx.forEach(t=>{csv+=`${t.id},${new Date(t.createdAt).toLocaleDateString('id-ID')},${t.cashier},${t.memberName||'-'},${t.subtotal},${t.discountAmount||0},${t.voucherDiscount||0},${t.pointsDisc||0},${t.tax||0},${t.total},${t.paymentMethod}\n`;});
  csv+='\n\nPENGELUARAN\nTanggal,Kategori,Keterangan,Dibayar Oleh,Jumlah\n';
  expenses.forEach(e=>{csv+=`${new Date(e.createdAt).toLocaleDateString('id-ID')},${e.category},${e.description},${e.paidBy||'-'},${e.amount}\n`;});
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`kasirpro-laporan-${new Date().toISOString().split('T')[0]}.csv`;a.click();
}
function exportPDF() {
  const stats=DB.calcStats(state.lastReportTransactions||[]);
  const s=DB.getSettings();
  const win=window.open('','_blank');
  win.document.write(`<html><head><title>Laporan KasirPro</title>
    <style>body{font-family:sans-serif;font-size:13px;padding:20px}h1,h2{color:#4338ca}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f3f4f6}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:15px 0}.stat-box{background:#f3f4f6;padding:12px;border-radius:8px;text-align:center}.stat-val{font-size:18px;font-weight:900;color:#4338ca}.stat-lbl{font-size:11px;color:#64748b}</style>
    </head><body>
    <h1>${s.storeName} — Laporan Penjualan</h1>
    <p>Periode: ${state.lastReportPeriod} · ${new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</p>
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-val">${formatCurrency(stats.totalRevenue)}</div><div class="stat-lbl">Total Omzet</div></div>
      <div class="stat-box"><div class="stat-val">${formatCurrency(stats.grossProfit)}</div><div class="stat-lbl">Laba Kotor</div></div>
      <div class="stat-box"><div class="stat-val">${stats.totalTransactions}</div><div class="stat-lbl">Transaksi</div></div>
      <div class="stat-box"><div class="stat-val">${stats.itemsSold}</div><div class="stat-lbl">Item Terjual</div></div>
    </div>
    <h2>Riwayat Transaksi</h2>
    <table><thead><tr><th>No</th><th>Tanggal</th><th>Kasir</th><th>Total</th><th>Metode</th></tr></thead>
    <tbody>${(state.lastReportTransactions||[]).map(t=>`<tr><td>${t.id}</td><td>${new Date(t.createdAt).toLocaleDateString('id-ID')}</td><td>${t.cashier}</td><td>${formatCurrency(t.total)}</td><td>${t.paymentMethod}</td></tr>`).join('')}</tbody></table>
    </body></html>`);
  win.document.close(); win.print();
}
function checkLowStock() {
  const low=DB.getLowStockProducts();
  if(low.length>0) showToast(`⚠️ ${low.length} produk stok rendah!`,'warning');
}

// ─── MOBILE KASIR TAB ────────────────────────────────────────────────────────
function kasirMobileTab(tab) {
  const produkPanel = document.getElementById('kasirProdukPanel');
  const cartPanel   = document.getElementById('kasirCartPanel');
  const btnProduk   = document.getElementById('kmtProduk');
  const btnCart     = document.getElementById('kmtCart');
  if (!produkPanel || !cartPanel) return;

  if (tab === 'produk') {
    produkPanel.classList.remove('mobile-hidden');
    cartPanel.classList.add('mobile-hidden');
    btnProduk.classList.add('active');
    btnCart.classList.remove('active');
  } else {
    produkPanel.classList.add('mobile-hidden');
    cartPanel.classList.remove('mobile-hidden');
    btnCart.classList.add('active');
    btnProduk.classList.remove('active');
  }
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const count = state.cart.reduce((s, i) => s + i.qty, 0);
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────────────
function closeModal(id){document.getElementById(id)?.classList.remove('active');}
function closeModalOutside(e,id){if(e.target===document.getElementById(id))closeModal(id);}
function showToast(msg,type='success'){
  const el=document.getElementById('toast');
  el.textContent=msg;el.className='toast '+type+' show';
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),3000);
}
function formatCurrency(n){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0);}
function formatCurrencyShort(n){if(n>=1000000)return'Rp'+(n/1000000).toFixed(1)+'jt';if(n>=1000)return'Rp'+(n/1000).toFixed(0)+'rb';return'Rp'+n;}
function parseRp(str){return parseFloat(str.replace(/[^0-9]/g,''))||0;}

// ─── HUTANG / PIUTANG ────────────────────────────────────────────────────────
let currentHutangFilter='semua';
function renderHutang() {
  const all=DB.getHutang(),stats=DB.getHutangStats(),aktif=all.filter(h=>h.status!=='lunas');
  document.getElementById('hutangSummary').innerHTML=`
    <div class="hutang-stat red"><div class="hs-label">🔴 Total Hutang</div><div class="hs-val">${formatCurrency(stats.totalHutang)}</div></div>
    <div class="hutang-stat green"><div class="hs-label">🟢 Total Piutang</div><div class="hs-val">${formatCurrency(stats.totalPiutang)}</div></div>
    <div class="hutang-stat ${stats.jatuhTempo>0?'warning':'gray'}"><div class="hs-label">⏰ Jatuh Tempo</div><div class="hs-val">${stats.jatuhTempo}</div></div>`;
  let list=all;
  if(currentHutangFilter==='hutang') list=all.filter(h=>h.jenis==='hutang'&&h.status!=='lunas');
  else if(currentHutangFilter==='piutang') list=all.filter(h=>h.jenis==='piutang'&&h.status!=='lunas');
  else if(currentHutangFilter==='lunas') list=all.filter(h=>h.status==='lunas');
  const el=document.getElementById('hutangList');
  if(!list.length){el.innerHTML='<p class="empty-msg">Tidak ada data</p>';return;}
  el.innerHTML=list.map(h=>{
    const isOverdue=h.tempo&&new Date(h.tempo)<new Date()&&h.status!=='lunas';
    const pct=h.jumlah>0?Math.round(((h.jumlah-h.sisaTagihan)/h.jumlah)*100):0;
    return `<div class="hutang-card ${h.jenis} ${h.status==='lunas'?'lunas':''} ${isOverdue?'overdue':''}">
      <div class="hc-top"><div class="hc-nama"><span class="hc-badge ${h.jenis}">${h.jenis==='hutang'?'🔴 HUTANG':'🟢 PIUTANG'}</span>
      <strong>${h.nama}</strong>${h.hp?`<a href="tel:${h.hp}" class="hc-hp">📞 ${h.hp}</a>`:''}</div>
      <div class="hc-actions">${h.status!=='lunas'?`<button class="btn-sm green" onclick="openBayarModal('${h.id}')">💳 Bayar</button>`:'<span class="lunas-badge">✅ LUNAS</span>'}
      <button class="btn-sm red" onclick="deleteHutangItem('${h.id}')">🗑</button></div></div>
      <div class="hc-keterangan">${h.keterangan||'-'}</div>
      <div class="hc-amounts"><div><span>Total</span><strong>${formatCurrency(h.jumlah)}</strong></div><div><span>Terbayar</span><strong class="green-text">${formatCurrency(h.jumlah-h.sisaTagihan)}</strong></div><div><span>Sisa</span><strong class="${h.status==='lunas'?'':'red-text'}">${formatCurrency(h.sisaTagihan)}</strong></div></div>
      <div class="hc-progress-wrap"><div class="hc-progress-bar"><div class="hc-progress-fill" style="width:${pct}%"></div></div><span class="hc-pct">${pct}%</span></div>
      <div class="hc-footer"><span ${isOverdue?'class="overdue-text"':''}>⏰ ${h.tempo?new Date(h.tempo).toLocaleDateString('id-ID'):'-'}${isOverdue?' (LEWAT)':''}</span><span>📅 ${new Date(h.createdAt).toLocaleDateString('id-ID')}</span></div>
      ${h.payments&&h.payments.length?`<div class="hc-payments">${h.payments.map(p=>`<div class="hc-payment-row">💳 ${new Date(p.date).toLocaleDateString('id-ID')} — ${formatCurrency(p.amount)} ${p.note?'· '+p.note:''}</div>`).join('')}</div>`:''}
    </div>`;
  }).join('');
}
function switchHutangTab(tab){currentHutangFilter=tab;document.querySelectorAll('.htab').forEach(b=>b.classList.remove('active'));document.getElementById('htab-'+tab).classList.add('active');renderHutang();}
function openHutangModal(id=null){['hutangNama','hutangJumlah','hutangKeterangan','hutangHp','hutangTempo'].forEach(f=>document.getElementById(f).value='');selectJenis('hutang');document.getElementById('editHutangId').value=id||'';document.getElementById('hutangModal').classList.add('active');}
function selectJenis(jenis){document.getElementById('hutangJenis').value=jenis;document.getElementById('jenis-hutang').classList.toggle('active',jenis==='hutang');document.getElementById('jenis-piutang').classList.toggle('active',jenis==='piutang');}
function saveHutang(){const nama=document.getElementById('hutangNama').value.trim(),jumlah=parseFloat(document.getElementById('hutangJumlah').value)||0;if(!nama||!jumlah){showToast('Nama dan jumlah wajib!','error');return;}DB.addHutang({nama,jumlah,jenis:document.getElementById('hutangJenis').value,keterangan:document.getElementById('hutangKeterangan').value.trim(),hp:document.getElementById('hutangHp').value.trim(),tempo:document.getElementById('hutangTempo').value});closeModal('hutangModal');renderHutang();showToast('✅ Data tersimpan!');}
function openBayarModal(id){const h=DB.getHutang().find(x=>x.id===id);if(!h)return;document.getElementById('bayarHutangId').value=id;document.getElementById('bayarJumlah').value=h.sisaTagihan;document.getElementById('bayarCatatan').value='';document.getElementById('bayarInfo').innerHTML=`<div class="bayar-info-row"><span>Nama</span><strong>${h.nama}</strong></div><div class="bayar-info-row"><span>Total</span><strong>${formatCurrency(h.jumlah)}</strong></div><div class="bayar-info-row"><span>Sisa</span><strong class="red-text">${formatCurrency(h.sisaTagihan)}</strong></div>`;document.getElementById('bayarModal').classList.add('active');}
function saveBayar(){const id=document.getElementById('bayarHutangId').value,amount=parseFloat(document.getElementById('bayarJumlah').value)||0;if(!amount){showToast('Masukkan jumlah bayar!','error');return;}DB.addPayment(id,{amount,note:document.getElementById('bayarCatatan').value.trim()});closeModal('bayarModal');renderHutang();showToast('✅ Pembayaran dicatat!');}
function deleteHutangItem(id){if(!confirm('Hapus data ini?'))return;DB.deleteHutang(id);renderHutang();showToast('Dihapus');}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard() {
  const todayTrx=DB.getTodayTransactions(),weekTrx=DB.getWeekTransactions();
  const todayStats=DB.calcStats(todayTrx),weekStats=DB.calcStats(weekTrx);
  const cashier=state.currentCashier,hour=new Date().getHours();
  const greeting=hour<11?'Selamat Pagi 👋':hour<15?'Selamat Siang 👋':hour<18?'Selamat Sore 👋':'Selamat Malam 👋';
  document.getElementById('dashGreeting').textContent=greeting;
  document.getElementById('dashDate').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  document.getElementById('dashCashierInfo').textContent=cashier?cashier.name:'';
  document.getElementById('dashStats').innerHTML=`
    <div class="dash-stat-card green"><div class="ds-icon">💰</div><div class="ds-val">${formatCurrency(todayStats.totalRevenue)}</div><div class="ds-label">Omzet Hari Ini</div></div>
    <div class="dash-stat-card blue"><div class="ds-icon">📈</div><div class="ds-val">${formatCurrency(todayStats.grossProfit)}</div><div class="ds-label">Laba Hari Ini</div></div>
    <div class="dash-stat-card purple"><div class="ds-icon">🧾</div><div class="ds-val">${todayStats.totalTransactions}</div><div class="ds-label">Transaksi</div></div>
    <div class="dash-stat-card orange"><div class="ds-icon">🛍️</div><div class="ds-val">${todayStats.itemsSold}</div><div class="ds-label">Item Terjual</div></div>`;
  document.getElementById('dashWeekStats').innerHTML=`
    <div class="week-stat-row"><span>Omzet 7 hari</span><strong>${formatCurrency(weekStats.totalRevenue)}</strong></div>
    <div class="week-stat-row"><span>Laba kotor</span><strong>${formatCurrency(weekStats.grossProfit)}</strong></div>
    <div class="week-stat-row"><span>Total transaksi</span><strong>${weekStats.totalTransactions}</strong></div>
    <div class="week-stat-row"><span>Rata-rata/hari</span><strong>${formatCurrency(weekStats.totalRevenue/7)}</strong></div>
    <div class="week-stat-row"><span>Rata-rata/transaksi</span><strong>${formatCurrency(weekStats.avgTransaction)}</strong></div>`;
  renderHourlyChart();renderWeeklyChart();renderDashTopProducts();renderDashHutang();checkStockAlert();
}
function renderHourlyChart(){const canvas=document.getElementById('hourlyChart');if(!canvas)return;const ctx=canvas.getContext('2d');const todayTrx=DB.getTodayTransactions();const hourMap={};for(let i=0;i<24;i++)hourMap[i]=0;todayTrx.forEach(t=>{const h=new Date(t.createdAt).getHours();hourMap[h]+=t.total;});const hours=Object.keys(hourMap).map(Number),values=hours.map(h=>hourMap[h]),maxVal=Math.max(...values)||1;const W=canvas.width=canvas.parentElement.clientWidth-32,H=canvas.height=160;ctx.clearRect(0,0,W,H);const pad={top:10,right:10,bottom:30,left:50};const cW=W-pad.left-pad.right,cH=H-pad.top-pad.bottom,barW=Math.max(4,cW/24-2);hours.forEach(h=>{const x=pad.left+(cW/24)*h,bH=(values[h]/maxVal)*cH,y=pad.top+cH-bH;const grad=ctx.createLinearGradient(0,y,0,y+bH);grad.addColorStop(0,'#6366f1');grad.addColorStop(1,'#a5b4fc');ctx.fillStyle=values[h]>0?grad:'#e2e8f0';ctx.beginPath();ctx.roundRect(x,y,barW,Math.max(bH,2),2);ctx.fill();if(h%4===0){ctx.fillStyle='#64748b';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText(h+':00',x+barW/2,H-8);}});}
function renderWeeklyChart(){const canvas=document.getElementById('weeklyChart');if(!canvas)return;const ctx=canvas.getContext('2d');const weekTrx=DB.getWeekTransactions();const dayMap={};for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);dayMap[d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'})]=0;}weekTrx.forEach(t=>{const key=new Date(t.createdAt).toLocaleDateString('id-ID',{day:'2-digit',month:'short'});if(key in dayMap)dayMap[key]+=t.total;});const labels=Object.keys(dayMap),values=labels.map(k=>dayMap[k]),maxVal=Math.max(...values)||1,bestIdx=values.indexOf(Math.max(...values));const W=canvas.width=canvas.parentElement.clientWidth-32,H=canvas.height=160;ctx.clearRect(0,0,W,H);const pad={top:10,right:10,bottom:36,left:50};const cW=W-pad.left-pad.right,cH=H-pad.top-pad.bottom,barW=Math.min(cW/labels.length-6,36);labels.forEach((label,i)=>{const x=pad.left+(cW/labels.length)*i+(cW/labels.length-barW)/2,bH=Math.max((values[i]/maxVal)*cH,2),y=pad.top+cH-bH;const grad=ctx.createLinearGradient(0,y,0,y+bH);if(i===bestIdx&&values[i]>0){grad.addColorStop(0,'#f59e0b');grad.addColorStop(1,'#fcd34d');}else{grad.addColorStop(0,'#6366f1');grad.addColorStop(1,'#818cf8');}ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(x,y,barW,bH,3);ctx.fill();if(i===bestIdx&&values[i]>0){ctx.fillStyle='#f59e0b';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText('★ TERBAIK',x+barW/2,y-4);}ctx.fillStyle='#64748b';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText(label,x+barW/2,H-8);});}
function renderDashTopProducts(){const todayTrx=DB.getTodayTransactions(),top=DB.getTopProducts(todayTrx,5),el=document.getElementById('dashTopProducts');if(!el)return;if(!top.length){el.innerHTML='<p class="empty-msg">Belum ada penjualan hari ini</p>';return;}const maxQty=top[0].qty;el.innerHTML=top.map((p,i)=>`<div class="top-product-row"><div class="rank-badge">${i+1}</div><div class="tp-info"><span>${p.emoji} ${p.name}</span><div class="tp-bar-wrap"><div class="tp-bar" style="width:${(p.qty/maxQty)*100}%"></div></div></div><div class="tp-stats"><span>${p.qty}x</span><span>${formatCurrency(p.revenue)}</span></div></div>`).join('');}
function checkStockAlert(){const low=DB.getLowStockProducts(),banner=document.getElementById('stockAlertBanner'),text=document.getElementById('stockAlertText');if(!banner||!text)return;if(low.length>0){text.textContent=`${low.length} produk stok rendah: ${low.slice(0,3).map(p=>p.name).join(', ')}${low.length>3?'...':''}`;banner.style.display='flex';}else{banner.style.display='none';}}
function renderDashHutang(){const stats=DB.getHutangStats(),all=DB.getHutang(),aktif=all.filter(h=>h.status!=='lunas'),overdue=aktif.filter(h=>h.tempo&&new Date(h.tempo)<new Date()),sumEl=document.getElementById('dashHutangSummary');if(!sumEl)return;if(!all.length){sumEl.innerHTML='<p class="empty-msg" style="margin:8px 0">Belum ada data hutang/piutang</p>';document.getElementById('dashHutangList').innerHTML='';return;}sumEl.innerHTML=`<div class="dh-summary"><div class="dh-chip red"><div class="dh-chip-label">🔴 Hutang Aktif</div><div class="dh-chip-val">${formatCurrency(stats.totalHutang)}</div><div class="dh-chip-count">${aktif.filter(h=>h.jenis==='hutang').length} pelanggan</div></div><div class="dh-chip green"><div class="dh-chip-label">🟢 Piutang Aktif</div><div class="dh-chip-val">${formatCurrency(stats.totalPiutang)}</div><div class="dh-chip-count">${aktif.filter(h=>h.jenis==='piutang').length} supplier</div></div><div class="dh-chip ${overdue.length>0?'warning':'gray'}"><div class="dh-chip-label">⏰ Jatuh Tempo</div><div class="dh-chip-val">${overdue.length}</div><div class="dh-chip-count">${overdue.length>0?'perlu ditagih!':'tidak ada'}</div></div></div>`;const sorted=[...aktif].sort((a,b)=>{const aO=a.tempo&&new Date(a.tempo)<new Date()?1:0,bO=b.tempo&&new Date(b.tempo)<new Date()?1:0;if(bO!==aO)return bO-aO;return b.sisaTagihan-a.sisaTagihan;}).slice(0,4);const listEl=document.getElementById('dashHutangList');if(!sorted.length){listEl.innerHTML='<p class="empty-msg" style="margin-top:8px">Semua lunas ✅</p>';return;}listEl.innerHTML=`<div class="dh-list">${sorted.map(h=>{const isOverdue=h.tempo&&new Date(h.tempo)<new Date(),tempoStr=h.tempo?new Date(h.tempo).toLocaleDateString('id-ID',{day:'2-digit',month:'short'}):'-',pct=h.jumlah>0?Math.round(((h.jumlah-h.sisaTagihan)/h.jumlah)*100):0;return`<div class="dh-row ${isOverdue?'overdue':''}"><div class="dh-row-left"><span class="dh-jenis-dot ${h.jenis}"></span><div><div class="dh-row-nama">${h.nama}</div><div class="dh-row-ket">${h.keterangan||(h.jenis==='hutang'?'Hutang pelanggan':'Piutang supplier')}</div></div></div><div class="dh-row-right"><div class="dh-row-sisa ${isOverdue?'red-text':''}">${formatCurrency(h.sisaTagihan)}</div><div class="dh-row-tempo ${isOverdue?'overdue-text':''}">⏰ ${tempoStr}${isOverdue?' ⚠️':''}</div><div class="dh-progress-mini"><div style="width:${pct}%;background:var(--success);height:100%;border-radius:3px"></div></div></div></div>`;}).join('')}</div>${aktif.length>4?`<div class="dh-more" onclick="showTab('hutang')">+${aktif.length-4} lainnya → Lihat Semua</div>`:''}`;
}

// ─── DARK MODE ────────────────────────────────────────────────────────────────
function toggleDarkMode(){const isDark=document.documentElement.getAttribute('data-theme')==='dark',newTheme=isDark?'light':'dark';document.documentElement.setAttribute('data-theme',newTheme);localStorage.setItem('kasirpro_theme',newTheme);document.getElementById('darkModeBtn').textContent=newTheme==='dark'?'☀️':'🌙';if(document.getElementById('tab-dashboard-content').classList.contains('active'))setTimeout(()=>{renderHourlyChart();renderWeeklyChart();},50);}
function loadTheme(){const theme=localStorage.getItem('kasirpro_theme')||'light';document.documentElement.setAttribute('data-theme',theme);const btn=document.getElementById('darkModeBtn');if(btn)btn.textContent=theme==='dark'?'☀️':'🌙';}

// ─── MEMBER & LOYALITAS ───────────────────────────────────────────────────────
function renderMemberList(){
  // show/hide admin-only controls
  const addBtn = document.querySelector('#tab-member-content .page-header .btn-primary');
  if (addBtn) addBtn.style.display = isAdmin() ? '' : 'none';
const q=(document.getElementById('searchMemberList')?.value||'').toLowerCase();let members=DB.getMembers().filter(m=>!q||m.nama.toLowerCase().includes(q)||m.phone.includes(q)||(m.code||'').toLowerCase().includes(q));const el=document.getElementById('memberListContent');if(!el)return;if(!members.length){el.innerHTML='<p class="empty-msg">Belum ada member</p>';return;}el.innerHTML=members.map(m=>{const tier=DB.getMemberTier(m.totalSpend||0);return`<div class="member-card"><div class="mc-top"><div class="mc-avatar" style="background:${tier.color}22;border-color:${tier.color}">${tier.icon}</div><div class="mc-info"><div class="mc-nama">${m.nama} <span class="mc-tier" style="color:${tier.color}">${tier.tier}</span></div><div class="mc-sub">📞 ${m.phone} · Kode: <strong>${m.code||'-'}</strong></div>${m.discount?`<div class="mc-sub">🏷️ Diskon member: ${m.discount}%</div>`:''}</div><div class="mc-actions"><button class="btn-sm red" onclick="deleteMemberItem('${m.id}')">🗑</button></div></div><div class="mc-stats"><div class="mc-stat"><div class="mc-stat-val">${(m.totalPoints||0).toLocaleString()}</div><div class="mc-stat-lbl">Poin</div></div><div class="mc-stat"><div class="mc-stat-val">${formatCurrencyShort(m.totalSpend||0)}</div><div class="mc-stat-lbl">Total Belanja</div></div><div class="mc-stat"><div class="mc-stat-val">${m.visitCount||0}x</div><div class="mc-stat-lbl">Kunjungan</div></div><div class="mc-stat"><div class="mc-stat-val">${m.lastVisit?new Date(m.lastVisit).toLocaleDateString('id-ID',{day:'2-digit',month:'short'}):'-'}</div><div class="mc-stat-lbl">Terakhir</div></div></div></div>`;}).join('');}
function openMemberModal(){document.getElementById('editMemberId').value='';['mNama','mPhone','mCode','mDiscount','mPoints'].forEach(id=>document.getElementById(id).value='');document.getElementById('memberModal').classList.add('active');}
function saveMember(){
  try {
    const nama=document.getElementById('mNama').value.trim();
    const phone=document.getElementById('mPhone').value.trim();
    if(!nama||!phone){showToast('Nama dan No HP wajib!','error');return;}
    const code=document.getElementById('mCode').value.trim().toUpperCase()||'M'+Date.now().toString().slice(-6);
    const discount=parseFloat(document.getElementById('mDiscount').value)||0;
    const totalPoints=parseInt(document.getElementById('mPoints').value)||0;
    DB.addMember({nama,phone,code,discount,totalPoints});
    closeModal('memberModal');
    renderMemberList();
    showToast('✅ Member ditambahkan!');
  } catch(e) {
    console.error('saveMember error:',e);
    showToast('❌ Gagal simpan: '+e.message,'error');
  }
}
function deleteMemberItem(id){if(!confirm('Hapus member ini?'))return;DB.deleteMember(id);renderMemberList();showToast('Dihapus');}
function searchMember(){const q=document.getElementById('memberInput').value.trim();if(!q){clearMember();return;}const m=DB.getMemberByCode(q)||DB.getMemberByPhone(q);if(m){state.selectedMember=m;const tier=DB.getMemberTier(m.totalSpend||0);document.getElementById('memberInfo').innerHTML=`<span>${tier.icon} <strong>${m.nama}</strong> · ${tier.tier}</span><span>🎯 ${(m.totalPoints||0).toLocaleString()} poin</span>${m.discount?`<span>🏷️ Diskon ${m.discount}%</span>`:''}`;document.getElementById('memberInfo').style.display='flex';document.getElementById('clearMemberBtn').style.display='inline-flex';document.getElementById('redeemPointsRow').style.display=m.totalPoints>0?'flex':'none';document.getElementById('availablePoints').textContent=`${(m.totalPoints||0).toLocaleString()} poin tersedia`;if(m.discount){document.getElementById('discountInput').value=m.discount;}calcTotal();}}
function clearMember(){state.selectedMember=null;document.getElementById('memberInput').value='';document.getElementById('memberInfo').style.display='none';document.getElementById('clearMemberBtn').style.display='none';document.getElementById('redeemPointsRow').style.display='none';document.getElementById('redeemPointsInput').value='';calcTotal();}

// ─── VOUCHER ──────────────────────────────────────────────────────────────────
function applyVoucher(){const code=document.getElementById('voucherInput').value.trim().toUpperCase();if(!code)return;const subtotal=state.cart.reduce((s,i)=>s+i.price*i.qty,0);const v=DB.getVoucherByCode(code);if(!v){showToast('❌ Voucher tidak valid / sudah habis!','error');return;}if(v.minOrder&&subtotal<v.minOrder){showToast(`❌ Min. belanja ${formatCurrency(v.minOrder)}`,'error');return;}state.appliedVoucher=v;const disc=v.type==='percent'?`${v.value}%`:formatCurrency(v.value);document.getElementById('voucherInfo').innerHTML=`✅ Voucher <strong>${v.code}</strong> — Diskon ${disc}`;document.getElementById('voucherInfo').style.display='block';document.getElementById('voucherInfo').className='voucher-info-strip applied';calcTotal();showToast(`🎁 Voucher ${v.code} berhasil dipakai!`);}
function openVoucherModal(){['vCode','vName','vValue','vMinOrder','vMaxUse','vFrom','vTo'].forEach(id=>document.getElementById(id).value='');document.getElementById('vType').value='percent';document.getElementById('voucherModal').classList.add('active');}
function saveVoucher(){
  try {
    const code=document.getElementById('vCode').value.trim().toUpperCase();
    const value=parseFloat(document.getElementById('vValue').value)||0;
    if(!code||!value){showToast('Kode dan nilai wajib diisi!','error');return;}
    DB.addVoucher({
      code, name:document.getElementById('vName').value.trim(),
      type:document.getElementById('vType').value, value,
      minOrder:parseFloat(document.getElementById('vMinOrder').value)||0,
      maxUse:parseInt(document.getElementById('vMaxUse').value)||null,
      validFrom:document.getElementById('vFrom').value||null,
      validTo:document.getElementById('vTo').value||null,
      active:true
    });
    closeModal('voucherModal');
    renderVoucherMgrList();
    showToast('✅ Voucher dibuat!');
  } catch(e) {
    console.error('saveVoucher error:',e);
    showToast('❌ Gagal simpan: '+e.message,'error');
  }
}
function openVoucherMgr(){renderVoucherMgrList();document.getElementById('voucherMgrModal').classList.add('active');}
function renderVoucherMgrList(){const el=document.getElementById('voucherMgrList');if(!el)return;const vouchers=DB.getVouchers();if(!vouchers.length){el.innerHTML='<p class="empty-msg">Belum ada voucher</p>';return;}el.innerHTML=`<table class="data-table"><thead><tr><th>Kode</th><th>Nama</th><th>Diskon</th><th>Min. Belanja</th><th>Terpakai</th><th>Berlaku</th><th>Status</th><th></th></tr></thead><tbody>${vouchers.map(v=>{const disc=v.type==='percent'?`${v.value}%`:formatCurrency(v.value),exp=v.validTo&&new Date(v.validTo)<new Date(),statusLabel=!v.active?'❌ Nonaktif':exp?'⌛ Kadaluarsa':(v.maxUse&&v.usedCount>=v.maxUse)?'🈵 Habis':'✅ Aktif';return`<tr><td><strong>${v.code}</strong></td><td>${v.name||'-'}</td><td>${disc}</td><td>${v.minOrder?formatCurrency(v.minOrder):'-'}</td><td>${v.usedCount||0}${v.maxUse?'/'+v.maxUse:''}</td><td>${v.validTo?new Date(v.validTo).toLocaleDateString('id-ID'):'∞'}</td><td>${statusLabel}</td><td><button class="btn-sm ${v.active?'red':'green'}" onclick="toggleVoucher('${v.id}',${!v.active})">${v.active?'Nonaktifkan':'Aktifkan'}</button><button class="btn-sm red" onclick="deleteVoucherItem('${v.id}')">🗑</button></td></tr>`;}).join('')}</tbody></table>`;}
function toggleVoucher(id,active){DB.updateVoucher(id,{active});renderVoucherMgrList();showToast(active?'✅ Voucher diaktifkan':'Voucher dinonaktifkan');}
function deleteVoucherItem(id){if(!confirm('Hapus voucher ini?'))return;DB.deleteVoucher(id);renderVoucherMgrList();}

// ─── PENGELUARAN ──────────────────────────────────────────────────────────────
function renderExpenses(){const period=document.getElementById('expensePeriod')?.value||'month',catFilter=document.getElementById('expenseCatFilter')?.value||'';let expenses=DB.getExpenses();const now=new Date();if(period==='today'){const d=new Date();d.setHours(0,0,0,0);expenses=expenses.filter(e=>new Date(e.createdAt)>=d);}else if(period==='week'){const d=new Date(now);d.setDate(d.getDate()-7);d.setHours(0,0,0,0);expenses=expenses.filter(e=>new Date(e.createdAt)>=d);}else if(period==='month'){const d=new Date(now);d.setDate(d.getDate()-30);d.setHours(0,0,0,0);expenses=expenses.filter(e=>new Date(e.createdAt)>=d);}if(catFilter)expenses=expenses.filter(e=>e.category===catFilter);const catSel=document.getElementById('expenseCatFilter');if(catSel&&catSel.options.length===1){DB.getExpenseCategories().forEach(cat=>{const o=document.createElement('option');o.value=cat;o.textContent=cat;catSel.appendChild(o);});}const total=expenses.reduce((s,e)=>s+e.amount,0),byCat={};expenses.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+e.amount;});const sumEl=document.getElementById('expenseSummary');if(sumEl)sumEl.innerHTML=`<div class="expense-summary-cards"><div class="exp-card total"><div class="exp-icon">📋</div><div class="exp-val">${formatCurrency(total)}</div><div class="exp-lbl">Total Pengeluaran</div></div><div class="exp-card count"><div class="exp-icon">📝</div><div class="exp-val">${expenses.length}</div><div class="exp-lbl">Jumlah Transaksi</div></div>${Object.entries(byCat).slice(0,2).map(([k,v])=>`<div class="exp-card"><div class="exp-icon">📂</div><div class="exp-val">${formatCurrencyShort(v)}</div><div class="exp-lbl">${k}</div></div>`).join('')}</div>`;const el=document.getElementById('expenseList');if(!el)return;if(!expenses.length){el.innerHTML='<p class="empty-msg">Tidak ada pengeluaran</p>';return;}el.innerHTML=`<table class="data-table"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Dibayar Oleh</th><th>Jumlah</th><th></th></tr></thead><tbody>${expenses.map(e=>`<tr><td>${new Date(e.createdAt).toLocaleDateString('id-ID')}</td><td><span class="cat-badge">${e.category}</span></td><td>${e.description}</td><td>${e.paidBy||'-'}</td><td><strong>${formatCurrency(e.amount)}</strong></td><td><button class="btn-sm red" onclick="deleteExpenseItem('${e.id}')">🗑</button></td></tr>`).join('')}</tbody></table>`;}
function openExpenseModal(){['expDesc','expAmount','expPaid'].forEach(id=>document.getElementById(id).value='');document.getElementById('expDate').value=new Date().toISOString().split('T')[0];document.getElementById('expenseModal').classList.add('active');}
function saveExpense(){
  try {
    const desc=document.getElementById('expDesc').value.trim();
    const amount=parseFloat(document.getElementById('expAmount').value)||0;
    if(!desc||!amount){showToast('Keterangan dan jumlah wajib!','error');return;}
    const category=document.getElementById('expCat').value;
    const paidBy=document.getElementById('expPaid').value.trim();
    const date=document.getElementById('expDate').value;
    DB.addExpense({category,description:desc,amount,paidBy,date});
    closeModal('expenseModal');
    renderExpenses();
    showToast('✅ Pengeluaran dicatat!');
  } catch(e) {
    console.error('saveExpense error:',e);
    showToast('❌ Gagal simpan: '+e.message,'error');
  }
}
function deleteExpenseItem(id){if(!confirm('Hapus?'))return;DB.deleteExpense(id);renderExpenses();}

// ─── PURCHASE ORDER ───────────────────────────────────────────────────────────
let currentPOTab='all';
function renderPOList(){let pos=DB.getPurchases();if(currentPOTab!=='all')pos=pos.filter(p=>p.status===currentPOTab);const el=document.getElementById('poList');if(!pos.length){el.innerHTML='<p class="empty-msg">Belum ada Purchase Order</p>';return;}el.innerHTML=pos.map(po=>{const statusIcon=po.status==='pending'?'⏳':po.status==='received'?'✅':'❌',statusColor=po.status==='pending'?'warning':po.status==='received'?'green':'red';return`<div class="po-card"><div class="po-header"><div><div class="po-id">${po.id}</div><div class="po-supplier">🏪 ${po.supplier||'-'} · ${new Date(po.createdAt).toLocaleDateString('id-ID')}</div></div><div class="po-header-right"><span class="stock-badge ${statusColor}">${statusIcon} ${po.status.toUpperCase()}</span>${po.status==='pending'?`<button class="btn-sm green" onclick="receivePO('${po.id}')">✅ Terima Barang</button><button class="btn-sm red" onclick="cancelPO('${po.id}')">❌ Batal</button>`:''}</div></div><div class="po-items">${po.items.map(i=>`<div class="po-item-row"><span>${i.productName}</span><span>${i.qty} pcs × ${formatCurrency(i.price)} = <strong>${formatCurrency(i.qty*i.price)}</strong></span></div>`).join('')}</div><div class="po-footer"><span>${po.notes||''}</span><strong>Total: ${formatCurrency(po.total)}</strong></div></div>`;}).join('');}
function switchPOTab(tab){currentPOTab=tab;document.querySelectorAll('.po-filter-tabs .htab').forEach(b=>b.classList.remove('active'));document.getElementById('ptab-'+tab).classList.add('active');renderPOList();}
function openPOModal(){document.getElementById('poSupplier').value='';document.getElementById('poDate').value=new Date().toISOString().split('T')[0];document.getElementById('poNotes').value='';document.getElementById('poItemsContainer').innerHTML='';document.getElementById('poTotalDisplay').textContent='Rp 0';addPOItem();document.getElementById('poModal').classList.add('active');}
function addPOItem(){const products=DB.getProducts(),opts=products.map(p=>`<option value="${p.id}" data-price="${p.modal||p.price}">${p.name} (Stok: ${p.stock})</option>`).join(''),row=document.createElement('div');row.className='po-item-input-row';row.innerHTML=`<select class="po-prod-sel" onchange="updatePOTotal()">${opts}</select><input type="number" class="po-qty-input" value="1" min="1" oninput="updatePOTotal()" style="width:70px"><input type="number" class="po-price-input" placeholder="Harga beli" oninput="updatePOTotal()" style="width:110px"><button type="button" class="btn-sm red" onclick="this.parentElement.remove();updatePOTotal()">✕</button>`;row.querySelector('.po-prod-sel').addEventListener('change',function(){row.querySelector('.po-price-input').value=this.options[this.selectedIndex].dataset.price||'';updatePOTotal();});row.querySelector('.po-price-input').value=products[0]?.modal||products[0]?.price||'';document.getElementById('poItemsContainer').appendChild(row);updatePOTotal();}
function updatePOTotal(){let total=0;document.querySelectorAll('.po-item-input-row').forEach(row=>{total+=(parseInt(row.querySelector('.po-qty-input').value)||0)*(parseFloat(row.querySelector('.po-price-input').value)||0);});document.getElementById('poTotalDisplay').textContent=formatCurrency(total);}
function savePO(){
  try {
    const rows=document.querySelectorAll('.po-item-input-row');
    const products=DB.getProducts();
    const items=[];
    let total=0;
    rows.forEach(row=>{
      const productId=row.querySelector('.po-prod-sel').value;
      const qty=parseInt(row.querySelector('.po-qty-input').value)||0;
      const price=parseFloat(row.querySelector('.po-price-input').value)||0;
      if(!productId||!qty)return;
      const prod=products.find(p=>p.id===productId);
      items.push({productId,productName:prod?.name||'-',qty,price});
      total+=qty*price;
    });
    if(!items.length){showToast('Tambahkan minimal 1 produk!','error');return;}
    DB.addPurchase({
      supplier:document.getElementById('poSupplier').value.trim(),
      date:document.getElementById('poDate').value,
      notes:document.getElementById('poNotes').value.trim(),
      items,total
    });
    closeModal('poModal');
    renderPOList();
    showToast('✅ Purchase Order dibuat!');
  } catch(e) {
    console.error('savePO error:',e);
    showToast('❌ Gagal simpan: '+e.message,'error');
  }
}
function receivePO(id){if(!confirm('Konfirmasi terima barang? Stok akan otomatis bertambah.'))return;DB.receivePurchase(id);renderPOList();showToast('✅ Barang diterima! Stok diperbarui.');}
function cancelPO(id){if(!confirm('Batalkan PO ini?'))return;DB.cancelPurchase(id);renderPOList();showToast('PO dibatalkan');}

// ─── SHIFT ────────────────────────────────────────────────────────────────────
function renderShiftTab(){const activeShift=DB.getActiveShift(),cardEl=document.getElementById('shiftCurrentCard'),histEl=document.getElementById('shiftHistoryList');if(activeShift){const opened=new Date(activeShift.openedAt),duration=Math.floor((Date.now()-opened)/60000),hrs=Math.floor(duration/60),mins=duration%60,shiftTrx=DB.getTransactions().filter(t=>new Date(t.createdAt)>=opened),revenue=shiftTrx.reduce((s,t)=>s+t.total,0);cardEl.innerHTML=`<div class="shift-active-card"><div class="shift-active-header"><div><div class="shift-status-dot"></div><span>Shift Sedang Berjalan</span></div><button class="btn-primary" onclick="openShiftCloseModal()">🔒 Tutup Shift</button></div><div class="shift-active-stats"><div><span>Kasir</span><strong>${activeShift.cashierName}</strong></div><div><span>Mulai</span><strong>${opened.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</strong></div><div><span>Durasi</span><strong>${hrs}j ${mins}m</strong></div><div><span>Kas Awal</span><strong>${formatCurrency(activeShift.openingCash)}</strong></div><div><span>Transaksi</span><strong>${shiftTrx.length}</strong></div><div><span>Omzet</span><strong>${formatCurrency(revenue)}</strong></div></div></div>`;}else{cardEl.innerHTML=`<div class="shift-closed-card"><div class="shift-closed-icon">⏸️</div><p>Tidak ada shift aktif saat ini</p><button class="btn-primary" onclick="document.getElementById('shiftOpenModal').classList.add('active')">▶️ Buka Shift Baru</button></div>`;}const history=DB.getShifts().filter(s=>s.status==='closed').slice(0,10);histEl.innerHTML=history.length?`<h3 style="margin:16px 0 10px;font-size:14px;font-weight:800">📜 Riwayat Shift</h3>${history.map(s=>`<div class="shift-history-row"><div><strong>${s.cashierName}</strong> · ${new Date(s.openedAt).toLocaleDateString('id-ID')}</div><div class="shift-history-detail"><span>🕐 ${new Date(s.openedAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})} – ${s.closedAt?new Date(s.closedAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'-'}</span><span>📦 ${s.trxCount||0} transaksi</span><span>💰 ${formatCurrency(s.revenue||0)}</span><span>💵 Kas: ${formatCurrency(s.closingCash||0)}</span></div></div>`).join('')}`:'<p class="empty-msg" style="margin-top:12px">Belum ada riwayat shift</p>';updateShiftIndicator();}
function updateShiftIndicator(){const el=document.getElementById('shiftIndicator');if(!el)return;const active=DB.getActiveShift();el.innerHTML=active?`<span class="shift-dot active"></span>Shift Aktif`:`<span class="shift-dot"></span>Shift Tutup`;el.className='shift-indicator '+(active?'active':'inactive');}
function doOpenShift(){const cash=parseFloat(document.getElementById('shiftOpenCash').value)||0;if(!state.currentCashier)return;DB.openShift(state.currentCashier.id,state.currentCashier.name,cash);closeModal('shiftOpenModal');renderShiftTab();showToast('▶️ Shift dibuka!');}
function openShiftCloseModal(){const active=DB.getActiveShift();if(!active)return;const shiftTrx=DB.getTransactions().filter(t=>new Date(t.createdAt)>=new Date(active.openedAt)),revenue=shiftTrx.reduce((s,t)=>s+t.total,0);document.getElementById('shiftCloseInfo').innerHTML=`<div class="shift-close-summary"><div><span>Kas Awal</span><strong>${formatCurrency(active.openingCash)}</strong></div><div><span>Total Transaksi</span><strong>${shiftTrx.length}</strong></div><div><span>Omzet Shift</span><strong>${formatCurrency(revenue)}</strong></div><div><span>Kas Prediksi</span><strong>${formatCurrency(active.openingCash+revenue)}</strong></div></div>`;document.getElementById('shiftCloseCash').value='';document.getElementById('shiftCloseNote').value='';document.getElementById('shiftCloseModal').classList.add('active');}
function doCloseShift(){const active=DB.getActiveShift();if(!active)return;const closingCash=parseFloat(document.getElementById('shiftCloseCash').value)||0,notes=document.getElementById('shiftCloseNote').value.trim();DB.closeShift(active.id,closingCash,notes);closeModal('shiftCloseModal');renderShiftTab();printShiftReport(active.id);showToast('🔒 Shift ditutup!');}
function printShiftReport(shiftId){const shift=DB.getShifts().find(s=>s.id===shiftId);if(!shift)return;const s=DB.getSettings(),win=window.open('','_blank');win.document.write(`<html><head><title>Laporan Shift</title><style>body{font-family:monospace;font-size:13px;padding:20px;max-width:400px;margin:auto}h2{text-align:center}table{width:100%}td{padding:3px 0}td:last-child{text-align:right;font-weight:bold}hr{border:1px dashed #999}</style></head><body><h2>${s.storeName}</h2><p style="text-align:center">${s.address}</p><hr><h3 style="text-align:center">LAPORAN SHIFT</h3><table><tr><td>Kasir</td><td>${shift.cashierName}</td></tr><tr><td>Buka</td><td>${new Date(shift.openedAt).toLocaleString('id-ID')}</td></tr><tr><td>Tutup</td><td>${new Date(shift.closedAt).toLocaleString('id-ID')}</td></tr><tr><td>Kas Awal</td><td>${formatCurrency(shift.openingCash)}</td></tr><tr><td>Total Transaksi</td><td>${shift.trxCount}</td></tr><tr><td>Omzet</td><td>${formatCurrency(shift.revenue)}</td></tr><tr><td>Kas Akhir</td><td>${formatCurrency(shift.closingCash)}</td></tr>${shift.notes?`<tr><td>Catatan</td><td>${shift.notes}</td></tr>`:''}</table><hr><p style="text-align:center">Dicetak: ${new Date().toLocaleString('id-ID')}</p></body></html>`);win.document.close();win.print();}

// ─── BARCODE SCANNER ──────────────────────────────────────────────────────────
let scannerStream=null,scannerInterval=null;
function openBarcodeScanner(){document.getElementById('barcodeModal').classList.add('active');startCamera();}
async function startCamera(){const video=document.getElementById('scannerVideo'),status=document.getElementById('scannerStatus');try{scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});video.srcObject=scannerStream;status.textContent='📷 Kamera aktif — arahkan ke barcode';status.style.color='var(--success)';if('BarcodeDetector'in window){const detector=new BarcodeDetector({formats:['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e']});scannerInterval=setInterval(async()=>{try{const barcodes=await detector.detect(video);if(barcodes.length>0){handleScannedCode(barcodes[0].rawValue);}}catch(e){}},500);}else{status.textContent='⚠️ Browser tidak support auto-scan. Gunakan input manual.';status.style.color='var(--warning)';}}catch(e){status.textContent='❌ Kamera tidak bisa diakses. Gunakan input manual.';status.style.color='var(--danger)';}}
function closeBarcodeScanner(){if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop());scannerStream=null;}if(scannerInterval){clearInterval(scannerInterval);scannerInterval=null;}document.getElementById('barcodeModal').classList.remove('active');}
function handleScannedCode(code){closeBarcodeScanner();const products=DB.getProducts(),found=products.find(p=>p.code===code||p.name.toLowerCase()===code.toLowerCase());if(found){addToCart(found.id);showToast('✅ '+found.name+' ditambahkan!');}else{document.getElementById('searchProduk').value=code;filterProducts();showToast('Produk dengan kode '+code+' tidak ditemukan','warning');}}
function searchByBarcode(){const code=document.getElementById('manualBarcode').value.trim();if(!code)return;handleScannedCode(code);document.getElementById('manualBarcode').value='';}

// ─── RETUR / REFUND ───────────────────────────────────────────────────────────
function openReturModal(){document.getElementById('returTrxId').value='';document.getElementById('returTrxInfo').style.display='none';document.getElementById('returItemsContainer').style.display='none';document.getElementById('returSubmitBtn').style.display='none';document.getElementById('returModal').classList.add('active');}
function findReturTransaction(){const idInput=document.getElementById('returTrxId').value.trim().toUpperCase(),trx=DB.getTransactions().find(t=>t.id===idInput||('#'+t.id)===idInput||t.id.includes(idInput)),infoEl=document.getElementById('returTrxInfo'),itemsEl=document.getElementById('returItemsContainer');if(!trx){infoEl.innerHTML='<p style="color:var(--danger);font-size:13px">❌ Transaksi tidak ditemukan</p>';infoEl.style.display='block';itemsEl.style.display='none';document.getElementById('returSubmitBtn').style.display='none';return;}infoEl.innerHTML=`<div class="retur-trx-info"><span>✅ Transaksi #${trx.id}</span><span>${new Date(trx.createdAt).toLocaleDateString('id-ID')}</span><span>Kasir: ${trx.cashier}</span><span>Total: ${formatCurrency(trx.total)}</span></div>`;infoEl.style.display='block';document.getElementById('returItemsList').innerHTML=trx.items.map((item,i)=>`<div class="retur-item-row"><input type="checkbox" id="rchk${i}" value="${i}"><label for="rchk${i}">${item.emoji||'📦'} ${item.name} × ${item.qty} — ${formatCurrency(item.price*item.qty)}</label><input type="number" class="retur-qty" min="1" max="${item.qty}" value="${item.qty}" style="width:60px"></div>`).join('');itemsEl.style.display='block';document.getElementById('returSubmitBtn').style.display='inline-flex';window._returTrx=trx;}
function saveRetur(){const trx=window._returTrx;if(!trx)return;const checkboxes=document.querySelectorAll('#returItemsList input[type=checkbox]:checked');if(!checkboxes.length){showToast('Pilih item yang diretur!','error');return;}const rows=document.querySelectorAll('.retur-item-row'),items=[];checkboxes.forEach(cb=>{const i=parseInt(cb.value),qty=parseInt(rows[i].querySelector('.retur-qty').value)||1,orig=trx.items[i];items.push({productId:orig.id,productName:orig.name,qty,price:orig.price,subtotal:orig.price*qty});});const refundTotal=items.reduce((s,i)=>s+i.subtotal,0);DB.addReturn({originalTrxId:trx.id,items,refundTotal,reason:document.getElementById('returReason').value.trim(),refundMethod:document.getElementById('returRefund').value,cashier:state.currentCashier?.name||'-'});closeModal('returModal');showToast(`✅ Retur diproses! Refund ${formatCurrency(refundTotal)}`);}

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  loadTheme();
  state.currentTransactionId = DB.getNextTransactionId();
  var transEl = document.getElementById('transId');
  if (transEl) transEl.textContent = '#' + state.currentTransactionId;
  renderProductGrid();
  renderCategories();
  generateQuickCash(0);
  checkLowStock();
  setInterval(checkStockAlert, 60000);

  // Restore session setelah reload
  var sid = localStorage.getItem('kasirpro_session');
  if (sid) {
    var list = DB.getCashiers();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === sid) {
        applyLogin(list[i]);
        break;
      }
    }
  }
})
