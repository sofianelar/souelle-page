-- ========================================================
-- Souelle Pajamas (Pyjamas Femmes & Parfums)
-- Database Schema & RLS Policies for Supabase
-- Project URL: https://bypkpgzvwyrxukrdsyfw.supabase.co
-- ========================================================

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products Table
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

-- 3. Delivery Prices Table (58 Algerian Wilayas)
CREATE TABLE IF NOT EXISTS public.delivery_prices (
  wilaya_code INT PRIMARY KEY,
  wilaya_name TEXT NOT NULL,
  home_price NUMERIC NOT NULL DEFAULT 600,
  desk_price NUMERIC NOT NULL DEFAULT 400
);

-- 4. Orders Table
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

-- 5. Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- ========================================================
-- Row Level Security (RLS) Configuration
-- ========================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if needed
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated can manage products" ON public.products;
DROP POLICY IF EXISTS "Public can view delivery prices" ON public.delivery_prices;
DROP POLICY IF EXISTS "Authenticated can manage delivery prices" ON public.delivery_prices;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated can view and manage orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Authenticated can manage store settings" ON public.store_settings;

-- Categories Policies
CREATE POLICY "Public can view categories" ON public.categories 
  FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage categories" ON public.categories 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products Policies
CREATE POLICY "Public can view products" ON public.products 
  FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage products" ON public.products 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Delivery Prices Policies
CREATE POLICY "Public can view delivery prices" ON public.delivery_prices 
  FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage delivery prices" ON public.delivery_prices 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Orders Policies (Customers can create orders anonymously, Admin can read/update all)
CREATE POLICY "Public can insert orders" ON public.orders 
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authenticated can view and manage orders" ON public.orders 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Store Settings Policies
CREATE POLICY "Public can view store settings" ON public.store_settings 
  FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage store settings" ON public.store_settings 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ========================================================
-- Storage Configuration (Bucket: products)
-- Run this to create the bucket & allow public reading + admin uploads
-- ========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for 'products' bucket
DROP POLICY IF EXISTS "Public can view products bucket images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images to products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update/delete images in products" ON storage.objects;

CREATE POLICY "Public can view products bucket images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can upload images to products" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products');

CREATE POLICY "Authenticated users can update/delete images in products" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'products');
