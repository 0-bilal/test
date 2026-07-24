/**
 * dashboard.js — لوحة تحكم DUO Burger (صفحة منفصلة)
 * تشارك التخزين مع صفحة المنيو (index.html) عبر نفس المفاتيح.
 */

/* ── Helpers ── */
const $ = id => document.getElementById(id);

/* ── مفاتيح التخزين (نفس المستخدمة في main.js) ── */
const SS_ITEMS    = 'duo_hidden_items';
const SS_SLIDES   = 'duo_hidden_slides';
const SS_DISCOUNT = 'duo_discount_hidden';
const SS_PHONE    = 'duo_phone_hidden';
const SS_VARIANTS = 'duo_hidden_variants';
const LS_BADGES   = 'duo_badges';
const LS_STATS_PFX = 'duo_stats_';

/* ── مفاتيح ضبط الشاشة ── */
const BASE_W = 2000, BASE_H = 1200;
const LS_SCALE_MODE = 'duo_scale_mode';    // 'auto' | 'manual'
const LS_SCALE_VAL  = 'duo_screen_scale';  // رقم المقياس اليدوي
const LS_SCALE_W    = 'duo_screen_w';
const LS_SCALE_H    = 'duo_screen_h';

/* ── الحالة ── */
let _hiddenItems    = new Set();
let _hiddenSlides   = new Set();
let _hiddenVariants = new Set();
let _discountHidden = false;
let _phoneHidden    = false;
let _badges         = {};

/* ── شارات ── */
const BADGE_META = {
  popular: { label: 'الأكثر طلباً', icon: 'fa-fire',  cls: 'badge--popular' },
  new:     { label: 'جديد',         icon: 'fa-star',  cls: 'badge--new'     },
  limited: { label: 'محدود',        icon: 'fa-clock', cls: 'badge--limited' },
};

const _key = (catId, nameAr) => catId + '||' + nameAr;

/* ════════════════════════════════════════════════
   تحميل الإعدادات
════════════════════════════════════════════════ */
function loadSettings() {
  try {
    _hiddenItems    = new Set(JSON.parse(sessionStorage.getItem(SS_ITEMS)    || '[]'));
    _hiddenSlides   = new Set(JSON.parse(sessionStorage.getItem(SS_SLIDES)   || '[]').map(String));
    _hiddenVariants = new Set(JSON.parse(sessionStorage.getItem(SS_VARIANTS) || '[]'));
    _discountHidden = sessionStorage.getItem(SS_DISCOUNT) === 'true';
    _phoneHidden    = sessionStorage.getItem(SS_PHONE)    === 'true';
    _badges         = JSON.parse(localStorage.getItem(LS_BADGES) || '{}');
  } catch (e) {
    _hiddenItems = new Set(); _hiddenSlides = new Set(); _hiddenVariants = new Set();
    _badges = {};
  }
}

/* ── إحصائيات ── */
function _todayKey() { return LS_STATS_PFX + new Date().toISOString().slice(0, 10); }
function _getStats() { try { return JSON.parse(localStorage.getItem(_todayKey()) || '{}'); } catch { return {}; } }

/* ════════════════════════════════════════════════
   تبديل التبويبات
════════════════════════════════════════════════ */
const TAB_TITLES = {
  header:   'الهيدر',
  slides:   'الشرائح الترويجية',
  products: 'المنتجات',
  stats:    'الإحصائيات',
  screen:   'ضبط الشاشة',
  pairing:  'ربط الأجهزة',
};
let _activeTab = 'header';

function showTab(tab) {
  _activeTab = tab;
  document.querySelectorAll('.dash-nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab)
  );
  const title = $('dash-page-title');
  if (title) title.textContent = TAB_TITLES[tab] || '';
  document.body.classList.remove('side-open');

  // إيقاف مؤقّت تحديث حالة الربط عند مغادرة تبويبه
  if (tab !== 'pairing') _stopPairingPoll();

  const body = $('dash-body');
  if (!body) return;

  switch (tab) {
    case 'header':   renderHeaderTab(body);   break;
    case 'slides':   renderSlidesTab(body);   break;
    case 'products': renderProductsTab(body); break;
    case 'stats':    renderStatsTab(body);    break;
    case 'screen':   renderScreenTab(body);   break;
    case 'pairing':  renderPairingTab(body);  break;
  }
}
window.showTab = showTab;

/* ════════════════════════════════════════════════
   تبويب: الهيدر
════════════════════════════════════════════════ */
function renderHeaderTab(body) {
  body.innerHTML = `
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-mobile-screen-button"></i> عناصر الهيدر</div>
      <label class="row">
        <div class="row-icon"><i class="fa-solid fa-phone"></i></div>
        <div class="row-label">
          إظهار رقم الهاتف
          <small>يظهر رقم التواصل أعلى المنيو</small>
        </div>
        <span class="toggle">
          <input type="checkbox" ${!_phoneHidden ? 'checked' : ''} onchange="togglePhone(this.checked)">
          <span class="slider"></span>
        </span>
      </label>
      <label class="row">
        <div class="row-icon row-icon--gold"><i class="fa-solid fa-tags"></i></div>
        <div class="row-label">
          إظهار زر الخصم 10%
          <small>الزر الذهبي الذي يفتح شاشة التقييم</small>
        </div>
        <span class="toggle">
          <input type="checkbox" ${!_discountHidden ? 'checked' : ''} onchange="toggleDiscount(this.checked)">
          <span class="slider"></span>
        </span>
      </label>
    </div>`;
}

/* ════════════════════════════════════════════════
   تبويب: الشرائح
════════════════════════════════════════════════ */
function renderSlidesTab(body) {
  const visCount = slides.filter((_, i) => !_hiddenSlides.has(String(i))).length;
  let html = `<div class="card">
    <div class="card-title">
      <i class="fa-solid fa-images"></i> الشرائح الترويجية
      <span class="count">${visCount}/${slides.length}</span>
    </div>`;
  slides.forEach((sl, i) => {
    const visible = !_hiddenSlides.has(String(i));
    html += `<label class="row ${visible ? '' : 'row--off'}">
      <div class="row-icon row-icon--num">${i + 1}</div>
      <div class="row-label">
        ${sl.titleAr || 'شريحة ' + (i + 1)}
        ${sl.titleEn ? `<small>${sl.titleEn}</small>` : ''}
      </div>
      <span class="status ${visible ? 'status--on' : 'status--off'}">
        ${visible ? '<i class="fa-solid fa-eye"></i> ظاهر' : '<i class="fa-solid fa-eye-slash"></i> مخفي'}
      </span>
      <span class="toggle">
        <input type="checkbox" ${visible ? 'checked' : ''} onchange="toggleSlide(${i}, this.checked)">
        <span class="slider"></span>
      </span>
    </label>`;
  });
  html += `</div>`;
  body.innerHTML = html;
}

/* ════════════════════════════════════════════════
   تبويب: المنتجات
════════════════════════════════════════════════ */
function renderProductsTab(body) {
  let html = '';
  menuCategories.forEach(cat => {
    const visCount = cat.items.filter(it => !_hiddenItems.has(_key(cat.id, it.nameAr))).length;
    html += `<div class="card">
      <div class="card-title">
        <i class="fa-solid ${cat.icon}"></i> ${cat.nameAr}
        <span class="count" data-cat="${cat.id}">${visCount}/${cat.items.length}</span>
      </div>`;
    cat.items.forEach(item => {
      const key    = _key(cat.id, item.nameAr);
      const badge  = _badges[key] || '';
      const hidden = _hiddenItems.has(key);
      html += `
      <label class="row ${hidden ? 'row--off' : ''}">
        <div class="row-icon row-icon--img">
          <i class="fa-solid fa-burger" style="${item.image ? 'display:none' : ''}"></i>
          ${item.image
            ? `<img src="${item.image}" alt="" onerror="this.remove();this.previousElementSibling.style.display='flex'">`
            : ''}
        </div>
        <div class="row-label">
          ${item.nameAr}
          ${item.nameEn ? `<small>${item.nameEn}</small>` : ''}
          ${item.price != null ? `<small class="price-hint">${item.price} ريال</small>` : ''}
        </div>
        <span class="toggle">
          <input type="checkbox" ${!hidden ? 'checked' : ''} onchange="toggleItem('${key}', this.checked)">
          <span class="slider"></span>
        </span>
      </label>
      <div class="badge-row">
        <span class="badge-label"><i class="fa-solid fa-tag"></i> شارة</span>
        <div class="badge-btns">
          ${['','popular','new','limited'].map(b => `
            <button class="badge-btn ${b ? 'badge-btn--'+b : 'badge-btn--none'} ${badge===b?'active':''}"
                    data-badge="${b}" onclick="setBadge('${key}','${b}',this)">
              ${b ? BADGE_META[b].label : 'لا شيء'}
            </button>`).join('')}
        </div>
      </div>`;
      if (item.variants?.length) {
        item.variants.forEach(v => {
          const vkey = key + '||' + v;
          html += `<label class="row row--variant">
            <div class="row-label variant-label">
              <i class="fa-solid fa-angle-left variant-arrow"></i> ${v}
            </div>
            <span class="toggle">
              <input type="checkbox" ${!_hiddenVariants.has(vkey) ? 'checked' : ''}
                     onchange="toggleVariant('${vkey}', this.checked)">
              <span class="slider"></span>
            </span>
          </label>`;
        });
      }
    });
    html += `</div>`;
  });
  body.innerHTML = html;
}

/* ════════════════════════════════════════════════
   تبويب: الإحصائيات
════════════════════════════════════════════════ */
function renderStatsTab(body) {
  const stats   = _getStats();
  const entries = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  const total   = entries.reduce((s, [, c]) => s + c, 0);
  const today   = new Date().toLocaleDateString('ar-SA', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  let html = `<div class="stats-header">
    <div class="stats-date"><i class="fa-solid fa-calendar-day"></i> ${today}</div>
    <div class="stats-total"><span>${total}</span> مشاهدة إجمالية</div>
  </div>`;

  if (!entries.length) {
    html += `<div class="stats-empty">
      <i class="fa-solid fa-chart-line"></i>
      <p>لا توجد إحصائيات لهذا اليوم بعد</p>
      <small>تُسجَّل المشاهدات عند فتح تفاصيل المنتجات في المنيو</small>
    </div>`;
  } else {
    const maxVal = entries[0][1];
    html += `<div class="card"><div class="card-title"><i class="fa-solid fa-fire"></i> الأكثر مشاهدةً</div>`;
    entries.forEach(([k, count], idx) => {
      const nameAr = k.split('||')[1] || k;
      const pct    = Math.round((count / maxVal) * 100);
      const rank   = idx === 0 ? 'rank--gold' : idx === 1 ? 'rank--silver' : idx === 2 ? 'rank--bronze' : '';
      html += `<div class="stat-row">
        <span class="stat-rank ${rank}">${idx + 1}</span>
        <span class="stat-name">${nameAr}</span>
        <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pct}%"></div></div>
        <span class="stat-count">${count}</span>
      </div>`;
    });
    html += `</div>`;
  }
  body.innerHTML = html;
}

/* ════════════════════════════════════════════════
   تبويب: ضبط الشاشة
════════════════════════════════════════════════ */
function renderScreenTab(body) {
  const sw   = screen.width;
  const sh   = screen.height;
  const mode = localStorage.getItem(LS_SCALE_MODE) || 'auto';
  const savedScale = parseFloat(localStorage.getItem(LS_SCALE_VAL) || '0');
  const savedW = localStorage.getItem(LS_SCALE_W) || '';
  const savedH = localStorage.getItem(LS_SCALE_H) || '';

  const autoScale = Math.min(sw / BASE_W, sh / BASE_H);
  const autoPct   = Math.round(autoScale * 100);
  const curPct    = mode === 'manual' && savedScale ? Math.round(savedScale * 100) : autoPct;

  const presets = [
    { label: '1920 × 1080', w: 1920, h: 1080 },
    { label: '2560 × 1440', w: 2560, h: 1440 },
    { label: '1366 × 768',  w: 1366, h: 768  },
    { label: '1280 × 800',  w: 1280, h: 800  },
    { label: '1024 × 768',  w: 1024, h: 768  },
    { label: '3840 × 2160', w: 3840, h: 2160 },
  ];

  body.innerHTML = `
    <!-- شرح -->
    <div class="screen-note">
      <i class="fa-solid fa-circle-info"></i>
      <div>
        <strong>ملاءمة تلقائية مُفعّلة افتراضياً</strong>
        يتكيّف المنيو والشرائح وكل العناصر مع أي حجم شاشة تلقائياً دون قصّ.
        استخدم الوضع اليدوي فقط إذا أردت تثبيت مقياس معيّن.
      </div>
    </div>

    <!-- بطاقات المعلومات -->
    <div class="screen-info-grid">
      <div class="screen-info">
        <i class="fa-solid fa-window-maximize"></i>
        <div><span class="si-label">دقة شاشتك</span><span class="si-val">${sw} × ${sh}</span></div>
      </div>
      <div class="screen-info">
        <i class="fa-solid fa-vector-square si-red"></i>
        <div><span class="si-label">مقاس التصميم</span><span class="si-val si-red">${BASE_W} × ${BASE_H}</span></div>
      </div>
      <div class="screen-info">
        <i class="fa-solid fa-magnifying-glass si-green"></i>
        <div><span class="si-label">المقياس الحالي</span><span class="si-val si-green">${curPct}%</span></div>
      </div>
      <div class="screen-info">
        <i class="fa-solid fa-toggle-on ${mode==='auto'?'si-green':''}"></i>
        <div><span class="si-label">الوضع</span><span class="si-val ${mode==='auto'?'si-green':''}">${mode==='auto'?'تلقائي':'يدوي'}</span></div>
      </div>
    </div>

    <!-- الوضع التلقائي -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-wand-magic-sparkles"></i> الوضع التلقائي (مُوصى به)</div>
      <div class="screen-auto">
        <div class="screen-auto-desc">
          <strong>ملاءمة تلقائية لكل شاشة</strong>
          <span>يتغيّر المقياس فوراً عند تغيير حجم النافذة أو نقل الموقع لشاشة أخرى.</span>
        </div>
        <button class="btn-auto ${mode==='auto'?'btn-auto--active':''}" onclick="setAutoMode()">
          ${mode==='auto'
            ? '<i class="fa-solid fa-circle-check"></i> مُفعّل'
            : '<i class="fa-solid fa-wand-magic-sparkles"></i> تفعيل التلقائي'}
        </button>
      </div>
    </div>

    <!-- أحجام جاهزة -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-desktop"></i> تثبيت على حجم شاشة محدّد</div>
      <div class="screen-presets">
        ${presets.map(p => {
          const sc = Math.round(Math.min(p.w / BASE_W, p.h / BASE_H) * 100);
          const active = mode==='manual' && String(p.w)===savedW && String(p.h)===savedH;
          return `<button class="preset ${active?'preset--active':''}" onclick="setManualScale(${p.w},${p.h})">
            <span class="preset-res">${p.label}</span>
            <span class="preset-pct">${sc}%</span>
          </button>`;
        }).join('')}
      </div>
    </div>

    <!-- حجم مخصص -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-pen-ruler"></i> حجم مخصص</div>
      <div class="screen-manual">
        <div class="field">
          <label>العرض (px)</label>
          <input type="number" id="sc-w" value="${sw}" min="600" max="6000" placeholder="2000">
        </div>
        <span class="field-x">×</span>
        <div class="field">
          <label>الارتفاع (px)</label>
          <input type="number" id="sc-h" value="${sh}" min="400" max="4000" placeholder="1200">
        </div>
        <button class="btn-apply" onclick="applyCustom()">
          <i class="fa-solid fa-check"></i> تطبيق
        </button>
      </div>
    </div>
  `;
}

/* ════════════════════════════════════════════════
   إجراءات — الهيدر / الشرائح / المنتجات
════════════════════════════════════════════════ */
function togglePhone(checked) {
  _phoneHidden = !checked;
  sessionStorage.setItem(SS_PHONE, String(_phoneHidden));
  toast(checked ? 'تم إظهار رقم الهاتف' : 'تم إخفاء رقم الهاتف');
}
function toggleDiscount(checked) {
  _discountHidden = !checked;
  sessionStorage.setItem(SS_DISCOUNT, String(_discountHidden));
  toast(checked ? 'تم إظهار زر الخصم' : 'تم إخفاء زر الخصم');
}
function toggleSlide(idx, checked) {
  if (checked) _hiddenSlides.delete(String(idx));
  else         _hiddenSlides.add(String(idx));
  sessionStorage.setItem(SS_SLIDES, JSON.stringify([..._hiddenSlides]));
  renderSlidesTab($('dash-body'));
}
function toggleItem(key, checked) {
  if (checked) _hiddenItems.delete(key);
  else         _hiddenItems.add(key);
  sessionStorage.setItem(SS_ITEMS, JSON.stringify([..._hiddenItems]));
  // تحديث العداد
  const cat = menuCategories.find(c => c.items.some(it => _key(c.id, it.nameAr) === key));
  if (cat) {
    const vis = cat.items.filter(it => !_hiddenItems.has(_key(cat.id, it.nameAr))).length;
    const el  = document.querySelector(`.count[data-cat="${cat.id}"]`);
    if (el) el.textContent = `${vis}/${cat.items.length}`;
  }
}
function toggleVariant(vkey, checked) {
  if (checked) _hiddenVariants.delete(vkey);
  else         _hiddenVariants.add(vkey);
  sessionStorage.setItem(SS_VARIANTS, JSON.stringify([..._hiddenVariants]));
}
function setBadge(key, badge, btn) {
  _badges[key] = badge;
  localStorage.setItem(LS_BADGES, JSON.stringify(_badges));
  btn.closest('.badge-btns').querySelectorAll('.badge-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.badge === badge)
  );
  toast(badge ? 'تم تعيين الشارة' : 'تمت إزالة الشارة');
}
window.togglePhone    = togglePhone;
window.toggleDiscount = toggleDiscount;
window.toggleSlide    = toggleSlide;
window.toggleItem     = toggleItem;
window.toggleVariant  = toggleVariant;
window.setBadge       = setBadge;

/* ════════════════════════════════════════════════
   إجراءات — ضبط الشاشة
════════════════════════════════════════════════ */
function setAutoMode() {
  localStorage.setItem(LS_SCALE_MODE, 'auto');
  localStorage.removeItem(LS_SCALE_VAL);
  localStorage.removeItem(LS_SCALE_W);
  localStorage.removeItem(LS_SCALE_H);
  toast('تم تفعيل الملاءمة التلقائية');
  renderScreenTab($('dash-body'));
}
function setManualScale(w, h) {
  const scale = Math.min(w / BASE_W, h / BASE_H);
  localStorage.setItem(LS_SCALE_MODE, 'manual');
  localStorage.setItem(LS_SCALE_VAL, String(scale));
  localStorage.setItem(LS_SCALE_W, String(w));
  localStorage.setItem(LS_SCALE_H, String(h));
  toast(`تم التثبيت على ${w}×${h} (${Math.round(scale*100)}%)`);
  renderScreenTab($('dash-body'));
}
function applyCustom() {
  const w = parseInt($('sc-w')?.value || '0', 10);
  const h = parseInt($('sc-h')?.value || '0', 10);
  if (w >= 600 && h >= 400) setManualScale(w, h);
  else toast('الرجاء إدخال قيم صحيحة');
}
window.setAutoMode    = setAutoMode;
window.setManualScale = setManualScale;
window.applyCustom    = applyCustom;

/* ════════════════════════════════════════════════
   تبويب: ربط الأجهزة (Firebase Realtime Database)
════════════════════════════════════════════════ */
const PAIR = {
  branch:  'duo_pair_branch',
  role:    'duo_pair_role',      // 'left' | 'right'
  enabled: 'duo_pair_enabled',   // 'true' | 'false'
  fb:      'duo_fb_config',       // إعداد مشروع Firebase (JSON)
  status:  'duo_conn_status',     // مرآة الحالة من صفحة المنيو
};

function _pairCfg() {
  let fb = null;
  try { fb = JSON.parse(localStorage.getItem(PAIR.fb) || 'null'); } catch (e) {}
  return {
    branch:  localStorage.getItem(PAIR.branch)  || 'Branch01',
    role:    localStorage.getItem(PAIR.role)    || 'left',
    enabled: localStorage.getItem(PAIR.enabled) === 'true',
    fb:      fb,
  };
}
const _roleLabel = r => (r === 'left' ? 'يسار' : 'يمين');

/* استخراج إعداد Firebase من نص ملصوق (JSON أو كائن JS) */
function parseFirebaseConfig(text) {
  if (!text || !text.trim()) return null;
  // محاولة JSON مباشرة
  try { const o = JSON.parse(text); if (o && typeof o === 'object' && o.databaseURL) return o; } catch (e) {}
  // استخراج الحقول بالتعبير النمطي من كائن JS
  const keys = ['apiKey','authDomain','databaseURL','projectId','storageBucket','messagingSenderId','appId','measurementId'];
  const o = {};
  keys.forEach(k => {
    const m = text.match(new RegExp(k + '\\s*:\\s*["\'`]([^"\'`]+)["\'`]'));
    if (m) o[k] = m[1];
  });
  return Object.keys(o).length ? o : null;
}

const STATE_META = {
  connected:  { c: '#22c55e', t: 'مرتبط ويعمل',     i: 'fa-circle-check' },
  connecting: { c: '#f5c200', t: 'جارٍ الاتصال…',    i: 'fa-spinner' },
  waiting:    { c: '#3b82f6', t: 'بانتظار الشريك',   i: 'fa-hourglass-half' },
  offline:    { c: '#f87171', t: 'غير متصل',         i: 'fa-plug-circle-xmark' },
  error:      { c: '#f87171', t: 'خطأ في الاتصال',   i: 'fa-triangle-exclamation' },
  idle:       { c: '#888',    t: 'الربط متوقف',      i: 'fa-circle-pause' },
};

function renderPairingTab(body) {
  const cfg    = _pairCfg();
  const fb     = cfg.fb || {};
  const fbText = fb.databaseURL ? JSON.stringify(fb, null, 2) : '';
  const fbOk   = !!fb.databaseURL;

  body.innerHTML = `
    <div class="screen-note">
      <i class="fa-solid fa-circle-info"></i>
      <div>
        <strong>ربط مجاني عبر Firebase — يعمل بلا خادم محلي</strong>
        اضبط كل جهاز مرة واحدة (فرع + دور)، والصق إعداد Firebase. بعدها يتصل الأيبادان تلقائياً
        كلما فُتح المنيو، بدون غرف أو QR، ويعمل حتى لو كان الراوتر يعزل الأجهزة.
      </div>
    </div>

    <!-- إعداد الجهاز -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-sliders"></i> إعداد هذا الجهاز</div>

      <div class="pair-field">
        <label>معرّف الفرع / الغرفة (Branch ID)</label>
        <input type="text" id="pair-branch" value="${cfg.branch}" placeholder="Branch01"
               oninput="pairPreview()">
        <small>يجب أن يكون نفسه تماماً على الجهازين (مثال: Branch01).</small>
      </div>

      <div class="pair-field">
        <label>دور هذا الجهاز</label>
        <div class="pair-roles">
          <button class="pair-role ${cfg.role==='left'?'pair-role--active':''}" data-role="left"
                  onclick="pairSetRole('left')">
            <i class="fa-solid fa-tablet-screen-button"></i>
            <span>الجهاز الأيسر</span>
            <small>left</small>
          </button>
          <button class="pair-role ${cfg.role==='right'?'pair-role--active':''}" data-role="right"
                  onclick="pairSetRole('right')">
            <i class="fa-solid fa-tablet-screen-button"></i>
            <span>الجهاز الأيمن</span>
            <small>right</small>
          </button>
        </div>
      </div>

      <div class="pair-ids">
        <div class="pair-id-box">
          <span class="pair-id-label"><i class="fa-solid fa-door-open"></i> الغرفة / الدور</span>
          <code id="pair-my-id">—</code>
        </div>
        <div class="pair-id-arrow"><i class="fa-solid fa-right-left"></i></div>
        <div class="pair-id-box">
          <span class="pair-id-label"><i class="fa-solid fa-tablet-screen-button"></i> الجهاز الشريك</span>
          <code id="pair-partner-id">—</code>
        </div>
      </div>

      <label class="row" style="margin-top:6px">
        <div class="row-icon row-icon--gold"><i class="fa-solid fa-bolt"></i></div>
        <div class="row-label">
          تفعيل الربط التلقائي
          <small>عند التفعيل يتصل الجهازان تلقائياً في صفحة المنيو</small>
        </div>
        <span class="toggle">
          <input type="checkbox" id="pair-enabled" ${cfg.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </span>
      </label>
    </div>

    <!-- إعداد Firebase -->
    <div class="card">
      <div class="card-title">
        <i class="fa-solid fa-fire"></i> إعداد Firebase
        <span class="count">${fbOk ? '✓ محفوظ' : 'مطلوب'}</span>
      </div>
      <p class="pair-adv-note">
        من مشروع Firebase ← إعدادات المشروع ← تطبيق الويب، انسخ كائن <code>firebaseConfig</code> بالكامل
        والصقه هنا. تأكّد أنك أنشأت <b>Realtime Database</b> (وليس Firestore) ليحتوي على <code>databaseURL</code>.
      </p>
      <div class="pair-field">
        <label>الصق إعداد Firebase (firebaseConfig)</label>
        <textarea id="pair-fb" class="pair-textarea" rows="9"
          placeholder='الصق هنا كائن firebaseConfig كاملاً — يجب أن يحتوي على apiKey و databaseURL و projectId و appId'>${fbText ? fbText.replace(/</g,'&lt;') : ''}</textarea>
      </div>
      <div class="pair-actions">
        <button class="btn-apply" onclick="pairSave()"><i class="fa-solid fa-floppy-disk"></i> حفظ الإعداد</button>
        <button class="btn-reset" onclick="pairReset()"><i class="fa-solid fa-rotate-left"></i> إعادة تعيين</button>
      </div>
    </div>

    <!-- الحالة -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-wifi"></i> حالة الاتصال <span class="count">هذا الجهاز فقط</span></div>
      <div id="pair-status-box" class="pair-status">
        <span class="pair-status-dot"></span>
        <div class="pair-status-text">
          <strong id="pair-status-label">—</strong>
          <small id="pair-status-detail">افتح المنيو على الجهازين لبدء الاتصال.</small>
        </div>
        <span id="pair-status-time" class="pair-status-time"></span>
      </div>
      <p class="pair-adv-note" style="margin-top:10px">
        <i class="fa-solid fa-circle-info"></i>
        تعرض هذه البطاقة حالة <b>هذا الجهاز</b> فقط. الحالة الحقيقية تظهر في المؤشّر الصغير
        أسفل صفحة المنيو على كل جهاز.
      </p>
    </div>

    <!-- اختبار الاتصال -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-satellite-dish"></i> اختبار الاتصال بـ Firebase</div>
      <div class="screen-auto">
        <div class="screen-auto-desc">
          <strong>تحقّق من أن هذا الجهاز يتصل بقاعدة البيانات</strong>
          <span>يتأكّد من صحّة الإعداد والإنترنت دون التأثير على الربط الفعلي.</span>
        </div>
        <button class="btn-apply" id="pair-test-btn" onclick="pairTest(this)">
          <i class="fa-solid fa-play"></i> بدء الاختبار
        </button>
      </div>
      <div id="pair-test-result" class="pair-test-result" style="display:none"></div>
    </div>

    <!-- تعليمات -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-list-check"></i> خطوات الإعداد لمرة واحدة</div>
      <div class="pair-steps">
        <div class="pair-step"><span>1</span> أنشئ مشروع Firebase مجاني، ثم فعّل «Realtime Database» واجعل قواعده تسمح بالقراءة/الكتابة.</div>
        <div class="pair-step"><span>2</span> انسخ إعداد firebaseConfig والصقه في الحقل أعلاه على كلا الجهازين.</div>
        <div class="pair-step"><span>3</span> أيباد = «يسار»، الآخر = «يمين»، بنفس معرّف الفرع، وفعّل الربط، ثم احفظ.</div>
        <div class="pair-step"><span>4</span> افتح المنيو على الجهازين — يتصلان تلقائياً وتظهر «مرتبط».</div>
      </div>
    </div>
  `;

  pairPreview();
  _startPairingPoll();
}

/* معاينة الغرفة/الدور فور التغيير */
function pairPreview() {
  const branch = ($('pair-branch')?.value || 'Branch01').trim() || 'Branch01';
  const role   = document.querySelector('.pair-role--active')?.dataset.role || 'left';
  const my = $('pair-my-id'), pt = $('pair-partner-id');
  if (my) my.textContent = `${branch} · ${_roleLabel(role)}`;
  if (pt) pt.textContent = `${branch} · ${_roleLabel(role === 'left' ? 'right' : 'left')}`;
}
window.pairPreview = pairPreview;

function pairSetRole(role) {
  document.querySelectorAll('.pair-role').forEach(b =>
    b.classList.toggle('pair-role--active', b.dataset.role === role)
  );
  pairPreview();
}
window.pairSetRole = pairSetRole;

function pairSave() {
  const branch = ($('pair-branch')?.value || '').trim();
  if (!branch) { toast('أدخل معرّف الفرع'); return; }
  const role = document.querySelector('.pair-role--active')?.dataset.role || 'left';
  const enabled = !!$('pair-enabled')?.checked;

  // إعداد Firebase
  const fbText = $('pair-fb')?.value || '';
  const fb = parseFirebaseConfig(fbText);
  if (fbText.trim() && !fb) { toast('تعذّر قراءة إعداد Firebase — تأكّد من نسخه كاملاً'); return; }
  if (fb && !fb.databaseURL) { toast('الإعداد ينقصه databaseURL — أنشئ Realtime Database أولاً'); return; }
  if (enabled && !fb) { toast('الصق إعداد Firebase قبل تفعيل الربط'); return; }

  localStorage.setItem(PAIR.branch, branch);
  localStorage.setItem(PAIR.role, role);
  localStorage.setItem(PAIR.enabled, String(enabled));
  if (fb) localStorage.setItem(PAIR.fb, JSON.stringify(fb));

  toast('تم حفظ إعداد الربط ✓');
  renderPairingTab($('dash-body'));
}
window.pairSave = pairSave;

function pairReset() {
  localStorage.removeItem(PAIR.branch);
  localStorage.removeItem(PAIR.role);
  localStorage.removeItem(PAIR.enabled);
  localStorage.removeItem(PAIR.fb);
  localStorage.removeItem(PAIR.status);
  toast('تمت إعادة تعيين الربط');
  renderPairingTab($('dash-body'));
}
window.pairReset = pairReset;

/* تحديث حالة الاتصال (مرآة من صفحة المنيو عبر localStorage) */
let _pairPollTimer = null;
function _startPairingPoll() {
  _stopPairingPoll();
  _updatePairStatus();
  _pairPollTimer = setInterval(_updatePairStatus, 1500);
}
function _stopPairingPoll() {
  if (_pairPollTimer) { clearInterval(_pairPollTimer); _pairPollTimer = null; }
}
function _updatePairStatus() {
  const box = $('pair-status-box');
  if (!box) { _stopPairingPoll(); return; }

  const cfg = _pairCfg();
  let st = null;
  try { st = JSON.parse(localStorage.getItem(PAIR.status) || 'null'); } catch (e) {}

  let state = 'idle';
  if (!cfg.enabled) state = 'idle';
  else if (st && st.state) {
    // اعتبر الحالة قديمة إذا مضى عليها أكثر من 20 ثانية دون تحديث
    const stale = Date.now() - (st.ts || 0) > 20000;
    state = stale ? 'offline' : st.state;
  } else state = 'offline';

  const m = STATE_META[state] || STATE_META.idle;
  const dot = box.querySelector('.pair-status-dot');
  if (dot) { dot.style.background = m.c; dot.style.boxShadow = `0 0 10px ${m.c}`; }

  const label = $('pair-status-label');
  if (label) label.textContent = m.t;

  const detail = $('pair-status-detail');
  if (detail) {
    if (!cfg.enabled) detail.textContent = 'الربط غير مُفعّل. فعّله واحفظ الإعداد.';
    else if (st && st.detail) detail.textContent = st.detail;
    else if (st && st.myId) detail.textContent = `${st.myId} ⇄ ${st.peerId || '—'}`;
    else detail.textContent = 'افتح صفحة المنيو على هذا الجهاز لبدء الاتصال.';
  }

  const time = $('pair-status-time');
  if (time) {
    if (st && st.ts && cfg.enabled) {
      const sec = Math.round((Date.now() - st.ts) / 1000);
      time.textContent = sec < 3 ? 'الآن' : `قبل ${sec}s`;
    } else time.textContent = '';
  }
}

/* اختبار الاتصال بـ Firebase (يستخدم الإعداد الملصوق حالياً أو المحفوظ) */
function pairTest(btn) {
  const box = $('pair-test-result');
  const show = (cls, html) => { if (box) { box.style.display = 'block'; box.className = 'pair-test-result ' + cls; box.innerHTML = html; } };

  if (typeof firebase === 'undefined' || !firebase.database) {
    show('bad', '<i class="fa-solid fa-triangle-exclamation"></i> لم تُحمّل مكتبة Firebase (تحقّق من الإنترنت).');
    return;
  }
  // استخدم النص الملصوق إن وُجد، وإلا المحفوظ
  const fb = parseFirebaseConfig($('pair-fb')?.value || '') || _pairCfg().fb;
  if (!fb || !fb.databaseURL) {
    show('bad', '<i class="fa-solid fa-circle-xmark"></i> لا يوجد إعداد Firebase صالح (ينقص databaseURL).');
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جارٍ الاختبار…'; }
  show('', '<i class="fa-solid fa-spinner fa-spin"></i> يتّصل بقاعدة بيانات Firebase…');

  let done = false;
  let testApp = null;
  const finish = (ok, msg) => {
    if (done) return; done = true;
    clearTimeout(timer);
    try { if (testApp) testApp.delete(); } catch (e) {}
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-play"></i> إعادة الاختبار'; }
    show(ok ? 'good' : 'bad',
      `<i class="fa-solid ${ok ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> ${msg}`);
  };
  const timer = setTimeout(() => finish(false, 'انتهت المهلة: تعذّر الاتصال. تأكّد من databaseURL وقواعد قاعدة البيانات والإنترنت.'), 9000);

  try {
    const name = 'duoTest-' + Date.now();
    testApp = firebase.initializeApp(fb, name);
    const db = firebase.database(testApp);

    // 1) تأكّد من الاتصال بالخادم
    db.ref('.info/connected').on('value', snap => {
      if (snap.val() === true) {
        // 2) جرّب كتابة/قراءة فعلية للتأكد من القواعد
        const ref = db.ref('duo/__test__/' + Math.random().toString(36).slice(2, 8));
        ref.set({ t: Date.now() })
          .then(() => ref.remove().catch(() => {}))
          .then(() => finish(true, 'ناجح ✓ — الاتصال والكتابة يعملان. إذا بقي «غير متصل»، فتأكّد أن الجهاز الآخر بنفس الفرع.'))
          .catch(err => finish(false, 'الاتصال تمّ لكن الكتابة مرفوضة — عدّل قواعد Realtime Database للسماح بالقراءة/الكتابة. (' + (err && err.code ? err.code : err) + ')'));
      }
    });
  } catch (e) {
    finish(false, 'فشل التهيئة: ' + e);
  }
}
window.pairTest = pairTest;

/* ── توست ── */
let _toastTimer = null;
function toast(msg) {
  const el = $('dash-toast');
  if (!el) return;
  el.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${msg}`;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  const rn = $('dash-rest-name');
  if (rn && typeof restaurantInfo !== 'undefined') rn.textContent = restaurantInfo.nameEn || restaurantInfo.nameAr || 'DUO';
  showTab('header');
});
