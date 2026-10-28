import { commerce, type ShopBindings } from './commerce';
import { chatbot } from './chatbot';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

type Bindings = ShopBindings;
type Product = {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  sizes: string;
  colors: string;
  image_key: string | null;
  featured: number;
  created_at: string;
};
const app = new Hono<{ Bindings: Bindings }>();
app.use(
  '/api/*',
  cors({
    origin: (origin) => origin || '',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);
const fail = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
const admin = (c: any) => {
  const secret = c.env.ADMIN_TOKEN;
  return Boolean(
    secret && secret.length >= 20 && c.req.header('authorization') === `Bearer ${secret}`,
  );
};
const productSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.string().trim().min(1).max(60),
  description: z.string().max(2000).default(''),
  price: z.number().int().nonnegative(),
  compare_at_price: z.number().int().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative(),
  sizes: z.array(z.string().min(1).max(15)).min(1).max(20),
  colors: z.array(z.string().min(1).max(30)).min(1).max(20),
  image_key: z.string().nullable().optional(),
  featured: z.boolean().default(false),
});
const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+() .-]{9,20}$/),
  address: z.string().trim().min(10).max(500),
  note: z.string().max(500).default(''),
  voucher_code: z.string().trim().max(30).optional(),
  items: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().int().min(1).max(20),
        size: z.string().max(15),
        color: z.string().max(30),
      }),
    )
    .min(1)
    .max(30),
});
const mapped = (p: Product) => ({
  ...p,
  sizes: JSON.parse(p.sizes),
  colors: JSON.parse(p.colors),
  image_url: p.image_key ? `/api/images/${encodeURIComponent(p.image_key)}` : null,
});
async function invalidate(env: Bindings) {
  await env.CACHE.delete('products:v1');
}

app.get('/api/health', (c) => c.json({ ok: true, service: 'nhom2-ba-khi-fashion' }));
app.get('/api/products', async (c) => {
  let products: Product[];
  const cached = await c.env.CACHE.get('products:v1');
  if (cached) {
    products = JSON.parse(cached);
  } else {
    const result = await c.env.DB.prepare(
      'SELECT * FROM products ORDER BY featured DESC, id DESC',
    ).all<Product>();
    products = result.results;
    await c.env.CACHE.put('products:v1', JSON.stringify(products), { expirationTtl: 60 });
  }
  const cat = c.req.query('category');
  const search = (c.req.query('q') || '').toLocaleLowerCase('vi');
  const filtered = products.filter(
    (p) =>
      (!cat || p.category === cat) &&
      (!search || `${p.name} ${p.description}`.toLocaleLowerCase('vi').includes(search)),
  );
  return c.json({ products: filtered.map(mapped) });
});
app.get('/api/products/:id', async (c) => {
  const p = await c.env.DB.prepare('SELECT * FROM products WHERE id=?')
    .bind(c.req.param('id'))
    .first<Product>();
  return p ? c.json({ product: mapped(p) }) : c.json({ error: 'Không tìm thấy sản phẩm' }, 404);
});
app.get('/api/images/:key{.+}', async (c) => {
  const key = c.req.param('key');
  if (!/^products\/[a-zA-Z0-9._/-]+$/.test(key) || key.includes('..'))
    return fail('Ảnh không hợp lệ');
  const obj = await c.env.IMAGES.get(key);
  if (!obj) return fail('Không tìm thấy ảnh', 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('Cache-Control', 'public, max-age=86400');
  return new Response(obj.body, { headers });
});
app.post('/api/admin/images', async (c) => {
  if (!admin(c)) return fail('Không có quyền', 401);
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) return fail('Cần upload file');
  if (file.size > 5 * 1024 * 1024) return fail('Ảnh vượt quá 5MB');
  const types = ['image/jpeg', 'image/png', 'image/webp'];
  if (!types.includes(file.type)) return fail('Chỉ nhận JPG, PNG, WebP');
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng =
    signature[0] === 137 && signature[1] === 80 && signature[2] === 78 && signature[3] === 71;
  const isJpg = signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
  const isWebp =
    String.fromCharCode(...signature.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...signature.slice(8, 12)) === 'WEBP';
  if (!(isPng || isJpg || isWebp)) return fail('Nội dung file không phải ảnh hỗ trợ');
  const ext = isPng ? 'png' : isJpg ? 'jpg' : 'webp';
  const key = `products/${crypto.randomUUID()}.${ext}`;
  await c.env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` },
  });
  return c.json({ key, url: `/api/images/${key}` }, 201);
});
app.post('/api/admin/products', async (c) => {
  if (!admin(c)) return fail('Không có quyền', 401);
  const parsed = productSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ');
  const p = parsed.data;
  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO products(name,slug,category,description,price,compare_at_price,stock,sizes,colors,image_key,featured) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
    )
      .bind(
        p.name,
        p.slug,
        p.category,
        p.description,
        p.price,
        p.compare_at_price ?? null,
        p.stock,
        JSON.stringify(p.sizes),
        JSON.stringify(p.colors),
        p.image_key ?? null,
        p.featured ? 1 : 0,
      )
      .run();
    await invalidate(c.env);
    return c.json({ id: result.meta.last_row_id }, 201);
  } catch {
    return fail('Slug đã tồn tại hoặc dữ liệu không hợp lệ');
  }
});
app.patch('/api/admin/products/:id', async (c) => {
  if (!admin(c)) return fail('Không có quyền', 401);
  const parsed = productSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ');
  const p = parsed.data;
  try {
    const r = await c.env.DB.prepare(
      'UPDATE products SET name=?,slug=?,category=?,description=?,price=?,compare_at_price=?,stock=?,sizes=?,colors=?,image_key=?,featured=? WHERE id=?',
    )
      .bind(
        p.name,
        p.slug,
        p.category,
        p.description,
        p.price,
        p.compare_at_price ?? null,
        p.stock,
        JSON.stringify(p.sizes),
        JSON.stringify(p.colors),
        p.image_key ?? null,
        p.featured ? 1 : 0,
        c.req.param('id'),
      )
      .run();
    if (!r.meta.changes) return fail('Không tìm thấy', 404);
    await invalidate(c.env);
    return c.json({ ok: true });
  } catch {
    return fail('Slug bị trùng hoặc dữ liệu không hợp lệ');
  }
});
app.delete('/api/admin/products/:id', async (c) => {
  if (!admin(c)) return fail('Không có quyền', 401);
  try {
    const r = await c.env.DB.prepare('DELETE FROM products WHERE id=?')
      .bind(c.req.param('id'))
      .run();
    await invalidate(c.env);
    return c.json({ ok: true, deleted: r.meta.changes });
  } catch {
    return fail('Sản phẩm đã có đơn hàng, không thể xóa', 409);
  }
});
app.post('/api/orders', async (c) => {
  const parsed = checkoutSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return fail('Thông tin đặt hàng không hợp lệ: ' + parsed.error.issues[0]?.message);
  const o = parsed.data;
  const seen = new Set<string>();
  for (const item of o.items) {
    const key = `${item.product_id}|${item.size}|${item.color}`;
    if (seen.has(key)) return fail('Sản phẩm trong đơn bị lặp');
    seen.add(key);
  }
  const ids = [...new Set(o.items.map((x) => x.product_id))];
  const placeholders = ids.map(() => '?').join(',');
  const result = await c.env.DB.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<Product>();
  const lookup = new Map(result.results.map((p) => [p.id, p]));
  let total = 0;
  const quantities = new Map<number, number>();
  for (const item of o.items) {
    const p = lookup.get(item.product_id);
    if (!p) return fail('Sản phẩm không còn tồn tại');
    if (!JSON.parse(p.sizes).includes(item.size) || !JSON.parse(p.colors).includes(item.color))
      return fail('Kích cỡ hoặc màu sắc không hợp lệ');
    quantities.set(p.id, (quantities.get(p.id) || 0) + item.quantity);
    total += p.price * item.quantity;
  }
  if (total > 1000000000) return fail('Đơn hàng vượt giới hạn');
  for (const [id, qty] of quantities) {
    if (lookup.get(id)!.stock < qty) return fail(`Không đủ hàng: ${lookup.get(id)!.name}`);
  }
  let discount = 0;
  let voucherCode: string | null = null;
  let voucher: any = null;
  if (o.voucher_code) {
    voucher = await c.env.DB.prepare(
      `SELECT * FROM vouchers WHERE code=? AND active=1 AND used_count<max_uses AND (expires_at IS NULL OR expires_at>datetime('now'))`,
    )
      .bind(o.voucher_code.toUpperCase())
      .first();
    if (!voucher || total < voucher.min_order)
      return fail('Voucher hết hạn hoặc chưa đủ điều kiện');
    discount = Math.min(
      total,
      voucher.discount_type === 'percent'
        ? Math.floor((total * voucher.discount_value) / 100)
        : voucher.discount_value,
    );
    voucherCode = voucher.code;
  }
  const authValue = c.req.header('authorization') || '';
  const sessionToken = authValue.replace(/^Bearer /, '');
  let userId: number | null = null;
  if (/^[a-f0-9]{64}$/.test(sessionToken)) {
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sessionToken))),
      (x) => x.toString(16).padStart(2, '0'),
    ).join('');
    const found = await c.env.DB.prepare(
      `SELECT customer_id FROM customer_sessions WHERE token_hash=? AND expires_at>datetime('now')`,
    )
      .bind(digest)
      .first<{ customer_id: number }>();
    userId = found?.customer_id ?? null;
  }
  const code = 'VL-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  const inserts = o.items.map((i) => {
    const p = lookup.get(i.product_id)!;
    return c.env.DB.prepare(
      'INSERT INTO order_items(order_id,product_id,product_name,size,color,quantity,unit_price) VALUES((SELECT id FROM orders WHERE code=?),?,?,?,?,?,?)',
    ).bind(code, i.product_id, p.name, i.size, i.color, i.quantity, p.price);
  });
  const decrements = [...quantities].map(([id, qty]) =>
    c.env.DB.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?').bind(
      qty,
      id,
      qty,
    ),
  );
  try {
    const ops = [
      ...decrements,
      c.env.DB.prepare(
        'INSERT INTO orders(code,customer_name,phone,address,note,total,customer_id,voucher_code,discount) VALUES(?,?,?,?,?,?,?,?,?)',
      ).bind(
        code,
        o.customer_name,
        o.phone,
        o.address,
        o.note,
        total - discount,
        userId,
        voucherCode,
        discount,
      ),
      ...inserts,
      ...(voucherCode
        ? [
            c.env.DB.prepare(
              'UPDATE vouchers SET used_count=used_count+1 WHERE code=? AND used_count<max_uses AND active=1',
            ).bind(voucherCode),
          ]
        : []),
    ];
    const results = await c.env.DB.batch(ops);
    if (
      decrements.some((_, i) => results[i].meta.changes !== 1) ||
      (voucherCode && results[results.length - 1].meta.changes !== 1)
    )
      return fail('Số lượng hàng vừa thay đổi, vui lòng thử lại', 409);
    await invalidate(c.env);
    return c.json(
      { code, total: total - discount, discount, message: 'Đã ghi nhận đơn hàng COD' },
      201,
    );
  } catch {
    return fail('Không thể tạo đơn, vui lòng thử lại', 409);
  }
});
app.get('/api/admin/orders', async (c) => {
  if (!admin(c)) return fail('Không có quyền', 401);
  const orders = await c.env.DB.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 100').all();
  return c.json({ orders: orders.results });
});
app.patch('/api/admin/orders/:id', async (c) => {
  if (!admin(c)) return fail('Không có quyền', 401);
  const parsed = z
    .object({ status: z.enum(['pending', 'confirmed', 'shipping', 'completed', 'cancelled']) })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return fail('Trạng thái không hợp lệ');
  const r = await c.env.DB.prepare('UPDATE orders SET status=? WHERE id=?')
    .bind(parsed.data.status, c.req.param('id'))
    .run();
  return c.json({ ok: Boolean(r.meta.changes) });
});
app.route('/api', commerce);
app.route('/api', chatbot);
app.onError((e, c) => {
  console.error(e);
  return c.json({ error: 'Lỗi máy chủ' }, 500);
});
export default app;
