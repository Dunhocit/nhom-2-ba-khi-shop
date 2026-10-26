-- Additive migration; never drops legacy products, orders or order_items.
CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS customer_sessions(token_hash TEXT PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_user ON customer_sessions(customer_id);
CREATE TABLE IF NOT EXISTS wishlists(customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, PRIMARY KEY(customer_id,product_id));
CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL REFERENCES customers(id), product_id INTEGER NOT NULL REFERENCES products(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(customer_id,product_id));
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE TABLE IF NOT EXISTS vouchers(code TEXT PRIMARY KEY COLLATE NOCASE, discount_type TEXT NOT NULL CHECK(discount_type IN ('fixed','percent')), discount_value INTEGER NOT NULL CHECK(discount_value > 0), min_order INTEGER NOT NULL DEFAULT 0 CHECK(min_order >= 0), max_uses INTEGER NOT NULL DEFAULT 100 CHECK(max_uses >= 0), used_count INTEGER NOT NULL DEFAULT 0 CHECK(used_count >= 0), active INTEGER NOT NULL DEFAULT 1, expires_at TEXT);
ALTER TABLE orders ADD COLUMN customer_id INTEGER REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN voucher_code TEXT;
ALTER TABLE orders ADD COLUMN discount INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE TABLE IF NOT EXISTS order_events(id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id), status TEXT NOT NULL, message TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
