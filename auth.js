/* BookHaven auth (demo, client-side only: data lives in the browser's localStorage) */
(function () {
  'use strict';
  var USERS_KEY = 'bookhaven_users';
  var SESSION_KEY = 'bookhaven_session';
  var ADMIN = { username: 'emad', password: '123', name: 'Emad' };

  function read(key, fallback) {
    try { var d = JSON.parse(localStorage.getItem(key)); return d == null ? fallback : d; }
    catch (e) { return fallback; }
  }
  function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  function getSession() {
    var s = read(SESSION_KEY, null);
    return s && s.username ? s : null;
  }
  function users() { var u = read(USERS_KEY, []); return Array.isArray(u) ? u : []; }

  function login(username, password) {
    username = String(username || '').trim().toLowerCase();
    var bad = { ok: false, error: 'Incorrect username or password.' };
    if (username === ADMIN.username) {
      if (password !== ADMIN.password) return bad;
      write(SESSION_KEY, { username: ADMIN.username, name: ADMIN.name, role: 'admin' });
      return { ok: true, role: 'admin' };
    }
    var u = users().filter(function (x) { return x.username === username; })[0];
    if (!u || u.password !== password) return bad;
    write(SESSION_KEY, { username: u.username, name: u.name, role: 'user' });
    return { ok: true, role: 'user' };
  }

  function register(d) {
    var name = String(d.name || '').trim();
    var username = String(d.username || '').trim().toLowerCase();
    var email = String(d.email || '').trim().toLowerCase();
    var list = users();
    if (!name) return { ok: false, error: 'Please enter your full name.' };
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return { ok: false, error: 'Username must be 3-20 characters: letters, numbers or underscore.' };
    if (username === ADMIN.username || list.some(function (u) { return u.username === username; })) return { ok: false, error: 'That username is already taken.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
    if (list.some(function (u) { return u.email === email; })) return { ok: false, error: 'An account with this email already exists.' };
    if (String(d.password || '').length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    if (d.password !== d.confirm) return { ok: false, error: 'Passwords do not match.' };
    list.push({ username: username, name: name, email: email, password: d.password });
    write(USERS_KEY, list);
    write(SESSION_KEY, { username: username, name: name, role: 'user' });
    return { ok: true, role: 'user' };
  }

  function logout() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    window.location.href = 'login.html';
  }

  window.BHAuth = { getSession: getSession, login: login, register: register, logout: logout };

  /* ---------- page guard (runs immediately, from <head>) ---------- */
  var page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var isPublic = page === 'login.html' || page === 'register.html';
  var session = getSession();
  var redirect = null;

  if (!session && !isPublic) {
    redirect = 'login.html?next=' + encodeURIComponent(page + window.location.search);
  } else if (session && isPublic) {
    redirect = 'index.html';
  } else if (page === 'dashboard.html' && (!session || session.role !== 'admin')) {
    redirect = 'index.html';
  }
  if (redirect) {
    document.documentElement.style.visibility = 'hidden';
    window.location.replace(redirect);
    return;
  }

  function nextUrl(fallback) {
    var n = new URLSearchParams(window.location.search).get('next');
    return n && /^[A-Za-z0-9_\-]+\.html(\?[A-Za-z0-9_=&\-%.]*)?$/.test(n) ? n : fallback;
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* nav: Dashboard (admin) + Logout */
    var s = getSession();
    var ul = document.querySelector('nav ul');
    if (s && ul) {
      var themeBtn = ul.querySelector('.theme-btn');
      var themeLi = themeBtn ? themeBtn.parentNode : null;
      if (s.role === 'admin') {
        var d = document.createElement('li');
        var da = document.createElement('a');
        da.href = 'dashboard.html';
        da.textContent = 'Dashboard';
        if (page === 'dashboard.html') da.className = 'active';
        d.appendChild(da);
        ul.insertBefore(d, themeLi);
      }
      var lo = document.createElement('li');
      var la = document.createElement('a');
      la.href = '#';
      la.id = 'logout-link';
      la.textContent = 'Logout (' + s.name.split(' ')[0] + ')';
      la.addEventListener('click', function (e) { e.preventDefault(); logout(); });
      lo.appendChild(la);
      ul.insertBefore(lo, themeLi);
    }

    /* login form */
    var lf = document.getElementById('login-form');
    if (lf) {
      lf.addEventListener('submit', function (e) {
        e.preventDefault();
        var err = document.getElementById('form-error');
        var r = login(document.getElementById('username').value, document.getElementById('password').value);
        if (!r.ok) { err.textContent = r.error; return; }
        window.location.href = nextUrl(r.role === 'admin' ? 'dashboard.html' : 'index.html');
      });
    }

    /* register form */
    var rf = document.getElementById('register-form');
    if (rf) {
      rf.addEventListener('submit', function (e) {
        e.preventDefault();
        var err = document.getElementById('form-error');
        var r = register({
          name: document.getElementById('name').value,
          username: document.getElementById('username').value,
          email: document.getElementById('email').value,
          password: document.getElementById('password').value,
          confirm: document.getElementById('confirm').value
        });
        if (!r.ok) { err.textContent = r.error; return; }
        window.location.href = nextUrl('index.html');
      });
    }
  });

  window.addEventListener('storage', function (e) {
    if (e.key === SESSION_KEY) window.location.reload();
  });
})();
