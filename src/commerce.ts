import { Hono } from 'hono';
import { z } from 'zod';
export type ShopBindings = {
  DB: D1Database;
  CACHE: KVNamespace;
  IMAGES: R2Bucket;
  ASSETS: Fetcher;
  ADMIN_TOKEN: string;
};
export const commerce = new Hono<{ Bindings: ShopBindings }>();
const error = (_c: any, message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
const allowedAdmin = (c: any) =>
  Boolean(
    c.env.ADMIN_TOKEN?.length >= 20 &&
    c.req.header('authorization') === `Bearer ${c.env.ADMIN_TOKEN}`,
  );
const encoder = new TextEncoder();
const hex = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b), (v) => v.toString(16).padStart(2, '0')).join('');
async function sha(text: string) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
}
async function derive(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  return hex(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 210000, hash: 'SHA-256' },
      key,
      256,
    ),
  );
}
type AuthCustomer = { id: number; name: string; email: string };
async function loggedIn(c: any): Promise<AuthCustomer | null> {
  const token = (c.req.header('authorization') || '').replace(/^Bearer /, '');
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const customer = await c.env.DB.prepare(
    `SELECT customers.id,customers.name,customers.email FROM customer_sessions JOIN customers ON customer_sessions.customer_id=customers.id WHERE token_hash=? AND expires_at>datetime('now')`,
  )
    .bind(await sha(token))
    .first();
  return customer as AuthCustomer | null;
}
async function issue(c: any, id: number) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
    v.toString(16).padStart(2, '0'),
  ).join('');
  await c.env.DB.prepare(
    `INSERT INTO customer_sessions(token_hash,customer_id,expires_at) VALUES(?,?,datetime('now','+14 days'))`,
  )
    .bind(await sha(token), id)
    .run();
  return token;
}
const account = z.object({
  email: z.string().trim().email().max(150),
  password: z.string().min(10).max(128),
});
commerce.post('/auth/register', async (c) => {
  const body = account
    .extend({ name: z.string().trim().min(2).max(100) })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success)
    return error(c, 'Tên, email hoặc mật khẩu không hợp lệ (mật khẩu tối thiểu 10 ký tự)');
  const { email, password, name } = body.data;
  const salt = crypto.randomUUID();
  const hash = await derive(password, salt);
  try {
    const r = await c.env.DB.prepare(
      'INSERT INTO customers(name,email,password_hash,salt) VALUES(?,?,?,?)',
    )
      .bind(name, email.toLowerCase(), hash, salt)
      .run();
    return c.json(
      {
        token: await issue(c, Number(r.meta.last_row_id)),
        user: { id: r.meta.last_row_id, name, email: email.toLowerCase() },
      },
      201,
    );
  } catch {
    return error(c, 'Không thể đăng ký; email có thể đã được sử dụng', 409);
  }
});
commerce.post('/auth/login', async (c) => {
  const body = account.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return error(c, 'Email hoặc mật khẩu không hợp lệ');
  const user = await c.env.DB.prepare('SELECT * FROM customers WHERE email=?')
    .bind(body.data.email.toLowerCase())
    .first<any>();
  if (!user || (await derive(body.data.password, user.salt)) !== user.password_hash)
    return error(c, 'Email hoặc mật khẩu không chính xác', 401);
  return c.json({
    token: await issue(c, user.id),
    user: { id: user.id, name: user.name, email: user.email },
  });
});
commerce.get('/auth/me', async (c) => {
  const user = await loggedIn(c);
  return user ? c.json({ user }) : error(c, 'Vui lòng đăng nhập', 401);
});
commerce.post('/auth/logout', async (c) => {
  const token = (c.req.header('authorization') || '').replace(/^Bearer /, '');
  if (/^[a-f0-9]{64}$/.test(token))
    await c.env.DB.prepare('DELETE FROM customer_sessions WHERE token_hash=?')
      .bind(await sha(token))
      .run();
  return c.json({ ok: true });
});
commerce.get('/wishlist', async (c) => {
  const user = await loggedIn(c);
  if (!user) return error(c, 'Vui lòng đăng nhập', 401);
  const data = await c.env.DB.prepare(
    'SELECT product_id FROM wishlists WHERE customer_id=? ORDER BY product_id DESC',
  )
    .bind(user.id)
    .all<{ product_id: number }>();
  return c.json({ ids: data.results.map((x) => x.product_id) });
});
commerce.post('/wishlist/:id', async (c) => {
  const user = await loggedIn(c);
  if (!user) return error(c, 'Vui lòng đăng nhập', 401);
  const id = Number(c.req.param('id'));
  if (!Number.isSafeInteger(id) || id < 1) return error(c, 'ID không hợp lệ');
  const p = await c.env.DB.prepare('SELECT id FROM products WHERE id=?').bind(id).first();
  if (!p) return error(c, 'Không tìm thấy sản phẩm', 404);
  await c.env.DB.prepare('INSERT OR IGNORE INTO wishlists(customer_id,product_id) VALUES(?,?)')
    .bind(user.id, id)
    .run();
  return c.json({ ok: true });
});
commerce.delete('/wishlist/:id', async (c) => {
  const user = await loggedIn(c);
  if (!user) return error(c, 'Vui lòng đăng nhập', 401);
  await c.env.DB.prepare('DELETE FROM wishlists WHERE customer_id=? AND product_id=?')
    .bind(user.id, c.req.param('id'))
    .run();
  return c.json({ ok: true });
});
commerce.get('/my/orders', async (c) => {
  const user = await loggedIn(c);
  if (!user) return error(c, 'Vui lòng đăng nhập', 401);
  const r = await c.env.DB.prepare(
    'SELECT id,code,total,status,discount,voucher_code,created_at FROM orders WHERE customer_id=? ORDER BY id DESC LIMIT 100',
  )
    .bind(user.id)
    .all();
  return c.json({ orders: r.results });
});
commerce.get('/orders/lookup', async (c) => {
  const code = c.req.query('code') || '';
  const phone = c.req.query('phone') || '';
  if (!/^VL-[A-Z0-9]{8}$/.test(code) || !/^[0-9+() .-]{9,20}$/.test(phone))
    return error(c, 'Mã đơn hoặc số điện thoại không hợp lệ');
  const order = await c.env.DB.prepare(
    'SELECT code,total,status,created_at FROM orders WHERE code=? AND phone=?',
  )
    .bind(code, phone)
    .first();
  return order ? c.json({ order }) : error(c, 'Không tìm thấy đơn hàng', 404);
});
commerce.get('/reviews/:productId', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT r.rating,r.comment,r.created_at,c.name FROM reviews r JOIN customers c ON c.id=r.customer_id WHERE r.product_id=? ORDER BY r.id DESC LIMIT 50',
  )
    .bind(c.req.param('productId'))
    .all();
  return c.json({ reviews: rows.results });
});
commerce.post('/reviews/:productId', async (c) => {
  const user = await loggedIn(c);
  if (!user) return error(c, 'Vui lòng đăng nhập', 401);
  const body = z
    .object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000) })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) return error(c, 'Đánh giá không hợp lệ');
  const id = Number(c.req.param('productId'));
  const bought = await c.env.DB.prepare(
    `SELECT 1 FROM orders JOIN order_items ON orders.id=order_items.order_id WHERE orders.customer_id=? AND order_items.product_id=? AND orders.status='completed' LIMIT 1`,
  )
    .bind(user.id, id)
    .first();
  if (!bought) return error(c, 'Chỉ khách đã mua và hoàn tất đơn mới được đánh giá', 403);
  await c.env.DB.prepare(
    'INSERT INTO reviews(customer_id,product_id,rating,comment) VALUES(?,?,?,?) ON CONFLICT(customer_id,product_id) DO UPDATE SET rating=excluded.rating,comment=excluded.comment,created_at=CURRENT_TIMESTAMP',
  )
    .bind(user.id, id, body.data.rating, body.data.comment)
    .run();
  return c.json({ ok: true });
});
commerce.post('/vouchers/check', async (c) => {
  const body = z
    .object({ code: z.string().trim().max(30), subtotal: z.number().int().nonnegative() })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) return error(c, 'Mã giảm giá hoặc tổng tiền không hợp lệ');
  const v = await c.env.DB.prepare(
    `SELECT * FROM vouchers WHERE code=? AND active=1 AND used_count<max_uses AND (expires_at IS NULL OR expires_at>datetime('now'))`,
  )
    .bind(body.data.code.toUpperCase())
    .first<any>();
  if (!v || body.data.subtotal < v.min_order)
    return error(c, 'Voucher không hợp lệ hoặc đơn hàng chưa đủ điều kiện');
  const discount = Math.min(
    body.data.subtotal,
    v.discount_type === 'percent'
      ? Math.floor((body.data.subtotal * v.discount_value) / 100)
      : v.discount_value,
  );
  return c.json({
    code: v.code,
    discount,
    subtotal: body.data.subtotal,
    total: body.data.subtotal - discount,
  });
});
commerce.get('/admin/customers', async (c) => {
  if (!allowedAdmin(c)) return error(c, 'Không có quyền', 401);
  const rows = await c.env.DB.prepare(
    'SELECT id,name,email,created_at FROM customers ORDER BY id DESC LIMIT 200',
  ).all();
  return c.json({ customers: rows.results });
});
commerce.get('/admin/overview', async (c) => {
  if (!allowedAdmin(c)) return error(c, 'Không có quyền', 401);
  const r = await c.env.DB.prepare(
    `SELECT (SELECT count(*) FROM products) products,(SELECT count(*) FROM customers) customers,(SELECT count(*) FROM orders) orders,(SELECT count(*) FROM orders WHERE status='pending') pending,(SELECT coalesce(sum(total),0) FROM orders WHERE status='completed') revenue,(SELECT count(*) FROM products WHERE stock<=5) low_stock`,
  ).first();
  return c.json({ overview: r });
});
commerce.get('/admin/vouchers', async (c) => {
  if (!allowedAdmin(c)) return error(c, 'Không có quyền', 401);
  const r = await c.env.DB.prepare('SELECT * FROM vouchers ORDER BY code').all();
  return c.json({ vouchers: r.results });
});
commerce.post('/admin/vouchers', async (c) => {
  if (!allowedAdmin(c)) return error(c, 'Không có quyền', 401);
  const schema = z.object({
    code: z.string().regex(/^[A-Z0-9_-]{3,30}$/),
    discount_type: z.enum(['fixed', 'percent']),
    discount_value: z.number().int().positive(),
    min_order: z.number().int().nonnegative(),
    max_uses: z.number().int().positive(),
  });
  const input = schema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return error(c, 'Dữ liệu voucher không hợp lệ');
  const v = input.data;
  if (v.discount_type === 'percent' && v.discount_value > 100)
    return error(c, 'Phần trăm tối đa 100');
  try {
    await c.env.DB.prepare(
      'INSERT INTO vouchers(code,discount_type,discount_value,min_order,max_uses) VALUES(?,?,?,?,?)',
    )
      .bind(v.code, v.discount_type, v.discount_value, v.min_order, v.max_uses)
      .run();
    return c.json({ ok: true }, 201);
  } catch {
    return error(c, 'Mã voucher đã tồn tại', 409);
  }
});
commerce.patch('/admin/vouchers/:code', async (c) => {
  if (!allowedAdmin(c)) return error(c, 'Không có quyền', 401);
  const body = z.object({ active: z.boolean() }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return error(c, 'Dữ liệu không hợp lệ');
  await c.env.DB.prepare('UPDATE vouchers SET active=? WHERE code=?')
    .bind(body.data.active ? 1 : 0, c.req.param('code'))
    .run();
  return c.json({ ok: true });
});
