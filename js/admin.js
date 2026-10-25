/**
 * admin.js — شاشة «المسؤول الأساسي» (admin.html)
 * ────────────────────────────────────────────────────────────────
 * تكتب القرارات في Firebase تحت duo/admin، وكل الشاشات تستمع لها عبر
 * js/duo-admin.js فتُطبَّق فوراً دون إعادة تحميل.
 *
 * شكل البيانات:
 *   duo/admin/scopes/{all|Branch01|Branch02…}/
 *       screens   { menu|mobile|cashier|dashboard: true }   ← true = مُطفأة
 *       message   { title, body, eta }                      ← رسالة الإطفاء
 *       until     timestamp                                 ← تشغيل تلقائي
 *       cashier   { <tab> | act_<action> | set_<card>: true }
 *       dashboard { <tab>: true }
 *       menu      { discount|phone|games|qrmenu|langbtn|mealprice: true }
 *       products  { <encoded "catId||nameAr">: true }
 *   duo/admin/update/forceAt   ← فرض تحديث كل الأجهزة
 *   duo/admin/sessionEpoch     ← تسجيل خروج الجميع من الكاشير/لوحة التحكم
 *   duo/admin/log/{id}         ← سجل التغييرات
 *   duo/presence/{device}      ← حضور الأجهزة ونسختها (تكتبه الأجهزة نفسها)
 *
 * الكتابة على duo/admin مسموحة فقط لحساب المسؤول (database.rules.json).
 */
(function () {
  'use strict';

  const ROOT    = 'duo/admin';
  const LOCK_MS = 10 * 60000;   // قفل تلقائي بعد ١٠ دقائق خمول
  const ONLINE_MS = 3 * 60000;  // الجهاز «متصل» إن ظهر خلال آخر ٣ دقائق

  /* مفاتيح Firebase لا تقبل . # $ [ ] / — نفس الترميز في js/duo-admin.js */
  const encKey = k => encodeURIComponent(k).replace(/\./g, '%2E');

  const SCREENS = [
    ['menu',      'fa-tv',             'شاشة المنيو'],
    ['mobile',    'fa-mobile-screen',  'منيو الجوال'],
    ['cashier',   'fa-cash-register',  'الكاشير'],
    ['dashboard', 'fa-sliders',        'لوحة التحكم'],
  ];
  const SCREEN_NAME = Object.fromEntries(SCREENS.map(s => [s[0], s[2]]));

  /* [المفتاح, الأيقونة, الاسم, وصف] — المفاتيح تطابق data-tab في الصفحات */
  const SETS = {
    'cashier:tabs': [
      ['products', 'fa-burger',          'المنتجات',        'إظهار/إخفاء المنتجات من الكاشير'],
      ['slides',   'fa-images',          'الشرائح',         'تثبيت وإخفاء الشرائح'],
      ['actions',  'fa-hand-pointer',    'إجراءات',         'أوامر فورية لشاشة المنيو'],
      ['split',    'fa-scale-balanced',  'تقسيم الفاتورة',  ''],
      ['balance',  'fa-cash-register',   'الموازنة',        ''],
      ['printing', 'fa-print',           'الطباعة',         'الكوبونات والرسائل'],
      ['devices',  'fa-tv',              'الأجهزة',         'الشاشات المتصلة'],
      ['settings', 'fa-gear',            'إعدادات',         ''],
    ],
    'cashier:inner': [
      ['act_showDiscount',   'fa-percent',    'عرض الخصم للعميل',   'تبويب الإجراءات'],
      ['act_showQR',         'fa-qrcode',     'عرض باركود الجوال',  'تبويب الإجراءات'],
      ['act_openGames',      'fa-gamepad',    'فتح الألعاب',        'تبويب الإجراءات'],
      ['act_toggleLang',     'fa-language',   'تبديل لغة المنيو',   'تبويب الإجراءات'],
      ['act_launchReaction', 'fa-bolt',       'لعبة سرعة الرد',     'تبويب الإجراءات'],
      ['act_launchXO',       'fa-hashtag',    'لعبة XO',            'تبويب الإجراءات'],
      ['set_maint',          'fa-wrench',     'وضع الصيانة',        'تبويب الإعدادات'],
      ['set_reset',          'fa-trash-can',  'إعادة ضبط المصنع',   'تبويب الإعدادات'],
    ],
    'dashboard:tabs': [
      ['header',      'fa-sliders',              'الهيدر',        'أزرار المنيو'],
      ['slides',      'fa-images',               'الشرائح',       ''],
      ['products',    'fa-burger',               'المنتجات',      'إظهار وإخفاء وشارات المنتجات'],
      ['stats',       'fa-chart-bar',            'الإحصائيات',    ''],
      ['scroll',      'fa-forward',              'السكرول',       'مدة التمرير التلقائي'],
      ['device',      'fa-mobile-screen-button', 'الجهاز',        ''],
      ['screen',      'fa-display',              'ضبط الشاشة',    ''],
      ['pairing',     'fa-link',                 'ربط الأجهزة',   ''],
      ['newproducts', 'fa-image',                'منتجات جديدة',  ''],
      ['statusimg',   'fa-tv',                   'صورة التلفاز',  ''],
    ],
    'menu:items': [
      ['discount',  'fa-percent',  'زر الخصم',           ''],
      ['phone',     'fa-phone',    'رقم الهاتف',         ''],
      ['games',     'fa-gamepad',  'زر الألعاب',         ''],
      ['qrmenu',    'fa-qrcode',   'زر منيو الجوال',     ''],
      ['langbtn',   'fa-language', 'زر تغيير اللغة',     ''],
      ['mealprice', 'fa-tags',     'سعر الوجبة',         ''],
    ],
  };

  const TITLES = {};
  document.querySelectorAll('#nav button').forEach(b => { TITLES[b.dataset.tab] = b.querySelector('span').textContent; });

  const $  = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ══════════ الحالة ══════════ */
  let app, auth, db, TS;
  let scopes   = {};          // { all: {...}, Branch01: {...} }
  let scope    = 'all';
  let presence = {};
  let logItems = [];
  let catalog  = null;        // { all: [cats], Branch01: [cats] }
  let latestVersion = '';
  let activeTab = 'overview';
  const subs = [];

  const BRANCHES = window.DUO_BRANCHES || { '1': { nameAr: 'الفرع الأول', products: 'js/products.js' } };
  const branchScope = id => 'Branch' + String(id).padStart(2, '0');
  const SCOPE_NAMES = { all: 'كل الفروع' };
  Object.entries(BRANCHES).forEach(([id, b]) => { SCOPE_NAMES[branchScope(id)] = b.nameAr; });
  const scopeLabel = s => SCOPE_NAMES[s] || s;

  const cur = () => scopes[scope] || {};
  const allSc = () => scopes.all || {};
  /* هل العنصر مُطفأ في النطاق المختار؟ ومن «كل الفروع» (موروث، لا يُعدَّل من نطاق الفرع)؟ */
  function flag(group, key) {
    const own = !!((cur()[group] || {})[key]);
    const inh = scope !== 'all' && !!((allSc()[group] || {})[key]);
    return { own, inh, off: own || inh };
  }

  /* ══════════ Firebase ══════════ */
  function init() {
    const cfg = window.DUO_FIREBASE_CONFIG;
    if (typeof firebase === 'undefined' || !cfg) { showLoginErr('تعذّر تحميل Firebase — تحقق من الاتصال بالإنترنت'); return; }
    app  = (firebase.apps || []).find(a => a.name === 'duoAdmin') || firebase.initializeApp(cfg, 'duoAdmin');
    auth = app.auth();
    db   = app.database();
    TS   = firebase.database.ServerValue.TIMESTAMP;
    auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(() => {});
    auth.onAuthStateChanged(user => user ? openApp() : closeApp());
  }

  /* ══════════ الدخول ══════════ */
  function showLoginErr(m) { $('login-err').textContent = m || ''; }

  const AUTH_ERR = {
    'auth/wrong-password':            'الرمز غير صحيح',
    'auth/invalid-credential':        'الرمز غير صحيح',
    'auth/invalid-login-credentials': 'الرمز غير صحيح',
    'auth/too-many-requests':         'محاولات كثيرة — انتظر قليلاً ثم حاول مجدداً',
    'auth/network-request-failed':    'لا يوجد اتصال بالإنترنت',
    'auth/user-not-found':            'حساب المسؤول غير موجود في Firebase بعد — راجع ADMIN-SETUP.md',
    'auth/user-disabled':             'حساب المسؤول معطّل في Firebase',
    'auth/operation-not-allowed':     'الدخول بالبريد وكلمة المرور غير مفعّل في Firebase — راجع ADMIN-SETUP.md',
    'auth/configuration-not-found':   'Firebase Authentication غير مفعّل بعد — راجع ADMIN-SETUP.md',
  };

  $('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const code = $('login-code').value.trim();
    if (!code) return;
    if (!auth) { showLoginErr('تعذّر الاتصال بـ Firebase'); return; }
    const btn = $('login-btn');
    btn.disabled = true;
    showLoginErr('');
    auth.signInWithEmailAndPassword(window.DUO_ADMIN_EMAIL, code)
      .catch(err => {
        showLoginErr(AUTH_ERR[err && err.code] || 'تعذّر الدخول (' + (err && err.code || 'خطأ') + ')');
        $('login-code').select();
      })
      .finally(() => { btn.disabled = false; });
  });

  $('logout-btn').addEventListener('click', () => auth && auth.signOut());

  /* القفل التلقائي بالخمول */
  let lastAct = Date.now();
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(ev =>
    window.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true, capture: true }));
  setInterval(() => {
    if (auth && auth.currentUser && Date.now() - lastAct > LOCK_MS) auth.signOut();
  }, 15000);

  function openApp() {
    $('login').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('login-code').value = '';
    showLoginErr('');
    lastAct = Date.now();
    listen();
    loadCatalog();
    loadLatestVersion();
  }

  function closeApp() {
    subs.splice(0).forEach(off => off());
    $('app').classList.add('hidden');
    $('login').classList.remove('hidden');
    setTimeout(() => $('login-code').focus(), 50);
  }

  function on(ref, cb) {
    const h = ref.on('value', s => cb(s.val()), err => {
      console.warn('[admin] read error', ref.toString(), err && err.code);
      if (err && /permission/i.test(err.code || '')) toast('لا توجد صلاحية قراءة — راجع قواعد Firebase (ADMIN-SETUP.md)', true);
    });
    subs.push(() => ref.off('value', h));
  }

  function listen() {
    on(db.ref(`${ROOT}/scopes`), v => { scopes = v || {}; renderAll(); });
    on(db.ref('duo/presence'),   v => { presence = v || {}; renderDevices(); renderOverview(); });
    on(db.ref(`${ROOT}/log`).limitToLast(100), v => {
      logItems = Object.values(v || {}).sort((a, b) => (b.ts || 0) - (a.ts || 0));
      renderLog();
    });
    on(db.ref('.info/connected'), v => {
      const l = $('live');
      l.textContent = v ? 'متصل' : 'غير متصل';
      l.style.color = v ? '' : '#f87171';
      l.style.background = v ? '' : 'var(--red-soft)';
    });
  }

  /* ══════════ الكتابة ══════════ */
  function save(promise, logMsg) {
    return promise
      .then(() => {
        if (logMsg) db.ref(`${ROOT}/log`).push({ msg: logMsg, scope, ts: TS }).catch(() => {});
        toast('تم التطبيق على ' + scopeLabel(scope));
      })
      .catch(err => {
        console.warn('[admin] write error', err);
        toast(/permission/i.test((err && err.code) || '') ? 'رُفض الحفظ — تأكد من قواعد Firebase (ADMIN-SETUP.md)' : 'تعذّر الحفظ', true);
        renderAll();
      });
  }
  const scopeRef = path => db.ref(`${ROOT}/scopes/${scope}/${path}`);

  function setFlag(group, key, off, label) {
    return save(scopeRef(`${group}/${key}`).set(off ? true : null), `${off ? 'إطفاء' : 'تفعيل'} «${label}»`);
  }

  /* ══════════ التبويبات ══════════ */
  function go(tab) {
    activeTab = tab;
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab').forEach(s => s.classList.toggle('show', s.id === 'tab-' + tab));
    $('title').textContent = TITLES[tab];
    document.body.classList.remove('side-open');
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('#nav button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
  $('menu-toggle').addEventListener('click', () => document.body.classList.toggle('side-open'));

  /* النطاق: كل الفروع أو فرع محدد */
  $('scope').innerHTML = Object.keys(SCOPE_NAMES).map(s => `<option value="${s}">${esc(SCOPE_NAMES[s])}</option>`).join('');
  $('scope').addEventListener('change', e => { scope = e.target.value; renderAll(true); });

  /* ══════════ الرسم ══════════ */
  function renderAll(scopeChanged) {
    renderGroups();
    renderPower(scopeChanged);
    renderProducts();
    renderDevices();
    renderOverview();
  }

  function pill(f) {
    if (f.inh) return '<span class="pill inh">مُطفأ لكل الفروع</span>';
    return f.off ? '<span class="pill off">مُطفأ</span>' : '<span class="pill on">مفعّل</span>';
  }

  function renderGroups() {
    document.querySelectorAll('[data-group]').forEach(el => {
      const group = el.dataset.group;
      el.innerHTML = SETS[group + ':' + el.dataset.set].map(([key, ic, name, hint]) => {
        const f = flag(group, key);
        return `<div class="row ${f.off ? 'off' : ''} ${f.inh ? 'inh' : ''}">
          <div class="ic"><i class="fa-solid ${ic}"></i></div>
          <div class="tx"><b>${esc(name)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</div>
          ${pill(f)}
          <label class="sw"><input type="checkbox" ${f.off ? '' : 'checked'} ${f.inh ? 'disabled' : ''}
            data-flag="${group}" data-key="${key}" data-label="${esc(name)}"><span></span></label>
        </div>`;
      }).join('');
    });
  }

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset && t.dataset.flag) setFlag(t.dataset.flag, t.dataset.key, !t.checked, t.dataset.label);
  });

  /* ── الإطفاء ── */
  function screenState(id) {
    const own = !!((cur().screens || {})[id]);
    const inh = scope !== 'all' && !!((allSc().screens || {})[id]);
    return { own, inh, off: own || inh };
  }

  function renderPower(scopeChanged) {
    $('tiles').innerHTML = SCREENS.map(([id, ic, n]) => {
      const f = screenState(id);
      return `<div class="tile ${f.off ? 'off' : ''} ${f.inh ? 'inh' : ''}" data-screen="${id}">
        <i class="fa-solid ${ic}"></i><b>${n}</b>
        <span class="pill ${f.inh ? 'inh' : f.off ? 'off' : 'on'}">${f.inh ? 'مُطفأة لكل الفروع' : f.off ? 'مُطفأة' : 'تعمل'}</span></div>`;
    }).join('');

    const offCount = SCREENS.filter(([id]) => screenState(id).off).length;
    const c = $('cnt-off'); c.hidden = !offCount; c.textContent = offCount;

    // حقول الرسالة: لا تُستبدل أثناء الكتابة فيها
    const m = cur().message || {};
    const fill = (id, v) => { const el = $(id); if (scopeChanged || document.activeElement !== el) el.value = v || ''; };
    fill('msg-title', m.title);
    fill('msg-body',  m.body);
    fill('msg-eta',   m.eta);
    fill('msg-until', cur().until ? toLocalInput(cur().until) : '');
    preview();
  }

  function toLocalInput(ts) {
    const d = new Date(ts), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  $('tiles').addEventListener('click', e => {
    const tile = e.target.closest('.tile');
    if (!tile) return;
    const id = tile.dataset.screen, f = screenState(id);
    if (f.inh) { toast('هذه الشاشة مُطفأة من «كل الفروع» — شغّلها من هناك', true); return; }
    save(scopeRef(`screens/${id}`).set(f.own ? null : true), `${f.own ? 'تشغيل' : 'إطفاء'} ${SCREEN_NAME[id]}`);
  });

  function setAllScreens(off) {
    const upd = {};
    SCREENS.forEach(([id]) => { upd[id] = off ? true : null; });
    save(scopeRef('screens').update(upd), off ? 'إطفاء كل الشاشات' : 'تشغيل كل الشاشات');
  }

  function preview() {
    $('pv-title').textContent = $('msg-title').value || 'الموقع متوقف مؤقتاً';
    $('pv-body').textContent  = $('msg-body').value  || 'نعتذر، سنعود قريباً.';
    const eta = $('msg-eta').value.trim();
    $('pv-eta').hidden = !eta;
    $('pv-eta').textContent = 'نعود ' + eta;
  }

  let msgTimer = null;
  ['msg-title', 'msg-body', 'msg-eta'].forEach(id => {
    $(id).addEventListener('input', () => {
      preview();
      clearTimeout(msgTimer);
      msgTimer = setTimeout(saveMessage, 700);
    });
    $(id).addEventListener('change', () => { clearTimeout(msgTimer); saveMessage(true); });
  });
  function saveMessage(withLog) {
    const msg = { title: $('msg-title').value.trim(), body: $('msg-body').value.trim(), eta: $('msg-eta').value.trim() };
    const p = scopeRef('message').set(msg.title || msg.body || msg.eta ? msg : null);
    if (withLog) save(p, 'تعديل رسالة الإطفاء');
    else p.catch(() => {});
  }
  $('msg-until').addEventListener('change', e => {
    const ts = e.target.value ? new Date(e.target.value).getTime() : null;
    save(scopeRef('until').set(ts), ts ? 'ضبط موعد التشغيل التلقائي' : 'إلغاء موعد التشغيل التلقائي');
  });

  /* ── المنتجات ── */
  async function loadCatalog() {
    if (catalog) return;
    const result = { all: [] };
    const union = new Map();
    for (const [id, b] of Object.entries(BRANCHES)) {
      try {
        const src  = await (await fetch(b.products, { cache: 'no-store' })).text();
        // ملف المنتجات يعرّف const menuCategories — يُقيَّم معزولاً حتى لا تتعارض ملفات الفروع
        const cats = new Function(src + '\n;return typeof menuCategories !== "undefined" ? menuCategories : [];')();
        result[branchScope(id)] = cats;
        cats.forEach(c => {
          if (!union.has(c.id)) union.set(c.id, { id: c.id, nameAr: c.nameAr, icon: c.icon, items: [] });
          const u = union.get(c.id);
          c.items.forEach(it => { if (!u.items.some(x => x.nameAr === it.nameAr)) u.items.push(it); });
        });
      } catch (e) { console.warn('[admin] products load error', b.products, e); }
    }
    result.all = [...union.values()];
    catalog = result;
    renderProducts();
    renderOverview();
  }

  function renderProducts() {
    const box = $('prods');
    if (!catalog) return;
    const q = $('p-search').value.trim();
    const cats = catalog[scope] || catalog.all;
    const html = cats.map(cat => {
      const items = cat.items.filter(it => !q || it.nameAr.includes(q) || (it.nameEn || '').toLowerCase().includes(q.toLowerCase()));
      if (!items.length) return '';
      return `<div class="cat-h">${esc(cat.nameAr)}</div><div class="prods">` + items.map(it => {
        const key = cat.id + '||' + it.nameAr;
        const f = flag('products', encKey(key));
        return `<div class="prod ${f.off ? 'off' : ''}">
          <div class="th"><i class="fa-solid ${esc(cat.icon || 'fa-utensils')}"></i></div>
          <div class="tx"><b>${esc(it.nameAr)}</b><small>${f.inh ? '<span class="pill inh"><i class="fa-solid fa-lock"></i> مخفي لكل الفروع</span>'
            : f.off ? '<span class="pill lock"><i class="fa-solid fa-lock"></i> مخفي ومقفل</span>' : 'ظاهر'}</small></div>
          <label class="sw ${f.inh ? 'inh' : ''}"><input type="checkbox" ${f.off ? '' : 'checked'} ${f.inh ? 'disabled' : ''}
            data-flag="products" data-key="${esc(encKey(key))}" data-label="${esc(it.nameAr)}"><span></span></label>
        </div>`;
      }).join('') + '</div>';
    }).join('');
    box.innerHTML = html || '<div class="empty">لا توجد منتجات مطابقة.</div>';
  }
  $('p-search').addEventListener('input', renderProducts);

  function showAllProducts() {
    save(scopeRef('products').set(null), 'إظهار كل المنتجات');
  }

  /* ── التحديثات والأجهزة ── */
  async function loadLatestVersion() {
    try {
      const txt = await (await fetch('sw.js', { cache: 'no-store' })).text();
      const m = txt.match(/CACHE_NAME\s*=\s*'duo-menu-(v\d+)'/);
      latestVersion = m ? m[1] : '';
    } catch (e) { latestVersion = ''; }
    $('ver-now').textContent = latestVersion || '—';
    renderDevices();
  }

  function devList() {
    const now = Date.now();
    return Object.entries(presence)
      .map(([id, d]) => Object.assign({ id }, d, { online: !!d.online && now - (d.lastSeen || 0) < ONLINE_MS }))
      .filter(d => scope === 'all' || d.branch === scope)
      .sort((a, b) => (b.online - a.online) || ((b.lastSeen || 0) - (a.lastSeen || 0)));
  }

  function ago(ts) {
    if (!ts) return '—';
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return `قبل ${m} د`;
    const h = Math.round(m / 60);
    if (h < 24) return `قبل ${h} س`;
    return `قبل ${Math.round(h / 24)} يوم`;
  }

  function renderDevices() {
    const list = devList();
    $('devs').innerHTML = list.length ? list.map(d => {
      const old = latestVersion && d.version && d.version !== latestVersion;
      const dot = !d.online ? 'r' : old ? 'y' : 'g';
      return `<div class="row"><span class="dot ${dot}"></span>
        <div class="tx"><b>${esc(SCREEN_NAME[d.screen] || d.screen)} — ${esc(d.device || '')}</b>
          <small>${esc(scopeLabel(d.branch))} · <span class="${old ? 'dev-ver-old' : ''}">${esc(d.version || '—')}${old ? ' (بانتظار التحديث)' : ''}</span> · ${d.online ? 'متصل' : ago(d.lastSeen)}</small></div>
        ${d.online ? '' : `<button class="dev-del" data-del="${esc(d.id)}" title="حذف من القائمة"><i class="fa-solid fa-xmark"></i></button>`}
      </div>`;
    }).join('') : '<div class="empty">لا توجد أجهزة مسجّلة بعد — تظهر الأجهزة هنا عند فتح أي شاشة بعد هذا التحديث.</div>';
  }
  $('devs').addEventListener('click', e => {
    const b = e.target.closest('[data-del]');
    if (b) db.ref('duo/presence/' + b.dataset.del).remove().catch(() => {});
  });
  setInterval(() => { if (db && auth && auth.currentUser) { renderDevices(); renderOverview(); } }, 30000);

  function forceUpdate() {
    if (!confirm('سيُعاد تحميل كل الأجهزة بأحدث نسخة من الموقع (الشاشة المشغولة تنتظر حتى تتوقف). متابعة؟')) return;
    save(db.ref(`${ROOT}/update`).set({ forceAt: TS }), 'فرض تحديث كل الأجهزة');
  }

  /* ── الأمان ── */
  $('pw-form').addEventListener('submit', e => {
    e.preventDefault();
    const curPw = $('pw-cur').value, nw = $('pw-new').value, nw2 = $('pw-new2').value;
    if (nw.length < 8) { toast('الرمز الجديد يجب أن يكون ٨ أحرف/أرقام على الأقل', true); return; }
    if (nw !== nw2)    { toast('الرمز الجديد وتأكيده غير متطابقين', true); return; }
    const user = auth.currentUser;
    const cred = firebase.auth.EmailAuthProvider.credential(user.email, curPw);
    user.reauthenticateWithCredential(cred)
      .then(() => user.updatePassword(nw))
      .then(() => {
        ['pw-cur', 'pw-new', 'pw-new2'].forEach(id => { $(id).value = ''; });
        db.ref(`${ROOT}/log`).push({ msg: 'تغيير رمز المسؤول الأساسي', scope: 'all', ts: TS }).catch(() => {});
        toast('تم تغيير رمز المسؤول');
      })
      .catch(err => toast(AUTH_ERR[err && err.code] === 'الرمز غير صحيح' ? 'الرمز الحالي غير صحيح' : (AUTH_ERR[err && err.code] || 'تعذّر تغيير الرمز'), true));
  });

  function logoutAll() {
    if (!confirm('سيُطلب الرقم السري من جديد على كل أجهزة الكاشير ولوحة التحكم. متابعة؟')) return;
    save(db.ref(`${ROOT}/sessionEpoch`).set(TS), 'تسجيل خروج كل الأجهزة');
  }

  /* ── الأزرار العامة ── */
  const ACTIONS = {
    'force-update':   forceUpdate,
    'kill-all':       () => setAllScreens(true),
    'start-all':      () => setAllScreens(false),
    'show-all-prods': showAllProducts,
    'logout-all':     logoutAll,
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (b && ACTIONS[b.dataset.action]) ACTIONS[b.dataset.action]();
  });

  /* ── نظرة عامة ── */
  function countOff(group) {
    const a = scope === 'all' ? {} : (allSc()[group] || {});
    return Object.keys(Object.assign({}, a, cur()[group] || {})).length;
  }

  function renderOverview() {
    const off = SCREENS.filter(([id]) => screenState(id).off).length;
    const s = $('ov-status');
    s.textContent = !off ? 'يعمل' : off === SCREENS.length ? 'مُطفأ' : 'جزئي';
    s.className = 'v ' + (off ? 'bad' : 'ok');
    $('ov-status-h').textContent = !off ? 'كل الشاشات مفعّلة' : `${off} من ${SCREENS.length} شاشات مُطفأة`;

    const online = devList().filter(d => d.online);
    $('ov-devs').textContent = online.length;
    const by = {};
    online.forEach(d => { const n = SCREEN_NAME[d.screen] || d.screen; by[n] = (by[n] || 0) + 1; });
    $('ov-devs-h').textContent = Object.entries(by).map(([n, c]) => `${c} ${n}`).join(' · ') || 'لا أجهزة متصلة';

    $('ov-feat').textContent = countOff('cashier') + countOff('dashboard') + countOff('menu');
    $('ov-prod').textContent = countOff('products');
  }

  /* ── السجل ── */
  function renderLog() {
    const html = list => list.length ? list.map(x => {
      const t = x.ts ? new Date(x.ts) : null;
      const time = t ? t.toLocaleString('ar-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      return `<div class="row"><div class="ic"><i class="fa-solid fa-pen"></i></div>
        <div class="tx"><b>${esc(x.msg)}</b><small>${esc(scopeLabel(x.scope))}</small></div><time>${esc(time)}</time></div>`;
    }).join('') : '<div class="empty">لا توجد تغييرات بعد.</div>';
    $('log-mini').innerHTML = html(logItems.slice(0, 5));
    $('log-full').innerHTML = html(logItems);
  }

  /* ── تنبيه ── */
  let toastTimer;
  function toast(m, isErr) {
    const el = $('toast');
    el.querySelector('span').textContent = m;
    el.classList.toggle('err', !!isErr);
    el.querySelector('i').className = 'fa-solid ' + (isErr ? 'fa-circle-exclamation' : 'fa-circle-check');
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), isErr ? 4000 : 1800);
  }

  init();
})();
