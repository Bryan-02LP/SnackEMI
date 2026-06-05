/* ════════════════════════════════════════════════════════════
   SNACK EMI — app.js  (versión con API real)
════════════════════════════════════════════════════════════ */

/* ── ESTADO GLOBAL ── */
const APP = {
  currentUser: null,
  isAdmin:     false,
  cart:        [],
  products:    [],
  orders:      [],
  currentDetail: null,
  splashStep:  0,
  prevScreen:  'home-screen',
  token:       null,
};

const API = '/api';  // base URL del backend Node.js

const CATEGORIES = [
  { icon: '🍔', label: 'Comidas', key: 'Comidas' },
  { icon: '🥤', label: 'Bebidas', key: 'Bebidas' },
  { icon: '🍟', label: 'Snacks',  key: 'Snacks'  },
  { icon: '🍬', label: 'Dulces',  key: 'Dulces'  },
  { icon: '🍊', label: 'Jugos',   key: 'Jugos'   },
  { icon: '🛒', label: 'Otros',   key: 'Otros'   },
];

/* ════════════════════════════════════════════════════════════
   HELPERS API
════════════════════════════════════════════════════════════ */
async function apiGet(url) {
  const res = await fetch(API + url, {
    headers: APP.token ? { Authorization: `Bearer ${APP.token}` } : {},
  });
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(API + url, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(APP.token ? { Authorization: `Bearer ${APP.token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiPut(url, body) {
  const res = await fetch(API + url, {
    method:  'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${APP.token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiDelete(url) {
  const res = await fetch(API + url, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${APP.token}` },
  });
  return res.json();
}

// Para subir archivos (multipart/form-data)
async function apiUpload(url, formData) {
  const res = await fetch(API + url, {
    method:  'POST',
    headers: { Authorization: `Bearer ${APP.token}` },
    body:    formData,
  });
  return res.json();
}

async function apiPutUpload(url, formData) {
  const res = await fetch(API + url, {
    method:  'PUT',
    headers: { Authorization: `Bearer ${APP.token}` },
    body:    formData,
  });
  return res.json();
}

/* ════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Ocultar todo al inicio
  document.getElementById('splash-screen').classList.remove('active');
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('student-app').classList.add('hidden');
  document.getElementById('admin-app').classList.add('hidden');

  const saved = localStorage.getItem('snack_emi_session');
  if (saved) {
    try {
      const session = JSON.parse(saved);
      // Verificar que el token no sea muy viejo (24h)
      APP.currentUser = session.user;
      APP.token       = session.token;
      APP.isAdmin     = ['admin','encargado'].includes(session.user.role);
      APP.isAdmin ? launchAdmin() : launchStudent();
    } catch(e) {
      localStorage.removeItem('snack_emi_session');
      document.getElementById('splash-screen').classList.add('active');
    }
  } else {
    document.getElementById('splash-screen').classList.add('active');
  }
  loadLogo();
});

/* ── Cargar logo EMI desde Cloudinary ── */
async function loadLogo() {
  try {
    const data = await apiGet('/productos/logo/url');
    if (data.success && data.url) {
      document.querySelectorAll('.emi-logo, .emi-logo-sm, .emi-logo-admin, .header-logo')
        .forEach(img => {
          img.src = data.url;
          img.style.display = 'block';
          const ph = img.nextElementSibling;
          if (ph) ph.style.display = 'none';
        });
    }
  } catch { /* logo placeholder se muestra igual */ }
}

/* ════════════════════════════════════════════════════════════
   SPLASH
════════════════════════════════════════════════════════════ */
document.getElementById('btn-splash-next').addEventListener('click', () => {
  const slides = document.querySelectorAll('.splash-slide');
  const dots   = document.querySelectorAll('.dot');
  slides[APP.splashStep].classList.remove('active');
  dots[APP.splashStep].classList.remove('active');
  APP.splashStep++;
  if (APP.splashStep >= slides.length) { goToAuth(); return; }
  slides[APP.splashStep].classList.add('active');
  dots[APP.splashStep].classList.add('active');
  if (APP.splashStep === slides.length - 1)
    document.getElementById('btn-splash-next').textContent = 'Comenzar →';
});
document.getElementById('btn-splash-skip').addEventListener('click', goToAuth);

function goToAuth() {
  document.getElementById('splash-screen').classList.remove('active');
  document.getElementById('auth-screen').classList.remove('hidden');
}

/* ════════════════════════════════════════════════════════════
   AUTH
════════════════════════════════════════════════════════════ */
function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab==='login');
  document.getElementById('tab-register').classList.toggle('active', tab==='register');
  document.getElementById('login-form').classList.toggle('active', tab==='login');
  document.getElementById('register-form').classList.toggle('active', tab==='register');
}

async function handleLogin(e) {
  e.preventDefault();
  const saga = document.getElementById('login-saga').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!saga || !pass) { showToast('Completa todos los campos', 'error'); return; }

  showToast('Iniciando sesión...', '');
  const data = await apiPost('/auth/login', { saga, password: pass });
  if (!data.success) { showToast(data.error || 'Error al iniciar sesión', 'error'); return; }

  saveSession(data);
  document.getElementById('auth-screen').classList.add('hidden');
  launchStudent();
  showToast(`Bienvenido, ${data.user.name.split(' ')[0]} 👋`, 'success');
}

async function handleRegister(e) {
  e.preventDefault();
  const name  = document.getElementById('reg-name').value.trim();
  const ci    = document.getElementById('reg-ci').value.trim();
  const saga  = document.getElementById('reg-saga').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;

  if (!name || !ci || !saga || !pass || !pass2) { showToast('Completa todos los campos', 'error'); return; }
  if (pass !== pass2) { showToast('Las contraseñas no coinciden', 'error'); return; }

  showToast('Creando cuenta...', '');
  const data = await apiPost('/auth/register', { name, ci, saga, password: pass });
  if (!data.success) { showToast(data.error || 'Error al registrarse', 'error'); return; }

  saveSession(data);
  document.getElementById('auth-screen').classList.add('hidden');
  launchStudent();
  showToast('¡Cuenta creada exitosamente! 🎉', 'success');
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const usuario     = document.getElementById('admin-user').value.trim();
  const codigoAdmin = document.getElementById('admin-code').value;

  showToast('Verificando...', '');
  const data = await apiPost('/auth/admin-login', { usuario, codigoAdmin });
  if (!data.success) { showToast(data.error || 'Credenciales incorrectas', 'error'); return; }

  saveSession(data);
  APP.isAdmin = true;
  closeModal('admin-login-modal');
  document.getElementById('auth-screen').classList.add('hidden');
  launchAdmin();
  showToast('Bienvenido, Admin 🔐', 'success');
}

function saveSession(data) {
  APP.token       = data.token;
  APP.currentUser = data.user;
  APP.isAdmin     = ['admin','encargado'].includes(data.user.role);
  localStorage.setItem('snack_emi_session', JSON.stringify({ token: data.token, user: data.user }));
}

function togglePass(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}
function showAdminLogin() {
  document.getElementById('admin-login-modal').classList.remove('hidden');
}

/* ════════════════════════════════════════════════════════════
   LAUNCH
════════════════════════════════════════════════════════════ */
async function launchStudent() {
  const u = APP.currentUser;
  document.getElementById('student-app').classList.remove('hidden');

  const hour   = new Date().getHours();
  const greet  = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const first  = u.name.split(' ')[0];
  document.getElementById('greeting-text').textContent = `${greet}, ${first} 👋`;

  const initials = u.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  document.getElementById('user-avatar').textContent      = initials;
  document.getElementById('profile-avatar-big').textContent = initials;
  document.getElementById('profile-name').textContent    = u.name;
  document.getElementById('profile-saga').textContent    = u.saga;
  document.getElementById('profile-ci').textContent      = u.ci || '—';
  document.getElementById('profile-saga-info').textContent = u.saga;

  await loadProducts();
  renderCategories();
  renderFeaturedProducts();
  renderAllProducts();
  renderCartUI();

  setTimeout(() => {
    document.getElementById('offer-banner').classList.remove('hidden');
    document.getElementById('banner-text').textContent = '¡Salteñas + Jugo = Bs. 12! Solo hoy';
  }, 1500);
}

async function launchAdmin() {
  document.getElementById('admin-app').classList.remove('hidden');
  await loadProducts();
  renderAdminDashboard();
  renderAdminProducts();
  renderAdminOrders('all');
  renderStockTable();
  renderStudentsTable();
  updateDashboardStats();
}

/* ════════════════════════════════════════════════════════════
   CARGAR PRODUCTOS DESDE API
════════════════════════════════════════════════════════════ */
async function loadProducts() {
  try {
    const data = await apiGet('/productos');
    if (data.success) {
      APP.products = data.data.map(p => ({
        id:       p.producto_id,
        name:     p.nombre,
        category: p.categoria,
        price:    parseFloat(p.precio),
        stock:    p.stock_actual,
        minStock: p.stock_minimo,
        status:   p.estado,
        img:      p.imagen_ruta,   // URL de Cloudinary
        desc:     p.descripcion,
        featured: p.destacado,
        icon:     p.icono,
      }));
    }
  } catch (e) {
    console.error('Error cargando productos:', e);
    showToast('Error al cargar productos', 'error');
  }
}

/* ════════════════════════════════════════════════════════════
   RENDER — ESTUDIANTE
════════════════════════════════════════════════════════════ */
function renderCategories() {
  const c = document.getElementById('categories-row');
  c.innerHTML = CATEGORIES.map(cat => `
    <div class="category-chip" onclick="filterByCategory('${cat.key}')">
      <span class="cat-icon">${cat.icon}</span>
      <span class="cat-label">${cat.label}</span>
    </div>`).join('');
}

function filterByCategory(cat) {
  document.querySelectorAll('.category-chip').forEach(el =>
    el.classList.toggle('active', el.querySelector('.cat-label').textContent === cat));
  showScreen('catalog-screen');
  renderCatalog(cat);
}

function renderFeaturedProducts() {
  const activos = APP.products.filter(p => p.status === 'activo');
  const list    = activos.filter(p => p.featured).slice(0, 4);
  const show    = list.length ? list : activos.slice(0, 4);
  document.getElementById('featured-products').innerHTML = show.map(productCardHTML).join('');
}

function renderAllProducts(filter = '') {
  const list = APP.products.filter(p =>
    (p.status === 'activo') &&
    (!filter || p.name.toLowerCase().includes(filter.toLowerCase()))
  );
  document.getElementById('all-products').innerHTML = list.map(productRowHTML).join('');
}

function renderCatalog(categoryFilter = '') {
  document.getElementById('filter-row').innerHTML = `
    <div class="categories-row">
      <div class="category-chip ${!categoryFilter?'active':''}" onclick="renderCatalog('')">
        <span class="cat-icon">🍽</span><span class="cat-label">Todo</span>
      </div>
      ${CATEGORIES.map(c => `
        <div class="category-chip ${categoryFilter===c.key?'active':''}" onclick="renderCatalog('${c.key}')">
          <span class="cat-icon">${c.icon}</span><span class="cat-label">${c.label}</span>
        </div>`).join('')}
    </div>`;

  const filtered = APP.products.filter(p => p.status === 'activo' && (!categoryFilter || p.category === categoryFilter));
  document.getElementById('catalog-products').innerHTML = filtered.length
    ? filtered.map(productCardHTML).join('')
    : `<div class="empty-cart"><div class="empty-icon">🔍</div><h4>Sin productos</h4></div>`;
}

function productCardHTML(p) {
  const si = getStockInfo(p);
  return `
    <div class="product-card" onclick="showProductDetail(${p.id})">
      <div class="product-img-wrap">
        ${p.img
          ? `<img src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />`
          : ''}
        <div class="product-img-placeholder" ${p.img?'style="display:none"':''}>
          <span>${getCatIcon(p.category)}</span><small>sin imagen</small>
        </div>
      </div>
      <div class="product-info">
        <span class="stock-badge ${si.class}">${si.label}</span>
        <div class="product-name">${p.name}</div>
        <div class="product-price">Bs. ${p.price.toFixed(2)}</div>
      </div>
      ${p.status !== 'agotado'
        ? `<button class="add-to-cart-btn" onclick="event.stopPropagation();addToCart(${p.id})">+</button>`
        : ''}
    </div>`;
}

function productRowHTML(p) {
  const si = getStockInfo(p);
  return `
    <div class="product-row" onclick="showProductDetail(${p.id})">
      <div class="product-row-img">
        ${p.img
          ? `<img src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'" />`
          : `<div class="product-img-placeholder">${getCatIcon(p.category)}</div>`}
      </div>
      <div class="product-row-info">
        <div class="product-name">${p.name}</div>
        <span class="stock-badge ${si.class}">${si.label}</span>
      </div>
      <div class="product-row-actions">
        <div class="product-price">Bs. ${p.price.toFixed(2)}</div>
        ${p.status !== 'agotado'
          ? `<button class="add-to-cart-btn" onclick="event.stopPropagation();addToCart(${p.id})" style="position:static;width:30px;height:30px;border-radius:50%">+</button>`
          : ''}
      </div>
    </div>`;
}

function showProductDetail(id) {
  const p = APP.products.find(x => x.id === id);
  if (!p) return;
  APP.currentDetail = p;
  const si = getStockInfo(p);

  document.getElementById('product-detail-content').innerHTML = `
    <div class="detail-img-wrap">
      ${p.img
        ? `<img src="${p.img}" alt="${p.name}" loading="lazy" />`
        : `<div class="product-img-placeholder" style="height:100%;font-size:4rem">${getCatIcon(p.category)}</div>`}
      <button class="detail-back" onclick="goBack()">←</button>
    </div>
    <div class="detail-body">
      <div class="detail-cat">${p.category}</div>
      <div class="detail-title">${p.name}</div>
      <span class="stock-badge ${si.class}" style="margin-bottom:10px">${si.label}</span>
      <div class="detail-price">Bs. ${p.price.toFixed(2)}</div>
      <div class="detail-desc">${p.desc || ''}</div>
      ${p.status !== 'agotado' ? `
        <div class="detail-qty-row">
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="changeDetailQty(-1)">−</button>
            <span class="qty-num" id="detail-qty">1</span>
            <button class="qty-btn" onclick="changeDetailQty(1)">+</button>
          </div>
          <button class="btn-primary detail-add-btn" onclick="addToCartFromDetail()">
            Agregar al carrito 🛒
          </button>
        </div>` : `
        <div style="padding:14px;background:var(--red-pale);border-radius:12px;color:var(--red);font-weight:600;text-align:center">
          😔 Producto agotado
        </div>`}
    </div>`;

  APP.prevScreen = document.querySelector('.app-screen.active')?.id || 'home-screen';
  showScreen('detail-screen');
}

function changeDetailQty(delta) {
  const el = document.getElementById('detail-qty');
  let q = parseInt(el.textContent) + delta;
  if (q < 1) q = 1;
  if (APP.currentDetail && q > APP.currentDetail.stock) q = APP.currentDetail.stock;
  el.textContent = q;
}
function addToCartFromDetail() {
  const qty = parseInt(document.getElementById('detail-qty')?.textContent || '1');
  addToCart(APP.currentDetail.id, qty);
}
function filterProducts() {
  renderAllProducts(document.getElementById('search-input').value);
}

/* ════════════════════════════════════════════════════════════
   CART
════════════════════════════════════════════════════════════ */
function addToCart(productId, qty = 1) {
  const p = APP.products.find(x => x.id === productId);
  if (!p || p.status === 'agotado') { showToast('Producto no disponible', 'error'); return; }
  const ex = APP.cart.find(i => i.id === productId);
  if (ex) ex.qty = Math.min(ex.qty + qty, p.stock);
  else APP.cart.push({ id: p.id, name: p.name, price: p.price, img: p.img, qty, max: p.stock });
  renderCartUI();
  showToast(`${p.name} agregado 🛒`, 'success');
}
function removeFromCart(id) { APP.cart = APP.cart.filter(i => i.id !== id); renderCartUI(); }
function changeCartQty(id, delta) {
  const item = APP.cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { removeFromCart(id); return; }
  if (item.qty > item.max) item.qty = item.max;
  renderCartUI();
}
function clearCart() { APP.cart = []; renderCartUI(); showToast('Carrito vaciado', 'warning'); }
function getCartTotal() { return APP.cart.reduce((s,i) => s + i.price*i.qty, 0); }

function renderCartUI() {
  const total = getCartTotal();
  const count = APP.cart.reduce((s,i) => s+i.qty, 0);
  ['cart-badge','nav-cart-badge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  });
  const container = document.getElementById('cart-items');
  const footer    = document.getElementById('cart-footer');
  if (!container) return;

  if (!APP.cart.length) {
    container.innerHTML = `<div class="empty-cart"><div class="empty-icon">🛒</div><h4>Tu carrito está vacío</h4><p>Agrega productos desde el menú</p></div>`;
    if (footer) footer.style.display = 'none';
    return;
  }
  container.innerHTML = APP.cart.map(item => `
    <div class="cart-item">
      ${item.img
        ? `<img class="cart-item-img" src="${item.img}" alt="${item.name}" loading="lazy" onerror="this.style.background='var(--gray-50)'" />`
        : `<div class="cart-item-img" style="background:var(--gray-50);display:flex;align-items:center;justify-content:center;font-size:1.5rem">${getCatIcon('')}</div>`}
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">Bs. ${item.price.toFixed(2)} c/u</div>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" onclick="changeCartQty(${item.id},-1)">−</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button class="cart-qty-btn" onclick="changeCartQty(${item.id},1)">+</button>
          <strong style="margin-left:8px;color:var(--blue)">Bs. ${(item.price*item.qty).toFixed(2)}</strong>
        </div>
      </div>
      <button class="cart-remove" onclick="removeFromCart(${item.id})">🗑</button>
    </div>`).join('');
  if (footer) {
    footer.style.display = 'block';
    document.getElementById('cart-total-amount').textContent = `Bs. ${total.toFixed(2)}`;
  }
}

/* ════════════════════════════════════════════════════════════
   CHECKOUT
════════════════════════════════════════════════════════════ */
function showScreen(screenId) {
  if (screenId === 'checkout-screen') renderCheckout();
  document.querySelectorAll('#student-app .app-screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) { target.classList.add('active'); APP.prevScreen = screenId; }
  if (screenId === 'catalog-screen') renderCatalog();
  if (screenId === 'orders-screen')  loadMyOrders();
}

function renderCheckout() {
  const total = getCartTotal();
  const summary = document.getElementById('checkout-summary');
  if (!summary) return;
  summary.innerHTML = `
    <h4>📋 Resumen del pedido</h4>
    ${APP.cart.map(i => `
      <div class="summary-row">
        <span>${i.name} × ${i.qty}</span>
        <span>Bs. ${(i.price*i.qty).toFixed(2)}</span>
      </div>`).join('')}
    <div class="summary-row"><span>Total</span><span>Bs. ${total.toFixed(2)}</span></div>`;
  document.getElementById('qr-total').textContent = `Bs. ${total.toFixed(2)}`;
}

async function confirmOrder() {
  if (!APP.cart.length) { showToast('El carrito está vacío', 'error'); return; }
  const pickup = document.getElementById('pickup-time')?.value || '10 minutos';
  const notes  = document.getElementById('order-notes')?.value?.trim() || '';
  showToast('Registrando pedido...', '');

  const data = await apiPost('/pedidos', {
    items:         APP.cart.map(i => ({ id: i.id, qty: i.qty })),
    horaRecogida:  pickup,
    metodoPago:    'QR',
    observaciones: notes,
  });

  if (!data.success) { showToast(data.error || 'Error al registrar pedido', 'error'); return; }

  document.getElementById('order-number').textContent  = data.codigo;
  document.getElementById('confirm-pickup').textContent = pickup;
  document.getElementById('confirm-total').textContent  = `Bs. ${data.total.toFixed(2)}`;
  APP.cart = [];
  renderCartUI();
  await loadProducts(); // actualizar stock
  renderFeaturedProducts();
  renderAllProducts();
  showScreen('confirm-screen');
  showToast('¡Pedido enviado! 🎉', 'success');
}

async function loadMyOrders() {
  const container = document.getElementById('my-orders-list');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--gray-300)">Cargando...</div>`;
  const data = await apiGet('/pedidos');
  if (!data.success || !data.data.length) {
    container.innerHTML = `<div class="empty-cart"><div class="empty-icon">📋</div><h4>Sin pedidos aún</h4></div>`;
    return;
  }
  container.innerHTML = data.data.map(o => `
    <div class="order-card">
      <div class="order-card-header">
        <span class="order-num">${o.codigo}</span>
        <span class="order-status status-${o.estado}">${statusLabel(o.estado)}</span>
      </div>
      <div style="font-size:.85rem;color:var(--gray-600);margin-bottom:4px">
        ${o.items?.map(i=>`${i.producto} x${i.cantidad}`).join(', ') || ''}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.85rem">
        <span>⏱ ${o.hora_recogida || '—'}</span>
        <strong>Bs. ${parseFloat(o.total).toFixed(2)}</strong>
      </div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════════
   NAV
════════════════════════════════════════════════════════════ */
function goBack() {
  showScreen(APP.prevScreen === 'detail-screen' ? 'home-screen' : (APP.prevScreen || 'home-screen'));
}
function goHome() { showScreen('home-screen'); setActiveNav(document.querySelector('.nav-item')); }
function setActiveNav(btn) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}
function showProfileMenu() { showScreen('profile-screen'); setActiveNav(null); }
function logout() { localStorage.removeItem('snack_emi_session'); location.reload(); }

/* ════════════════════════════════════════════════════════════
   ADMIN — PANELES
════════════════════════════════════════════════════════════ */
function showAdminPanel(panel) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`admin-${panel}`)?.classList.add('active');
  document.getElementById('admin-panel-title').textContent = panelTitle(panel);
  if (panel === 'settings') renderSettingsPanel();
}
function panelTitle(p) {
  return { dashboard:'Dashboard', products:'Productos', orders:'Pedidos',
           stock:'Inventario', students:'Estudiantes', reports:'Reportes',
           settings:'Configuración' }[p] || p;
}
function setSidebarActive(btn) {
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}
function toggleSidebar() { document.getElementById('admin-sidebar').classList.toggle('open'); }

/* ── Dashboard ── */
async function updateDashboardStats() {
  try {
    const data = await apiGet('/stock/dashboard');
    if (!data.success) return;
    document.getElementById('stat-products').textContent = data.productosActivos;
    document.getElementById('stat-orders').textContent   = data.pedidosHoy;
    document.getElementById('stat-revenue').textContent  = `Bs. ${data.ventasHoy.toFixed(0)}`;
    document.getElementById('stat-lowstock').textContent = data.stockBajo;
  } catch {}
}

async function renderAdminDashboard() {
  await updateDashboardStats();

  // Pedidos recientes
  const tbody = document.getElementById('recent-orders-body');
  if (tbody) {
    const data = await apiGet('/pedidos?estado=');
    const orders = data.data?.slice(0,5) || [];
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>${o.codigo}</strong></td>
        <td>${o.estudiante || o.nombre_completo || '—'}</td>
        <td><strong>Bs. ${parseFloat(o.total).toFixed(2)}</strong></td>
        <td><span class="status-pill pill-${o.estado}">${statusLabel(o.estado)}</span></td>
        <td><button class="action-btn view" onclick="advanceOrderStatus(${o.pedido_id},'${o.estado}')">▶</button></td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray-300)">Sin pedidos hoy</td></tr>';
  }

  // Stock bajo
  const lowList = document.getElementById('low-stock-list');
  if (lowList) {
    const data = await apiGet('/stock');
    const low  = data.alertas || [];
    lowList.innerHTML = low.length
      ? low.map(p => `
          <div class="low-stock-item">
            <span>${p.nombre}</span>
            <span class="stock-num">Stock: ${p.stock_actual} / Mín: ${p.stock_minimo}</span>
          </div>`).join('')
      : '<p style="color:var(--gray-300);text-align:center;padding:12px">✅ Todo el stock está bien</p>';
  }
}

/* ── Products Table ── */
function renderAdminProducts(filter = '') {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;
  const list = APP.products.filter(p =>
    !filter || p.name.toLowerCase().includes(filter.toLowerCase())
  );
  tbody.innerHTML = list.map(p => `
    <tr>
      <td>
        ${p.img
          ? `<img class="table-product-img" src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.style.background='var(--gray-100)'" />`
          : `<div class="table-product-img" style="background:var(--gray-50);display:flex;align-items:center;justify-content:center">${getCatIcon(p.category)}</div>`}
      </td>
      <td><strong>${p.name}</strong></td>
      <td><span class="status-pill" style="background:var(--blue-pale);color:var(--blue)">${p.category}</span></td>
      <td><strong>Bs. ${p.price.toFixed(2)}</strong></td>
      <td><span style="font-weight:700;color:${p.stock<=p.minStock?'var(--red)':'var(--green)'}">${p.stock}</span></td>
      <td><span class="status-pill pill-${p.status}">${statusLabel(p.status)}</span></td>
      <td>
        <div class="action-btns">
          <button class="action-btn edit" onclick="openProductModal(${p.id})" title="Editar">✏️</button>
          <button class="action-btn ${p.status==='inactivo'?'view':'del'}"
            onclick="toggleProductStatus(${p.id},'${p.status}')"
            title="${p.status==='inactivo'?'Habilitar':'Deshabilitar'}">
            ${p.status==='inactivo'?'✅':'🚫'}
          </button>
        </div>
      </td>
    </tr>`).join('');
}
function filterAdminProducts(val) { renderAdminProducts(val); }

/* ── Orders ── */
async function renderAdminOrders(filter) {
  const container = document.getElementById('orders-cards');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--gray-300)">Cargando...</div>`;

  const url  = filter === 'all' ? '/pedidos' : `/pedidos?estado=${filter}`;
  const data = await apiGet(url);
  const list = data.data || [];

  container.innerHTML = list.length
    ? list.map(o => `
        <div class="order-mgmt-card ${o.estado}">
          <div class="order-mgmt-header">
            <span class="order-mgmt-num">${o.codigo}</span>
            <span class="status-pill pill-${o.estado}">${statusLabel(o.estado)}</span>
          </div>
          <div class="order-student">👤 ${o.estudiante || '—'}</div>
          <div class="order-products">${o.items?.map(i=>`${i.producto} x${i.cantidad}`).join(', ') || '—'}</div>
          ${o.observaciones ? `<div style="margin:4px 0;padding:6px 8px;background:var(--yellow-pale);border-radius:6px;font-size:.78rem;color:var(--yellow-dark)">📝 ${o.observaciones}</div>` : ''}
          <div class="order-footer">
            <span class="order-total">Bs. ${parseFloat(o.total).toFixed(2)}</span>
            <div class="order-actions">
              ${o.estado !== 'entregado' ? `
                <button class="order-action-btn advance" onclick="advanceOrderStatus(${o.pedido_id},'${o.estado}')">
                  ▶ ${nextStatusLabel(o.estado)}
                </button>` : '<span style="color:var(--gray-300);font-size:.78rem">✅ Listo</span>'}
            </div>
          </div>
        </div>`).join('')
    : '<p style="text-align:center;color:var(--gray-300);padding:40px">No hay pedidos.</p>';
}

async function advanceOrderStatus(pedidoId, estadoActual) {
  const flow  = ['pendiente','preparando','listo','entregado'];
  const idx   = flow.indexOf(estadoActual);
  if (idx >= flow.length - 1) return;
  const nuevo = flow[idx + 1];
  const data  = await apiPut(`/pedidos/${pedidoId}`, { estado: nuevo });
  if (data.success) {
    showToast(`Pedido → ${statusLabel(nuevo)}`, 'success');
    renderAdminOrders('all');
    renderAdminDashboard();
  } else {
    showToast(data.error || 'Error', 'error');
  }
}

function filterOrders(filter) { renderAdminOrders(filter); }
function setFilterActive(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

/* ── Stock ── */
async function renderStockTable() {
  const tbody = document.getElementById('stock-table-body');
  if (!tbody) return;
  const data = await apiGet('/stock');
  const list = data.data || [];
  tbody.innerHTML = list.map(p => `
    <tr>
      <td><strong>${p.nombre}</strong></td>
      <td><strong style="color:${p.stock_actual<=p.stock_minimo?'var(--red)':'var(--green)'}">${p.stock_actual}</strong></td>
      <td>${p.stock_minimo}</td>
      <td><span class="status-pill ${p.nivel_stock==='ok'?'pill-activo':p.nivel_stock==='bajo'?'pill-pendiente':'pill-agotado'}">${p.nivel_stock==='ok'?'OK':p.nivel_stock==='bajo'?'Bajo':'Crítico'}</span></td>
      <td>
        <div class="stock-adjust">
          <input type="number" id="stock-adj-${p.producto_id}" value="0" min="-100" />
          <button onclick="adjustStock(${p.producto_id})">Actualizar</button>
        </div>
      </td>
    </tr>`).join('');
}

async function adjustStock(productId) {
  const inp    = document.getElementById(`stock-adj-${productId}`);
  const delta  = parseInt(inp?.value) || 0;
  if (delta === 0) { showToast('Ingresa una cantidad distinta de 0', 'error'); return; }
  const data   = await apiPost('/stock/ajustar', { productoId: productId, cantidad: delta, tipo: 'ajuste', motivo: 'Ajuste manual admin' });
  if (data.success) {
    showToast(data.mensaje, 'success');
    await loadProducts();
    renderStockTable();
    renderAdminProducts();
    updateDashboardStats();
  } else {
    showToast(data.error || 'Error', 'error');
  }
}

/* ── Students ── */
function renderStudentsTable() {
  const tbody = document.getElementById('students-table-body');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--gray-300);padding:20px">
    Conecta la tabla de usuarios para ver los estudiantes registrados.</td></tr>`;
}

/* ════════════════════════════════════════════════════════════
   PRODUCT MODAL (Admin CRUD) — con Cloudinary
════════════════════════════════════════════════════════════ */
function openProductModal(productId = null) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  document.getElementById('product-form').reset();
  document.getElementById('product-img-preview').style.display = 'none';
  document.getElementById('img-placeholder').style.display     = 'block';
  document.getElementById('edit-product-id').value = '';
  APP._editingProductId = null;

  if (productId) {
    const p = APP.products.find(x => x.id === productId);
    if (!p) return;
    title.textContent = 'Editar Producto';
    APP._editingProductId = productId;
    document.getElementById('edit-product-id').value = p.id;
    document.getElementById('p-name').value      = p.name;
    document.getElementById('p-category').value  = p.category;
    document.getElementById('p-price').value     = p.price;
    document.getElementById('p-stock').value     = p.stock;
    document.getElementById('p-min-stock').value = p.minStock;
    // Mostrar estado actual incluyendo inactivo
    const statusEl = document.getElementById('p-status');
    if (statusEl) statusEl.value = p.status;
    document.getElementById('p-desc').value      = p.desc || '';

    if (p.img) {
      const preview = document.getElementById('product-img-preview');
      preview.src   = p.img;
      preview.style.display = 'block';
      document.getElementById('img-placeholder').style.display = 'none';
    }
  } else {
    title.textContent = 'Agregar Producto';
  }
  modal.classList.remove('hidden');
}

async function saveProduct(e) {
  e.preventDefault();
  const editId     = document.getElementById('edit-product-id').value;
  const fileInput  = document.getElementById('product-img-input');
  const hasFile    = fileInput.files.length > 0;

  // Usar FormData para poder enviar la imagen
  const fd = new FormData();
  fd.append('nombre',      document.getElementById('p-name').value.trim());
  fd.append('descripcion', document.getElementById('p-desc').value.trim());
  fd.append('precio',      document.getElementById('p-price').value);
  fd.append('stock',       document.getElementById('p-stock').value);
  fd.append('minStock',    document.getElementById('p-min-stock').value || '5');
  fd.append('estado',      document.getElementById('p-status').value);
  fd.append('destacado',   'false');

  // Buscar el categoriaId según nombre
  const catName = document.getElementById('p-category').value;
  const catMap  = { Comidas:1, Bebidas:2, Snacks:3, Dulces:4, Jugos:5, Otros:6 };
  fd.append('categoriaId', catMap[catName] || 6);

  if (hasFile) fd.append('imagen', fileInput.files[0]);

  showToast('Guardando...', '');
  let data;
  if (editId) {
    data = await apiPutUpload(`/productos/${editId}`, fd);
  } else {
    data = await apiUpload('/productos', fd);
  }

  if (!data.success) { showToast(data.error || 'Error al guardar', 'error'); return; }

  showToast(editId ? 'Producto actualizado ✅' : 'Producto agregado ✅', 'success');
  closeModal('product-modal');
  await loadProducts();
  renderAdminProducts();
  updateDashboardStats();
  renderStockTable();
}

async function deleteProduct(productId) {
  const p = APP.products.find(x => x.id === productId);
  if (!p || !confirm(`¿Eliminar "${p.name}"?`)) return;
  const data = await apiDelete(`/productos/${productId}`);
  if (data.success) {
    showToast(`"${p.name}" eliminado`, 'warning');
    await loadProducts();
    renderAdminProducts();
    updateDashboardStats();
  } else {
    showToast(data.error || 'Error', 'error');
  }
}

function previewProductImg(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('product-img-preview');
    preview.src   = e.target.result;
    preview.style.display = 'block';
    document.getElementById('img-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

/* ── Subir logo EMI desde admin ── */
async function uploadLogo(input) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('logo', file);
  showToast('Subiendo logo...', '');
  const data = await apiUpload('/productos/logo/upload', fd);
  if (data.success) {
    showToast('Logo EMI actualizado ✅', 'success');
    // Actualizar todos los logos en la interfaz
    document.querySelectorAll('.emi-logo, .emi-logo-sm, .emi-logo-admin, .header-logo')
      .forEach(img => {
        img.src = data.url + '?t=' + Date.now();
        img.style.display = 'block';
      });
  } else {
    showToast(data.error || 'Error al subir logo', 'error');
  }
}

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */
function getStockInfo(p) {
  if (p.status === 'agotado' || p.stock === 0) return { class:'out',  label:'● Agotado' };
  if (p.stock <= p.minStock)                   return { class:'low',  label:`⚠ Últimos ${p.stock}` };
  return { class:'ok', label:'● Disponible' };
}
function getCatIcon(cat) {
  return { Comidas:'🍔', Bebidas:'🥤', Snacks:'🍟', Dulces:'🍬', Jugos:'🍊', Otros:'🛒' }[cat] || '🍽';
}
function statusLabel(s) {
  return { activo:'Disponible', agotado:'Agotado', inactivo:'Inactivo',
           pendiente:'Pendiente', preparando:'Preparando', listo:'¡Listo!', entregado:'Entregado' }[s] || s;
}
function nextStatusLabel(s) {
  return { pendiente:'Preparar', preparando:'Marcar Listo', listo:'Entregar' }[s] || 'Avanzar';
}
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className   = `toast ${type}`;
  toast.classList.remove('hidden');
  clearTimeout(APP._toastTimer);
  APP._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

/* ════════════════════════════════════════════════════════════
   SETTINGS PANEL — Logo, QR y fotos de productos
════════════════════════════════════════════════════════════ */

async function renderSettingsPanel() {
  // Cargar logo actual
  try {
    const logo = await apiGet('/productos/logo/url');
    const prev = document.getElementById('settings-logo-preview');
    if (logo.success && logo.url && prev) {
      prev.src = logo.url;
      prev.style.display = 'block';
      prev.nextElementSibling.style.display = 'none';
    }
  } catch {}

  // Cargar QR actual
  try {
    const qr   = await apiGet('/productos/qr/url');
    const prev = document.getElementById('settings-qr-preview');
    if (qr.success && qr.url && prev) {
      prev.src = qr.url;
      prev.style.display = 'block';
      prev.nextElementSibling.style.display = 'none';
    }
  } catch {}

  // Galería de fotos de productos
  renderProductsPhotoGrid();
}

function renderProductsPhotoGrid() {
  const grid = document.getElementById('products-photo-grid');
  if (!grid) return;

  if (!APP.products.length) {
    grid.innerHTML = `<p style="color:var(--gray-300);font-size:.88rem">No hay productos cargados.</p>`;
    return;
  }

  grid.innerHTML = APP.products.map(p => `
    <div class="photo-grid-item" onclick="openProductModal(${p.id})" title="Editar foto de ${p.name}">
      <div class="photo-grid-img">
        ${p.img
          ? `<img src="${p.img}" alt="${p.name}" loading="lazy"
                  onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
             <div class="no-img" style="display:none">${getCatIcon(p.category)}</div>`
          : `<div class="no-img">${getCatIcon(p.category)}</div>`}
        <div class="edit-overlay">✏️</div>
      </div>
      <span class="photo-grid-name" title="${p.name}">${p.name}</span>
      <span class="${p.img ? 'photo-grid-has-img' : 'photo-grid-no-img'}">
        ${p.img ? '✅ Con foto' : '⚠ Sin foto'}
      </span>
    </div>
  `).join('');
}

/* ── Subir QR de pago ── */
async function uploadQR(input) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('qr', file);
  showToast('Subiendo QR...', '');
  const data = await apiUpload('/productos/qr/upload', fd);
  if (data.success) {
    showToast('QR de pago actualizado ✅', 'success');
    // Actualizar preview en settings
    const prev = document.getElementById('settings-qr-preview');
    if (prev) {
      prev.src = data.url + '?t=' + Date.now();
      prev.style.display = 'block';
      prev.nextElementSibling.style.display = 'none';
    }
    // Actualizar la imagen QR en el checkout
    const qrImg = document.querySelector('.qr-img');
    if (qrImg) {
      qrImg.src = data.url + '?t=' + Date.now();
      qrImg.style.display = 'block';
      const ph = qrImg.nextElementSibling;
      if (ph) ph.style.display = 'none';
    }
  } else {
    showToast(data.error || 'Error al subir QR', 'error');
  }
}

/* ── Cargar QR en pantalla de checkout ── */
async function loadQRForCheckout() {
  try {
    const data = await apiGet('/productos/qr/url');
    if (data.success && data.url) {
      const qrImg = document.querySelector('.qr-img');
      if (qrImg) {
        qrImg.src = data.url;
        qrImg.style.display = 'block';
        const ph = qrImg.nextElementSibling;
        if (ph) ph.style.display = 'none';
      }
    }
  } catch {}
}

// Cargar QR cada vez que se muestra la pantalla de checkout
const _origShowScreen = showScreen;
// Sobreescribir showScreen para cargar QR automáticamente
window.showScreen = function(screenId) {
  _origShowScreen(screenId);
  if (screenId === 'checkout-screen') loadQRForCheckout();
};

/* ── Habilitar / Deshabilitar producto rápido ── */
async function toggleProductStatus(productId, currentStatus) {
  const newStatus = currentStatus === 'inactivo' ? 'activo' : 'inactivo';
  const label     = newStatus === 'inactivo' ? 'deshabilitar' : 'habilitar';
  if (!confirm(`¿Deseas ${label} este producto?`)) return;

  const fd = new FormData();
  fd.append('estado', newStatus);
  const data = await apiPutUpload(`/productos/${productId}`, fd);
  if (data.success) {
    showToast(newStatus === 'inactivo' ? '🚫 Producto deshabilitado' : '✅ Producto habilitado', 'success');
    await loadProducts();
    renderAdminProducts();
    updateDashboardStats();
  } else {
    showToast(data.error || 'Error', 'error');
  }
}
