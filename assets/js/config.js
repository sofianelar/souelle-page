// ========================================================
// Souelle Pajamas (Pyjamas Femmes & Parfums)
// Single Configuration File for Storefront & Admin Dashboard
// ========================================================

const SUPABASE_URL = "https://bypkpgzvwyrxukrdsyfw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_TNyim2oDwbfPICNYWw_QCw_phhFjwII";
const STORAGE_BUCKET = "products";

// Initialize Supabase Client globally if library loaded
let supabaseClient = null;
if (typeof supabase !== "undefined" && supabase.createClient) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}
window.supabaseClient = supabaseClient;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.STORAGE_BUCKET = STORAGE_BUCKET;

// Store Branding & Defaults
const DEFAULT_CONFIG = {
  storeName: "Souelle Pajamas",
  storeTagline: "نعومة • أناقة • أنوثة | راحتك، أسلوبنا",
  logoUrl: "assets/images/logo.jpg",
  whatsappNumber: "+213557857717",
  whatsappDisplay: "0557 85 77 17",
  instagramHandle: "souelle_pajamas",
  instagramUrl: "https://instagram.com/souelle_pajamas",
  currency: "د.ج",

  topbar: {
    enabled: true,
    text: "🚚 التوصيل متوفر لجميع الولايات (58 ولاية) • الدفع عند الاستلام مع إمكانية المعاينة قبل الدفع ✨",
    whatsappLabel: "خدمة الزبائن (واتساب):"
  },

  hero: {
    badge: "✨ التشكيلة الحصرية 2026",
    title: "نعومة فائقة وأناقة <span>تليق بأنوثتك</span>",
    subtitle: "اكتشفي أرقى تشكيلات بيجامات النوم الفاخرة والعطور الساحرة المصممة خصيصاً للمرأة العصرية الأنيقة. أقمشة حريرية ناعمة وعطور تلامس الروح مع توصيل سريع لباب منزلك.",
    bannerImage: "assets/images/hero-banner.jpg",
    ctaPrimaryText: "تسوّقي البيجامات الآن",
    ctaSecondaryText: "اكتشفي العطور",
    ctaWhatsappText: "استفسار فوري عبر واتساب"
  },

  sections: {
    products: {
      badge: "🎀 أرقى الموديلات",
      title: "التشكيلة المختارة لكِ",
      subtitle: "بيجامات نوم راقية، أطقم عرائس وعطور تمنحك شعوراً استثنائياً بالدلال"
    },
    reviews: {
      badge: "⭐ تجارب حقيقية",
      title: "ماذا تقول زبوناتنا الوفيات؟",
      subtitle: "أكثر من 1,500 زبونة سعيدة عبر كامل التراب الوطني"
    },
    deliveryBanner: {
      badge: "🚚 خدمة شحن احترافية",
      title: "نوصلك وين ما كنتِ في الجزائر (58 ولاية)",
      subtitle: "توصيل سريع وموثوق إلى باب منزلك أو استلام من المكتب، مع ضمان المعاينة قبل الدفع لراحة بالك التامة."
    }
  },

  features: [
    { icon: "🚚", title: "توصيل سريع لـ 58 ولاية", desc: "توصيل لباب دارك أو المكتب خلال 24 إلى 48 ساعة فقط." },
    { icon: "💎", title: "أقمشة حريرية فاخرة", desc: "خامات ناعمة وباردة منتقاة بعناية لراحتك التامة." },
    { icon: "🤝", title: "الدفع عند الاستلام", desc: "افتحي طلبيتك وعاينيها قبل دفع أي دينار للموزع." },
    { icon: "💬", title: "خدمة زبائن فورية", desc: "فريقنا في خدمتك يومياً عبر الواتساب للإجابة عن كل استفسار." }
  ],

  reviews: [
    {
      id: "rev-1",
      name: "سارة م.",
      city: "وهران (Oran)",
      stars: 5,
      text: "وصلتني البيجاما الحريرية لولاية وهران في 24 ساعة، القماش بزاف خفيف وبارد وناعم، لا فينيسيون تحفة كيما فالفوطو تماماً. شكراً بزاف Souelle Pajamas!"
    },
    {
      id: "rev-2",
      name: "مريم ك.",
      city: "الجزائر العاصمة",
      stars: 5,
      text: "شريت عطر Souelle Rose Nocturne مع البيجاما، الريحة تع العطر تبقى شادة يومين في القش، حتى راجلي عجبو بزاف. تعامل راقي وتوصيل سريع للعاصمة."
    },
    {
      id: "rev-3",
      name: "نورهان ب.",
      city: "قسنطينة (Constantine)",
      stars: 5,
      text: "كنت نوجد فجهازي وديت الطقم العرائسي الأبيض الملكي، الدانتيل فرنسي تحفة والبياض ناصع، فرحت بيه بزاف ربي يباركلكم فرزقكم."
    }
  ],

  theme: {
    primary: "#E8829C",
    primaryHover: "#D66B86",
    secondary: "#8A2846",
    accent: "#D4AF37",
    accentHover: "#B89728",
    background: "#FFF9FA",
    cardBg: "#FFFFFF",
    textDark: "#2B2226",
    textMuted: "#7A6D74"
  }
};

window.DEFAULT_CONFIG = DEFAULT_CONFIG;
