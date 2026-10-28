const fallbackImages = [
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=700&q=80',
  'https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=700&q=80',
  'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=700&q=80',
  'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=700&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=700&q=80',
];
const $ = (s) => document.querySelector(s);
const money = (n) => Number(n).toLocaleString('vi-VN') + '₫';
const escapeHtml = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  );
let products = [],
  category = 'Tất cả',
  current = null,
  adminProducts = [];
const CART_KEY = 'nhom2-ba-khi:cart:v1';
let cart = [];
try {
  cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  if (!Array.isArray(cart)) cart = [];
} catch {
  cart = [];
}
function toast(t) {
  $('#toast').textContent = t;
  $('#toast').classList.add('show');
  setTimeout(() => $('#toast').classList.remove('show'), 3200);
}
function imageOf(p) {
  return p.image_url || fallbackImages[(p.id - 1) % fallbackImages.length] || fallbackImages[0];
}
async function api(url, opts = {}) {
  const res = await fetch(url, opts);
  let data;
  try {
    data = await res.json();
  } catch {
    data = { error: 'Phản hồi không hợp lệ' };
  }
  if (!res.ok) throw Error(data.error || 'Có lỗi xảy ra');
  return data;
}
async function loadProducts() {
  try {
    products = (await api('/api/products')).products;
    renderCategories();
    renderProducts();
    renderCart();
  } catch (e) {
    $('#productGrid').innerHTML = `<div class="empty">
      Không tải được sản phẩm. ${escapeHtml(e.message)}
    </div>`;
  }
}
function chooseCategory(x) {
  category = x;
  renderCategories();
  renderProducts();
}

function renderCategories() {
  const fixedCats = ['Tất cả', 'Áo khoác', 'Quần', 'Áo', 'Váy', 'Giày', 'Dép', 'Mũ'];

  // Tự động bổ sung danh mục mới từ D1 nếu có
  const cats = [...new Set([...fixedCats, ...products.map((p) => p.category)])];

  $('#categories').innerHTML = cats
    .map(
      (c) => `
    <button
      class="chip ${c === category ? 'active' : ''}"
      data-cat="${escapeHtml(c)}">
      ${escapeHtml(c)}
    </button>
  `,
    )
    .join('');

  $('#categories')
    .querySelectorAll('button')
    .forEach((b) => {
      b.onclick = () => chooseCategory(b.dataset.cat);
    });
}
function renderProducts() {
  const q = $('#search').value.trim().toLocaleLowerCase('vi');
  const filtered = products.filter(
    (p) =>
      (category === 'Tất cả' || p.category === category) &&
      (!q || (p.name + ' ' + p.description).toLocaleLowerCase('vi').includes(q)),
  );
  $('#productCount').textContent = `${filtered.length} sản phẩm`;
  $('#productGrid').innerHTML = filtered.length
    ? filtered
        .map(
          (p) =>
            `<article class="product">
              <div class="photo">
                <img
                  loading="lazy"
                  src="${escapeHtml(imageOf(p))}"
                  alt="${escapeHtml(p.name)}"
                >
                <span class="tag">
                  ${
                    p.compare_at_price > p.price
                      ? `-${Math.round((1 - p.price / p.compare_at_price) * 100)}%`
                      : p.featured
                        ? 'BESTSELLER'
                        : 'NEW'
                  }
                </span>
                <button
                  class="quick"
                  data-view="${p.id}"
                >XEM NHANH +</button>
              </div>
              <h3>${escapeHtml(p.name)}</h3>
              <div class="sub">
                ${escapeHtml(p.category)} · ${p.stock ? 'Còn hàng' : 'Hết hàng'}
              </div>
              <div class="money">
                ${money(p.price)}
                ${p.compare_at_price                 ? `<span class="old">
                    ${money(p.compare_at_price)}
                  </span>` : ''}
              </div>
            </article>`,
        )
        .join('')
    : `<div class="empty">
        Không tìm thấy sản phẩm phù hợp.
      </div>`;
  $('#productGrid')
    .querySelectorAll('[data-view]')
    .forEach((btn) => (btn.onclick = () => openProduct(+btn.dataset.view)));
}
function openProduct(id) {
  current = products.find((p) => p.id === id);
  if (!current) return;
  const p = current;
  $('#modalContent').innerHTML = `<button
      class="close"
      onclick="closeAll()"
      aria-label="Đóng"
    >×</button>
    <div class="detail">
      <img
        src="${escapeHtml(imageOf(p))}"
        alt="${escapeHtml(p.name)}"
      >
      <div class="detail-content">
        <span class="eyebrow">${escapeHtml(p.category)}</span>
        <h2>${escapeHtml(p.name)}</h2>
        <div
          class="money"
          style="font-size:22px"
        >
          ${money(p.price)}
          ${
            p.compare_at_price
              ? `<span class="old">
                  ${money(p.compare_at_price)}
                </span>`
              : ''
          }
        </div>
        <p
          style="line-height:1.8;color:#777"
        >${escapeHtml(p.description)}</p>
        <label class="dim">Chọn kích cỡ</label>
        <select id="sizeSelect">
          ${p.sizes.map((s) => `<option>${escapeHtml(s)}</option>`).join('')}
        </select>
        <label class="dim">Chọn màu sắc</label>
        <select id="colorSelect">
          ${p.colors.map((s) => `<option>${escapeHtml(s)}</option>`).join('')}
        </select>
        <label class="dim">Số lượng</label>
        <select id="quantitySelect">
          ${Array.from({ length: Math.min(10, p.stock) }, (_, i) => `<option>${i + 1}</option>`).join('')}
        </select>
        <button
          class="primary"
          style="width:100%"
          ${!p.stock ? 'disabled' : ''}
          onclick="addCart()"
        >
          ${p.stock ? 'THÊM VÀO GIỎ HÀNG →' : 'HẾT HÀNG'}
        </button>
        <p class="dim">Kho: ${p.stock} sản phẩm · Thanh toán COD</p>
      </div>
    </div>`;
  $('#overlay').classList.add('open');
  $('#modal').classList.add('open');
}
function closeAll() {
  $('#drawer').classList.remove('open');
  $('#modal').classList.remove('open');
  $('#overlay').classList.remove('open');
}
function openCart() {
  renderCart();
  $('#modal').classList.remove('open');
  $('#overlay').classList.add('open');
  $('#drawer').classList.add('open');
}
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}
function addCart() {
  const p = current,
    q = +$('#quantitySelect').value,
    size = $('#sizeSelect').value,
    color = $('#colorSelect').value;
  if (!q) return;
  const row = cart.find((x) => x.product_id === p.id && x.size === size && x.color === color);
  const count = cart.filter((x) => x.product_id === p.id).reduce((s, x) => s + x.quantity, 0);
  if (count + q > p.stock) {
    toast('Số lượng vượt quá tồn kho');
    return;
  }
  if (row) row.quantity += q;
  else cart.push({ product_id: p.id, quantity: q, size, color });
  saveCart();
  openCart();
  toast('Đã thêm sản phẩm vào giỏ hàng');
}
function changeCart(index, delta) {
  const p = products.find((p) => p.id === cart[index].product_id);
  if (!p) return;
  const total = cart.filter((x) => x.product_id === p.id).reduce((s, x) => s + x.quantity, 0);
  if (delta > 0 && total >= p.stock) {
    toast('Đã đạt số lượng tồn kho');
    return;
  }
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  saveCart();
}
function removeCart(i) {
  cart.splice(i, 1);
  saveCart();
}
function renderCart() {
  const valid = cart
    .map((x, i) => ({ ...x, i, product: products.find((p) => p.id === x.product_id) }))
    .filter((x) => x.product);
  $('#cartCount').textContent = cart.reduce((s, x) => s + x.quantity, 0);
  $('#cartItems').innerHTML = valid.length
    ? valid
        .map(
          (x) =>
            `<div class="cartrow">
              <img
                src="${escapeHtml(imageOf(x.product))}"
                alt=""
              >
              <div style="flex:1">
                <h4>${escapeHtml(x.product.name)}</h4>
                <div class="dim">
                  ${escapeHtml(x.size)} / ${escapeHtml(x.color)}
                </div>
                <p class="money">${money(x.product.price)}</p>
                <div>
                  <button
                    class="smallbtn"
                    onclick="changeCart(${x.i},-1)"
                  >−</button>
                  &nbsp; ${x.quantity} &nbsp;
                  <button
                    class="smallbtn"
                    onclick="changeCart(${x.i},1)"
                  >+</button>
                </div>
                <button
                  class="remove"
                  onclick="removeCart(${x.i})"
                >Xóa</button>
              </div>
            </div>`,
        )
        .join('')
    : `<div class="empty">
        Giỏ hàng đang trống.
        <p>Hãy chọn sản phẩm bạn thích nhé!</p>
      </div>`;
  $('#subtotal').textContent = money(valid.reduce((s, x) => s + x.quantity * x.product.price, 0));
  $('#cartBottom').classList.toggle('hidden', !valid.length);
  if (!valid.length) $('#checkoutForm').classList.add('hidden');
}
function showCheckout() {
  if (!cart.length) return;
  $('#checkoutForm').classList.remove('hidden');
  $('#checkoutForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
$('#checkoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  const form = new FormData(e.target);
  const order = {
    customer_name: form.get('customer_name'),
    phone: form.get('phone'),
    address: form.get('address'),
    note: form.get('note') || '',
    items: cart,
  };
  try {
    const result = await api('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    cart = [];
    saveCart();
    $('#checkoutForm').reset();
    $('#checkoutForm').classList.add('hidden');
    closeAll();
    await loadProducts();
    alert(
      `Đặt hàng thành công!\nMã đơn: ${result.code}\nTổng tiền hàng: ${money(result.total)}\nCửa hàng sẽ liên hệ xác nhận.`,
    );
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
  }
});
$('#search').addEventListener('input', renderProducts);
if (new URLSearchParams(location.search).has('admin')) {
  $('#shop').classList.add('hidden');
  $('#admin').classList.remove('hidden');
} else loadProducts();
const adminHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${$('#adminToken').value.trim()}`,
});
async function loadAdmin() {
  try {
    await loadProducts();
    adminProducts = products;
    const data = await api('/api/admin/orders', { headers: adminHeaders() });
    $('#adminArea').classList.remove('hidden');
    renderAdminProducts();
    renderAdminOrders(data.orders);
    toast('Đã xác thực quản trị');
  } catch (e) {
    toast(e.message);
  }
}
function renderAdminProducts() {
  $('#adminProducts').innerHTML = adminProducts
    .map(
      (p) =>
        `<tr>
          <td>${escapeHtml(p.name)}</td>
          <td>${money(p.price)}</td>
          <td>${p.stock}</td>
          <td>
            <button
              class="smallbtn"
              onclick="editProduct(${p.id})"
            >Sửa</button>
            <button
              class="smallbtn"
              onclick="deleteProduct(${p.id})"
            >Xóa</button>
          </td>
        </tr>`,
    )
    .join('');
}
function renderAdminOrders(rows) {
  $('#adminOrders').innerHTML = rows.length
    ? rows
        .map(
          (o) =>
            `<tr>
              <td>
                <b>${escapeHtml(o.code)}</b><br>
                ${escapeHtml(o.customer_name)}<br>
                <span class="dim">
                  ${escapeHtml(o.phone)} · ${escapeHtml(o.address)}
                </span>
              </td>
              <td>${money(o.total)}</td>
              <td>
                <select
                  data-order="${o.id}"
                  aria-label="Trạng thái"
                >
                  <option value="pending">Mới</option>
                  <option value="confirmed">Xác nhận</option>
                  <option value="shipping">Đang giao</option>
                  <option value="completed">Hoàn tất</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </td>
            </tr>`,
        )
        .join('')
    : `<tr>
        <td colspan="3">Chưa có đơn hàng</td>
      </tr>`;
  rows.forEach((o) => {
    const sel = document.querySelector(`[data-order="${o.id}"]`);
    sel.value = o.status;
    sel.onchange = async () => {
      try {
        await api('/api/admin/orders/' + o.id, {
          method: 'PATCH',
          headers: adminHeaders(),
          body: JSON.stringify({ status: sel.value }),
        });
        toast('Đã cập nhật');
      } catch (e) {
        toast(e.message);
      }
    };
  });
}
function editProduct(id) {
  const p = adminProducts.find((x) => x.id === id);
  if (!p) return;
  $('#editId').value = p.id;
  $('#pName').value = p.name;
  $('#pSlug').value = p.slug;
  $('#pCategory').value = p.category;
  $('#pDescription').value = p.description;
  $('#pPrice').value = p.price;
  $('#pCompare').value = p.compare_at_price ?? '';
  $('#pStock').value = p.stock;
  $('#pSizes').value = p.sizes.join(',');
  $('#pColors').value = p.colors.join(',');
  $('#pFeatured').checked = !!p.featured;
  $('#formHeading').textContent = 'Sửa sản phẩm #' + p.id;
  $('#productForm').scrollIntoView({ behavior: 'smooth' });
}
function resetProductForm() {
  $('#productForm').reset();
  $('#editId').value = '';
  $('#formHeading').textContent = 'Thêm sản phẩm';
}
$('#productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true;
  try {
    const id = $('#editId').value;
    const old = adminProducts.find((p) => String(p.id) === id);
    let image_key = old?.image_key || null;
    const file = $('#pImage').files[0];
    if (file) {
      const data = new FormData();
      data.append('file', file);
      const uploaded = await api('/api/admin/images', {
        method: 'POST',
        headers: { Authorization: adminHeaders().Authorization },
        body: data,
      });
      image_key = uploaded.key;
    }
    const payload = {
      name: $('#pName').value.trim(),
      slug: $('#pSlug').value.trim(),
      category: $('#pCategory').value.trim(),
      description: $('#pDescription').value,
      price: +$('#pPrice').value,
      compare_at_price: $('#pCompare').value ? +$('#pCompare').value : null,
      stock: +$('#pStock').value,
      sizes: $('#pSizes')
        .value.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      colors: $('#pColors')
        .value.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      image_key,
      featured: $('#pFeatured').checked,
    };
    await api(id ? '/api/admin/products/' + id : '/api/admin/products', {
      method: id ? 'PATCH' : 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(payload),
    });
    resetProductForm();
    await loadAdmin();
    toast('Đã lưu sản phẩm');
  } catch (e) {
    toast(e.message);
  } finally {
    btn.disabled = false;
  }
});
async function deleteProduct(id) {
  if (!confirm('Bạn chắc chắn muốn xóa sản phẩm?')) return;
  try {
    await api('/api/admin/products/' + id, { method: 'DELETE', headers: adminHeaders() });
    await loadAdmin();
    toast('Đã xóa');
  } catch (e) {
    toast(e.message);
  }
}
