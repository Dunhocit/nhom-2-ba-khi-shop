// Additive commerce functionality: keeps the existing storefront layout and legacy cart.
const MEMBER_TOKEN_KEY = 'bakhi:member-token:v3';
let memberToken = sessionStorage.getItem(MEMBER_TOKEN_KEY) || '';
let memberUser = null;
let wishlistIds = [];

const authHeaders = () =>
  memberToken ? { Authorization: 'Bearer ' + memberToken } : {};
const msg = (s) => window.toast?.(s);
const escapeText = (s) => escapeHtml(s);

function closeCommerce() {
  document.getElementById('commerceModal').classList.remove('open');
}

function panel(title, content) {
  document.getElementById('commerceContent').innerHTML =
    '<h2>' + escapeText(title) + '</h2>' + content;
  document.getElementById('commerceModal').classList.add('open');
}

const safeDate = (s) =>
  s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString('vi-VN') : '';

async function memberFetch(endpoint, options = {}) {
  return api('/api/' + endpoint, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
}

async function refreshMember() {
  if (!memberToken) {
    memberUser = null;
    wishlistIds = [];
    return;
  }

  try {
    memberUser = (await memberFetch('auth/me')).user;
    wishlistIds = (await memberFetch('wishlist')).ids;
  } catch {
    memberToken = '';
    sessionStorage.removeItem(MEMBER_TOKEN_KEY);
    memberUser = null;
    wishlistIds = [];
  }
}

function openMember() {
  if (memberUser) {
    panel(
      'Xin chào, ' + memberUser.name,
      `<p>${escapeText(memberUser.email)}</p>
      <div class="cNav">
        <button onclick="openMyOrders()">Đơn mua của tôi</button>
        <button onclick="openFavorites()">Đã yêu thích</button>
        <button onclick="memberLogout()">Đăng xuất</button>
      </div>`,
    );
    return;
  }

  panel(
    'Tài khoản khách hàng',
    `<p class="dim">
      Đăng nhập để lưu yêu thích và theo dõi đơn hàng. Bạn vẫn có thể đặt hàng không cần tài khoản.
    </p>
    <form id="loginMember">
      <label>
        Email
        <input
          type="email"
          name="email"
          required
          autocomplete="email"
        >
      </label>
      <label>
        Mật khẩu
        <input
          name="password"
          type="password"
          minlength="10"
          required
          autocomplete="current-password"
        >
      </label>
      <button class="primary">ĐĂNG NHẬP</button>
    </form>
    <p>
      <button
        class="smallbtn"
        onclick="openRegistration()"
      >Tạo tài khoản mới</button>
    </p>`,
  );
  document.getElementById('loginMember').onsubmit = (ev) =>
    sendMember(ev, 'login');
}

function openRegistration() {
  panel(
    'Đăng ký tài khoản',
    `<form id="registerMember">
      <label>
        Họ tên
        <input
          name="name"
          minlength="2"
          maxlength="100"
          required
        >
      </label>
      <label>
        Email
        <input
          type="email"
          name="email"
          required
        >
      </label>
      <label>
        Mật khẩu (ít nhất 10 ký tự)
        <input
          type="password"
          name="password"
          minlength="10"
          required
        >
      </label>
      <button class="primary">TẠO TÀI KHOẢN</button>
    </form>
    <p class="dim">Không dùng lại mật khẩu của các tài khoản khác.</p>`,
  );
  document.getElementById('registerMember').onsubmit = (ev) =>
    sendMember(ev, 'register');
}

async function sendMember(ev, kind) {
  ev.preventDefault();
  const button = ev.target.querySelector('button');
  button.disabled = true;
  const form = new FormData(ev.target);

  try {
    const data = await api('/api/auth/' + kind, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    memberToken = data.token;
    sessionStorage.setItem(MEMBER_TOKEN_KEY, memberToken);
    memberUser = data.user;
    await refreshMember();
    closeCommerce();
    msg('Xin chào ' + memberUser.name);
  } catch (e) {
    msg(e.message);
  } finally {
    button.disabled = false;
  }
}

async function memberLogout() {
  try {
    await memberFetch('auth/logout', { method: 'POST' });
  } catch {}

  memberToken = '';
  sessionStorage.removeItem(MEMBER_TOKEN_KEY);
  memberUser = null;
  wishlistIds = [];
  closeCommerce();
  msg('Đã đăng xuất');
}

async function openMyOrders() {
  if (!memberUser) return openMember();

  try {
    const rows = (await memberFetch('my/orders')).orders;
    panel(
      'Đơn hàng của tôi',
      rows.length
        ? rows
            .map(
              (o) =>
                `<div class="cRow">
                  <div>
                    <b>${escapeText(o.code)}</b>
                    <div class="dim">
                      ${escapeText(o.status)} · ${safeDate(o.created_at)}
                    </div>
                  </div>
                  <b>${money(o.total)}</b>
                </div>`,
            )
            .join('')
        : '<p>Bạn chưa có đơn hàng gắn với tài khoản.</p>',
    );
  } catch (e) {
    msg(e.message);
  }
}

async function openFavorites() {
  if (!memberUser) return openMember();

  await refreshMember();
  const ps = products.filter((p) => wishlistIds.includes(p.id));
  panel(
    'Sản phẩm yêu thích',
    ps.length
      ? ps
          .map(
            (p) =>
              `<div class="cRow">
                <div>
                  ${escapeText(p.name)}
                  <div class="dim">${money(p.price)}</div>
                </div>
                <button
                  class="smallbtn"
                  data-unfavorite="${p.id}"
                >Bỏ thích</button>
              </div>`,
          )
          .join('')
      : '<p>Chưa có sản phẩm yêu thích.</p>',
  );
  document.querySelectorAll('[data-unfavorite]').forEach((b) => {
    b.onclick = async () => {
      await toggleFavorite(+b.dataset.unfavorite);
      openFavorites();
    };
  });
}

async function toggleFavorite(id) {
  if (!memberUser) {
    openMember();
    return;
  }

  try {
    const exists = wishlistIds.includes(id);
    await memberFetch('wishlist/' + id, {
      method: exists ? 'DELETE' : 'POST',
    });
    wishlistIds = exists
      ? wishlistIds.filter((x) => x !== id)
      : [...wishlistIds, id];
    msg(exists ? 'Đã bỏ yêu thích' : 'Đã thêm vào yêu thích');
    decorateProducts();
  } catch (e) {
    msg(e.message);
  }
}

function decorateProducts() {
  document.querySelectorAll('#productGrid .product').forEach((el, i) => {
    const p = products.filter(
      (x) =>
        (category === 'Tất cả' || x.category === category) &&
        (!document.querySelector('#search').value.trim() ||
          (x.name + ' ' + x.description)
            .toLocaleLowerCase('vi')
            .includes(
              document.querySelector('#search').value
                .trim()
                .toLocaleLowerCase('vi'),
            )),
    )[i];

    if (!p || el.querySelector('.fav-toggle')) return;

    const btn = document.createElement('button');
    btn.className = 'fav-toggle';
    btn.title = 'Yêu thích';
    btn.textContent = wishlistIds.includes(p.id) ? '♥' : '♡';
    btn.onclick = () => toggleFavorite(p.id);
    el.querySelector('.photo').appendChild(btn);
  });
}

function openTracking() {
  panel(
    'Tra cứu trạng thái đơn',
    `<p class="dim">
      Nhập mã đơn và số điện thoại đã dùng khi đặt hàng.
    </p>
    <form id="lookupOrder">
      <label>
        Mã đơn
        <input
          name="code"
          required
          placeholder="VL-XXXXXXXX"
        >
      </label>
      <label>
        Số điện thoại
        <input
          name="phone"
          required
        >
      </label>
      <button class="primary">TRA CỨU</button>
    </form>
    <div id="orderResult"></div>`,
  );
  document.getElementById('lookupOrder').onsubmit = async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);

    try {
      const r = await api(
        '/api/orders/lookup?' +
          new URLSearchParams({
            code: String(f.get('code')).trim().toUpperCase(),
            phone: String(f.get('phone')).trim(),
          }),
      );
      document.getElementById('orderResult').innerHTML =
        `<p><b>${escapeText(r.order.code)}</b> · ` +
        `${escapeText(r.order.status)} · ${money(r.order.total)}</p>`;
    } catch (e) {
      msg(e.message);
    }
  };
}

async function openReviews(productId) {
  try {
    const data = await api('/api/reviews/' + productId);
    const content = data.reviews.length
      ? data.reviews
          .map(
            (x) =>
              `<div class="cRow">
                <div>
                  <b>${escapeText(x.name)}</b> · ${'★'.repeat(x.rating)}
                  <p>${escapeText(x.comment)}</p>
                </div>
              </div>`,
          )
          .join('')
      : '<p>Chưa có đánh giá.</p>';

    panel(
      'Đánh giá sản phẩm',
      content +
        (memberUser
          ? `<form id="reviewForm">
              <label>
                Đánh giá
                <select name="rating">
                  <option value="5">5 sao</option>
                  <option value="4">4 sao</option>
                  <option value="3">3 sao</option>
                  <option value="2">2 sao</option>
                  <option value="1">1 sao</option>
                </select>
              </label>
              <label>
                Nội dung
                <textarea
                  name="comment"
                  maxlength="1000"
                ></textarea>
              </label>
              <button class="primary">GỬI ĐÁNH GIÁ</button>
              <p class="dim">
                Chỉ khách đã hoàn tất đơn mua sản phẩm mới được đánh giá.
              </p>
            </form>`
          : ''),
    );

    const f = document.getElementById('reviewForm');
    if (f) {
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const d = new FormData(f);

        try {
          await memberFetch('reviews/' + productId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rating: Number(d.get('rating')),
              comment: String(d.get('comment')),
            }),
          });
          openReviews(productId);
          msg('Đã gửi đánh giá');
        } catch (e) {
          msg(e.message);
        }
      };
    }
  } catch (e) {
    msg(e.message);
  }
}

// Existing API functions run without modification; wrap only to add controls.
const renderProductsBase = window.renderProducts;
window.renderProducts = function () {
  renderProductsBase();
  decorateProducts();
};

const openProductBase = window.openProduct;
window.openProduct = function (id) {
  openProductBase(id);
  const node = document.querySelector('#modalContent .detail-content');
  if (node) {
    const b = document.createElement('button');
    b.className = 'outline';
    b.textContent = '★ Xem đánh giá';
    b.onclick = () => {
      closeAll();
      openReviews(id);
    };
    node.appendChild(b);
  }
};

// Send logged-in token and optional voucher when existing checkout is submitted.
const oldApi = window.api;
window.api = async function (url, options = {}) {
  if (url === '/api/orders' && options.method === 'POST') {
    const opts = {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...authHeaders(),
      },
    };
    const body = JSON.parse(opts.body);
    const voucher = document
      .querySelector('#checkoutForm [name="voucher_code"]')
      ?.value.trim();

    if (voucher) body.voucher_code = voucher;

    opts.body = JSON.stringify(body);
    return oldApi(url, opts);
  }

  return oldApi(url, options);
};

const loadAdminBase = window.loadAdmin;
window.loadAdmin = async function () {
  await loadAdminBase();
  if (!document.querySelector('#adminArea').classList.contains('hidden')) {
    await loadExtraAdmin();
  }
};

async function loadExtraAdmin() {
  try {
    const headers = adminHeaders();
    const [v, c, o] = await Promise.all([
      api('/api/admin/vouchers', { headers }),
      api('/api/admin/customers', { headers }),
      api('/api/admin/overview', { headers }),
    ]);
    const d = o.overview;

    document.querySelector('#adminOverview').innerHTML =
      `<div class="overview-grid">
        <div><b>${d.products}</b><br>Sản phẩm</div>
        <div><b>${d.customers}</b><br>Khách hàng</div>
        <div><b>${d.orders}</b><br>Đơn hàng</div>
        <div><b>${d.pending}</b><br>Chờ xác nhận</div>
        <div><b>${d.low_stock}</b><br>Sắp hết (≤5)</div>
        <div><b>${money(d.revenue)}</b><br>Doanh thu hoàn tất</div>
      </div>`;

    document.querySelector('#adminExtras').innerHTML =
      `<h3>Thêm voucher</h3>
      <form
        id="voucherCreate"
        class="form"
      >
        <label>
          Mã voucher
          <input
            name="code"
            required
            placeholder="BAKHI10"
            pattern="[A-Z0-9_-]{3,30}"
          >
        </label>
        <label>
          Loại
          <select name="discount_type">
            <option value="percent">Giảm %</option>
            <option value="fixed">Giảm tiền (VND)</option>
          </select>
        </label>
        <label>
          Mức giảm
          <input
            name="discount_value"
            type="number"
            min="1"
            required
          >
        </label>
        <label>
          Giá trị đơn tối thiểu
          <input
            name="min_order"
            type="number"
            value="0"
            min="0"
            required
          >
        </label>
        <label>
          Số lượt sử dụng
          <input
            name="max_uses"
            type="number"
            value="100"
            min="1"
            required
          >
        </label>
        <button class="primary">TẠO VOUCHER</button>
      </form>
      <h3>Voucher (${v.vouchers.length})</h3>
      ${v.vouchers
        .map(
          (x) =>
            `<div class="cRow">
              <div>
                <b>${escapeText(x.code)}</b><br>
                <span class="dim">
                  ${x.used_count}/${x.max_uses} lượt ·
                  ${x.active ? 'Đang bật' : 'Đã tắt'}
                </span>
              </div>
              <button
                class="smallbtn"
                data-voucher="${escapeText(x.code)}"
                data-active="${x.active ? 'false' : 'true'}"
              >${x.active ? 'Tắt' : 'Bật'}</button>
            </div>`,
        )
        .join('')}
      <h3>Khách hàng (${c.customers.length})</h3>
      ${c.customers
        .slice(0, 30)
        .map(
          (x) =>
            `<div class="cRow">
              ${escapeText(x.name)}
              <small>${escapeText(x.email)}</small>
            </div>`,
        )
        .join('')}`;

    document.querySelector('#voucherCreate').onsubmit = async (ev) => {
      ev.preventDefault();
      const data = Object.fromEntries(new FormData(ev.target));
      for (const key of ['discount_value', 'min_order', 'max_uses']) {
        data[key] = Number(data[key]);
      }

      try {
        await api('/api/admin/vouchers', {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        });
        msg('Đã tạo voucher');
        loadExtraAdmin();
      } catch (e) {
        msg(e.message);
      }
    };

    document.querySelectorAll('[data-voucher]').forEach((b) => {
      b.onclick = async () => {
        try {
          await api(
            '/api/admin/vouchers/' + encodeURIComponent(b.dataset.voucher),
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                active: b.dataset.active === 'true',
              }),
            },
          );
          loadExtraAdmin();
        } catch (e) {
          msg(e.message);
        }
      };
    });
  } catch (e) {
    msg('Không tải được quản trị nâng cao: ' + e.message);
  }
}

refreshMember().then(() => decorateProducts());

// Product cards may load asynchronously; hook loadProducts completion.
const loadProductsBase = window.loadProducts;
window.loadProducts = async function () {
  await loadProductsBase();
  decorateProducts();
};
