# Nhóm 2 - Bá Khí — Fashion Store trên Cloudflare

Bộ source gồm giao diện cửa hàng responsive, UX mua hàng (lọc/tìm kiếm/xem chi tiết/size/màu/giỏ hàng/checkout COD), trang quản trị sản phẩm, hình ảnh và đơn hàng, Hono API và Cloudflare D1 + KV + R2.

## Công nghệ
- FE: HTML/CSS/JavaScript, không yêu cầu build (nằm ở `frontend/`)
- BE: Hono + TypeScript trên Cloudflare Workers (`backend/src/index.ts`)
- D1: danh mục sản phẩm, tồn kho, đơn hàng và chi tiết đơn (`backend/migrations/0001_init.sql`)
- KV: cache danh sách sản phẩm (60 giây); giỏ hàng demo nằm ở localStorage trình duyệt
- R2: ảnh sản phẩm qua `/api/admin/images` và `/api/images/...`

> Cloudflare dùng **R2**, không có dịch vụ ảnh tên G2. Bộ ảnh Unsplash ban đầu chỉ mang tính demo, chưa nằm trong R2. Có thể thay bằng ảnh thật qua trang quản trị.

## Cài và chạy local
Yêu cầu Node.js 20+ và tài khoản Cloudflare.

```bash
npm install
cp .dev.vars.example .dev.vars  # Windows CMD: copy .dev.vars.example .dev.vars
# chỉnh ADMIN_TOKEN trong .dev.vars thành chuỗi bí mật ít nhất 20 ký tự
npx wrangler d1 migrations apply fashion_db --local
npm run dev
```

Mở địa chỉ do Wrangler in ra (thường `http://localhost:8787`). Trang quản trị: `http://localhost:8787/?admin=1`. Trong môi trường local, nếu bindings chưa được cấu hình đầy đủ, Wrangler có thể tạo bản D1/KV/R2 giả lập tuỳ phiên bản.

## Triển khai lên Cloudflare

1. Đăng nhập: `npx wrangler login`.
2. Tạo D1: `npx wrangler d1 create fashion_db` và sao chép `database_id` vào `wrangler.toml`.
3. Tạo KV: `npx wrangler kv namespace create CACHE` (hoặc với CLI mới `npx wrangler kv namespace create CACHE`); sao chép namespace ID vào `wrangler.toml`.
4. Tạo R2: `npx wrangler r2 bucket create nhom2-ba-khi-images`. **R2 có thể yêu cầu kích hoạt thanh toán trong tài khoản Cloudflare**.
5. Tạo secret không đưa vào Git: `npx wrangler secret put ADMIN_TOKEN` rồi nhập chuỗi ngẫu nhiên dài ít nhất 20 ký tự.
6. Chạy schema + dữ liệu mẫu lên remote: `npm run db:migrate:remote`.
7. Deploy: `npm run deploy`. Wrangler sẽ trả URL `*.workers.dev` hoặc dùng custom domain.
8. Mở `https://your-url.workers.dev/?admin=1`, nhập ADMIN_TOKEN, upload ảnh và quản lý sản phẩm.

**Lưu ý**: một số phiên bản Wrangler có cú pháp KV khác (`npx wrangler kv:namespace create CACHE`); chạy `npx wrangler kv --help` để xem cú pháp phù hợp. Với local, hãy thay ID giả trong `wrangler.toml` bằng ID tạo thực.

## API chính
| Method | Path | Tác dụng |
|---|---|---|
| GET | `/api/health` | Kiểm tra API |
| GET | `/api/products?q=&category=` | Danh sách và lọc sản phẩm |
| GET | `/api/products/:id` | Chi tiết sản phẩm |
| POST | `/api/orders` | Gửi đơn COD, tính giá từ D1 |
| GET | `/api/images/:key` | Đọc ảnh từ R2 |
| POST | `/api/admin/images` | Upload file ảnh, cần Bearer ADMIN_TOKEN |
| POST | `/api/admin/products` | Tạo sản phẩm |
| PATCH | `/api/admin/products/:id` | Sửa sản phẩm |
| DELETE | `/api/admin/products/:id` | Xóa sản phẩm chưa có đơn |
| GET | `/api/admin/orders` | Danh sách 100 đơn mới nhất |
| PATCH | `/api/admin/orders/:id` | Cập nhật trạng thái đơn |

## Ranh giới demo / cần bổ sung trước production
- Admin dùng shared secret: **nên thay bằng Cloudflare Access hoặc hệ thống xác thực nhân viên phân quyền**, kèm CSRF/đăng nhập/chống brute force phù hợp.
- Chưa tích hợp thanh toán trực tuyến (VNPay, MoMo), hãng vận chuyển, voucher, thuế, email, xác nhận thanh toán và quy trình hoàn kho khi hủy.
- Cần anti-bot/rate limit (Cloudflare WAF/Turnstile) ở `/api/orders`, hạn chế spam đơn; xử lý dữ liệu cá nhân theo quy định.
- D1 lưu hàng tồn theo sản phẩm, chưa tách tồn kho theo biến thể size/màu. Có trigger chống trừ âm và D1 batch transactional.
- Bảng orders chưa có đăng nhập khách, lịch sử đơn và phân trang; ảnh cũ không tự xóa khỏi R2 khi cập nhật/xóa sản phẩm.
- Cần ảnh thương hiệu/chính sách thật, kiểm thử đơn hàng, kiểm thử phụ tải và backup D1 trước vận hành kinh doanh.
- Mức miễn ship trên banner chỉ là nội dung demo; chưa có logic phí vận chuyển tự động.

## Cấu trúc
```text
nhom2-ba-khi-shop/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Hono API core
│   │   └── commerce.ts       # Module thương mại nâng cao
│   └── migrations/
│       ├── 0001_init.sql
│       └── 0002_commerce.sql
├── frontend/
│   ├── index.html            # Cửa hàng, responsive + dashboard admin
│   ├── app.js                # Hành vi frontend & giỏ hàng
│   └── commerce.js           # Tài khoản, review, voucher
├── wrangler.toml
├── package.json
└── .dev.vars.example
```
