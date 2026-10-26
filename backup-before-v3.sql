PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_init.sql','2026-10-21 08:55:17');
CREATE TABLE products (
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
INSERT INTO "products" ("id","name","slug","category","description","price","compare_at_price","stock","sizes","colors","image_key","featured","created_at") VALUES(2,'Áo sơ mi Oxford','ao-so-mi-oxford','Áo','Sơ mi tối giản, dễ phối đồ.',429000,NULL,34,'["M","L","XL"]','["Trắng","Xanh"]',NULL,1,'2026-10-21 08:55:17');
INSERT INTO "products" ("id","name","slug","category","description","price","compare_at_price","stock","sizes","colors","image_key","featured","created_at") VALUES(7,'Dép Đúc Bánh Mì Nam Nữ Dép Đúc Nguyên Khối Đế Răng Cưa','dep-thich-hop-mang-di-lai-hang-ngay','Dép',replace('Màu sắc: như hình ảnh mô tả \n\n-  Size: 36-43 nam nữ đều vừa chân, thời trang mới không sợ hết thời\n\n-  Xuất xứ: Việt Nam\n\nĐẶC ĐIỂM NỔI BẬT:\n\nÊm ái chịu lực đàn hồi tốt \n\n- Không bị xẹp lún trong thời gian sử dụng\n\n - Độ bền cao chịu nắng chịu nước, đi được quanh năm\n\n Quai tốt độ bền cao chống nước \n\n- Chống chịu thời tiết tốt\n\n- Chịu nước thoải mái\n\n- Được dùng xử lý nên phần keo rất bền kết dính cực kì tốt \n\n- Cảm giác mang: Dép nhẹ cực kì vừa vặn ôm chân size chuẩn \n\n- Đế mềm mại, chống trượt \n\nPHONG CÁCH - PHỐI ĐỒ\n\n- Dép quai ngang rất dễ phối đồ thích hợp cả quần jean, quần short, đồ thể thao, áo thun\n\n- Dép thích hợp mang đi lại hàng ngày \n\n- Đi học, đi chơi, đi trong nhà đều đẹp và rất dễ phối đồ\n\n- Dép cực kì thời trang dễ dàng phối được với các loại trang phục quần áo, áo thun, quần jean. \n\n- Thích hợp cho một outfit nhẹ nhàng năng động với trang phục quần áo thể thao \n\n- Nhẹ nhàng với sơ mi quần tây đi học nhanh gọn - Dép quai ngang là lựa chọn nhanh chóng cho bạn và tiết kiệm thời gian \n\n- Dép mang hàng ngày và cũng có thể đi đến bất kì đâu trong mọi trang phục từ áo phông rộng đến quần đùi \n\n- Dép bền đẹp chịu nước tốt có thể phối đồ outfit đồ đẹp cùng bạn đi dưới mưa','\n',char(10)),89000,120000,1000,'["36","37","38","39","40","41","42","43"]','["Kem","trà sữa","đen","nâu"]','products/ab252d14-0e1a-44e4-bf30-f7c7b72003f1.png',1,'2026-10-21 09:32:36');
INSERT INTO "products" ("id","name","slug","category","description","price","compare_at_price","stock","sizes","colors","image_key","featured","created_at") VALUES(8,'Dép basic nam nữ chữ thêu ELEMENTS đế cao','dep-basic-nam-nu-chu-theu-elements-de-cao','Dép',replace('Thông số kỹ thuật sản phẩm\n\nTên sản phẩm: Dép basic nam nữ chữ thêu ELE đế cao 4cm đệm êm đế chống trơn trượt Luxe E18 thoải mái dễ phối đồ\n\nChất liệu:\n\nQuai dép: Quai vải denim, họa tiết chữ thêu nổi, đệm lót êm ái, không gây đau chân.\n\nĐế dép: Cao su tổng hợp, chống trơn trượt, độ bền cao.\n\nĐặc điểm nổi bật:\n\nĐế cao 4cm, siêu tôn dáng và thoải mái.\n\nHọa tiết chữ thêu nổi bật, mang phong cách thời trang hiện đại, dễ phối đồ.\n\nKích thước: Size 36 - 43 (Xem hướng dẫn chọn size bên dưới).\n\nQuy cách đóng gói:\n\nĐóng gói bọc dán cẩn thận với mút bảo vệ quai dép.\n\nSản phẩm được kiểm tra kỹ càng trước khi giao hàng.\n\nMàu sắc: Đen tối giản, sang trọng, phù hợp với mọi phong cách.','\n',char(10)),139700,254000,100,'["36","37","38","39","40","41","42","43"]','["Đen","Trắng","Xanh"]','products/bba09b6f-0f93-4dac-92cb-17d833b57192.png',1,'2026-10-21 09:47:01');
INSERT INTO "products" ("id","name","slug","category","description","price","compare_at_price","stock","sizes","colors","image_key","featured","created_at") VALUES(9,'Giày Sneaker Nam CHAO SHOES G3005 Chất Vải Canvas Kiểu Dáng Hàn Quốc Dễ Phối Đồ','giay-sneaker-nam-chao-shoes-g3005-chat-vai-canvas-kieu-dang-han-quoc-de-phoi-do','Giày',replace('✔️ Chất Liệu : Giày được làm từ vải Canvas cao cấp giúp Giày càng thêm bền đẹp\n\n✔️ Lên chân êm ái, di chuyển nhẹ nhàng\n\n✔️ Kiểu Dáng :Trẻ Trung, Kiểu Dáng Thời Trang Phong Cách\n\n✔️ Thiết Kế : Form Giày thời trang năng động, kiểu dáng thời trang cao cấp không lo lỗi mốt\n\n✔️ Đế giày : Đế được làm từ cao su giúp giày thêm bền đẹp hợp êm chân, thoải mái khi di chuyển\n\n✔️ Thích hợp đi chơi, dạo phố, đi dạo…..\n\n✔️ Dễ dàng phối đồ trang phục phụ kiện mặc nhiều kiểu\n\n✔️ Thích hợp với các mùa trong năm: Xuân - Hè - Thu - Đông\n\n✔️ Thanh toán khi nhận hàng\n\n✔️ Đến với Shop bạn hoàn toàn có thể yên tâm hàng đảm bảo chất lượng, tốt nhất trong tầm giá.( không có hàng lỗi, hàng thứ cấp )\n\n💥 HƯỚNG DẪN BẢO QUẢN GIÀY THỂ THAO NAM\n\n✔️ Để giày ở nơi khô ráo thoáng mát để giữ giày được bền đẹp hơn\n\n✔️ Vệ sinh giày, dùng khăn hay bàn trải lông mềm để chải sạch giày cùng với nước tẩy rửa giày chuyên dụng với da hay da Pu\n\n✔️ Có thể giặt giày cùng với chất tẩy rửa nhẹ','\n',char(10)),200000,250000,10,'["36","37","38","39","40","41","42","43"]','["Đen","Trắng","Xanh"]','products/f5a41dcc-7d7a-4577-b096-48dae0ce9141.png',1,'2026-10-21 09:51:43');
INSERT INTO "products" ("id","name","slug","category","description","price","compare_at_price","stock","sizes","colors","image_key","featured","created_at") VALUES(10,'Áo Thun Nam Nữ Unisex Tay Lỡ, Áo Phông Cotton From Rộng Crop Stuido Doodle Art','ao-thun-nam-nu-unisex-tay-lo-ao-phong-cotton-form-rong-crop-studio-doodle-art','Áo',replace('Áo Thun Nam Nữ Unisex Tay Lỡ, Áo Phông Cotton From Rộng Crop Stuido Doodle Art\n\nTHÔNG TIN SẢN PHẨM:\n\n• Áo thun nam nữ unisex tay lỡ, áo phông cotton from rộng AD69 Oversize\n\n• Kiểu dáng: Unisex, Freesize, Tay lỡ, Form rộng\n\n• Xuất sứ: Việt Nam\n\n• Chất liệu: Poly , cotton co dãn, không xù\n\n• Họa tiết: In\n\n• Màu sắc: Đen, Trắng','\n',char(10)),67620,138000,45,'["S","M","L","XL","XXL"]','["Đen","Trắng"]','products/557111d2-5fea-4e5e-a9d4-7f5df022cd92.png',0,'2026-10-21 09:55:20');
INSERT INTO "products" ("id","name","slug","category","description","price","compare_at_price","stock","sizes","colors","image_key","featured","created_at") VALUES(11,'Quần short jean nam chất liệu jean mềm thoáng mát','quan-short-jean-nam-chat-lieu-jean-mem-thoang-mat','Quần',replace('Chất liệu\nDenim\nKiểu dáng quần\nThường\nChiều dài quần\nDài 3/4\nXuất xứ\nViệt Nam\nRất lớn\nCó','\n',char(10)),129000,169000,37,'["S","M","L","XL"]','["Đen","Xanh","Xám"]','products/563493eb-f442-49ae-8a6a-1250e7c75a39.png',1,'2026-10-21 09:58:01');
INSERT INTO "products" ("id","name","slug","category","description","price","compare_at_price","stock","sizes","colors","image_key","featured","created_at") VALUES(12,'Quần Sịp Đùi Boxer Nam (22-100kg) cao cấp mẫu cún thun lạnh, Sịp Nam Menswear co dãn 4 chiều lịch lãm T13','quan-sip-dui-boxer-nam-22-100kg-thun-lanh-co-gian-4-chieu-mau-cun-t13','Quần',replace('Quần Sịp Đùi Boxer Nam cao cấp mẫu thun lạnh, Sịp Nam Menswear co dãn 4 chiều lịch lãm T13\n\nThông tin sản phẩm:\n\n👉 Quần lót nam chất liệu cotton cao cấp, có khả năng thấm hút mồ hôi tốt, thông thoáng, co giãn đàn hồi cả 4 chiều đem lại cảm giác thoải mái khi mặc.  Bề mặt vải mềm, mịn không bai dão sau thời gian dài sử dụng.\n\n👉 Thiết kế đặc biệt cho bạn tự tin vận động, tạo vẻ quyến rũ đầy nam tính\n\n👉 Cạp chun bản rộng co giãn, phù hợp với nhiều lứa tuổi, không gây hằn trên da\n\n👉 Khử mùi nhanh, co giãn 4 chiều tạo cảm giác thoải mái không bí\n\n👉 Khả năng kháng khuẩn cực tốt \n\n👉 Không bai giãn, sổ lông trong quá trình sử dụng \n\n👉 Sản phẩm tinh tế và luôn được ưa chuộng','\n',char(10)),24000,40000,400,'["S","M","L","XL"]','["Đen","Trắng","Xám","Xanh"]','products/b59cf2e1-8ebb-49c5-af66-ad18de81dff2.png',1,'2026-10-21 10:06:12');
INSERT INTO "products" ("id","name","slug","category","description","price","compare_at_price","stock","sizes","colors","image_key","featured","created_at") VALUES(13,'Quần Đùi Nam Nữ Ở Nhà Giá Sinh Viên','quan-dui-nam-nu-o-nha-gia-sinh-vien','Quần',replace('Bạn đang tìm kiếm quần đùi nam mặc ở nhà vừa thoải mái, vừa thời trang, lại còn giá hợp lý? Sản phẩm quần đùi nam mặc ở nhà của shop chính là lựa chọn hoàn hảo dành cho bạn!\n\nChất liệu cao cấp: Thun cotton co giãn, mềm mại, thoáng mát, thấm hút mồ hôi tốt, không gây bí bách khi mặc lâu.\n\nForm dáng chuẩn: Thiết kế trẻ trung, năng động, phù hợp với nhiều dáng người, không quá ôm sát, mang lại cảm giác thoải mái suốt cả ngày.\n\nLý tưởng để mặc:\n\nỞ nhà, ngủ trưa, nghỉ ngơi\n\nTập gym nhẹ, yoga\n\nĐi siêu thị, dạo phố, đi biển, picnic\n\nMặc trong nhà trọ, ký túc xá, phòng lạnh...','\n',char(10)),29749,45000,2434,'["S","M","L","XL","XXL"]','["Đỏ","Xanh","Trắng"]','products/a1e84030-347b-4845-9fb0-97fcceaebbf2.png',1,'2026-10-21 10:16:55');
CREATE TABLE orders (
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
INSERT INTO "orders" ("id","code","customer_name","phone","address","note","total","status","created_at") VALUES(1,'VL-D4D801E8','hdhdhdh','038578338','jrjfjjirifjfbj4i48rifuf r thtfir8ri t tfifif8f888','hh',429000,'cancelled','2026-10-21 09:36:09');
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL
);
INSERT INTO "order_items" ("id","order_id","product_id","product_name","size","color","quantity","unit_price") VALUES(1,1,2,'Áo sơ mi Oxford','M','Trắng',1,429000);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('products',13);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('orders',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('order_items',1);
CREATE INDEX idx_products_category ON products(category);
CREATE TRIGGER prevent_negative_stock BEFORE UPDATE OF stock ON products
WHEN NEW.stock < 0 BEGIN SELECT RAISE(ABORT, 'Insufficient stock'); END;
