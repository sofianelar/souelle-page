// ========================================================
// Souelle Pajamas - Admin Dashboard Controller
// 100% Pure Supabase Integration
// ========================================================

let allAdminProducts = [];
let allAdminCategories = [];
let allAdminOrders = [];
let allAdminDeliveryRates = [];
let currentOrdersFilter = "all";
let activeAdminUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupAdminTabs();
  await checkAdminAuth();
});

// ==================== AUTHENTICATION ====================
async function checkAdminAuth() {
  const authModal = document.getElementById("adminAuthModal");
  const loginError = document.getElementById("adminLoginError");
  if (loginError) loginError.style.display = "none";

  try {
    const session = await db.getCurrentSession();
    if (!session || !session.user) {
      if (authModal) authModal.classList.add("active");
      return;
    }

    activeAdminUser = session.user;
    if (authModal) authModal.classList.remove("active");

    const badge = document.getElementById("adminUserBadge");
    if (badge && activeAdminUser.email) {
      badge.textContent = `المشرف: ${activeAdminUser.email}`;
    }

    await initAdminDashboard();
  } catch (err) {
    console.error("Auth check failed:", err);
    if (authModal) authModal.classList.add("active");
  }
}

async function handleAdminLoginSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById("adminEmailInput");
  const passwordInput = document.getElementById("adminPasswordInput");
  const errorBox = document.getElementById("adminLoginError");
  const loginBtn = document.getElementById("adminLoginBtn");

  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value.trim() : "";

  if (!email || !password) return;

  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.innerHTML = `<span>جاري التحقق من الحساب...</span> ⏳`;
  }
  if (errorBox) errorBox.style.display = "none";

  try {
    const data = await db.signInAdmin(email, password);
    activeAdminUser = data.user;

    const authModal = document.getElementById("adminAuthModal");
    if (authModal) authModal.classList.remove("active");

    showToast("مرحباً بكِ في لوحة تحكم Souelle Pajamas 🎀", "success");
    await initAdminDashboard();
  } catch (err) {
    console.error("Login error:", err);
    if (errorBox) {
      let msg = err.message || "حدث خطأ في تسجيل الدخول";
      if (msg.includes("Invalid login credentials")) {
        msg = "بيانات الدخول غير صحيحة. تأكدي من البريد وكلمة المرور المسجلة في Supabase Auth.";
      } else if (msg.includes("Email not confirmed")) {
        msg = "البريد الإلكتروني لم يتم تأكيده بعد في Supabase.";
      }
      errorBox.innerHTML = `❌ ${msg}`;
      errorBox.style.display = "block";
    }

    const form = document.getElementById("adminLoginForm");
    if (form) {
      form.style.animation = "none";
      form.offsetHeight;
      form.style.animation = "shake 0.4s ease";
    }
  } finally {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.innerHTML = `<span>تسجيل الدخول (Supabase)</span> 🔐`;
    }
  }
}
window.handleAdminLoginSubmit = handleAdminLoginSubmit;

async function adminLogout() {
  if (confirm("هل ترغبين في تسجيل الخروج من لوحة التحكم؟")) {
    await db.signOutAdmin();
    activeAdminUser = null;
    const authModal = document.getElementById("adminAuthModal");
    if (authModal) authModal.classList.add("active");
    showToast("تم تسجيل الخروج بنجاح", "info");
  }
}
window.adminLogout = adminLogout;

// ==================== DASHBOARD INITIALIZATION ====================
async function initAdminDashboard() {
  try {
    await Promise.all([
      loadAdminCategories(),
      loadAdminProducts(),
      loadAdminOrders(),
      loadDeliveryRates(),
      loadStoreSettingsIntoForm()
    ]);
    updateOverviewStats();
  } catch (err) {
    console.error("Dashboard data load error:", err);
    showToast("تنبيه: تعذر جلب بعض البيانات من Supabase", "error");
  }
}

// Setup tabs switching
function setupAdminTabs() {
  const tabs = document.querySelectorAll(".admin-nav-item");
  const panes = document.querySelectorAll(".admin-tab-pane");
  const title = document.getElementById("pageTitleDisplay");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove("active"));
      panes.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");

      const label = tab.querySelector("span:last-child")?.textContent || "لوحة التحكم";
      if (title) title.textContent = label;
    });
  });
}

// ==================== OVERVIEW STATS ====================
function updateOverviewStats() {
  // Revenue: confirmed or delivered orders
  const validOrders = allAdminOrders.filter(o => o.status !== "ملغى");
  const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const pendingCount = allAdminOrders.filter(o => o.status === "جديد" || o.status === "قيد الانتظار").length;

  const revEl = document.getElementById("statsTotalRevenue");
  if (revEl) revEl.textContent = `${totalRevenue.toLocaleString()} د.ج`;

  const ordEl = document.getElementById("statsTotalOrders");
  if (ordEl) ordEl.textContent = allAdminOrders.length;

  const pendEl = document.getElementById("statsPendingOrders");
  if (pendEl) pendEl.textContent = `${pendingCount} طلب قيد الانتظار`;

  const prodEl = document.getElementById("statsTotalProducts");
  if (prodEl) prodEl.textContent = allAdminProducts.length;

  const catEl = document.getElementById("statsTotalCategories");
  if (catEl) catEl.textContent = `${allAdminCategories.length} أقسام`;

  // Render recent 5 orders
  const tbody = document.getElementById("recentOrdersTableBody");
  if (tbody) {
    const recent = allAdminOrders.slice(0, 5);
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:#94A3B8;">لا توجد طلبات مسجلة بعد في Supabase</td></tr>`;
    } else {
      tbody.innerHTML = recent.map(o => `
        <tr>
          <td><strong style="color:var(--secondary); font-family:monospace;">#${o.id.substring(0, 8)}</strong></td>
          <td>${o.customerName}</td>
          <td><a href="https://wa.me/${o.customerPhone.replace(/[^0-9]/g, '')}" target="_blank" style="color:#25D366; font-weight:700;">${o.customerPhone} 💬</a></td>
          <td>${o.wilaya || '-'}</td>
          <td style="font-weight:700; color:var(--primary);">${Number(o.total).toLocaleString()} د.ج</td>
          <td><span class="status-badge ${getStatusBadgeClass(o.status)}">${o.status}</span></td>
          <td style="font-size:0.82rem; color:#64748B;">${formatDate(o.created_at)}</td>
          <td>
            <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="viewOrderDetails('${o.id}')">معاينة</button>
          </td>
        </tr>
      `).join("");
    }
  }
}

// ==================== CATEGORIES MANAGEMENT ====================
async function loadAdminCategories() {
  const tbody = document.getElementById("adminCategoriesTableBody");
  const productCatSelect = document.getElementById("productCategorySelect");
  const filterCatSelect = document.getElementById("adminProductCategoryFilter");

  try {
    allAdminCategories = await db.getCategories();
  } catch (e) {
    console.error("Error loading categories:", e);
    allAdminCategories = [];
  }

  // Populate Categories Table
  if (tbody) {
    if (allAdminCategories.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem; color:#94A3B8;">لا توجد أقسام بعد. اضغطي على "إضافة قسم جديد" للبدء.</td></tr>`;
    } else {
      tbody.innerHTML = allAdminCategories.map(c => `
        <tr>
          <td style="font-family:monospace; font-size:0.8rem; color:#64748B;">${c.id}</td>
          <td><strong>${c.name}</strong></td>
          <td style="font-size:0.82rem; color:#64748B;">${formatDate(c.created_at)}</td>
          <td>
            <div style="display:flex; gap:0.4rem;">
              <button type="button" class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="openEditCategoryModal('${c.id}', '${escapeAttr(c.name)}')">تعديل ✏️</button>
              <button type="button" class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem; color:#DC2626; border-color:#FCA5A5;" onclick="deleteCategoryAction('${c.id}')">حذف 🗑️</button>
            </div>
          </td>
        </tr>
      `).join("");
    }
  }

  // Populate Product Category Select
  if (productCatSelect) {
    if (allAdminCategories.length === 0) {
      productCatSelect.innerHTML = `<option value="">-- يرجى إضافة قسم أولاً --</option>`;
    } else {
      productCatSelect.innerHTML = allAdminCategories.map(c => `
        <option value="${c.id}">${c.name}</option>
      `).join("");
    }
  }

  // Populate Filter Select
  if (filterCatSelect) {
    filterCatSelect.innerHTML = `<option value="all">جميع الأقسام</option>` + allAdminCategories.map(c => `
      <option value="${c.id}">${c.name}</option>
    `).join("");
  }
}

function openAddCategoryModal() {
  document.getElementById("categoryEditId").value = "";
  document.getElementById("categoryNameInput").value = "";
  document.getElementById("categoryModalTitle").textContent = "إضافة قسم جديد";
  openModal("categoryModal");
}
window.openAddCategoryModal = openAddCategoryModal;

function openEditCategoryModal(id, name) {
  document.getElementById("categoryEditId").value = id;
  document.getElementById("categoryNameInput").value = name;
  document.getElementById("categoryModalTitle").textContent = "تعديل اسم القسم";
  openModal("categoryModal");
}
window.openEditCategoryModal = openEditCategoryModal;

async function handleCategoryFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("categoryEditId").value;
  const name = document.getElementById("categoryNameInput").value.trim();
  const btn = document.getElementById("saveCategoryBtn");

  if (!name) return;

  if (btn) {
    btn.disabled = true;
    btn.textContent = "جاري الحفظ في Supabase...";
  }

  try {
    if (id) {
      await db.updateCategory(id, name);
      showToast("تم تحديث القسم بنجاح ✅", "success");
    } else {
      await db.addCategory(name);
      showToast("تمت إضافة القسم الجديد بنجاح ✅", "success");
    }
    closeModal("categoryModal");
    await loadAdminCategories();
    updateOverviewStats();
  } catch (err) {
    console.error("Save category error:", err);
    showToast(`فشل حفظ القسم: ${err.message || 'خطأ غير معروف'}`, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "حفظ القسم 💾";
    }
  }
}
window.handleCategoryFormSubmit = handleCategoryFormSubmit;

async function deleteCategoryAction(id) {
  if (!confirm("هل أنتِ متأكدة من حذف هذا القسم؟")) return;
  try {
    await db.deleteCategory(id);
    showToast("تم حذف القسم بنجاح", "success");
    await loadAdminCategories();
    updateOverviewStats();
  } catch (err) {
    console.error("Delete category error:", err);
    showToast(`فشل حذف القسم: ${err.message}`, "error");
  }
}
window.deleteCategoryAction = deleteCategoryAction;

// ==================== PRODUCTS MANAGEMENT ====================
async function loadAdminProducts() {
  const tbody = document.getElementById("adminProductsTableBody");
  try {
    allAdminProducts = await db.getProducts();
  } catch (err) {
    console.error("Error loading products from Supabase:", err);
    allAdminProducts = [];
  }

  renderAdminProductsTable(allAdminProducts);
}

function renderAdminProductsTable(products) {
  const tbody = document.getElementById("adminProductsTableBody");
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:3rem; color:#94A3B8;">
      لا توجد منتجات مسجلة في جدول products في Supabase.<br>اضغطي على <strong>"إضافة منتج جديد"</strong> لإضافة أول بيجاما أو عطر!
    </td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const cat = allAdminCategories.find(c => c.id === p.category_id);
    const catName = cat ? cat.name : "عام";
    const imgUrl = (p.images && p.images[0]) || "assets/images/logo.jpg";
    const sizesBadges = (p.sizes || []).map(s => `<span style="background:#F1F5F9; color:#475569; padding:2px 6px; border-radius:4px; font-size:0.75rem; margin-inline-end:3px;">${s}</span>`).join("");
    const colorsBadges = (p.colors || []).map(c => `<span style="background:#FFF1F2; color:#BE123C; padding:2px 6px; border-radius:4px; font-size:0.75rem; margin-inline-end:3px;">${c}</span>`).join("");

    return `
      <tr>
        <td>
          <img src="${imgUrl}" alt="${p.name}" style="width:50px; height:50px; object-fit:cover; border-radius:6px; border:1px solid #E2E8F0;" onerror="this.src='assets/images/logo.jpg'">
        </td>
        <td>
          <strong>${p.name}</strong>
          ${p.description ? `<div style="font-size:0.75rem; color:#64748B; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.description}</div>` : ''}
        </td>
        <td><span class="status-badge" style="background:#FDF2F8; color:#9D174D;">${catName}</span></td>
        <td style="font-weight:700; color:var(--secondary); font-size:1rem;">${Number(p.price).toLocaleString()} د.ج</td>
        <td>${sizesBadges || '<span style="color:#CBD5E1;">-</span>'}</td>
        <td>${colorsBadges || '<span style="color:#CBD5E1;">-</span>'}</td>
        <td style="font-size:0.8rem; color:#64748B;">${formatDate(p.created_at)}</td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button type="button" class="btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.8rem;" onclick="openEditProductModal('${p.id}')">تعديل ✏️</button>
            <button type="button" class="btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.8rem; color:#DC2626; border-color:#FCA5A5;" onclick="deleteProductAction('${p.id}')">حذف 🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function filterAdminProducts(query) {
  const q = (query || "").toLowerCase().trim();
  const filtered = allAdminProducts.filter(p => 
    p.name.toLowerCase().includes(q) || 
    (p.description && p.description.toLowerCase().includes(q))
  );
  renderAdminProductsTable(filtered);
}
window.filterAdminProducts = filterAdminProducts;

function filterAdminProductsByCategory(catId) {
  if (catId === "all") {
    renderAdminProductsTable(allAdminProducts);
  } else {
    const filtered = allAdminProducts.filter(p => p.category_id === catId);
    renderAdminProductsTable(filtered);
  }
}
window.filterAdminProductsByCategory = filterAdminProductsByCategory;

function openAddProductModal() {
  document.getElementById("productIdInput").value = "";
  document.getElementById("productNameInput").value = "";
  document.getElementById("productPriceInput").value = "";
  document.getElementById("productSizesInput").value = "S, M, L, XL, XXL";
  document.getElementById("productColorsInput").value = "وردي بودري, شمباني, أسود ملكي";
  document.getElementById("productImageUrlInput").value = "";
  document.getElementById("productImagePreview").src = "assets/images/logo.jpg";
  document.getElementById("productDescriptionInput").value = "";
  document.getElementById("productFileInput").value = "";
  document.getElementById("productFileUploadStatus").textContent = "";
  document.getElementById("productModalTitle").textContent = "إضافة منتج جديد لـ Supabase";
  openModal("productModal");
}
window.openAddProductModal = openAddProductModal;

function openEditProductModal(id) {
  const p = allAdminProducts.find(item => item.id === id);
  if (!p) return;

  document.getElementById("productIdInput").value = p.id;
  document.getElementById("productNameInput").value = p.name || "";
  document.getElementById("productPriceInput").value = p.price || "";
  document.getElementById("productSizesInput").value = (p.sizes || []).join(", ");
  document.getElementById("productColorsInput").value = (p.colors || []).join(", ");
  
  const imgUrl = (p.images && p.images[0]) || "";
  document.getElementById("productImageUrlInput").value = imgUrl;
  document.getElementById("productImagePreview").src = imgUrl || "assets/images/logo.jpg";
  document.getElementById("productDescriptionInput").value = p.description || "";
  document.getElementById("productFileInput").value = "";
  document.getElementById("productFileUploadStatus").textContent = "";

  const catSelect = document.getElementById("productCategorySelect");
  if (catSelect && p.category_id) {
    catSelect.value = p.category_id;
  }

  document.getElementById("productModalTitle").textContent = "تعديل تفاصيل المنتج";
  openModal("productModal");
}
window.openEditProductModal = openEditProductModal;

function appendProductSize(size) {
  const input = document.getElementById("productSizesInput");
  if (!input) return;
  const current = input.value.split(",").map(s => s.trim()).filter(Boolean);
  if (!current.includes(size)) {
    current.push(size);
    input.value = current.join(", ");
  }
}
window.appendProductSize = appendProductSize;

function appendProductColor(color) {
  const input = document.getElementById("productColorsInput");
  if (!input) return;
  const current = input.value.split(",").map(c => c.trim()).filter(Boolean);
  if (!current.includes(color)) {
    current.push(color);
    input.value = current.join(", ");
  }
}
window.appendProductColor = appendProductColor;

// Preview selected image and upload immediately or on submit
async function previewSelectedProductImage(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  const statusEl = document.getElementById("productFileUploadStatus");
  const preview = document.getElementById("productImagePreview");
  const urlInput = document.getElementById("productImageUrlInput");

  // Show local preview immediately
  const reader = new FileReader();
  reader.onload = e => { if (preview) preview.src = e.target.result; };
  reader.readAsDataURL(file);

  if (statusEl) {
    statusEl.textContent = "جاري رفع الصورة إلى Supabase Storage (bucket: products)... ⏳";
    statusEl.style.color = "#2563EB";
  }

  try {
    const uploadedUrl = await db.uploadProductImage(file);
    if (urlInput) urlInput.value = uploadedUrl;
    if (preview) preview.src = uploadedUrl;
    if (statusEl) {
      statusEl.textContent = "✅ تم رفع الصورة وحفظ الرابط بنجاح!";
      statusEl.style.color = "#16A34A";
    }
    showToast("تم رفع الصورة إلى سحابة Supabase بنجاح 🖼️", "success");
  } catch (err) {
    console.error("Storage upload error:", err);
    if (statusEl) {
      statusEl.textContent = `⚠️ تعذر الرفع التلقائي: ${err.message}. يمكنكِ كتابة رابط مباشر بالأسفل.`;
      statusEl.style.color = "#DC2626";
    }
  }
}
window.previewSelectedProductImage = previewSelectedProductImage;

async function handleProductFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("productIdInput").value;
  const name = document.getElementById("productNameInput").value.trim();
  const catId = document.getElementById("productCategorySelect").value;
  const price = Number(document.getElementById("productPriceInput").value);
  const sizesRaw = document.getElementById("productSizesInput").value;
  const colorsRaw = document.getElementById("productColorsInput").value;
  let imageUrl = document.getElementById("productImageUrlInput").value.trim();
  const description = document.getElementById("productDescriptionInput").value.trim();
  const btn = document.getElementById("saveProductBtn");

  if (!name || isNaN(price)) {
    showToast("يرجى إدخال اسم المنتج والسعر بشكل صحيح", "error");
    return;
  }

  const sizes = sizesRaw.split(",").map(s => s.trim()).filter(Boolean);
  const colors = colorsRaw.split(",").map(c => c.trim()).filter(Boolean);

  // If a file was selected but not uploaded yet
  const fileInput = document.getElementById("productFileInput");
  if (fileInput && fileInput.files && fileInput.files[0] && !imageUrl) {
    try {
      if (btn) btn.innerHTML = `<span>جاري رفع الصورة...</span> ⏳`;
      imageUrl = await db.uploadProductImage(fileInput.files[0]);
    } catch (upErr) {
      console.warn("Upload fallback error:", upErr);
    }
  }

  const productPayload = {
    name,
    category_id: catId || null,
    price,
    images: imageUrl ? [imageUrl] : [],
    description,
    sizes,
    colors
  };

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>جاري الحفظ في Supabase...</span> ⏳`;
  }

  try {
    if (id) {
      await db.updateProduct(id, productPayload);
      showToast("تم تحديث المنتج بنجاح في Supabase ✅", "success");
    } else {
      await db.addProduct(productPayload);
      showToast("تمت إضافة المنتج بنجاح إلى جدول products ✅", "success");
    }

    closeModal("productModal");
    await loadAdminProducts();
    updateOverviewStats();
  } catch (err) {
    console.error("Save product error:", err);
    showToast(`❌ خطأ في حفظ المنتج: ${err.message || 'تأكدي من سياسات RLS في Supabase'}`, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>حفظ المنتج في Supabase</span> 💾`;
    }
  }
}
window.handleProductFormSubmit = handleProductFormSubmit;

async function deleteProductAction(id) {
  if (!confirm("هل أنتِ متأكدة من حذف هذا المنتج نهائياً من Supabase؟")) return;

  try {
    await db.deleteProduct(id);
    showToast("تم حذف المنتج بنجاح من قاعدة البيانات", "success");
    await loadAdminProducts();
    updateOverviewStats();
  } catch (err) {
    console.error("Delete product error:", err);
    showToast(`فشل حذف المنتج: ${err.message}`, "error");
  }
}
window.deleteProductAction = deleteProductAction;

// ==================== ORDERS MANAGEMENT ====================
async function loadAdminOrders(filter = "all") {
  currentOrdersFilter = filter;
  try {
    allAdminOrders = await db.getOrders();
  } catch (err) {
    console.error("Error loading orders:", err);
    allAdminOrders = [];
  }

  renderAdminOrdersTable();
  updateOverviewStats();
}

function filterAdminOrders(status, btn) {
  currentOrdersFilter = status;
  document.querySelectorAll(".order-filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderAdminOrdersTable();
}
window.filterAdminOrders = filterAdminOrders;

function searchAdminOrders(query) {
  const q = (query || "").toLowerCase().trim();
  const filtered = allAdminOrders.filter(o => 
    o.customerName.toLowerCase().includes(q) ||
    o.customerPhone.includes(q) ||
    (o.wilaya && o.wilaya.toLowerCase().includes(q))
  );
  renderAdminOrdersTable(filtered);
}
window.searchAdminOrders = searchAdminOrders;

function renderAdminOrdersTable(listToRender) {
  const tbody = document.getElementById("adminOrdersTableBody");
  if (!tbody) return;

  let orders = listToRender || allAdminOrders;
  if (currentOrdersFilter !== "all") {
    orders = orders.filter(o => o.status === currentOrdersFilter);
  }

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:3rem; color:#94A3B8;">
      لا توجد طلبات في هذه الحالة حالياً.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const cleanPhone = (o.customerPhone || "").replace(/[^0-9]/g, "");
    const itemsCount = (o.items || []).reduce((sum, i) => sum + (Number(i.quantity || i.qty) || 1), 0);
    const firstItemName = o.items && o.items[0] ? o.items[0].name : "منتجات";

    return `
      <tr>
        <td>
          <div style="font-weight:700; color:var(--secondary); font-family:monospace;">#${o.id.substring(0, 8)}</div>
          <div style="font-size:0.75rem; color:#64748B;">${formatDate(o.created_at)}</div>
        </td>
        <td>
          <strong>${o.customerName}</strong>
        </td>
        <td>
          <a href="https://wa.me/${cleanPhone}" target="_blank" class="btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.8rem; color:#15803D; border-color:#86EFAC;">
            ${o.customerPhone} 💬
          </a>
        </td>
        <td>
          <div style="font-size:0.88rem; font-weight:600;">${o.wilaya || '-'}</div>
          ${o.address ? `<div style="font-size:0.75rem; color:#64748B;">${o.address}</div>` : ''}
        </td>
        <td>
          <div style="font-size:0.88rem;">${firstItemName} ${itemsCount > 1 ? `(+${itemsCount - 1})` : ''}</div>
          <span style="font-size:0.75rem; color:#64748B;">${itemsCount} قطع</span>
        </td>
        <td style="font-weight:800; color:var(--primary); font-size:1.05rem;">
          ${Number(o.total).toLocaleString()} د.ج
        </td>
        <td>
          <select class="form-control" style="padding:0.35rem 0.5rem; font-size:0.82rem; border-radius:6px; font-weight:700;" onchange="updateOrderStatusAction('${o.id}', this.value)">
            <option value="جديد" ${o.status === 'جديد' ? 'selected' : ''}>جديد 🟡</option>
            <option value="مؤكد" ${o.status === 'مؤكد' ? 'selected' : ''}>مؤكد 🔵</option>
            <option value="قيد الشحن" ${o.status === 'قيد الشحن' ? 'selected' : ''}>قيد الشحن 🚚</option>
            <option value="تم التوصيل" ${o.status === 'تم التوصيل' ? 'selected' : ''}>تم التوصيل 🟢</option>
            <option value="ملغى" ${o.status === 'ملغى' ? 'selected' : ''}>ملغى 🔴</option>
          </select>
        </td>
        <td>
          <div style="display:flex; gap:0.3rem;">
            <button type="button" class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="viewOrderDetails('${o.id}')">معاينة 👁️</button>
            <button type="button" class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="printOrderInvoice('${o.id}')">وصل 🖨️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function updateOrderStatusAction(id, newStatus) {
  try {
    await db.updateOrderStatus(id, newStatus);
    showToast(`تم تغيير حالة الطلب إلى "${newStatus}" بنجاح`, "success");
    await loadAdminOrders(currentOrdersFilter);
  } catch (err) {
    console.error("Order status update error:", err);
    showToast(`فشل تحديث حالة الطلب: ${err.message}`, "error");
  }
}
window.updateOrderStatusAction = updateOrderStatusAction;

function viewOrderDetails(id) {
  const o = allAdminOrders.find(item => item.id === id);
  if (!o) return;

  const body = document.getElementById("orderDetailsBody");
  if (!body) return;

  const cleanPhone = (o.customerPhone || "").replace(/[^0-9]/g, "");
  const itemsHtml = (o.items || []).map(i => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid #EDF2F7;">
      <div>
        <strong style="color:var(--secondary); font-size:0.95rem;">${i.name}</strong>
        <div style="font-size:0.8rem; color:#64748B;">
          ${i.size ? `المقاس: ${i.size} | ` : ''} ${i.color ? `اللون: ${i.color} | ` : ''} الكمية: ${i.quantity || i.qty || 1}
        </div>
      </div>
      <div style="font-weight:700; color:var(--primary);">
        ${(Number(i.price) * (Number(i.quantity || i.qty) || 1)).toLocaleString()} د.ج
      </div>
    </div>
  `).join("");

  body.innerHTML = `
    <div style="margin-bottom:1.25rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:2px solid var(--border-color); padding-bottom:0.75rem;">
        <div>
          <h4 style="color:var(--secondary); font-size:1.15rem; margin-bottom:0.2rem;">طلب رقم: #${o.id}</h4>
          <span style="font-size:0.82rem; color:#64748B;">التاريخ: ${formatDate(o.created_at)}</span>
        </div>
        <span class="status-badge ${getStatusBadgeClass(o.status)}" style="font-size:0.9rem; padding:0.4rem 0.8rem;">${o.status}</span>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; background:#F8FAFC; padding:1rem; border-radius:8px; margin-bottom:1.25rem;">
        <div>
          <div style="font-size:0.8rem; color:#64748B;">اسم الزبونة:</div>
          <strong style="font-size:1rem; color:var(--text-dark);">${o.customerName}</strong>
        </div>
        <div>
          <div style="font-size:0.8rem; color:#64748B;">رقم الهاتف:</div>
          <a href="https://wa.me/${cleanPhone}" target="_blank" style="font-weight:700; color:#15803D; font-size:1rem;">${o.customerPhone} 💬 مراسلة واتساب</a>
        </div>
        <div>
          <div style="font-size:0.8rem; color:#64748B;">الولاية:</div>
          <strong>${o.wilaya || '-'}</strong>
        </div>
        <div>
          <div style="font-size:0.8rem; color:#64748B;">العنوان الدقيق:</div>
          <strong>${o.address || '-'}</strong>
        </div>
      </div>

      <h5 style="color:var(--secondary); margin-bottom:0.5rem; font-size:1rem;">المنتجات المطلوبة:</h5>
      <div style="background:#fff; border:1px solid #E2E8F0; border-radius:8px; padding:0.5rem 1rem; margin-bottom:1rem;">
        ${itemsHtml || '<p style="color:#64748B;">لا توجد تفاصيل للمنتجات</p>'}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; background:#FFF1F2; padding:1rem; border-radius:8px; border:1px solid #FECDD3;">
        <span style="font-weight:700; color:#9F1239; font-size:1.05rem;">المبلغ الإجمالي للدفع عند الاستلام:</span>
        <strong style="font-size:1.35rem; color:var(--secondary);">${Number(o.total).toLocaleString()} د.ج</strong>
      </div>

      ${o.notes ? `
        <div style="margin-top:1rem; padding:0.75rem; background:#FEF3C7; border:1px solid #FCD34D; border-radius:6px; font-size:0.88rem; color:#92400E;">
          <strong>ملاحظات الزبونة:</strong> ${o.notes}
        </div>
      ` : ''}

      <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
        <button type="button" class="btn-secondary" onclick="printOrderInvoice('${o.id}')">طباعة الوصل 🖨️</button>
        <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً ${o.customerName} 🎀\nمعكِ متجر Souelle Pajamas بخصوص طلبيتك رقم #${o.id.substring(0, 8)}.`)}" target="_blank" class="btn-primary" style="background:#25D366; border-color:#25D366;">
          <span>تأكيد الطلب عبر واتساب</span> 💬
        </a>
      </div>
    </div>
  `;

  openModal("orderDetailsModal");
}
window.viewOrderDetails = viewOrderDetails;

function printOrderInvoice(id) {
  const o = allAdminOrders.find(item => item.id === id);
  if (!o) return;

  const printContainer = document.getElementById("printableInvoice");
  if (!printContainer) return;

  const itemsRows = (o.items || []).map(i => `
    <tr>
      <td style="border:1px solid #ddd; padding:8px;">${i.name} ${i.size ? `(${i.size})` : ''} ${i.color ? `(${i.color})` : ''}</td>
      <td style="border:1px solid #ddd; padding:8px; text-align:center;">${i.quantity || i.qty || 1}</td>
      <td style="border:1px solid #ddd; padding:8px; text-align:center;">${Number(i.price).toLocaleString()} د.ج</td>
      <td style="border:1px solid #ddd; padding:8px; text-align:center;">${(Number(i.price) * (Number(i.quantity || i.qty) || 1)).toLocaleString()} د.ج</td>
    </tr>
  `).join("");

  printContainer.innerHTML = `
    <div style="font-family:'Tajawal', sans-serif; direction:rtl; padding:20px; max-width:700px; margin:0 auto; border:2px solid #8A2846; border-radius:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #8A2846; padding-bottom:15px; margin-bottom:20px;">
        <div>
          <h2 style="color:#8A2846; margin:0;">Souelle Pajamas</h2>
          <div style="color:#666; font-size:13px;">بيجامات نوم فاخرة • عطور نسائية ساحرة</div>
          <div style="color:#666; font-size:13px;">الهاتف / واتساب: 0557 85 77 17</div>
        </div>
        <div style="text-align:left;">
          <h3 style="margin:0; color:#E8829C;">وصل تسليم طلبيّة</h3>
          <div style="font-family:monospace; font-size:13px; color:#555;">#${o.id.substring(0, 12)}</div>
          <div style="font-size:12px; color:#777;">التاريخ: ${new Date(o.created_at).toLocaleDateString("ar-DZ")}</div>
        </div>
      </div>

      <div style="background:#FFF9FA; border:1px solid #E8829C; border-radius:8px; padding:12px; margin-bottom:20px;">
        <h4 style="margin:0 0 8px 0; color:#8A2846;">معلومات الزبونة والتوصيل:</h4>
        <div style="font-size:14px; line-height:1.7;">
          <strong>الاسم:</strong> ${o.customerName} | <strong>الهاتف:</strong> ${o.customerPhone}<br>
          <strong>الولاية:</strong> ${o.wilaya || ''} | <strong>العنوان:</strong> ${o.address || ''}<br>
          ${o.notes ? `<strong>ملاحظات:</strong> ${o.notes}` : ''}
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
        <thead>
          <tr style="background:#8A2846; color:#fff;">
            <th style="border:1px solid #ddd; padding:8px; text-align:right;">المنتج</th>
            <th style="border:1px solid #ddd; padding:8px; width:70px;">الكمية</th>
            <th style="border:1px solid #ddd; padding:8px; width:100px;">السعر الفردي</th>
            <th style="border:1px solid #ddd; padding:8px; width:110px;">المجموع</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div style="display:flex; justify-content:space-between; align-items:center; background:#FFF1F2; border:1px solid #FECDD3; border-radius:8px; padding:12px 18px; margin-bottom:25px;">
        <span style="font-size:16px; font-weight:700; color:#9F1239;">المبلغ المستحق للدفع عند الاستلام:</span>
        <strong style="font-size:22px; color:#8A2846;">${Number(o.total).toLocaleString()} د.ج</strong>
      </div>

      <div style="text-align:center; font-size:13px; color:#666; border-top:1px dashed #ccc; padding-top:10px;">
        ✨ شكراً لثقتكِ بـ Souelle Pajamas! يحق لكِ معاينة الطلبية قبل الدفع للموزع. ✨
      </div>
    </div>
  `;

  window.print();
}
window.printOrderInvoice = printOrderInvoice;

// ==================== DELIVERY RATES & SEED ====================
async function loadDeliveryRates() {
  const tbody = document.getElementById("deliveryRatesTableBody");
  try {
    allAdminDeliveryRates = await db.getDeliveryPrices();
  } catch (err) {
    console.error("Error loading delivery prices:", err);
    allAdminDeliveryRates = [];
  }

  if (!tbody) return;

  if (allAdminDeliveryRates.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:2.5rem; color:#94A3B8;">
          جدول أسعار التوصيل (delivery_prices) فارغ حالياً في Supabase.<br>
          <button type="button" class="btn-primary" style="margin-top:1rem; background:#059669; border-color:#059669;" onclick="seed58WilayasAction()">
            🌱 اضغطي هنا لزرع أسعار التوصيل لـ 58 ولاية فوراً
          </button>
        </td>
      </tr>
    `;
    return;
  }

  renderDeliveryTableRows(allAdminDeliveryRates);
}

function renderDeliveryTableRows(rates) {
  const tbody = document.getElementById("deliveryRatesTableBody");
  if (!tbody) return;

  tbody.innerHTML = rates.map(r => `
    <tr>
      <td style="font-weight:700; color:var(--secondary);">${r.wilaya_code}</td>
      <td><strong>${r.wilaya_name}</strong></td>
      <td>
        <input type="number" id="homePrice_${r.wilaya_code}" class="form-control" value="${r.home_price}" style="width:130px; display:inline-block; font-weight:700;"> د.ج
      </td>
      <td>
        <input type="number" id="deskPrice_${r.wilaya_code}" class="form-control" value="${r.desk_price}" style="width:130px; display:inline-block; font-weight:700;"> د.ج
      </td>
      <td>
        <button type="button" class="btn-secondary" style="padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="saveSingleDeliveryPrice(${r.wilaya_code})">حفظ 💾</button>
      </td>
    </tr>
  `).join("");
}

function filterDeliveryTable(query) {
  const q = (query || "").toLowerCase().trim();
  const filtered = allAdminDeliveryRates.filter(r => 
    String(r.wilaya_code).includes(q) ||
    r.wilaya_name.toLowerCase().includes(q)
  );
  renderDeliveryTableRows(filtered);
}
window.filterDeliveryTable = filterDeliveryTable;

async function saveSingleDeliveryPrice(code) {
  const home = document.getElementById(`homePrice_${code}`)?.value;
  const desk = document.getElementById(`deskPrice_${code}`)?.value;

  if (home === undefined || desk === undefined) return;

  try {
    await db.updateDeliveryPrice(code, home, desk);
    showToast(`تم تحديث سعر التوصيل لولاية رقم ${code} بنجاح ✅`, "success");
  } catch (err) {
    console.error("Save delivery price error:", err);
    showToast(`فشل حفظ السعر: ${err.message}`, "error");
  }
}
window.saveSingleDeliveryPrice = saveSingleDeliveryPrice;

// Seed all 58 wilayas into delivery_prices in Supabase
async function seed58WilayasAction() {
  if (typeof ALGERIA_WILAYAS === "undefined") {
    showToast("تعذر العثور على بيانات الولايات في wilayas.js", "error");
    return;
  }

  if (!confirm("هل ترغبين بزرع/تحديث أسعار التوصيل لجميع ولايات الجزائر الـ 58 في Supabase؟")) {
    return;
  }

  showToast("جاري زرع أسعار التوصيل لـ 58 ولاية في Supabase... 🚚", "info");

  try {
    await db.seedDeliveryPrices(ALGERIA_WILAYAS);
    showToast("✅ تم زرع وتحديث أسعار التوصيل لـ 58 ولاية بنجاح في Supabase!", "success");
    await loadDeliveryRates();
  } catch (err) {
    console.error("Seeding error:", err);
    showToast(`❌ فشل زرع أسعار التوصيل: ${err.message}`, "error");
  }
}
window.seed58WilayasAction = seed58WilayasAction;

// ==================== STORE SETTINGS & BRANDING ====================
async function loadStoreSettingsIntoForm() {
  try {
    const s = await db.getSettings();

    // Announcement bar
    const topbarText = document.getElementById("customTopbarText");
    if (topbarText) topbarText.value = s.topbar?.text || DEFAULT_CONFIG.topbar.text;
    const topbarWa = document.getElementById("customTopbarWaLabel");
    if (topbarWa) topbarWa.value = s.topbar?.whatsappLabel || DEFAULT_CONFIG.topbar.whatsappLabel;

    // Headings
    const pBadge = document.getElementById("customProductsBadge");
    if (pBadge) pBadge.value = s.sections?.products?.badge || DEFAULT_CONFIG.sections.products.badge;
    const pTitle = document.getElementById("customProductsTitle");
    if (pTitle) pTitle.value = s.sections?.products?.title || DEFAULT_CONFIG.sections.products.title;
    const pSub = document.getElementById("customProductsSubtitle");
    if (pSub) pSub.value = s.sections?.products?.subtitle || DEFAULT_CONFIG.sections.products.subtitle;

    // Branding
    const storeName = document.getElementById("settingsStoreName");
    if (storeName) storeName.value = s.storeName || DEFAULT_CONFIG.storeName;
    const tagline = document.getElementById("settingsStoreTagline");
    if (tagline) tagline.value = s.storeTagline || DEFAULT_CONFIG.storeTagline;
    const waNum = document.getElementById("settingsWhatsappNum");
    if (waNum) waNum.value = s.whatsappNumber || DEFAULT_CONFIG.whatsappNumber;
    const waDisp = document.getElementById("settingsWhatsappDisplay");
    if (waDisp) waDisp.value = s.whatsappDisplay || DEFAULT_CONFIG.whatsappDisplay;
    const igHandle = document.getElementById("settingsInstagramHandle");
    if (igHandle) igHandle.value = s.instagramHandle || DEFAULT_CONFIG.instagramHandle;
    const heroBadge = document.getElementById("settingsHeroBadge");
    if (heroBadge) heroBadge.value = s.hero?.badge || DEFAULT_CONFIG.hero.badge;
    const heroTitle = document.getElementById("settingsHeroTitle");
    if (heroTitle) heroTitle.value = s.hero?.title || DEFAULT_CONFIG.hero.title;
    const heroSub = document.getElementById("settingsHeroSubtitle");
    if (heroSub) heroSub.value = s.hero?.subtitle || DEFAULT_CONFIG.hero.subtitle;

    // Theme
    if (s.theme) {
      setPickerValue("colorPickerPrimary", s.theme.primary || "#E8829C");
      setPickerValue("colorPickerSecondary", s.theme.secondary || "#8A2846");
      setPickerValue("colorPickerAccent", s.theme.accent || "#D4AF37");
      setPickerValue("colorPickerBg", s.theme.background || "#FFF9FA");
    }
  } catch (err) {
    console.warn("Could not populate settings form:", err);
  }
}

function setPickerValue(id, val) {
  const el = document.getElementById(id);
  const textEl = document.getElementById(`${id}Text`);
  if (el) el.value = val;
  if (textEl) textEl.textContent = val;
}

async function saveSectionHeadings(e) {
  e.preventDefault();
  const current = await db.getSettings();
  const updated = {
    ...current,
    topbar: {
      ...current.topbar,
      text: document.getElementById("customTopbarText")?.value || current.topbar.text,
      whatsappLabel: document.getElementById("customTopbarWaLabel")?.value || current.topbar.whatsappLabel
    },
    sections: {
      ...current.sections,
      products: {
        badge: document.getElementById("customProductsBadge")?.value,
        title: document.getElementById("customProductsTitle")?.value,
        subtitle: document.getElementById("customProductsSubtitle")?.value
      }
    }
  };

  try {
    await db.saveSettings(updated);
    showToast("تم حفظ وتحديث نصوص الأقسام في Supabase ✅", "success");
  } catch (err) {
    showToast(`فشل الحفظ: ${err.message}`, "error");
  }
}
window.saveSectionHeadings = saveSectionHeadings;

async function saveBrandingAndThemeSettings(e) {
  e.preventDefault();
  const current = await db.getSettings();

  const primary = document.getElementById("colorPickerPrimary")?.value || "#E8829C";
  const secondary = document.getElementById("colorPickerSecondary")?.value || "#8A2846";
  const accent = document.getElementById("colorPickerAccent")?.value || "#D4AF37";
  const bg = document.getElementById("colorPickerBg")?.value || "#FFF9FA";

  const updated = {
    ...current,
    storeName: document.getElementById("settingsStoreName")?.value || current.storeName,
    storeTagline: document.getElementById("settingsStoreTagline")?.value || current.storeTagline,
    whatsappNumber: document.getElementById("settingsWhatsappNum")?.value || current.whatsappNumber,
    whatsappDisplay: document.getElementById("settingsWhatsappDisplay")?.value || current.whatsappDisplay,
    instagramHandle: document.getElementById("settingsInstagramHandle")?.value || current.instagramHandle,
    hero: {
      ...current.hero,
      badge: document.getElementById("settingsHeroBadge")?.value || current.hero.badge,
      title: document.getElementById("settingsHeroTitle")?.value || current.hero.title,
      subtitle: document.getElementById("settingsHeroSubtitle")?.value || current.hero.subtitle
    },
    theme: {
      primary,
      secondary,
      accent,
      background: bg,
      primaryHover: "#D66B86",
      accentHover: "#B89728"
    }
  };

  try {
    await db.saveSettings(updated);
    showToast("تم حفظ كافة إعدادات الهوية والألوان في Supabase ✅✨", "success");
  } catch (err) {
    showToast(`فشل الحفظ: ${err.message}`, "error");
  }
}
window.saveBrandingAndThemeSettings = saveBrandingAndThemeSettings;

// ==================== HELPERS ====================
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("active");
}
window.openModal = openModal;

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("active");
}
window.closeModal = closeModal;

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

function getStatusBadgeClass(status) {
  switch (status) {
    case "جديد": return "status-pending";
    case "مؤكد": return "status-confirmed";
    case "قيد الشحن": return "status-shipping";
    case "تم التوصيل": return "status-delivered";
    case "ملغى": return "status-cancelled";
    default: return "status-pending";
  }
}

function formatDate(isoStr) {
  if (!isoStr) return "-";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("ar-DZ", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (e) {
    return isoStr;
  }
}

function escapeAttr(str) {
  return (str || "").replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function copySqlSchema() {
  const sql = `-- كود الجداول وقواعد RLS الكاملة لمتجر Souelle Pajamas
-- يمكنكِ نسخه ولصقه في SQL Editor في Supabase:
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price NUMERIC NOT NULL,
  images TEXT[] DEFAULT '{}',
  description TEXT,
  sizes TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delivery_prices (
  wilaya_code INT PRIMARY KEY,
  wilaya_name TEXT NOT NULL,
  home_price NUMERIC NOT NULL DEFAULT 600,
  desk_price NUMERIC NOT NULL DEFAULT 400
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  wilaya TEXT NOT NULL,
  address TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL,
  status TEXT DEFAULT 'جديد',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- تفعيل RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on products" ON public.products FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated all on products" ON public.products FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow public read on categories" ON public.categories FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated all on categories" ON public.categories FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow public read on delivery" ON public.delivery_prices FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated all on delivery" ON public.delivery_prices FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow public insert on orders" ON public.orders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow authenticated all on orders" ON public.orders FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow public read on settings" ON public.store_settings FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated all on settings" ON public.store_settings FOR ALL TO authenticated USING (true);`;

  navigator.clipboard.writeText(sql).then(() => {
    showToast("تم نسخ كود SQL الكامل إلى الحافظة بنجاح 📋", "success");
  });
}
window.copySqlSchema = copySqlSchema;
