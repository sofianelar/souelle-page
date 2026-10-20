// ========================================================
// Souelle Pajamas - Storefront Application Controller
// Pure Supabase Backend - No localStorage for products
// ========================================================

// Global state
let storeProducts = [];
let storeCategories = [];
let storeDeliveryPrices = [];
let storeSettings = DEFAULT_CONFIG;
let currentFilter = "all";
let activeProductForModal = null;
let modalQty = 1;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. Load store settings from Supabase
    storeSettings = await db.getSettings();
  } catch (e) {
    storeSettings = DEFAULT_CONFIG;
  }

  // 2. Apply theme & branding
  applyStoreBranding();

  // 3. Load categories & products from Supabase
  await Promise.all([
    loadStoreCategories(),
    loadAndRenderProducts(),
    loadStoreWilayas()
  ]);

  // 4. Initialize cart UI & listeners
  updateCartUI();
  setupEventListeners();
});

// ==================== BRANDING & THEME ====================
function applyStoreBranding() {
  const s = storeSettings || DEFAULT_CONFIG;

  // Store Name & Tagline
  document.querySelectorAll(".brand-name-text").forEach(el => el.textContent = s.storeName);
  document.querySelectorAll(".brand-tagline-text").forEach(el => el.textContent = s.storeTagline);

  // Logo
  document.querySelectorAll(".brand-logo-img").forEach(el => {
    el.src = s.logoUrl || "assets/images/logo.jpg";
    el.alt = s.storeName;
  });

  // Topbar
  const topbarTextEl = document.getElementById("topbarText");
  if (topbarTextEl && s.topbar?.text) topbarTextEl.textContent = s.topbar.text;
  const topbarWaLabelEl = document.getElementById("topbarWhatsappLabel");
  if (topbarWaLabelEl && s.topbar?.whatsappLabel) topbarWaLabelEl.textContent = s.topbar.whatsappLabel;

  // WhatsApp & Social
  const whatsappNum = (s.whatsappNumber || "+213557857717").replace(/[^0-9]/g, "");
  document.querySelectorAll(".whatsapp-link-btn").forEach(link => {
    link.href = `https://wa.me/${whatsappNum}?text=${encodeURIComponent("مرحباً Souelle Pajamas 🎀، أريد الاستفسار عن التشكيلة المتوفرة لديكم.")}`;
  });

  document.querySelectorAll(".whatsapp-display-num").forEach(el => {
    el.textContent = s.whatsappDisplay || s.whatsappNumber;
  });

  document.querySelectorAll(".instagram-link-btn").forEach(link => {
    link.href = s.instagramUrl || `https://instagram.com/${s.instagramHandle || 'souelle_pajamas'}`;
  });

  // Hero Section
  if (s.hero) {
    const heroTitle = document.getElementById("heroTitle");
    if (heroTitle && s.hero.title) heroTitle.innerHTML = s.hero.title;
    const heroSubtitle = document.getElementById("heroSubtitle");
    if (heroSubtitle && s.hero.subtitle) heroSubtitle.textContent = s.hero.subtitle;
    const heroBadge = document.getElementById("heroBadge");
    if (heroBadge && s.hero.badge) heroBadge.textContent = s.hero.badge;
  }

  // Section Headings
  if (s.sections?.products) {
    const pBadge = document.getElementById("productsSectionBadge");
    if (pBadge && s.sections.products.badge) pBadge.textContent = s.sections.products.badge;
    const pTitle = document.getElementById("productsSectionTitle");
    if (pTitle && s.sections.products.title) pTitle.textContent = s.sections.products.title;
    const pSubtitle = document.getElementById("productsSectionSubtitle");
    if (pSubtitle && s.sections.products.subtitle) pSubtitle.textContent = s.sections.products.subtitle;
  }

  // Render Features & Testimonials
  renderFeaturesStrip(s);
  renderCustomerReviews(s);
}

// Render dynamic features strip
function renderFeaturesStrip(s) {
  const container = document.getElementById("featuresGrid");
  if (!container) return;
  const features = s.features || DEFAULT_CONFIG.features;
  container.innerHTML = features.map(f => `
    <div class="feature-box">
      <div class="feature-icon-circle">${f.icon || '✨'}</div>
      <div class="feature-info">
        <h4>${f.title}</h4>
        <p>${f.desc}</p>
      </div>
    </div>
  `).join("");
}

// Render dynamic customer reviews
function renderCustomerReviews(s) {
  const container = document.getElementById("testimonialsGrid");
  if (!container) return;
  const reviews = s.reviews || DEFAULT_CONFIG.reviews;
  container.innerHTML = reviews.map(r => {
    const stars = "⭐".repeat(r.stars || 5);
    const initial = r.name ? r.name.charAt(0) : "س";
    return `
      <div style="background:#fff; padding:1.75rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);">
        <div style="color: #FFA41C; margin-bottom: 0.5rem; font-size: 1.1rem;">${stars}</div>
        <p style="color: var(--text-dark); line-height: 1.7; font-size: 0.95rem; margin-bottom: 1rem;">
          "${r.text}"
        </p>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--secondary); color:#fff; display: flex; align-items: center; justify-content: center; font-weight: 700;">${initial}</div>
          <div>
            <strong style="color: var(--secondary); display: block; font-size: 0.95rem;">${r.name}</strong>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${r.city}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ==================== CATEGORIES (SUPABASE) ====================
async function loadStoreCategories() {
  try {
    storeCategories = await db.getCategories();
  } catch (e) {
    console.warn("Could not load categories from Supabase:", e);
    storeCategories = [];
  }

  renderCategoryPills();
  renderNavLinks();
}

function renderCategoryPills() {
  const container = document.getElementById("categoryFilterPills");
  if (!container) return;

  const defaultPill = `
    <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" onclick="filterStoreCategory('all')">
      <span>✨ الكل</span>
    </button>
  `;

  const customPills = storeCategories.map(cat => `
    <button class="filter-btn ${currentFilter === cat.id ? 'active' : ''}" data-filter="${cat.id}" onclick="filterStoreCategory('${cat.id}')">
      <span>🎀 ${cat.name}</span>
    </button>
  `).join("");

  container.innerHTML = defaultPill + customPills;
}

function renderNavLinks() {
  const mainNav = document.getElementById("mainNavLinks");
  const mobileNav = document.getElementById("mobileNavLinks");
  const whatsappNum = (storeSettings.whatsappNumber || "+213557857717").replace(/[^0-9]/g, "");

  let html = `
    <li><a href="index.html" class="nav-link active">الرئيسية</a></li>
  `;

  // Add top categories
  storeCategories.slice(0, 3).forEach(c => {
    html += `<li><a href="#productsSection" class="nav-link" onclick="filterStoreCategory('${c.id}')">${c.name}</a></li>`;
  });

  html += `
    <li><a href="delivery.html" class="nav-link">أسعار التوصيل (58 ولاية)</a></li>
    <li><a href="https://wa.me/${whatsappNum}" target="_blank" class="nav-link" style="color: #25D366; font-weight: 700;">طلب عبر واتساب 💬</a></li>
  `;

  if (mainNav) mainNav.innerHTML = html;
  if (mobileNav) mobileNav.innerHTML = html;
}

function filterStoreCategory(catId) {
  currentFilter = catId;
  document.querySelectorAll("#categoryFilterPills .filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === catId);
  });
  renderProductsGrid(filterProductsList(storeProducts, currentFilter));
  const section = document.getElementById("productsSection");
  if (section) section.scrollIntoView({ behavior: "smooth" });
}
window.filterStoreCategory = filterStoreCategory;

// ==================== PRODUCTS (SUPABASE ONLY - NO LOCALSTORAGE) ====================
async function loadAndRenderProducts(searchQuery = "") {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align:center; padding: 4rem 1rem;">
      <div class="pulse-dot" style="margin: 0 auto 1rem;"></div>
      <p style="color:var(--text-muted); font-size:1.05rem;">جاري تحميل أحدث المنتجات من قاعدة بيانات Supabase...</p>
    </div>
  `;

  try {
    storeProducts = await db.getProducts();
  } catch (err) {
    console.error("Supabase load products error:", err);
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 4rem 1rem; background:#FFF1F2; border:1px solid #FECDD3; border-radius:12px;">
        <span style="font-size:2.5rem; display:block; margin-bottom:0.75rem;">⚠️</span>
        <h3 style="color:#9F1239; margin-bottom:0.5rem;">تعذر الاتصال بـ Supabase لجلب المنتجات</h3>
        <p style="color:#BE123C; font-size:0.95rem; margin-bottom:1rem;">${err.message || 'يرجى التحقق من سياسات RLS في لوحة Supabase.'}</p>
        <button type="button" class="btn-primary" onclick="loadAndRenderProducts()">إعادة المحاولة 🔄</button>
      </div>
    `;
    return;
  }

  const filtered = filterProductsList(storeProducts, currentFilter, searchQuery);
  renderProductsGrid(filtered);
}
window.loadAndRenderProducts = loadAndRenderProducts;

function filterProductsList(list, catId, searchQuery = "") {
  let res = list;
  if (catId && catId !== "all") {
    res = res.filter(p => p.category_id === catId);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    res = res.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }
  return res;
}

function renderProductsGrid(products) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 4rem 1rem;">
        <span style="font-size: 3.5rem; display:block; margin-bottom: 1rem;">🛍️</span>
        <h3 style="color:var(--secondary); font-size: 1.4rem; margin-bottom: 0.5rem;">لا توجد منتجات معروضة حالياً</h3>
        <p style="color:var(--text-muted); font-size:0.95rem;">يمكنكِ إضافة منتجات جديدة بكل سهولة من لوحة الإدارة (admin.html).</p>
      </div>
    `;
    return;
  }

  const whatsappNum = (storeSettings.whatsappNumber || "+213557857717").replace(/[^0-9]/g, "");

  grid.innerHTML = products.map(product => {
    const cat = storeCategories.find(c => c.id === product.category_id);
    const catName = cat ? cat.name : "تشكيلة حصرية";
    const imgUrl = product.image || (product.images && product.images[0]) || "assets/images/logo.jpg";

    const whatsappInquiryMsg = encodeURIComponent(
      `مرحباً Souelle Pajamas 🎀\nأريد الاستفسار عن منتج:\n• ${product.name}\n• السعر: ${product.price} د.ج\nهل متوفر لديكم حالياً؟`
    );

    return `
      <div class="product-card" data-id="${product.id}">
        <div class="product-thumb-box" onclick="openProductModal('${product.id}')">
          <img src="${imgUrl}" alt="${product.name}" class="product-thumb" loading="lazy" onerror="this.src='assets/images/logo.jpg'">
          <button class="product-quick-view-btn" type="button">
            <span>نظرة سريعة</span> 👁️
          </button>
        </div>
        <div class="product-body">
          <span class="product-category-label">${catName}</span>
          <h3 class="product-name" onclick="openProductModal('${product.id}')">${product.name}</h3>

          <div class="product-price-row">
            <div class="current-price">${Number(product.price).toLocaleString()} <span>د.ج</span></div>
          </div>

          <div class="product-actions">
            <button class="btn-fast-order" type="button" onclick="openQuickOrderModal('${product.id}')">
              <span>طلب فوري</span> ⚡
            </button>
            <button class="btn-add-cart-icon" type="button" title="أضيفي للسلة" onclick="quickAddToCart('${product.id}')">
              🛒
            </button>
            <a href="https://wa.me/${whatsappNum}?text=${whatsappInquiryMsg}" target="_blank" class="btn-card-whatsapp">
              <span>استفسار واتساب</span> 💬
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ==================== WILAYAS (SUPABASE WITH FALLBACK) ====================
async function loadStoreWilayas() {
  try {
    storeDeliveryPrices = await db.getDeliveryPrices();
  } catch (e) {
    storeDeliveryPrices = [];
  }

  // If Supabase delivery_prices has rows, use them; otherwise fallback to ALGERIA_WILAYAS
  const wilayasSource = (storeDeliveryPrices && storeDeliveryPrices.length > 0)
    ? storeDeliveryPrices.map(d => ({
        code: d.wilaya_code,
        name: d.wilaya_name,
        home_price: d.home_price,
        desk_price: d.desk_price
      }))
    : (typeof ALGERIA_WILAYAS !== "undefined" ? ALGERIA_WILAYAS : []);

  populateWilayasDropdowns(wilayasSource);
}

function populateWilayasDropdowns(list) {
  const options = `
    <option value="">-- اختاري الولاية (58 ولاية) --</option>
    ${list.map(w => `<option value="${w.code}" data-name="${w.name}" data-home="${w.home_price}" data-desk="${w.desk_price}">${w.code}. ${w.name}</option>`).join("")}
  `;

  document.querySelectorAll(".wilaya-select").forEach(select => {
    select.innerHTML = options;
  });
}

// ==================== PRODUCT DETAIL MODAL ====================
function openProductModal(productId) {
  const product = storeProducts.find(p => p.id === productId);
  if (!product) return;

  activeProductForModal = product;
  modalQty = 1;

  const modal = document.getElementById("productDetailModal");
  const modalContent = document.getElementById("productDetailContent");
  if (!modal || !modalContent) return;

  const cat = storeCategories.find(c => c.id === product.category_id);
  const catName = cat ? cat.name : "تشكيلة حصرية";
  const imgUrl = product.image || (product.images && product.images[0]) || "assets/images/logo.jpg";

  const sizesHtml = product.sizes && product.sizes.length > 0 ? `
    <div style="margin-bottom: 1rem;">
      <label class="form-label">المقاس المطلوب:</label>
      <div style="display:flex; gap: 0.5rem; flex-wrap:wrap;" id="modalSizesGroup">
        ${product.sizes.map((s, idx) => `
          <button type="button" class="btn-secondary size-opt-btn ${idx === 0 ? 'active' : ''}" style="padding: 0.4rem 1rem; font-size: 0.9rem;" onclick="selectModalOption(this, 'size')">${s}</button>
        `).join("")}
      </div>
    </div>
  ` : '';

  const colorsHtml = product.colors && product.colors.length > 0 ? `
    <div style="margin-bottom: 1rem;">
      <label class="form-label">اللون / الطراز:</label>
      <div style="display:flex; gap: 0.5rem; flex-wrap:wrap;" id="modalColorsGroup">
        ${product.colors.map((c, idx) => `
          <button type="button" class="btn-secondary color-opt-btn ${idx === 0 ? 'active' : ''}" style="padding: 0.4rem 1rem; font-size: 0.9rem;" onclick="selectModalOption(this, 'color')">${c}</button>
        `).join("")}
      </div>
    </div>
  ` : '';

  modalContent.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 1.5rem; align-items: start;">
      <div>
        <img src="${imgUrl}" alt="${product.name}" style="width:100%; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); object-fit: cover; max-height: 380px;" onerror="this.src='assets/images/logo.jpg'">
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; background: var(--primary-light); padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.85rem; color: var(--secondary);">
          <span>🚚</span>
          <div><strong>التوصيل متوفر لجميع الولايات:</strong> الدفع عند الاستلام مع إمكانية معاينة الطلبية قبل الدفع.</div>
        </div>
      </div>
      <div>
        <span class="product-category-label">${catName}</span>
        <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--secondary); margin-bottom: 0.5rem;">${product.name}</h2>
        <div class="product-price-row" style="margin-bottom: 1rem;">
          <div class="current-price">${Number(product.price).toLocaleString()} <span>د.ج</span></div>
        </div>
        <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.7; margin-bottom: 1.25rem;">${product.description || ''}</p>
        
        ${sizesHtml}
        ${colorsHtml}

        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
          <label class="form-label" style="margin: 0;">الكمية:</label>
          <div class="qty-control-box">
            <button type="button" class="qty-btn" onclick="adjustModalQty(-1)">-</button>
            <span id="modalQtyDisplay" style="font-weight: 700; min-width: 28px; text-align: center;">1</span>
            <button type="button" class="qty-btn" onclick="adjustModalQty(1)">+</button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <button type="button" class="btn-primary" style="width:100%;" onclick="submitModalAddToCart()">
            <span>أضيفي إلى سلة المشتريات</span> 🛍️
          </button>
          <button type="button" class="btn-fast-order" style="width:100%;" onclick="openQuickOrderModal('${product.id}')">
            <span>طلب فوري مباشر (الدفع عند الاستلام)</span> ⚡
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.add("active");
}
window.openProductModal = openProductModal;

function selectModalOption(btn, type) {
  const container = type === 'size' ? document.getElementById("modalSizesGroup") : document.getElementById("modalColorsGroup");
  if (!container) return;
  container.querySelectorAll("button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}
window.selectModalOption = selectModalOption;

function adjustModalQty(delta) {
  modalQty = Math.max(1, modalQty + delta);
  const display = document.getElementById("modalQtyDisplay");
  if (display) display.textContent = modalQty;
}
window.adjustModalQty = adjustModalQty;

function submitModalAddToCart() {
  if (!activeProductForModal) return;
  const activeSizeBtn = document.querySelector("#modalSizesGroup .active");
  const activeColorBtn = document.querySelector("#modalColorsGroup .active");

  const size = activeSizeBtn ? activeSizeBtn.textContent.trim() : "";
  const color = activeColorBtn ? activeColorBtn.textContent.trim() : "";

  db.addToCart(activeProductForModal, size, color, modalQty);
  closeModal("productDetailModal");
  showToast("تمت إضافة المنتج إلى السلة بنجاح! 🎀", "success");
  openCartDrawer();
}
window.submitModalAddToCart = submitModalAddToCart;

function quickAddToCart(productId) {
  const product = storeProducts.find(p => p.id === productId);
  if (!product) return;

  const defaultSize = product.sizes && product.sizes.length ? product.sizes[0] : "";
  const defaultColor = product.colors && product.colors.length ? product.colors[0] : "";

  db.addToCart(product, defaultSize, defaultColor, 1);
  updateCartUI();
  showToast(`تمت إضافة "${product.name}" إلى السلة 🛍️`, "success");
}
window.quickAddToCart = quickAddToCart;

// ==================== FAST ORDER MODAL & SUBMIT (SUPABASE + WHATSAPP) ====================
function openQuickOrderModal(productId) {
  const product = storeProducts.find(p => p.id === productId);
  if (!product) return;

  activeProductForModal = product;
  closeModal("productDetailModal");

  const modal = document.getElementById("quickOrderModal");
  const orderProductInfo = document.getElementById("quickOrderProductInfo");

  const imgUrl = product.image || (product.images && product.images[0]) || "assets/images/logo.jpg";

  orderProductInfo.innerHTML = `
    <div style="display:flex; gap: 1rem; align-items:center; background: var(--bg-main); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
      <img src="${imgUrl}" alt="${product.name}" style="width: 65px; height: 65px; object-fit:cover; border-radius: var(--radius-sm);" onerror="this.src='assets/images/logo.jpg'">
      <div style="flex-grow: 1;">
        <h4 style="font-size: 0.98rem; font-weight: 700; color: var(--secondary); margin-bottom: 0.2rem;">${product.name}</h4>
        <div style="font-weight: 800; color: var(--secondary); font-size: 1.1rem;">
          <span id="quickOrderProductPrice">${Number(product.price).toLocaleString()}</span> د.ج
        </div>
      </div>
    </div>
  `;

  // Sizes & Colors
  const sizeSelect = document.getElementById("quickOrderSize");
  if (sizeSelect) {
    if (product.sizes && product.sizes.length > 0) {
      sizeSelect.parentElement.style.display = "block";
      sizeSelect.innerHTML = product.sizes.map(s => `<option value="${s}">${s}</option>`).join("");
    } else {
      sizeSelect.parentElement.style.display = "none";
    }
  }

  const colorSelect = document.getElementById("quickOrderColor");
  if (colorSelect) {
    if (product.colors && product.colors.length > 0) {
      colorSelect.parentElement.style.display = "block";
      colorSelect.innerHTML = product.colors.map(c => `<option value="${c}">${c}</option>`).join("");
    } else {
      colorSelect.parentElement.style.display = "none";
    }
  }

  calculateQuickOrderTotal();
  modal.classList.add("active");
}
window.openQuickOrderModal = openQuickOrderModal;

function calculateQuickOrderTotal() {
  if (!activeProductForModal) return;
  const wilayaSelect = document.getElementById("quickOrderWilaya");
  const selectedOption = wilayaSelect ? wilayaSelect.options[wilayaSelect.selectedIndex] : null;
  const deliveryType = document.querySelector('input[name="quickDeliveryType"]:checked')?.value || "home";
  
  const deliveryFee = selectedOption
    ? Number(deliveryType === "home" ? selectedOption.dataset.home : selectedOption.dataset.desk) || 0
    : 0;

  const qty = Number(document.getElementById("quickOrderQty")?.value || 1);
  const subtotal = Number(activeProductForModal.price) * qty;
  const total = subtotal + deliveryFee;

  const feeEl = document.getElementById("quickOrderDeliveryFee");
  if (feeEl) feeEl.textContent = deliveryFee > 0 ? `${deliveryFee.toLocaleString()} د.ج` : "يُحدد حسب الولاية";

  const totalEl = document.getElementById("quickOrderTotal");
  if (totalEl) totalEl.textContent = `${total.toLocaleString()} د.ج`;
}
window.calculateQuickOrderTotal = calculateQuickOrderTotal;

// SUBMIT ORDER TO SUPABASE AND OPEN WHATSAPP
async function handleQuickOrderSubmit(e) {
  e.preventDefault();
  if (!activeProductForModal) return;

  const name = document.getElementById("quickOrderName")?.value.trim();
  const phone = document.getElementById("quickOrderPhone")?.value.trim();
  const wilayaSelect = document.getElementById("quickOrderWilaya");
  const selectedOption = wilayaSelect ? wilayaSelect.options[wilayaSelect.selectedIndex] : null;
  const wilayaCode = wilayaSelect?.value;
  const wilayaName = selectedOption?.dataset.name || selectedOption?.text || "";
  const commune = document.getElementById("quickOrderCommune")?.value.trim() || "";
  const address = document.getElementById("quickOrderAddress")?.value.trim() || "";
  const size = document.getElementById("quickOrderSize")?.value || "";
  const color = document.getElementById("quickOrderColor")?.value || "";
  const qty = Number(document.getElementById("quickOrderQty")?.value || 1);
  const deliveryType = document.querySelector('input[name="quickDeliveryType"]:checked')?.value || "home";

  if (!name || !phone || !wilayaCode || !commune) {
    showToast("يرجى ملء جميع الحقول المطلوبة (الاسم، الهاتف، الولاية، البلدية)", "error");
    return;
  }

  const deliveryFee = Number(deliveryType === "home" ? selectedOption?.dataset.home : selectedOption?.dataset.desk) || 0;
  const subtotal = Number(activeProductForModal.price) * qty;
  const total = subtotal + deliveryFee;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>جاري تسجيل الطلب في Supabase...</span> ⏳`;
  }

  const orderPayload = {
    customerName: name,
    customerPhone: phone,
    wilaya: `${wilayaCode} - ${wilayaName} (${deliveryType === 'home' ? 'توصيل لباب المنزل' : 'استلام من المكتب'})`,
    address: `${commune}${address ? ' - ' + address : ''}`,
    items: [
      {
        id: activeProductForModal.id,
        name: activeProductForModal.name,
        price: Number(activeProductForModal.price),
        size: size || null,
        color: color || null,
        quantity: qty
      }
    ],
    total: total,
    notes: `طلب فوري مباشر | المقاس: ${size} | اللون: ${color} | التوصيل: ${deliveryType === 'home' ? 'منزل' : 'مكتب'}`
  };

  try {
    const createdOrder = await db.createOrder(orderPayload);
    closeModal("quickOrderModal");

    // Automatically trigger WhatsApp
    openOrderWhatsapp(createdOrder);

    // Show order success modal
    showOrderSuccessModal(createdOrder);
  } catch (err) {
    console.error("Order creation error:", err);
    showToast(`فشل تسجيل الطلب في Supabase: ${err.message}`, "error");

    // In case of RLS or network issue, don't leave customer hanging - generate WhatsApp order directly
    const fallbackOrder = {
      id: "TEMP-" + Date.now().toString().slice(-6),
      ...orderPayload
    };
    closeModal("quickOrderModal");
    openOrderWhatsapp(fallbackOrder);
    showOrderSuccessModal(fallbackOrder);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>تأكيد الطلب الآن (الدفع عند الاستلام)</span> 🚚`;
    }
  }
}
window.handleQuickOrderSubmit = handleQuickOrderSubmit;

// ==================== CART DRAWER & CHECKOUT ====================
function openCartDrawer() {
  renderCartDrawer();
  const drawerOverlay = document.getElementById("cartDrawerOverlay");
  if (drawerOverlay) drawerOverlay.classList.add("active");
}
window.openCartDrawer = openCartDrawer;

function closeCartDrawer() {
  const drawerOverlay = document.getElementById("cartDrawerOverlay");
  if (drawerOverlay) drawerOverlay.classList.remove("active");
}
window.closeCartDrawer = closeCartDrawer;

function updateCartUI() {
  const cart = db.getCart();
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll(".cart-count-badge").forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
  });
}

function renderCartDrawer() {
  const container = document.getElementById("cartDrawerItems");
  const subtotalEl = document.getElementById("cartDrawerSubtotal");
  const totalEl = document.getElementById("cartDrawerTotal");
  const deliveryFeeEl = document.getElementById("cartDrawerDeliveryFee");

  const cart = db.getCart();

  if (cart.length === 0) {
    if (container) {
      container.innerHTML = `
        <div style="text-align:center; padding: 3rem 1rem; color: var(--text-muted);">
          <span style="font-size: 3rem; display:block; margin-bottom: 0.5rem;">🛍️</span>
          <p style="font-weight: 700; color: var(--secondary);">سلة مشترياتكِ فارغة</p>
          <p style="font-size:0.85rem;">تصفحي تشكيلة البيجامات والعطور وأضيفي ما يعجبكِ.</p>
        </div>
      `;
    }
    if (subtotalEl) subtotalEl.textContent = "0 د.ج";
    if (totalEl) totalEl.textContent = "0 د.ج";
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  if (subtotalEl) subtotalEl.textContent = `${subtotal.toLocaleString()} د.ج`;

  const wilayaSelect = document.getElementById("cartCheckoutWilaya");
  const selectedOption = wilayaSelect ? wilayaSelect.options[wilayaSelect.selectedIndex] : null;
  const deliveryFee = selectedOption && selectedOption.dataset.home ? Number(selectedOption.dataset.home) : 0;

  if (deliveryFeeEl) {
    deliveryFeeEl.textContent = deliveryFee > 0 ? `${deliveryFee.toLocaleString()} د.ج` : "حددي الولاية";
  }
  if (totalEl) {
    totalEl.textContent = `${(subtotal + deliveryFee).toLocaleString()} د.ج`;
  }

  if (container) {
    container.innerHTML = cart.map(item => `
      <div class="cart-drawer-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.src='assets/images/logo.jpg'">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-variants">
            ${item.size ? `المقاس: ${item.size}` : ''} ${item.color ? `| اللون: ${item.color}` : ''}
          </div>
          <div class="cart-item-price">${(item.price * item.qty).toLocaleString()} د.ج</div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem;">
          <div class="qty-control-box">
            <button type="button" class="qty-btn" onclick="updateCartItemQty('${item.cartKey}', ${item.qty - 1})">-</button>
            <span style="font-weight:700; min-width: 20px; text-align:center;">${item.qty}</span>
            <button type="button" class="qty-btn" onclick="updateCartItemQty('${item.cartKey}', ${item.qty + 1})">+</button>
          </div>
          <button type="button" style="background:transparent; color:#E74C3C; font-size:0.8rem; text-decoration:underline;" onclick="updateCartItemQty('${item.cartKey}', 0)">حذف</button>
        </div>
      </div>
    `).join("");
  }
}

function updateCartItemQty(cartKey, qty) {
  db.updateCartQty(cartKey, qty);
  renderCartDrawer();
  updateCartUI();
}
window.updateCartItemQty = updateCartItemQty;

// CART CHECKOUT SUBMIT TO SUPABASE & OPEN WHATSAPP
async function handleCartCheckoutSubmit(e) {
  e.preventDefault();
  const cart = db.getCart();
  if (cart.length === 0) {
    showToast("سلتك فارغة!", "error");
    return;
  }

  const name = document.getElementById("cartCheckoutName")?.value.trim();
  const phone = document.getElementById("cartCheckoutPhone")?.value.trim();
  const wilayaSelect = document.getElementById("cartCheckoutWilaya");
  const selectedOption = wilayaSelect ? wilayaSelect.options[wilayaSelect.selectedIndex] : null;
  const wilayaCode = wilayaSelect?.value;
  const wilayaName = selectedOption?.dataset.name || selectedOption?.text || "";
  const commune = document.getElementById("cartCheckoutCommune")?.value.trim() || "";
  const address = document.getElementById("cartCheckoutAddress")?.value.trim() || "";

  if (!name || !phone || !wilayaCode || !commune) {
    showToast("يرجى ملء جميع معلومات التوصيل المطلوبة", "error");
    return;
  }

  const deliveryFee = Number(selectedOption?.dataset.home || 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = subtotal + deliveryFee;

  const checkoutBtn = document.getElementById("cartDrawerCheckoutBtn");
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = `<span>جاري تسجيل الطلب في Supabase...</span> ⏳`;
  }

  const orderPayload = {
    customerName: name,
    customerPhone: phone,
    wilaya: `${wilayaCode} - ${wilayaName} (توصيل لباب المنزل)`,
    address: `${commune}${address ? ' - ' + address : ''}`,
    items: cart.map(i => ({
      id: i.id,
      name: i.name,
      price: i.price,
      size: i.size || null,
      color: i.color || null,
      quantity: i.qty
    })),
    total: total,
    notes: ""
  };

  try {
    const createdOrder = await db.createOrder(orderPayload);
    db.clearCart();
    closeCartDrawer();
    updateCartUI();

    openOrderWhatsapp(createdOrder);
    showOrderSuccessModal(createdOrder);
  } catch (err) {
    console.error("Cart checkout error:", err);
    showToast(`فشل حفظ الطلب في Supabase: ${err.message}`, "error");

    const fallbackOrder = {
      id: "TEMP-" + Date.now().toString().slice(-6),
      ...orderPayload
    };
    db.clearCart();
    closeCartDrawer();
    updateCartUI();

    openOrderWhatsapp(fallbackOrder);
    showOrderSuccessModal(fallbackOrder);
  } finally {
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = `<span>تأكيد الطلب (الدفع عند الاستلام)</span> 🚚`;
    }
  }
}
window.handleCartCheckoutSubmit = handleCartCheckoutSubmit;

// Open WhatsApp with detailed order summary
function openOrderWhatsapp(order) {
  const whatsappNum = (storeSettings.whatsappNumber || "+213557857717").replace(/[^0-9]/g, "");
  const itemsText = (order.items || []).map(i => 
    `• ${i.name} (الكمية: ${i.quantity || i.qty || 1}${i.size ? ' - مقاس ' + i.size : ''}${i.color ? ' - لون ' + i.color : ''}) - ${Number(i.price).toLocaleString()} د.ج`
  ).join("\n");

  const msg = encodeURIComponent(
    `🛍️ *طلبية جديدة من متجر Souelle Pajamas*\n` +
    `🔖 رقم الطلب: #${typeof order.id === 'string' ? order.id.substring(0, 8) : order.id}\n\n` +
    `👤 *معلومات الزبونة:*\n` +
    `• الاسم: ${order.customerName}\n` +
    `• رقم الهاتف: ${order.customerPhone}\n` +
    `• الولاية: ${order.wilaya}\n` +
    `• العنوان / البلدية: ${order.address}\n\n` +
    `📦 *المنتجات المطلوبة:*\n${itemsText}\n\n` +
    `💵 *المجموع الإجمالي المستحق عند الاستلام:* *${Number(order.total).toLocaleString()} د.ج*\n` +
    `🤝 الدفع عند الاستلام بعد المعاينة.\n` +
    `يرجى تأكيد وشحن طلبي وشكراً!`
  );

  window.open(`https://wa.me/${whatsappNum}?text=${msg}`, "_blank");
}

function showOrderSuccessModal(order) {
  const modal = document.getElementById("orderSuccessModal");
  const orderRefEl = document.getElementById("successOrderRef");
  const orderSummaryEl = document.getElementById("successOrderSummary");
  const whatsappConfirmBtn = document.getElementById("successWhatsappBtn");

  if (!modal) return;

  if (orderRefEl) {
    orderRefEl.textContent = typeof order.id === 'string' ? `#${order.id.substring(0, 8)}` : `#${order.id}`;
  }

  if (orderSummaryEl) {
    orderSummaryEl.innerHTML = `
      <div style="font-size: 0.95rem; line-height: 1.8; color: var(--text-dark);">
        <div><strong>الزبونة:</strong> ${order.customerName} (${order.customerPhone})</div>
        <div><strong>عنوان التوصيل:</strong> ${order.wilaya} - ${order.address}</div>
        <div><strong>المبلغ الإجمالي المستحق:</strong> <span style="color:var(--secondary); font-weight:800; font-size:1.15rem;">${Number(order.total).toLocaleString()} د.ج</span></div>
        <div style="color: #27AE60; font-weight:700; margin-top: 0.5rem;">🚚 الدفع عند الاستلام بعد المعاينة لراحتكِ التامة</div>
      </div>
    `;
  }

  if (whatsappConfirmBtn) {
    whatsappConfirmBtn.onclick = () => openOrderWhatsapp(order);
  }

  modal.classList.add("active");
}

// ==================== EVENT LISTENERS & HELPERS ====================
function setupEventListeners() {
  // Quick Order Wilaya change
  const quickWilaya = document.getElementById("quickOrderWilaya");
  if (quickWilaya) {
    quickWilaya.addEventListener("change", calculateQuickOrderTotal);
  }

  // Delivery type radio change
  document.querySelectorAll('input[name="quickDeliveryType"]').forEach(r => {
    r.addEventListener("change", calculateQuickOrderTotal);
  });

  // Quantity input change
  const quickQty = document.getElementById("quickOrderQty");
  if (quickQty) {
    quickQty.addEventListener("input", calculateQuickOrderTotal);
  }

  // Cart Wilaya change
  const cartWilaya = document.getElementById("cartCheckoutWilaya");
  if (cartWilaya) {
    cartWilaya.addEventListener("change", renderCartDrawer);
  }

  // Search input
  const searchInput = document.getElementById("storeSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      loadAndRenderProducts(e.target.value);
    });
  }
}

function showToast(message, type = "info") {
  let c = document.getElementById("toastContainer");
  if (!c) {
    c = document.createElement("div");
    c.id = "toastContainer";
    c.className = "toast-container";
    document.body.appendChild(c);
  }

  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> <span>${message}</span>`;
  c.appendChild(t);

  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 400);
  }, 4000);
}
window.showToast = showToast;

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("active");
}
window.closeModal = closeModal;
