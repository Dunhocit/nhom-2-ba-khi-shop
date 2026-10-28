CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK(price >= 0),
  compare_at_price INTEGER CHECK(compare_at_price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  sizes TEXT NOT NULL DEFAULT '["S","M","L","XL"]',
  colors TEXT NOT NULL DEFAULT '["Đen","Trắng"]',
  image_key TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL
);
INSERT OR IGNORE INTO products(name,slug,category,description,price,compare_at_price,stock,sizes,colors,featured) VALUES
('Áo thun Essential','ao-thun-essential','Áo','Chất cotton thoáng mát, phom unisex.',249000,329000,45,'["S","M","L","XL"]','["Trắng","Đen","Kem"]',1),
('Áo sơ mi Oxford','ao-so-mi-oxford','Áo','Sơ mi tối giản, dễ phối đồ.',429000,NULL,35,'["M","L","XL"]','["Trắng","Xanh"]',1),
('Quần jeans Straight','quan-jeans-straight','Quần','Denim đứng phom, phong cách hiện đại.',549000,699000,24,'["28","29","30","31","32"]','["Xanh denim","Đen"]',1),
('Áo khoác Varsity','ao-khoac-varsity','Áo khoác','Khoác nhẹ năng động cho ngày se lạnh.',799000,999000,16,'["M","L","XL"]','["Đen","Nâu"]',1),
('Chân váy chữ A','chan-vay-chu-a','Váy','Thiết kế thanh lịch, dễ kết hợp.',389000,NULL,27,'["S","M","L"]','["Đen","Be"]',0),
('Quần ống rộng Relax','quan-ong-rong-relax','Quần','Thoải mái vận động, phong cách đường phố.',459000,529000,38,'["S","M","L","XL"]','["Xám","Đen"]',0);
CREATE TRIGGER IF NOT EXISTS prevent_negative_stock BEFORE UPDATE OF stock ON products
WHEN NEW.stock < 0 BEGIN SELECT RAISE(ABORT, 'Insufficient stock'); END;
