/* Admin dashboard: manage books + inventory (changes show up instantly for customers) */
(function () {
  'use strict';
  var BH = window.BH, Auth = window.BHAuth;
  if (!BH || !Auth) return;
  var s = Auth.getSession();
  if (!s || s.role !== 'admin') return;

  function $(id) { return document.getElementById(id); }
  var form = $('book-form');
  if (!form) return;

  Object.keys(BH.CATS).forEach(function (k) {
    var o = document.createElement('option');
    o.value = k; o.textContent = BH.CATS[k];
    $('f-category').appendChild(o);
  });
  BH.COVERS.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c.value; o.textContent = c.name;
    $('f-color').appendChild(o);
  });

  function resetForm() {
    form.reset();
    $('f-id').value = '';
    $('form-title').textContent = 'Add a New Book';
    $('f-submit').textContent = 'Add Book';
    $('f-cancel').hidden = true;
    $('f-error').textContent = '';
  }

  function renderStats() {
    var books = BH.getBooks();
    var copies = 0, out = 0, value = 0;
    books.forEach(function (b) {
      copies += b.stock; value += BH.cents(b.price) * b.stock;
      if (b.stock <= 0) out++;
    });
    var box = $('dash-stats');
    box.textContent = '';
    [['Titles', books.length], ['Copies in stock', copies], ['Out of stock', out], ['Inventory value', BH.money(value)], ['Messages', BH.getMessages().length]].forEach(function (x) {
      var d = BH.el('div', 'dash-stat');
      d.appendChild(BH.el('span', '', x[0]));
      d.appendChild(BH.el('strong', '', String(x[1])));
      box.appendChild(d);
    });
  }

  function setStock(id, n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < 0) n = 0;
    var books = BH.getBooks();
    var b = books.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    b.stock = n;
    BH.saveBooks(books);
    render();
    BH.toast('"' + b.title + '" stock set to ' + n);
  }

  function renderTable() {
    var tbody = document.querySelector('#books-table tbody');
    tbody.textContent = '';
    var books = BH.getBooks();
    if (!books.length) {
      var tr0 = document.createElement('tr');
      var td0 = BH.el('td', 'dash-empty', 'No books yet. Add your first book above.');
      td0.colSpan = 6;
      tr0.appendChild(td0); tbody.appendChild(tr0);
      return;
    }
    books.forEach(function (b) {
      var tr = document.createElement('tr');

      var tdCover = document.createElement('td');
      var sw = BH.el('span', 'dash-swatch');
      sw.style.background = b.color;
      tdCover.appendChild(sw);
      tr.appendChild(tdCover);

      var tdTitle = document.createElement('td');
      tdTitle.appendChild(BH.el('strong', '', b.title));
      tdTitle.appendChild(BH.el('div', 'dash-sub', b.author));
      tr.appendChild(tdTitle);

      tr.appendChild(BH.el('td', '', BH.CATS[b.category] || b.category));
      tr.appendChild(BH.el('td', '', BH.money(BH.cents(b.price))));

      var tdStock = document.createElement('td');
      var st = BH.el('div', 'stock-stepper');
      var minus = BH.el('button', 'qty-btn', '\u2212');
      minus.type = 'button'; minus.setAttribute('aria-label', 'Decrease stock');
      minus.addEventListener('click', function () { setStock(b.id, b.stock - 1); });
      var inp = BH.el('input', 'stock-input');
      inp.type = 'number'; inp.min = 0; inp.step = 1; inp.value = b.stock;
      inp.setAttribute('aria-label', 'Stock for ' + b.title);
      inp.addEventListener('change', function () { setStock(b.id, inp.value); });
      var plus = BH.el('button', 'qty-btn', '+');
      plus.type = 'button'; plus.setAttribute('aria-label', 'Increase stock');
      plus.addEventListener('click', function () { setStock(b.id, b.stock + 1); });
      st.appendChild(minus); st.appendChild(inp); st.appendChild(plus);
      tdStock.appendChild(st);
      if (b.stock <= 0) tdStock.appendChild(BH.el('div', 'dash-out', 'Out of stock'));
      tr.appendChild(tdStock);

      var tdAct = document.createElement('td');
      var act = BH.el('div', 'row-actions');
      var edit = BH.el('button', 'btn-outline', 'Edit');
      edit.type = 'button';
      edit.addEventListener('click', function () { startEdit(b.id); });
      var del = BH.el('button', 'btn-danger', 'Delete');
      del.type = 'button';
      del.addEventListener('click', function () { removeBook(b.id); });
      act.appendChild(edit); act.appendChild(del);
      tdAct.appendChild(act);
      tr.appendChild(tdAct);

      tbody.appendChild(tr);
    });
  }

  function renderMessages() {
    var box = $('messages-list');
    box.textContent = '';
    var list = BH.getMessages();
    if (!list.length) { box.appendChild(BH.el('p', 'dash-empty', 'No messages yet.')); return; }
    list.forEach(function (m) {
      var item = BH.el('div', 'msg-item');
      var head = BH.el('div', 'msg-head');
      head.appendChild(BH.el('strong', '', m.subject));
      var del = BH.el('button', 'btn-danger', 'Delete');
      del.type = 'button';
      del.style.padding = '0.3rem 0.8rem';
      del.style.fontSize = '0.8rem';
      del.style.borderRadius = '8px';
      del.addEventListener('click', function () {
        BH.saveMessages(BH.getMessages().filter(function (x) { return x.id !== m.id; }));
        render();
      });
      head.appendChild(del);
      item.appendChild(head);
      item.appendChild(BH.el('div', 'dash-sub', m.name + ' \u00b7 ' + m.email + ' \u00b7 ' + new Date(m.ts).toLocaleString()));
      item.appendChild(BH.el('p', 'msg-body', m.message));
      box.appendChild(item);
    });
  }

  function render() { renderStats(); renderTable(); renderMessages(); }

  window.addEventListener('storage', function (e) {
    if (e.key === BH.MSG_KEY) { renderStats(); renderMessages(); }
  });

  function startEdit(id) {
    var b = BH.getBook(id);
    if (!b) return;
    $('f-id').value = b.id;
    $('f-title').value = b.title;
    $('f-subtitle').value = b.subtitle || '';
    $('f-author').value = b.author;
    $('f-category').value = b.category;
    $('f-price').value = b.price;
    $('f-stock').value = b.stock;
    $('f-pages').value = b.pages || '';
    $('f-language').value = b.language || '';
    $('f-isbn').value = b.isbn || '';
    $('f-color').value = b.color;
    $('f-desc').value = b.description || '';
    $('f-featured').checked = !!b.featured;
    $('form-title').textContent = 'Edit Book';
    $('f-submit').textContent = 'Save Changes';
    $('f-cancel').hidden = false;
    $('f-error').textContent = '';
    if (form.scrollIntoView) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function removeBook(id) {
    var b = BH.getBook(id);
    if (!b || !window.confirm('Delete "' + b.title + '" from the store?')) return;
    BH.saveBooks(BH.getBooks().filter(function (x) { return x.id !== id; }));
    if ($('f-id').value === id) resetForm();
    render();
    BH.toast('"' + b.title + '" deleted');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('f-error');
    var title = $('f-title').value.trim();
    var author = $('f-author').value.trim();
    var price = Number($('f-price').value);
    var stockRaw = $('f-stock').value.trim();
    var stock = Number(stockRaw);

    if (!title || !author) { err.textContent = 'Title and author are required.'; return; }
    if ($('f-price').value === '' || isNaN(price) || price < 0) { err.textContent = 'Enter a valid price (0 or more).'; return; }
    if (stockRaw === '' || !Number.isInteger(stock) || stock < 0) { err.textContent = 'Stock must be a whole number (0 or more).'; return; }

    var books = BH.getBooks();
    var id = $('f-id').value;
    var data = {
      title: title,
      subtitle: $('f-subtitle').value.trim(),
      author: author,
      category: $('f-category').value,
      price: price,
      stock: stock,
      color: $('f-color').value,
      pages: $('f-pages').value.trim(),
      language: $('f-language').value.trim() || 'English',
      isbn: $('f-isbn').value.trim(),
      description: $('f-desc').value.trim() || 'No description yet.',
      featured: $('f-featured').checked
    };

    if (id) {
      var b = books.filter(function (x) { return x.id === id; })[0];
      if (!b) { err.textContent = 'This book no longer exists.'; resetForm(); render(); return; }
      Object.keys(data).forEach(function (k) { b[k] = data[k]; });
      BH.saveBooks(books);
      BH.toast('"' + title + '" updated');
    } else {
      data.id = BH.uniqueId(title, books);
      books.push(data);
      BH.saveBooks(books);
      BH.toast('"' + title + '" added to the store');
    }
    resetForm();
    render();
  });

  $('f-cancel').addEventListener('click', resetForm);
  $('reset-books').addEventListener('click', function () {
    if (!window.confirm('Replace ALL books with the 6 default books? Your changes will be lost.')) return;
    BH.saveBooks(BH.clone(BH.DEFAULT_BOOKS));
    resetForm();
    render();
    BH.toast('Default books restored');
  });

  BH.onBooksChange(render);
  resetForm();
  render();
})();
