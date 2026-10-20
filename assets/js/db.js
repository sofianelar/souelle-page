// ========================================================
// Souelle Pajamas - Supabase Database Layer
// Pure Supabase Backend - No localStorage for products
// ========================================================

class StoreDB {
  constructor() {
    this.CART_KEY = "souelle_cart";
    this.SETTINGS_CACHE_KEY = "souelle_settings_cache";
    this.client = window.supabaseClient;
    this.applyThemeColors();
  }

  // Ensure supabase client is available
  getClient() {
    if (!this.client && window.supabaseClient) {
      this.client = window.supabaseClient;
    }
    return this.client;
  }

  // ==================== AUTHENTICATION ====================
  async getCurrentSession() {
    const sb = this.getClient();
    if (!sb) return null;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) {
        console.warn("Session check error:", error);
        return null;
      }
      return data?.session || null;
    } catch (e) {
      console.error("Auth session error:", e);
      return null;
    }
  }

  async signInAdmin(email, password) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase client is not initialized");
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });
    if (error) throw error;
    return data;
  }

  async signOutAdmin() {
    const sb = this.getClient();
    if (sb) {
      const { error } = await sb.auth.signOut();
      if (error) console.warn("Sign out error:", error);
    }
    sessionStorage.removeItem("souelle_admin_logged_in");
    localStorage.removeItem("souelle_admin_logged_in");
  }

  // ==================== PRODUCTS (SUPABASE ONLY) ====================
  async getProducts() {
    const sb = this.getClient();
    if (!sb) {
      console.error("Supabase client is not available");
      return [];
    }

    try {
      const { data, error } = await sb
        .from("products")
        .select(`
          id,
          name,
          category_id,
          price,
          images,
          description,
          sizes,
          colors,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching products from Supabase:", error);
        throw error;
      }

      // Normalize array structure
      return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        category_id: p.category_id,
        price: Number(p.price) || 0,
        images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
        image: (Array.isArray(p.images) && p.images.length > 0) ? p.images[0] : "assets/images/logo.jpg",
        description: p.description || "",
        sizes: Array.isArray(p.sizes) ? p.sizes : [],
        colors: Array.isArray(p.colors) ? p.colors : [],
        created_at: p.created_at
      }));
    } catch (err) {
      console.error("Failed to load products:", err);
      throw err;
    }
  }

  async addProduct(product) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase client is not available");

    const payload = {
      name: product.name,
      category_id: product.category_id || null,
      price: Number(product.price),
      images: Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []),
      description: product.description || "",
      sizes: Array.isArray(product.sizes) ? product.sizes : [],
      colors: Array.isArray(product.colors) ? product.colors : []
    };

    const { data, error } = await sb
      .from("products")
      .insert([payload])
      .select();

    if (error) {
      console.error("Supabase error adding product:", error);
      throw error;
    }
    return data && data[0];
  }

  async updateProduct(id, product) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase client is not available");

    const payload = {
      name: product.name,
      category_id: product.category_id || null,
      price: Number(product.price),
      images: Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []),
      description: product.description || "",
      sizes: Array.isArray(product.sizes) ? product.sizes : [],
      colors: Array.isArray(product.colors) ? product.colors : []
    };

    const { data, error } = await sb
      .from("products")
      .update(payload)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase error updating product:", error);
      throw error;
    }
    return data && data[0];
  }

  async deleteProduct(id) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase client is not available");

    const { error } = await sb
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase error deleting product:", error);
      throw error;
    }
    return true;
  }

  // ==================== STORAGE IMAGE UPLOAD ====================
  async uploadProductImage(file) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase client is not available");

    const bucketName = window.STORAGE_BUCKET || "products";
    const fileExt = file.name.split(".").pop();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
    const fileName = `${Date.now()}_${cleanFileName}.${fileExt}`;
    const filePath = fileName;

    const { data, error } = await sb.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) {
      console.error("Supabase storage upload error:", error);
      throw error;
    }

    const { data: urlData } = sb.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  // ==================== CATEGORIES (SUPABASE) ====================
  async getCategories() {
    const sb = this.getClient();
    if (!sb) return [];

    try {
      const { data, error } = await sb
        .from("categories")
        .select("id, name, created_at")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("Failed to fetch categories:", e);
      return [];
    }
  }

  async addCategory(name) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase client is not available");

    const { data, error } = await sb
      .from("categories")
      .insert([{ name: name.trim() }])
      .select();

    if (error) {
      console.error("Error adding category:", error);
      throw error;
    }
    return data && data[0];
  }

  async updateCategory(id, name) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase client is not available");

    const { data, error } = await sb
      .from("categories")
      .update({ name: name.trim() })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating category:", error);
      throw error;
    }
    return data && data[0];
  }

  async deleteCategory(id) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase client is not available");

    const { error } = await sb
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
    return true;
  }

  // ==================== DELIVERY PRICES (58 WILAYAS) ====================
  async getDeliveryPrices() {
    const sb = this.getClient();
    if (!sb) return [];

    try {
      const { data, error } = await sb
        .from("delivery_prices")
        .select("wilaya_code, wilaya_name, home_price, desk_price")
        .order("wilaya_code", { ascending: true });

      if (error) {
        console.error("Error fetching delivery prices:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("Failed to load delivery prices:", e);
      return [];
    }
  }

  async updateDeliveryPrice(wilayaCode, homePrice, deskPrice) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase client is not available");

    const { data, error } = await sb
      .from("delivery_prices")
      .update({
        home_price: Number(homePrice),
        desk_price: Number(deskPrice)
      })
      .eq("wilaya_code", Number(wilayaCode))
      .select();

    if (error) {
      console.error("Error updating delivery price:", error);
      throw error;
    }
    return data;
  }

  async seedDeliveryPrices(wilayasList) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase client is not available");

    const rows = (wilayasList || []).map(w => ({
      wilaya_code: Number(w.code),
      wilaya_name: w.name,
      home_price: Number(w.home_price) || 600,
      desk_price: Number(w.desk_price) || 400
    }));

    const { data, error } = await sb
      .from("delivery_prices")
      .upsert(rows, { onConflict: "wilaya_code" });

    if (error) {
      console.error("Error seeding delivery prices:", error);
      throw error;
    }
    return data;
  }

  // ==================== ORDERS (SUPABASE) ====================
  async getOrders() {
    const sb = this.getClient();
    if (!sb) return [];

    try {
      const { data, error } = await sb
        .from("orders")
        .select("id, customer_name, phone, wilaya, address, items, total, status, notes, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        throw error;
      }

      return (data || []).map(o => ({
        id: o.id,
        customerName: o.customer_name,
        customerPhone: o.phone,
        wilaya: o.wilaya,
        address: o.address,
        items: Array.isArray(o.items) ? o.items : [],
        total: Number(o.total) || 0,
        status: o.status || "جديد",
        notes: o.notes || "",
        created_at: o.created_at,
        date: o.created_at
      }));
    } catch (e) {
      console.error("Failed to get orders:", e);
      throw e;
    }
  }

  async createOrder(orderData) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase client is not available");

    const payload = {
      customer_name: orderData.customerName,
      phone: orderData.customerPhone,
      wilaya: orderData.wilaya,
      address: orderData.address,
      items: orderData.items || [],
      total: Number(orderData.total),
      status: "جديد",
      notes: orderData.notes || null
    };

    const { data, error } = await sb
      .from("orders")
      .insert([payload])
      .select();

    if (error) {
      console.error("Error creating order in Supabase:", error);
      throw error;
    }

    const created = data && data[0];
    return {
      id: created.id,
      customerName: created.customer_name,
      customerPhone: created.phone,
      wilaya: created.wilaya,
      address: created.address,
      items: created.items,
      total: created.total,
      status: created.status,
      notes: created.notes,
      created_at: created.created_at
    };
  }

  async updateOrderStatus(id, newStatus) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase client is not available");

    const { data, error } = await sb
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
    return data;
  }

  // ==================== STORE SETTINGS ====================
  async getSettings() {
    const sb = this.getClient();
    let config = { ...DEFAULT_CONFIG };

    if (sb) {
      try {
        const { data, error } = await sb
          .from("store_settings")
          .select("key, value")
          .eq("key", "main_config")
          .maybeSingle();

        if (!error && data && data.value) {
          config = { ...DEFAULT_CONFIG, ...data.value };
        }
      } catch (e) {
        console.warn("Could not read remote store settings, using defaults:", e);
      }
    }
    return config;
  }

  async saveSettings(newSettings) {
    const sb = this.getClient();
    const current = await this.getSettings();
    const merged = { ...current, ...newSettings };

    this.applyThemeColors(merged.theme);

    if (sb) {
      const { data, error } = await sb
        .from("store_settings")
        .upsert({
          key: "main_config",
          value: merged
        }, { onConflict: "key" });

      if (error) {
        console.error("Error saving settings to Supabase:", error);
        throw error;
      }
    }
    return merged;
  }

  applyThemeColors(theme) {
    const t = theme || DEFAULT_CONFIG.theme;
    const root = document.documentElement;
    if (!root) return;
    root.style.setProperty("--primary", t.primary || "#E8829C");
    root.style.setProperty("--primary-hover", t.primaryHover || "#D66B86");
    root.style.setProperty("--secondary", t.secondary || "#8A2846");
    root.style.setProperty("--accent", t.accent || "#D4AF37");
    root.style.setProperty("--accent-hover", t.accentHover || "#B89728");
    root.style.setProperty("--bg-main", t.background || "#FFF9FA");
    root.style.setProperty("--card-bg", t.cardBg || "#FFFFFF");
    root.style.setProperty("--text-dark", t.textDark || "#2B2226");
    root.style.setProperty("--text-muted", t.textMuted || "#7A6D74");
  }

  // ==================== SHOPPING CART (BROWSER SESSION) ====================
  getCart() {
    try {
      const data = sessionStorage.getItem(this.CART_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveCart(cart) {
    try {
      sessionStorage.setItem(this.CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error("Error saving cart:", e);
    }
  }

  addToCart(product, size = "", color = "", qty = 1) {
    const cart = this.getCart();
    const cartKey = `${product.id}_${size}_${color}`;
    const existingIndex = cart.findIndex(item => item.cartKey === cartKey);

    if (existingIndex > -1) {
      cart[existingIndex].qty += qty;
    } else {
      cart.push({
        cartKey: cartKey,
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || (product.images && product.images[0]) || "assets/images/logo.jpg",
        size: size,
        color: color,
        qty: qty
      });
    }
    this.saveCart(cart);
    return cart;
  }

  updateCartQty(cartKey, qty) {
    let cart = this.getCart();
    if (qty <= 0) {
      cart = cart.filter(item => item.cartKey !== cartKey);
    } else {
      const item = cart.find(i => i.cartKey === cartKey);
      if (item) item.qty = qty;
    }
    this.saveCart(cart);
    return cart;
  }

  clearCart() {
    sessionStorage.removeItem(this.CART_KEY);
  }
}

// Global instance
window.db = new StoreDB();
