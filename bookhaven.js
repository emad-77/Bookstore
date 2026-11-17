/* BookHaven shared logic: books store, cart, checkout, orders, tracking (client-side demo) */
(function () {
  'use strict';
  var BOOKS_KEY = 'bookhaven_books';
  var CART_PREFIX = 'bookhaven_cart_';
  var ORD_KEY = 'bookhaven_orders_v2';
  var MSG_KEY = 'bookhaven_messages';

  var CATS = { prog: 'Programming', scifi: 'Sci-Fi', self: 'Self-Development' };
  var COVERS = [
    { name: 'Blue',   value: 'linear-gradient(135deg, #1e3a8a, #2563eb)' },
    { name: 'Green',  value: 'linear-gradient(135deg, #065f46, #10b981)' },
    { name: 'Orange', value: 'linear-gradient(135deg, #7c2d12, #ea580c)' },
    { name: 'Purple', value: 'linear-gradient(135deg, #4c1d95, #7c3aed)' },
    { name: 'Pink',   value: 'linear-gradient(135deg, #831843, #db2777)' },
    { name: 'Slate',  value: 'linear-gradient(135deg, #1f2937, #4b5563)' },
    { name: 'Teal',   value: 'linear-gradient(135deg, #115e59, #14b8a6)' },
    { name: 'Red',    value: 'linear-gradient(135deg, #7f1d1d, #ef4444)' }
  ];

  var DEFAULT_BOOKS = [
    { id: 'clean-code', title: 'Clean Code', subtitle: 'A Handbook of Agile Software Craftsmanship', author: 'Robert C. Martin', category: 'prog', price: 35, stock: 14, color: COVERS[0].value, pages: '464', language: 'English', isbn: '978-0132350884', featured: true,
      description: "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees. This book is packed with practical advice about everything from naming variables to refactoring complex functions and writing solid unit tests." },
    { id: 'atomic-habits', title: 'Atomic Habits', subtitle: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones', author: 'James Clear', category: 'self', price: 22, stock: 22, color: COVERS[1].value, pages: '320', language: 'English', isbn: '978-0735211292', featured: true,
      description: 'A practical guide to building good habits and breaking bad ones through small, consistent changes that compound over time.' },
    { id: 'dune', title: 'Dune', subtitle: '', author: 'Frank Herbert', category: 'scifi', price: 18.5, stock: 5, color: COVERS[2].value, pages: '688', language: 'English', isbn: '978-0441172719', featured: true,
      description: 'An epic science-fiction saga of politics, religion and ecology on the desert planet Arrakis, where the fate of an empire hangs on a single precious spice.' },
    { id: 'the-pragmatic-programmer', title: 'The Pragmatic Programmer', subtitle: 'Your Journey to Mastery', author: 'Andrew Hunt', category: 'prog', price: 40, stock: 9, color: COVERS[3].value, pages: '352', language: 'English', isbn: '978-0135957059', featured: false,
      description: 'Timeless, practical advice on becoming a better developer, from taking ownership of your craft to writing flexible, maintainable code.' },
    { id: '1984', title: '1984', subtitle: '', author: 'George Orwell', category: 'scifi', price: 15, stock: 0, color: COVERS[4].value, pages: '328', language: 'English', isbn: '978-0451524935', featured: false,
      description: 'A chilling dystopian novel about surveillance, propaganda and the loss of individual freedom under a totalitarian regime.' },
    { id: 'deep-work', title: 'Deep Work', subtitle: 'Rules for Focused Success in a Distracted World', author: 'Cal Newport', category: 'self', price: 24, stock: 11, color: COVERS[5].value, pages: '296', language: 'English', isbn: '978-1455586691', featured: false,
      description: 'Why focused, distraction-free concentration is becoming rare and valuable, and how to train it to produce your best work.' }
  ];

  /* Delivery timeline for the demo (seconds after purchase) */
  var STEPS = [
    { label: 'Order placed',     at: 0,  desc: 'We received your order.' },
    { label: 'Left inventory',   at: 8,  desc: 'Books picked and removed from stock.' },
    { label: 'Shipped',          at: 20, desc: 'Your package was handed to the carrier.' },
    { label: 'Out for delivery', at: 40, desc: 'The courier is on the way to you.' },
    { label: 'Delivered',        at: 70, desc: 'Package delivered. Enjoy your reading!' }
  ];

  /* ---------- helpers ---------- */
  function read(key, fallback) {
    try { var d = JSON.parse(localStorage.getItem(key)); return d == null ? fallback : d; }
    catch (e) { return fallback; }
  }
  function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function money(cents) { return '$' + (cents / 100).toFixed(2); }
  function cents(price) { return Math.round(Number(price) * 100); }
  function slugify(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'book'; }
  function uniqueId(title, books) {
    var base = slugify(title), id = base, n = 2;
    while (books.some(function (b) { return b.id === id; })) { id = base + '-' + n++; }
    return id;
  }
  function session() { return window.BHAuth ? window.BHAuth.getSession() : null; }

  /* ---------- books store ---------- */
  function getBooks() {
    var b = read(BOOKS_KEY, null);
    if (!Array.isArray(b)) { b = clone(DEFAULT_BOOKS); write(BOOKS_KEY, b); }
    return b;
  }
  function saveBooks(b) { write(BOOKS_KEY, b); }
  function getBook(id) { return getBooks().filter(function (b) { return b.id === id; })[0] || null; }

  var booksCbs = [];
  function onBooksChange(fn) { booksCbs.push(fn); }

  /* ---------- contact messages ---------- */
  function getMessages() { var m = read(MSG_KEY, []); return Array.isArray(m) ? m : []; }
  function saveMessages(m) { write(MSG_KEY, m); }

  /* ---------- toast ---------- */
  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('cart-toast');
    if (!t) { t = document.createElement('div'); t.id = 'cart-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- cart (per user, stores only id + qty) ---------- */
  function cartKey() { var s = session(); return CART_PREFIX + (s ? s.username : 'guest'); }
  function loadCart() { var d = read(cartKey(), []); return Array.isArray(d) ? d : []; }
  function saveCart(c) { write(cartKey(), c); }

  // live lines: always uses current price/stock, drops deleted books, clamps to stock
  function cartLines() {
    var changed = false, lines = [];
    loadCart().forEach(function (i) {
      var b = getBook(i.id);
      if (!b) { changed = true; return; }
      var q = Math.min(i.qty, b.stock);
      if (q !== i.qty) changed = true;
      if (q > 0) lines.push({ book: b, qty: q }); else changed = true;
    });
    if (changed) saveCart(lines.map(function (l) { return { id: l.book.id, qty: l.qty }; }));
    return lines;
  }
  function updateBadge() {
    var n = cartLines().reduce(function (s, l) { return s + l.qty; }, 0);
    document.querySelectorAll('.cart-count').forEach(function (e) {
      e.textContent = n;
      e.classList.toggle('empty', n === 0);
    });
  }

  function addItem(id, qty) {
    var book = getBook(id);
    if (!book) { toast('This book is no longer available.'); return; }
    var cart = loadCart();
    var item = cart.filter(function (i) { return i.id === id; })[0];
    var room = book.stock - (item ? item.qty : 0);
    if (book.stock <= 0) { toast('"' + book.title + '" is out of stock'); return; }
    if (room <= 0) { toast('You already have all available copies of "' + book.title + '"'); return; }
    var add = Math.min(qty, room);
    if (item) item.qty += add; else cart.push({ id: id, qty: add });
    saveCart(cart);
    updateBadge();
    toast(add < qty ? 'Only ' + add + ' added (stock limit reached)' : '"' + book.title + '" added to cart');
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.add-to-cart');
    if (!btn || btn.disabled) return;
    var qty = 1;
    var wrap = btn.closest('.details-actions');
    var qi = wrap && wrap.querySelector('.qty-input');
    if (qi) { qty = parseInt(qi.value, 10); if (isNaN(qty) || qty < 1) qty = 1; }
    addItem(btn.dataset.id, qty);
  });

  /* ---------- cards ---------- */
  function badgeText(b, mode) {
    if (b.stock <= 0) return 'Out of Stock';
    if (mode === 'count') return 'In Stock (' + b.stock + ')';
    return b.stock <= 5 ? b.stock + ' Left' : 'In Stock';
  }

  function buildCard(b, mode) {
    var card = el('div', 'book-card');
    card.dataset.cat = b.category;

    var cover = el('div', 'book-cover');
    cover.style.background = b.color;
    var badge = el('span', 'stock-badge', badgeText(b, mode));
    if (b.stock <= 0) { badge.style.background = '#fee2e2'; badge.style.color = '#991b1b'; }
    cover.appendChild(badge);
    cover.appendChild(document.createTextNode(b.title));
    card.appendChild(cover);

    var info = el('div', 'book-info');
    info.appendChild(el('span', 'book-category', CATS[b.category] || b.category));
    info.appendChild(el('h3', 'book-title', b.title));
    info.appendChild(el('p', 'book-author', b.author));

    var footer = el('div', 'book-footer');
    footer.appendChild(el('span', 'price', money(cents(b.price))));
    var more = el('a', 'btn-primary', mode === 'count' ? 'View Details' : 'Details');
    more.href = 'book-details.html?id=' + encodeURIComponent(b.id);
    more.style.padding = '0.45rem 1rem';
    more.style.fontSize = '0.85rem';
    footer.appendChild(more);

    var add = el('button', 'btn-outline add-to-cart', b.stock <= 0 ? 'Out of Stock' : 'Add to Cart');
    add.type = 'button';
    add.dataset.id = b.id;
    add.disabled = b.stock <= 0;
    footer.appendChild(add);

    info.appendChild(footer);
    card.appendChild(info);
    return card;
  }

  /* ---------- home page ---------- */
  function initIndex() {
    var grid = document.getElementById('trending-grid');
    if (!grid) return;
    function render() {
      var books = getBooks();
      var feat = books.filter(function (b) { return b.featured; });
      if (!feat.length) feat = books.slice(0, 3);
      grid.textContent = '';
      feat.slice(0, 6).forEach(function (b) { grid.appendChild(buildCard(b, 'simple')); });
      if (!books.length) grid.appendChild(el('p', 'no-results', 'No books available right now.'));
      var link = document.getElementById('featured-link');
      if (link && feat[0]) link.href = 'book-details.html?id=' + encodeURIComponent(feat[0].id);
    }
    render();
    onBooksChange(render);
  }

  /* ---------- catalog: render + search + category filter ---------- */
  function initCatalog() {
    var grid = document.getElementById('catalog-grid');
    if (!grid) return;
    var input = document.getElementById('book-search');
    var btn = document.getElementById('search-btn');
    var msg = document.getElementById('no-results');
    var radios = document.querySelectorAll('.filter-radios');

    function currentCategory() {
      for (var i = 0; i < radios.length; i++) if (radios[i].checked) return radios[i].id.replace('filter-', '');
      return 'all';
    }
    function doSearch() {
      var w = input.value.toLowerCase().trim();
      var cat = currentCategory();
      var cards = grid.querySelectorAll('.book-card');
      var visible = 0;
      for (var i = 0; i < cards.length; i++) {
        var title = cards[i].querySelector('.book-title').textContent.toLowerCase();
        var author = cards[i].querySelector('.book-author').textContent.toLowerCase();
        var match = title.includes(w) || author.includes(w);
        cards[i].classList.toggle('search-hidden', !match);
        if (match && (cat === 'all' || cards[i].dataset.cat === cat)) visible++;
      }
      msg.textContent = cards.length ? 'No books found. Try a different title or author.' : 'The catalog is empty right now.';
      msg.hidden = visible !== 0;
    }
    function render() {
      grid.textContent = '';
      getBooks().forEach(function (b) { grid.appendChild(buildCard(b, 'count')); });
      doSearch();
    }
    input.addEventListener('input', doSearch);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
    btn.addEventListener('click', doSearch);
    for (var i = 0; i < radios.length; i++) radios[i].addEventListener('change', doSearch);
    render();
    onBooksChange(render);
  }

  /* ---------- book details ---------- */
  function spec(label, value) {
    var d = el('div', 'spec-box');
    d.appendChild(el('span', '', label));
    d.appendChild(el('strong', '', value || '-'));
    return d;
  }
  function initDetails() {
    var root = document.getElementById('details-root');
    if (!root) return;
    function render() {
      root.textContent = '';
      var id = new URLSearchParams(window.location.search).get('id');
      var books = getBooks();
      var b = id ? books.filter(function (x) { return x.id === id; })[0] : (books.filter(function (x) { return x.featured; })[0] || books[0]);
      if (!b) {
        var nf = el('div', 'cart-empty');
        nf.appendChild(el('h3', '', 'Book not found'));
        nf.appendChild(el('p', '', 'This book may have been removed from the catalog.'));
        var back = el('a', 'btn-primary', 'Back to Catalog');
        back.href = 'catalog.html';
        nf.appendChild(back);
        root.appendChild(nf);
        return;
      }
      document.title = 'BookHaven | ' + b.title + ' - Details';

      var wrap = el('div', 'details-wrapper');
      var cover = el('div', 'details-cover');
      cover.style.background = b.color;
      var tag = el('span', '', CATS[b.category] || b.category);
      tag.style.cssText = 'text-transform: uppercase; letter-spacing: 2px; font-size: 0.85rem; opacity: 0.85; margin-bottom: 0.5rem;';
      cover.appendChild(tag);
      cover.appendChild(el('h2', '', b.title));
      if (b.subtitle) { var sp = el('p', '', b.subtitle); sp.style.opacity = '0.9'; cover.appendChild(sp); }
      wrap.appendChild(cover);

      var content = el('div', 'details-content');
      var meta = el('div', 'details-meta');
      var cat = el('span', 'book-category', CATS[b.category] || b.category);
      cat.style.margin = '0';
      var av = el('span', 'availability-tag', b.stock <= 0 ? 'Out of Stock' : 'In Stock (' + b.stock + ' Copies Available)');
      if (b.stock <= 0) { av.style.background = '#fee2e2'; av.style.color = '#991b1b'; }
      meta.appendChild(cat); meta.appendChild(av);
      content.appendChild(meta);

      content.appendChild(el('h1', 'details-title', b.subtitle ? b.title + ': ' + b.subtitle : b.title));
      var au = el('p', 'details-author', 'By ');
      au.appendChild(el('strong', '', b.author));
      content.appendChild(au);
      content.appendChild(el('div', 'details-price', money(cents(b.price))));
      content.appendChild(el('p', 'details-desc', b.description));

      var specs = el('div', 'details-specs');
      specs.appendChild(spec('Pages', b.pages ? b.pages + ' Pages' : ''));
      specs.appendChild(spec('Language', b.language));
      specs.appendChild(spec('ISBN', b.isbn));
      content.appendChild(specs);

      var actions = el('div', 'details-actions');
      var q = el('input', 'qty-input');
      q.type = 'number'; q.value = 1; q.min = 1; q.max = Math.max(b.stock, 1); q.disabled = b.stock <= 0;
      q.setAttribute('aria-label', 'Quantity');
      var add = el('button', 'btn-primary add-to-cart', b.stock <= 0 ? 'Out of Stock' : 'Add to Shopping Cart');
      add.type = 'button'; add.dataset.id = b.id; add.disabled = b.stock <= 0;
      var cont = el('a', 'btn-outline', 'Continue Browsing');
      cont.href = 'catalog.html';
      actions.appendChild(q); actions.appendChild(add); actions.appendChild(cont);
      content.appendChild(actions);

      wrap.appendChild(content);
      root.appendChild(wrap);
    }
    render();
    onBooksChange(render);
  }

  /* ---------- cart page ---------- */
  var customer = { name: (session() && session().name) || '', phone: '' };

  function field(id, labelText, type, placeholder, key, autocomplete) {
    var g = el('div', 'form-group');
    g.style.marginBottom = '1rem';
    var lab = el('label', '', labelText);
    lab.htmlFor = id;
    var inp = el('input');
    inp.type = type; inp.id = id; inp.placeholder = placeholder; inp.autocomplete = autocomplete;
    inp.value = customer[key];
    inp.addEventListener('input', function () { customer[key] = inp.value; });
    g.appendChild(lab); g.appendChild(inp);
    return g;
  }

  function renderCart() {
    var root = document.getElementById('cart-root');
    if (!root) return;
    var lines = cartLines();
    updateBadge();
    root.textContent = '';

    if (!lines.length) {
      var empty = el('div', 'cart-empty');
      empty.appendChild(el('h3', '', 'Your cart is empty'));
      empty.appendChild(el('p', '', 'Browse the catalog and add some books you like.'));
      var go = el('a', 'btn-primary', 'Browse Catalog');
      go.href = 'catalog.html';
      empty.appendChild(go);
      root.appendChild(empty);
      return;
    }

    var list = el('div', 'cart-list');
    var totalCents = 0, count = 0;
    lines.forEach(function (l) {
      var b = l.book, c = cents(b.price);
      totalCents += c * l.qty; count += l.qty;

      var row = el('div', 'cart-item');
      var thumb = el('div', 'cart-thumb', b.title);
      thumb.style.background = b.color;
      row.appendChild(thumb);

      var info = el('div', 'cart-info');
      info.appendChild(el('h3', '', b.title));
      info.appendChild(el('p', 'cart-author', b.author));
      info.appendChild(el('p', 'cart-unit', money(c) + ' each \u00b7 ' + b.stock + ' in stock'));
      row.appendChild(info);

      var qtyBox = el('div', 'cart-qty');
      var minus = el('button', 'qty-btn', '\u2212');
      minus.setAttribute('aria-label', 'Decrease quantity');
      minus.addEventListener('click', function () { changeQty(b.id, -1); });
      var plus = el('button', 'qty-btn', '+');
      plus.setAttribute('aria-label', 'Increase quantity');
      plus.disabled = l.qty >= b.stock;
      plus.addEventListener('click', function () { changeQty(b.id, 1); });
      qtyBox.appendChild(minus);
      qtyBox.appendChild(el('span', 'cart-qty-num', String(l.qty)));
      qtyBox.appendChild(plus);
      row.appendChild(qtyBox);

      row.appendChild(el('div', 'cart-line-total', money(c * l.qty)));
      var rm = el('button', 'cart-remove', 'Remove');
      rm.addEventListener('click', function () { removeItem(b.id); });
      row.appendChild(rm);
      list.appendChild(row);
    });

    var summary = el('div', 'cart-summary');
    summary.appendChild(el('h3', '', 'Order Summary'));
    var r1 = el('div', 'summary-row');
    r1.appendChild(el('span', '', 'Items')); r1.appendChild(el('span', '', String(count)));
    var r2 = el('div', 'summary-row total');
    r2.appendChild(el('span', '', 'Total')); r2.appendChild(el('span', '', money(totalCents)));
    summary.appendChild(r1); summary.appendChild(r2);

    summary.appendChild(field('cust-name', 'Full Name', 'text', 'Your name', 'name', 'name'));
    summary.appendChild(field('cust-phone', 'Phone Number', 'tel', 'e.g. 01012345678', 'phone', 'tel'));
    var cerr = el('p', 'form-error');
    cerr.id = 'checkout-error';
    summary.appendChild(cerr);

    var buy = el('button', 'btn-primary', 'Buy Now');
    buy.style.width = '100%';
    buy.addEventListener('click', checkout);
    summary.appendChild(buy);
    var clear = el('button', 'btn-outline', 'Clear Cart');
    clear.style.width = '100%'; clear.style.marginTop = '0.8rem';
    clear.addEventListener('click', function () { saveCart([]); renderCart(); });
    summary.appendChild(clear);

    var layout = el('div', 'cart-layout');
    layout.appendChild(list); layout.appendChild(summary);
    root.appendChild(layout);
  }

  function changeQty(id, delta) {
    var cart = loadCart();
    var item = cart.filter(function (i) { return i.id === id; })[0];
    var b = getBook(id);
    if (!item || !b) return;
    item.qty = Math.min(item.qty + delta, b.stock);
    if (item.qty < 1) cart = cart.filter(function (i) { return i.id !== id; });
    saveCart(cart); renderCart();
  }
  function removeItem(id) {
    saveCart(loadCart().filter(function (i) { return i.id !== id; }));
    renderCart();
  }

  /* ---------- checkout: reduces inventory + creates an order ---------- */
  function loadOrders() { var d = read(ORD_KEY, []); return Array.isArray(d) ? d : []; }

  function checkout() {
    var lines = cartLines();
    if (!lines.length) { renderCart(); return; }
    var s = session();
    var books = getBooks();

    var err = document.getElementById('checkout-error');
    var custName = customer.name.trim();
    var custPhone = customer.phone.trim();
    var digits = custPhone.replace(/\D/g, '');
    if (!custName) { if (err) err.textContent = 'Please enter your name.'; return; }
    if (!/^\+?[0-9\s\-]+$/.test(custPhone) || digits.length < 7 || digits.length > 15) {
      if (err) err.textContent = 'Please enter a valid phone number.';
      return;
    }
    if (err) err.textContent = '';

    var total = lines.reduce(function (t, l) { return t + cents(l.book.price) * l.qty; }, 0);
    if (!window.confirm('Place order for ' + money(total) + '?')) return;

    var items = lines.map(function (l) {
      var b = books.filter(function (x) { return x.id === l.book.id; })[0];
      var before = b.stock;
      b.stock = before - l.qty;
      return { id: b.id, title: b.title, author: b.author, price: b.price, qty: l.qty, color: b.color, before: before, after: b.stock };
    });
    saveBooks(books);

    var order = {
      id: 'BH-' + Math.floor(100000 + Math.random() * 900000),
      user: s ? s.username : 'guest',
      ts: Date.now(),
      customer: { name: custName, phone: custPhone },
      items: items,
      totalCents: total
    };
    var orders = loadOrders();
    orders.unshift(order);
    write(ORD_KEY, orders);
    saveCart([]);
    window.location.href = 'track-order.html?order=' + encodeURIComponent(order.id);
  }

  /* ---------- contact form ---------- */
  function initContact() {
    var f = document.getElementById('contact-form');
    if (!f) return;
    var status = document.getElementById('contact-status');
    var s = session();
    function val(id) { return document.getElementById(id).value.trim(); }
    function prefill() { if (s) document.getElementById('name').value = s.name; }
    prefill();

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = {
        id: 'MSG-' + Date.now(),
        ts: Date.now(),
        user: s ? s.username : 'guest',
        name: val('name'), email: val('email'), subject: val('subject'), message: val('message')
      };
      if (!msg.name || !msg.email || !msg.subject || !msg.message) {
        status.className = 'form-error';
        status.textContent = 'Please fill in all fields.';
        return;
      }
      var list = getMessages();
      list.unshift(msg);
      saveMessages(list);
      f.reset();
      prefill();
      status.className = 'form-success';
      status.textContent = 'Thank you! Your message was sent. We will get back to you soon.';
    });
  }

  /* ---------- order tracking ---------- */
  var updaters = [];
  function fmtTime(ts) {
    return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function buildOrderCard(order, highlight) {
    var card = el('div', 'order-card' + (highlight ? ' highlight' : ''));
    card.id = 'order-' + order.id;

    var head = el('div', 'order-head');
    var left = el('div');
    left.appendChild(el('h3', '', 'Order ' + order.id));
    left.appendChild(el('p', 'order-sub', 'Placed ' + fmtTime(order.ts) + ' \u00b7 Total ' + money(order.totalCents)));
    var pill = el('span', 'order-pill');
    head.appendChild(left); head.appendChild(pill);
    card.appendChild(head);

    var items = el('ul', 'order-items');
    order.items.forEach(function (it) { items.appendChild(el('li', '', it.title + ' \u00d7 ' + it.qty)); });
    card.appendChild(items);
    if (order.customer) {
      card.appendChild(el('p', 'order-sub', 'Deliver to: ' + order.customer.name + ' \u00b7 ' + order.customer.phone));
    }

    var route = el('div', 'route');
    var line = el('div', 'route-line');
    var fill = el('div', 'route-fill');
    line.appendChild(fill);
    var pkg = el('span', 'route-pkg', '\ud83d\udce6');
    route.appendChild(line); route.appendChild(pkg);
    card.appendChild(route);
    var labels = el('div', 'route-labels');
    labels.appendChild(el('span', '', 'Warehouse'));
    labels.appendChild(el('span', '', 'Your door'));
    card.appendChild(labels);

    var eta = el('p', 'order-eta');
    card.appendChild(eta);

    var tl = el('ul', 'timeline');
    var stepEls = STEPS.map(function (st, i) {
      var li = el('li', 'step');
      li.appendChild(el('span', 'step-dot'));
      var body = el('div', 'step-body');
      body.appendChild(el('strong', '', st.label));
      var time = el('span', 'step-time');
      body.appendChild(time);
      body.appendChild(el('p', 'step-desc', st.desc));
      if (i === 1) {
        var inv = el('div', 'step-inv');
        order.items.forEach(function (it) {
          inv.appendChild(el('div', '', it.title + ': ' + it.before + ' \u2192 ' + it.after + ' in stock'));
        });
        body.appendChild(inv);
      }
      li.appendChild(body);
      tl.appendChild(li);
      return { li: li, time: time };
    });
    card.appendChild(tl);

    var last = STEPS.length - 1;
    function update() {
      var elapsed = (Date.now() - order.ts) / 1000;
      var idx = 0;
      STEPS.forEach(function (st, i) { if (elapsed >= st.at) idx = i; });
      var pct = 100;
      if (idx < last) {
        var a = STEPS[idx].at, b = STEPS[idx + 1].at;
        pct = ((idx + (elapsed - a) / (b - a)) / last) * 100;
      }
      fill.style.width = pct + '%';
      pkg.style.left = pct + '%';
      pill.textContent = STEPS[idx].label;
      pill.classList.toggle('delivered', idx === last);
      stepEls.forEach(function (st, i) {
        st.li.classList.toggle('done', i <= idx);
        st.li.classList.toggle('next', i === idx + 1);
        st.time.textContent = i <= idx ? ' \u00b7 ' + fmtTime(order.ts + STEPS[i].at * 1000) : ' \u00b7 Pending';
      });
      eta.textContent = idx === last
        ? 'Delivered on ' + fmtTime(order.ts + STEPS[last].at * 1000)
        : 'Estimated delivery in ' + Math.ceil(STEPS[last].at - elapsed) + ' seconds';
    }
    update();
    updaters.push(update);
    return card;
  }

  function renderTrack() {
    var root = document.getElementById('track-root');
    if (!root) return;
    var s = session();
    updaters = [];
    root.textContent = '';
    var mine = loadOrders().filter(function (o) { return s && o.user === s.username; });

    if (!mine.length) {
      var empty = el('div', 'cart-empty');
      empty.appendChild(el('h3', '', 'No orders yet'));
      empty.appendChild(el('p', '', 'Once you buy something from your cart, you can follow it here.'));
      var go = el('a', 'btn-primary', 'Browse Catalog');
      go.href = 'catalog.html';
      empty.appendChild(go);
      root.appendChild(empty);
      return;
    }
    var wanted = new URLSearchParams(window.location.search).get('order');
    var focusNode = null;
    mine.forEach(function (o) {
      var c = buildOrderCard(o, o.id === wanted);
      if (o.id === wanted) focusNode = c;
      root.appendChild(c);
    });
    if (focusNode && focusNode.scrollIntoView) focusNode.scrollIntoView({ block: 'start' });

    var clear = el('button', 'btn-outline', 'Clear my order history');
    clear.addEventListener('click', function () {
      if (!window.confirm('Delete your order history? (Stock is not restored.)')) return;
      write(ORD_KEY, loadOrders().filter(function (o) { return !(s && o.user === s.username); }));
      window.location.href = 'track-order.html';
    });
    root.appendChild(clear);
  }

  setInterval(function () { updaters.forEach(function (u) { u(); }); }, 1000);

  window.addEventListener('storage', function (e) {
    if (e.key === BOOKS_KEY) { booksCbs.forEach(function (f) { f(); }); renderCart(); updateBadge(); }
    else if (e.key === cartKey()) { updateBadge(); renderCart(); }
    else if (e.key === ORD_KEY) { renderTrack(); }
  });

  window.BH = {
    CATS: CATS, COVERS: COVERS, DEFAULT_BOOKS: DEFAULT_BOOKS,
    getBooks: getBooks, saveBooks: saveBooks, getBook: getBook,
    uniqueId: uniqueId, onBooksChange: onBooksChange,
    getMessages: getMessages, saveMessages: saveMessages, MSG_KEY: MSG_KEY,
    el: el, money: money, cents: cents, toast: toast, clone: clone
  };

  updateBadge();
  initIndex();
  initCatalog();
  initDetails();
  initContact();
  renderCart();
  renderTrack();
})();
