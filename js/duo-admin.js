/**
 * duo-admin.js — تطبيق قرارات «المسؤول الأساسي» (admin.html) على هذه الشاشة
 * ────────────────────────────────────────────────────────────────────────
 * يستمع لمسار duo/admin في Firebase ويطبّق التغييرات فوراً دون إعادة تحميل:
 *   - إطفاء الشاشة: يغطّيها برسالة الإطفاء (وتعود تلقائياً عند التشغيل)
 *   - ميزات الكاشير / أقسام لوحة التحكم: تُخفى من القائمة ولا يمكن فتحها
 *   - عناصر المنيو والمنتجات: تُقفل فوق إعدادات لوحة التحكم (main.js يسأل isOff)
 *   - فرض التحديث: يمسح الكاش ويعيد التحميل عند أول لحظة خمول
 *   - تسجيل خروج الجميع: يُلغي جلسة الرقم السري في الكاشير ولوحة التحكم
 * ويفحص كل ٥ دقائق إن رُفعت نسخة جديدة من الموقع (sw.js) فيحدّث نفسه.
 *
 * آخر قرارات معروفة تُحفظ محلياً، فتُطبَّق فور فتح الصفحة حتى دون إنترنت.
 *
 * نوع الشاشة يُحدَّد في وسم السكربت: <script src="js/duo-admin.js" data-screen="menu">
 *   (menu | cashier | dashboard | mobile)
 * يُحمَّل بعد Firebase SDK و duo-config.js (و branch.js إن وُجد).
 *
 * الاستخدام:
 *   DuoAdmin.isOff(group, id)   — group: 'menu' | 'products' | 'cashier' | 'dashboard'
 *   DuoAdmin.onChange(fn)       — يُستدعى عند أي تغيير من المسؤول
 */
window.DuoAdmin = (function () {
  'use strict';

  const SCREEN   = (document.currentScript && document.currentScript.dataset.screen) || 'menu';
  const ROOT     = 'duo/admin';
  const LS_CACHE = 'duo_admin_cache';
  const LS_FORCE = 'duo_admin_force_seen';
  const IDLE_MS  = 60000;

  const BRANCH = window.DUO_SYNC_DEFAULT || (function () {
    let b = null;
    try { b = new URLSearchParams(location.search).get('branch'); } catch (e) {}
    return 'Branch' + String(b || '1').padStart(2, '0');
  })();

  /* مفاتيح Firebase لا تقبل . # $ [ ] / — نفس الترميز في js/admin.js */
  const encKey = k => encodeURIComponent(k).replace(/\./g, '%2E');

  let data = { all: {}, mine: {} };
  try { Object.assign(data, JSON.parse(localStorage.getItem(LS_CACHE) || '{}')); } catch (e) {}
  const listeners = [];

  function _grp(scope, g) { return (data[scope] && data[scope][g]) || {}; }

  function isOff(group, id) {
    const k = group === 'products' ? encKey(id) : id;
    return !!(_grp('all', group)[k] || _grp('mine', group)[k]);
  }

  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }

  function _esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ══════════ إطفاء الشاشة ══════════ */
  function _offScope() {
    const now = Date.now();
    for (const s of ['mine', 'all']) {
      const sc = data[s] || {};
      const until = Number(sc.until) || 0;
      if (sc.screens && sc.screens[SCREEN] && !(until && until <= now)) return sc;
    }
    return null;
  }

  function _renderPower() {
    const sc = _offScope();
    let el = document.getElementById('duo-admin-off');
    if (!sc) { if (el) el.remove(); return; }
    if (!document.body) return;
    if (!el) {
      el = document.createElement('div');
      el.id = 'duo-admin-off';
      document.body.appendChild(el);
    }
    const m = sc.message || {};
    const html = `
      <style>
        #duo-admin-off { position:fixed; inset:0; z-index:2147483647; direction:rtl;
          display:flex; align-items:center; justify-content:center; text-align:center; padding:24px;
          background:radial-gradient(ellipse at center,#1d0508 0%,#050505 70%); color:#fff;
          font-family:'Tajawal',system-ui,sans-serif; }
        #duo-admin-off .dao-lg { width:84px; height:84px; border-radius:24px; margin:0 auto 22px;
          background:linear-gradient(135deg,#8f1521,#be1e2d); display:flex; align-items:center; justify-content:center;
          font:800 22px 'Poppins',system-ui,sans-serif; box-shadow:0 10px 40px rgba(190,30,45,.45); }
        #duo-admin-off h2 { font-size:clamp(22px,4vw,40px); font-weight:900; margin:0 0 12px; }
        #duo-admin-off p { font-size:clamp(14px,2vw,20px); color:rgba(255,255,255,.55); max-width:560px; margin:0 auto; line-height:1.8; white-space:pre-line; }
        #duo-admin-off .dao-eta { display:inline-block; margin-top:20px; font-size:clamp(13px,1.6vw,17px); color:#d4a24c;
          background:rgba(212,162,76,.12); padding:7px 16px; border-radius:30px; }
      </style>
      <div>
        <div class="dao-lg">DUO</div>
        <h2>${_esc(m.title || 'الموقع متوقف مؤقتاً')}</h2>
        <p>${_esc(m.body || 'نعتذر، سنعود قريباً.')}</p>
        ${m.eta ? `<span class="dao-eta">نعود ${_esc(m.eta)}</span>` : ''}
      </div>`;
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  // موعد التشغيل التلقائي: أعد الفحص دورياً
  setInterval(_renderPower, 15000);

  /* ══════════ إخفاء تبويبات الكاشير / لوحة التحكم ══════════ */
  function _renderNav() {
    const g = SCREEN === 'cashier' || SCREEN === 'dashboard' ? SCREEN : null;
    if (!g) return;
    const keys = Object.keys(Object.assign({}, _grp('all', g), _grp('mine', g)))
      .filter(k => k.indexOf('_') === -1 && isOff(g, k));
    let st = document.getElementById('duo-admin-style');
    if (!st) {
      st = document.createElement('style');
      st.id = 'duo-admin-style';
      document.head.appendChild(st);
    }
    st.textContent = keys.length
      ? keys.map(k => `[data-tab="${k.replace(/"/g, '')}"]`).join(',') + '{display:none!important}'
      : '';
  }

  function _changed() {
    try { localStorage.setItem(LS_CACHE, JSON.stringify({ all: data.all, mine: data.mine })); } catch (e) {}
    _renderPower();
    _renderNav();
    listeners.forEach(fn => { try { fn(); } catch (e) { console.warn('[DuoAdmin] listener error:', e); } });
  }

  /* ══════════ الخمول + التحديث ══════════ */
  let _lastAct = Date.now();
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(ev =>
    window.addEventListener(ev, () => { _lastAct = Date.now(); }, { passive: true, capture: true }));

  function _busy() {
    if (document.getElementById('duo-admin-off')) return false;   // الشاشة مُطفأة — لا أحد يستخدمها
    return SCREEN === 'menu' && !!document.querySelector(
      '#product-overlay.active, #review-overlay.active, #qrmenu-overlay.active, ' +
      '#games-hub.active, #game-overlay.active, #xo-overlay.active');
  }

  let _idleTimer = null;
  function _whenIdle(fn) {
    clearInterval(_idleTimer);
    _idleTimer = setInterval(() => {
      const off = !!document.getElementById('duo-admin-off');
      if (_busy() || (!off && Date.now() - _lastAct < IDLE_MS)) return;
      clearInterval(_idleTimer);
      fn();
    }, 3000);
  }

  async function _hardReload() {
    try {
      if ('caches' in window) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
    } catch (e) {}
    try {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch (e) {}
    location.reload();
  }

  function _onUpdate(u) {
    const at = Number(u && u.forceAt) || 0;
    if (!at) return;
    const seen = Number(localStorage.getItem(LS_FORCE) || 0);
    localStorage.setItem(LS_FORCE, String(Math.max(at, seen)));
    if (!seen || at <= seen) return;   // أول تشغيل لهذا الجهاز: الصفحة محمّلة للتو بأحدث نسخة
    _whenIdle(_hardReload);
  }

  /* رفع نسخة جديدة (رقم CACHE_NAME في sw.js) يُكتشف تلقائياً دون ضغط أو تحديث يدوي */
  function _autoUpdate() {
    if (!('serviceWorker' in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;
    setInterval(() => {
      navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
    }, 5 * 60000);
    let pending = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || pending) return;   // أول تسجيل لـ Service Worker ليس تحديثاً
      pending = true;
      _whenIdle(() => location.reload());
    });
  }

  async function _version() {
    try {
      const ks = (await caches.keys()).filter(k => /^duo-menu-v\d+$/.test(k));
      ks.sort((a, b) => parseInt(b.slice(10), 10) - parseInt(a.slice(10), 10));
      return ks.length ? ks[0].slice(9) : '';
    } catch (e) { return ''; }
  }

  /* ══════════ تسجيل خروج الجميع (الكاشير / لوحة التحكم) ══════════ */
  function _onEpoch(v) {
    if (sessionStorage.getItem('duo_admin_ok') !== '1') return;
    let at = Number(sessionStorage.getItem('duo_admin_at') || 0);
    if (!at) {   // جلسة سابقة لهذه الميزة: تُعدّ بدأت الآن
      at = Date.now();
      sessionStorage.setItem('duo_admin_at', String(at));
    }
    const ep = Number(v) || 0;
    if (ep > at) {
      sessionStorage.removeItem('duo_admin_ok');
      sessionStorage.removeItem('duo_admin_at');
      location.reload();
    }
  }

  /* ══════════ حضور الجهاز (يظهر في شاشة المسؤول) ══════════ */
  function _devId() {
    let id = localStorage.getItem('duo_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('duo_device_id', id);
    }
    return id;
  }

  function _ua() {
    const u = navigator.userAgent;
    return /iPad/i.test(u) ? 'iPad' : /iPhone/i.test(u) ? 'iPhone' : /Android/i.test(u) ? 'Android' : 'Desktop';
  }

  async function _presence(db) {
    if (SCREEN === 'mobile') return;   // هواتف الزبائن لا تُسجَّل
    const TS  = firebase.database.ServerValue.TIMESTAMP;
    const ref = db.ref(`duo/presence/${_devId()}_${SCREEN}`);
    const base = { screen: SCREEN, branch: BRANCH, version: await _version(), device: _ua() };
    db.ref('.info/connected').on('value', s => {
      if (s.val() !== true) return;
      ref.onDisconnect().update({ online: false, lastSeen: TS });
      ref.update(Object.assign({}, base, { online: true, lastSeen: TS })).catch(() => {});
    });
    setInterval(() => { ref.update({ online: true, lastSeen: TS }).catch(() => {}); }, 60000);
  }

  /* ══════════ Firebase ══════════ */
  function _db() {
    if (typeof firebase === 'undefined' || !firebase.database) return null;
    const cfg = window.DUO_FIREBASE_CONFIG;
    if (!cfg || !cfg.databaseURL) return null;
    try {
      const apps = firebase.apps || [];
      const app = apps.find(a => a && a.name === 'duoApp')
               || apps.find(a => a && a.name === 'duoSync')
               || firebase.initializeApp(cfg, 'duoSync');
      return firebase.database(app);
    } catch (e) {
      console.warn('[DuoAdmin] init error:', e);
      return null;
    }
  }

  function _start() {
    const db = _db();
    if (!db) return;
    const on = (path, cb) => db.ref(path).on('value', s => cb(s.val()),
      e => console.warn('[DuoAdmin] listen error:', path, e && e.code));
    on(`${ROOT}/scopes/all`,       v => { data.all  = v || {}; _changed(); });
    on(`${ROOT}/scopes/${BRANCH}`, v => { data.mine = v || {}; _changed(); });
    on(`${ROOT}/update`,           _onUpdate);
    if (SCREEN === 'cashier' || SCREEN === 'dashboard') on(`${ROOT}/sessionEpoch`, _onEpoch);
    _presence(db);
  }

  // طبّق آخر قرارات محفوظة فوراً، ثم اتصل بـ Firebase
  _renderPower();
  _renderNav();
  _autoUpdate();
  _start();

  return { isOff, onChange, branch: BRANCH, screen: SCREEN };
})();
