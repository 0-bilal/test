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
const SS_GAMES    = 'duo_games_hidden';
const SS_QRMENU   = 'duo_qrmenu_hidden';
const SS_VARIANTS = 'duo_hidden_variants';
const LS_BADGES      = 'duo_badges';
const LS_STATS_PFX   = 'duo_stats_';
const LS_TEMP_HIDE   = 'duo_temp_hide';
const LS_SCROLL_SKIP = 'duo_scroll_skip';
const LS_CAT_SKIP    = 'duo_cat_scroll_skip';

/* ── مفاتيح ضبط الشاشة ── */
const BASE_W = 2000, BASE_H = 1200;
const LS_SCALE_MODE = 'duo_scale_mode';    // 'auto' | 'manual'
const LS_SCALE_VAL  = 'duo_screen_scale';  // رقم المقياس اليدوي
const LS_SCALE_W    = 'duo_screen_w';
const LS_SCALE_H    = 'duo_screen_h';
const LS_LAYOUT     = 'duo_menu_layout';   // 'horizontal' | 'vertical'

/* ── مفاتيح إعدادات السكرول ── */
const LS_AUTO_SCROLL          = 'duo_auto_scroll';
const LS_ITEM_DURATION_KEY    = 'duo_item_duration';
const LS_PAUSE_DURATION_KEY   = 'duo_pause_duration';
const LS_OVERLAY_DURATION_KEY = 'duo_overlay_duration';

/* ── مفاتيح إعدادات Overlay/Crossfade ── */
const LS_CROSSFADE_DUR     = 'duo_crossfade_dur';
const LS_OV_CHANGE_DUR     = 'duo_overlay_change_dur';
const LS_OV_CLOSE_DUR      = 'duo_overlay_close_dur';

/* ── مفاتيح الصيانة والشرائح والجهاز ── */
const LS_MAINTENANCE       = 'duo_maintenance';
const LS_MAINTENANCE_MSG   = 'duo_maintenance_msg';
const LS_SLIDE_DURATIONS   = 'duo_slide_durations';      // JSON {idx: ms}
const LS_PINNED_SLIDE      = 'duo_pinned_slide';         // رقم الشريحة المثبتة أو null
const LS_LOCK_TIMEOUT      = 'duo_lock_timeout';         // دقائق (0 = معطّل)

/* ── الحالة ── */
let _hiddenItems    = new Set();
let _hiddenSlides   = new Set();
let _hiddenVariants = new Set();
let _discountHidden = false;
let _phoneHidden    = false;
let _gamesHidden    = false;
let _qrmenuHidden   = false;
let _badges         = {};
let _tempHide       = {};   // { "key": expiryMs }
let _scrollSkip     = new Set();
let _catSkip        = new Set();
let _autoScroll      = true;
let _itemDuration    = 3500;
let _pauseDuration   = 12000;
let _overlayDuration = 8000;
let _crossfadeDur    = 520;
let _ovChangeDur     = 260;
let _ovCloseDur      = 430;
let _maintenanceOn   = false;
let _maintenanceMsg  = '';
let _slideDurations  = {};   // {idx: ms}
let _pinnedSlide     = null; // null = لا تثبيت | رقم = الشريحة المثبتة
let _lockTimeout     = 0;    // دقائق
let _statsView       = 'today'; // 'today' | 'week'

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
    _gamesHidden    = sessionStorage.getItem(SS_GAMES)   === 'true';
    _qrmenuHidden   = sessionStorage.getItem(SS_QRMENU) === 'true';
    _badges         = JSON.parse(localStorage.getItem(LS_BADGES) || '{}');
    try { _tempHide = JSON.parse(localStorage.getItem(LS_TEMP_HIDE) || '{}'); } catch { _tempHide = {}; }
    _scrollSkip = new Set(JSON.parse(localStorage.getItem(LS_SCROLL_SKIP) || '[]'));
    _catSkip    = new Set(JSON.parse(localStorage.getItem(LS_CAT_SKIP)    || '[]'));
    _autoScroll      = (localStorage.getItem(LS_AUTO_SCROLL) ?? 'true') !== 'false';
    _itemDuration    = parseInt(localStorage.getItem(LS_ITEM_DURATION_KEY)    || '3500',  10);
    _pauseDuration   = parseInt(localStorage.getItem(LS_PAUSE_DURATION_KEY)   || '12000', 10);
    _overlayDuration = parseInt(localStorage.getItem(LS_OVERLAY_DURATION_KEY) || '8000',  10);
    _crossfadeDur    = parseInt(localStorage.getItem(LS_CROSSFADE_DUR)        || '520',   10);
    _ovChangeDur     = parseInt(localStorage.getItem(LS_OV_CHANGE_DUR)        || '260',   10);
    _ovCloseDur      = parseInt(localStorage.getItem(LS_OV_CLOSE_DUR)         || '430',   10);
    _maintenanceOn   = localStorage.getItem(LS_MAINTENANCE)    === 'true';
    _maintenanceMsg  = localStorage.getItem(LS_MAINTENANCE_MSG) || '';
    _lockTimeout     = parseInt(localStorage.getItem(LS_LOCK_TIMEOUT)          || '0',     10);
    try { _slideDurations = JSON.parse(localStorage.getItem(LS_SLIDE_DURATIONS) || '{}'); } catch { _slideDurations = {}; }
    const _ps = localStorage.getItem(LS_PINNED_SLIDE);
    _pinnedSlide = (_ps !== null && _ps !== '') ? parseInt(_ps, 10) : null;
  } catch (e) {
    _hiddenItems = new Set(); _hiddenSlides = new Set(); _hiddenVariants = new Set();
    _badges = {}; _tempHide = {}; _scrollSkip = new Set(); _catSkip = new Set();
    _autoScroll = true; _itemDuration = 3500; _pauseDuration = 12000; _overlayDuration = 8000;
    _crossfadeDur = 520; _ovChangeDur = 260; _ovCloseDur = 430;
    _maintenanceOn = false; _maintenanceMsg = ''; _slideDurations = {}; _pinnedSlide = null; _lockTimeout = 0;
  }
}

function _fmtRemaining(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}س ${m}د`;
  if (h > 0) return `${h} ساعة`;
  return `${m} دقيقة`;
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
  scroll:   'إعدادات السكرول',
  device:   'إدارة الجهاز',
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
    case 'scroll':   renderScrollTab(body);   break;
    case 'device':   renderDeviceTab(body);   break;
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
      <label class="row">
        <div class="row-icon" style="background:rgba(59,130,246,.12);border-color:rgba(59,130,246,.25);color:#3b82f6"><i class="fa-solid fa-gamepad"></i></div>
        <div class="row-label">
          إظهار زر الألعاب مَن يدفع؟
          <small>الزر الأزرق الذي يفتح شاشة الألعاب</small>
        </div>
        <span class="toggle">
          <input type="checkbox" ${!_gamesHidden ? 'checked' : ''} onchange="toggleGames(this.checked)">
          <span class="slider"></span>
        </span>
      </label>
      <label class="row">
        <div class="row-icon" style="background:rgba(6,120,100,.15);border-color:rgba(20,184,166,.30);color:rgba(20,184,166,.90)"><i class="fa-solid fa-qrcode"></i></div>
        <div class="row-label">
         إظهار زر منيو الجوال
          <small>يعرض QR code على لوحة الشرائح ليمسحه العميل بهاتفه</small>
        </div>
        <span class="toggle">
          <input type="checkbox" ${!_qrmenuHidden ? 'checked' : ''} onchange="toggleQRMenu(this.checked)">
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
  const hasPinned = _pinnedSlide !== null && !isNaN(_pinnedSlide);
  let html = `<div class="card">
    <div class="card-title">
      <i class="fa-solid fa-images"></i> الشرائح الترويجية
      <span class="count">${visCount}/${slides.length}</span>
    </div>`;
  if (hasPinned) {
    const pinnedName = slides[_pinnedSlide]?.titleAr || ('شريحة ' + (_pinnedSlide + 1));
    html += `<div class="slide-pin-banner">
      <i class="fa-solid fa-thumbtack"></i>
      مثبّتة: <strong>${pinnedName}</strong>
      <span class="slide-pin-banner-hint">السلايدشو متوقف</span>
    </div>`;
  }
  slides.forEach((sl, i) => {
    const visible  = !_hiddenSlides.has(String(i));
    const defDur   = sl.duration ?? 5000;
    const curDur   = (_slideDurations[String(i)] !== undefined) ? _slideDurations[String(i)] : defDur;
    const durSec   = (curDur / 1000).toFixed(1).replace('.0', '');
    const isCustom = _slideDurations[String(i)] !== undefined;
    const isPinned = _pinnedSlide === i;
    html += `
    <label class="row ${visible ? '' : 'row--off'} ${isPinned ? 'row--pinned' : ''}">
      <div class="row-icon row-icon--num">${isPinned ? '<i class="fa-solid fa-thumbtack" style="font-size:12px;color:#f5c200"></i>' : (i + 1)}</div>
      <div class="row-label">
        ${sl.titleAr || 'شريحة ' + (i + 1)}
        ${sl.titleEn ? `<small>${sl.titleEn}</small>` : ''}
        ${isPinned ? `<small class="slide-pin-active-label"><i class="fa-solid fa-thumbtack"></i> مثبّتة</small>` : ''}
      </div>
      <span class="status ${visible ? 'status--on' : 'status--off'}">
        ${visible ? '<i class="fa-solid fa-eye"></i> ظاهر' : '<i class="fa-solid fa-eye-slash"></i> مخفي'}
      </span>
      <span class="toggle">
        <input type="checkbox" ${visible ? 'checked' : ''} onchange="toggleSlide(${i}, this.checked)">
        <span class="slider"></span>
      </span>
    </label>
    <div class="slide-dur-row">
      <i class="fa-solid fa-stopwatch slide-dur-icon"></i>
      <span class="slide-dur-label">مدة العرض</span>
      <button class="slide-dur-btn" onclick="adjustSlideDur(${i}, -500)" ${curDur <= 1000 ? 'disabled' : ''}>−</button>
      <span class="slide-dur-val" id="slide-dur-val-${i}">${durSec} ث</span>
      <button class="slide-dur-btn" onclick="adjustSlideDur(${i}, 500)" ${curDur >= 30000 ? 'disabled' : ''}>+</button>
      ${isCustom ? `<button class="slide-dur-reset" onclick="resetSlideDur(${i})" title="إعادة للافتراضي">
        <i class="fa-solid fa-rotate-left"></i>
      </button>` : ''}
      <button class="slide-pin-btn ${isPinned ? 'slide-pin-btn--active' : ''}"
        onclick="togglePinnedSlide(${i})"
        title="${isPinned ? 'إلغاء التثبيت واستئناف السلايدشو' : 'تثبيت هذه الشريحة وإيقاف السلايدشو'}">
        <i class="fa-solid fa-thumbtack"></i>
        ${isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
      </button>
    </div>`;
  });
  html += `</div>`;
  body.innerHTML = html;
}

function togglePinnedSlide(idx) {
  if (_pinnedSlide === idx) {
    // إلغاء التثبيت
    _pinnedSlide = null;
    localStorage.removeItem(LS_PINNED_SLIDE);
  } else {
    // تثبيت هذه الشريحة
    _pinnedSlide = idx;
    localStorage.setItem(LS_PINNED_SLIDE, String(idx));
  }
  _syncPush();
  renderSlidesTab($('dash-body'));
}
window.togglePinnedSlide = togglePinnedSlide;

/* ════════════════════════════════════════════════
   تبويب: المنتجات
════════════════════════════════════════════════ */
function renderProductsTab(body) {
  const now = Date.now();
  let html = '';
  menuCategories.forEach(cat => {
    const visCount  = cat.items.filter(it => !_hiddenItems.has(_key(cat.id, it.nameAr))).length;
    const catSkipped = _catSkip.has(cat.id);
    html += `<div class="card">
      <div class="card-title">
        <i class="fa-solid ${cat.icon}"></i> ${cat.nameAr}
        <span class="count" data-cat="${cat.id}">${visCount}/${cat.items.length}</span>
        <label class="cat-skip-toggle" title="تخطي القسم كاملاً في السكرول التلقائي">
          <span class="cat-skip-label"><i class="fa-solid fa-forward-step"></i> تخطي القسم</span>
          <span class="toggle toggle--sm">
            <input type="checkbox" ${catSkipped ? 'checked' : ''} onchange="toggleCatSkip('${cat.id}', this.checked)">
            <span class="slider"></span>
          </span>
        </label>
      </div>`;
    cat.items.forEach(item => {
      const key        = _key(cat.id, item.nameAr);
      const badge      = _badges[key] || '';
      const hidden     = _hiddenItems.has(key);
      const tempExpiry = _tempHide[key];
      const isTempHid  = tempExpiry && tempExpiry > now;
      const remaining  = isTempHid ? _fmtRemaining(tempExpiry - now) : '';
      const isSkipped  = _scrollSkip.has(key);

      html += `
      <label class="row ${(hidden || isTempHid) ? 'row--off' : ''}">
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

      <!-- شارة -->
      <div class="badge-row">
        <span class="badge-label"><i class="fa-solid fa-tag"></i> شارة</span>
        <div class="badge-btns">
          ${['','popular','new','limited'].map(b => `
            <button class="badge-btn ${b ? 'badge-btn--'+b : 'badge-btn--none'} ${badge===b?'active':''}"
                    data-badge="${b}" onclick="setBadge('${key}','${b}',this)">
              ${b ? BADGE_META[b].label : 'لا شيء'}
            </button>`).join('')}
        </div>
      </div>

      <!-- إخفاء مؤقت + تخطي السكرول -->
      <div class="item-controls-row">

        <div class="item-ctrl-group">
          <span class="item-ctrl-label"><i class="fa-solid fa-clock"></i> إخفاء مؤقت</span>
          ${isTempHid
            ? `<div class="temp-active">
                <span class="temp-remaining"><i class="fa-solid fa-hourglass-half"></i> ${remaining}</span>
                <button class="temp-cancel" onclick="cancelTempHide('${key}')">
                  <i class="fa-solid fa-xmark"></i> إلغاء
                </button>
               </div>`
            : `<div class="temp-btns">
                ${[1,2,4,8].map(h => `
                  <button class="temp-btn" onclick="setTempHide('${key}',${h})">${h}س</button>
                `).join('')}
               </div>`
          }
        </div>

        <div class="item-ctrl-group item-ctrl-group--skip">
          <span class="item-ctrl-label"><i class="fa-solid fa-forward-step"></i> تخطي في السكرول</span>
          <label class="toggle toggle--sm">
            <input type="checkbox" ${isSkipped ? 'checked' : ''} onchange="toggleScrollSkip('${key}', this.checked)">
            <span class="slider"></span>
          </label>
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
   تبويب: الإحصائيات (متقدمة)
════════════════════════════════════════════════ */
function _get7DayData() {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const key   = LS_STATS_PFX + dateStr;
    const stats = (() => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } })();
    const total = Object.values(stats).reduce((s, c) => s + c, 0);
    result.push({
      date: d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' }),
      dateStr,
      total,
      stats,
    });
  }
  return result;
}

function renderStatsTab(body) {
  const today = new Date().toLocaleDateString('ar-SA', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // أزرار التبديل بين اليوم / 7 أيام
  let html = `
  <div class="stats-view-toggle">
    <button class="stats-view-btn ${_statsView==='today'?'active':''}" onclick="setStatsView('today')">
      <i class="fa-solid fa-calendar-day"></i> اليوم
    </button>
    <button class="stats-view-btn ${_statsView==='week'?'active':''}" onclick="setStatsView('week')">
      <i class="fa-solid fa-chart-bar"></i> آخر 7 أيام
    </button>
    <button class="stats-export-btn" onclick="exportStatsCSV()">
      <i class="fa-solid fa-file-csv"></i> تصدير CSV
    </button>
  </div>`;

  if (_statsView === 'today') {
    /* ── عرض اليوم ── */
    const stats   = _getStats();
    const entries = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    const total   = entries.reduce((s, [, c]) => s + c, 0);

    html += `<div class="stats-header">
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

  } else {
    /* ── عرض 7 أيام ── */
    const days    = _get7DayData();
    const weekTotal = days.reduce((s, d) => s + d.total, 0);
    const maxDay  = Math.max(...days.map(d => d.total), 1);

    // رسم بياني أعمدة
    html += `<div class="stats-header">
      <div class="stats-date"><i class="fa-solid fa-chart-bar"></i> آخر 7 أيام</div>
      <div class="stats-total"><span>${weekTotal}</span> مشاهدة إجمالية</div>
    </div>
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-calendar-week"></i> مشاهدات يومية</div>
      <div class="week-bars">`;

    days.forEach(d => {
      const pct = Math.round((d.total / maxDay) * 100);
      const isToday = d.dateStr === new Date().toISOString().slice(0, 10);
      html += `<div class="week-bar-wrap">
        <div class="week-bar-col">
          <span class="week-bar-count">${d.total || ''}</span>
          <div class="week-bar-fill ${isToday ? 'week-bar-today' : ''}"
               style="height:${Math.max(pct, 4)}%"></div>
        </div>
        <span class="week-bar-label ${isToday ? 'week-bar-label--today' : ''}">${d.date}</span>
      </div>`;
    });
    html += `</div></div>`;

    // أفضل المنتجات خلال 7 أيام
    const agg = {};
    days.forEach(d => Object.entries(d.stats).forEach(([k, c]) => { agg[k] = (agg[k] || 0) + c; }));
    const aggEntries = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (aggEntries.length) {
      const maxV = aggEntries[0][1];
      html += `<div class="card"><div class="card-title"><i class="fa-solid fa-trophy"></i> الأكثر مشاهدةً (7 أيام)</div>`;
      aggEntries.forEach(([k, count], idx) => {
        const nameAr = k.split('||')[1] || k;
        const pct    = Math.round((count / maxV) * 100);
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
  }

  body.innerHTML = html;
}

function setStatsView(view) {
  _statsView = view;
  renderStatsTab($('dash-body'));
}
window.setStatsView = setStatsView;

function exportStatsCSV() {
  const days = _get7DayData();
  const allKeys = new Set();
  days.forEach(d => Object.keys(d.stats).forEach(k => allKeys.add(k)));
  const keysArr = [...allKeys];
  const headers = ['التاريخ', 'الإجمالي', ...keysArr.map(k => k.split('||')[1] || k)].join(',');
  const rows = days.map(d =>
    [d.dateStr, d.total, ...keysArr.map(k => d.stats[k] || 0)].join(',')
  );
  const csv = '﻿' + [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'duo_stats_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('تم تصدير الإحصائيات ✓');
}
window.exportStatsCSV = exportStatsCSV;

/* ════════════════════════════════════════════════
   تبويب: إعدادات السكرول
════════════════════════════════════════════════ */
function renderScrollTab(body) {
  const fmtSec = ms => (ms / 1000).toFixed(1).replace('.0', '') + ' ث';

  body.innerHTML = `

    <!-- ══ تشغيل / إيقاف السكرول التلقائي ══ -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-forward"></i> السكرول التلقائي</div>
      <label class="row">
        <div class="row-icon" style="background:rgba(190,30,45,.12);border-color:rgba(190,30,45,.25);color:var(--red)">
          <i class="fa-solid fa-play"></i>
        </div>
        <div class="row-label">
          تشغيل السكرول التلقائي
          <small>عند التعطيل يبقى المنيو ثابتاً ولا ينتقل من منتج لآخر</small>
        </div>
        <span class="toggle">
          <input type="checkbox" id="scroll-auto-toggle" ${_autoScroll ? 'checked' : ''}
                 onchange="setAutoScroll(this.checked)">
          <span class="slider"></span>
        </span>
      </label>
    </div>

    <!-- ══ زمن الانتقال بين المنتجات ══ -->
    <div class="card">
      <div class="card-title">
        <i class="fa-solid fa-gauge-high"></i> زمن الانتقال بين المنتجات
        <span class="count" id="item-dur-val">${fmtSec(_itemDuration)}</span>
      </div>
      <div class="screen-note" style="margin-bottom:14px">
        <i class="fa-solid fa-circle-info"></i>
        <div>المدة التي يبقى فيها كل منتج مُسلَّطاً عليه الضوء قبل الانتقال للتالي.</div>
      </div>
      <div class="scroll-slider-wrap">
        <span class="scroll-slider-min">1 ث</span>
        <input type="range" id="item-dur-slider" min="1000" max="10000" step="500"
               value="${_itemDuration}"
               oninput="previewItemDur(this.value)"
               onchange="saveItemDur(this.value)">
        <span class="scroll-slider-max">10 ث</span>
      </div>
      <div class="scroll-presets">
        ${[2000,3500,5000,7000].map(v =>
          `<button class="preset ${_itemDuration===v?'preset--active':''}"
                   onclick="saveItemDur(${v},true)">
             ${fmtSec(v)}
           </button>`
        ).join('')}
      </div>
    </div>

    <!-- ══ فترة الانتظار بعد لمس العميل ══ -->
    <div class="card">
      <div class="card-title">
        <i class="fa-solid fa-hand-pointer"></i> فترة الانتظار بعد تفاعل العميل
        <span class="count" id="pause-dur-val">${fmtSec(_pauseDuration)}</span>
      </div>
      <div class="screen-note" style="margin-bottom:14px">
        <i class="fa-solid fa-circle-info"></i>
        <div>عندما يلمس العميل الشاشة أو يتصفح يدوياً، ينتظر الموقع هذه المدة قبل استئناف السكرول التلقائي.</div>
      </div>
      <div class="scroll-slider-wrap">
        <span class="scroll-slider-min">5 ث</span>
        <input type="range" id="pause-dur-slider" min="5000" max="60000" step="1000"
               value="${_pauseDuration}"
               oninput="previewPauseDur(this.value)"
               onchange="savePauseDur(this.value)">
        <span class="scroll-slider-max">60 ث</span>
      </div>
      <div class="scroll-presets">
        ${[8000,12000,20000,30000].map(v =>
          `<button class="preset ${_pauseDuration===v?'preset--active':''}"
                   onclick="savePauseDur(${v},true)">
             ${fmtSec(v)}
           </button>`
        ).join('')}
      </div>
    </div>

    <!-- ══ زمن عرض تفاصيل المنتج ══ -->
    <div class="card">
      <div class="card-title">
        <i class="fa-solid fa-window-maximize"></i> زمن إغلاق تفاصيل المنتج
        <span class="count" id="overlay-dur-val">${fmtSec(_overlayDuration)}</span>
      </div>
      <div class="screen-note" style="margin-bottom:14px">
        <i class="fa-solid fa-circle-info"></i>
        <div>عندما يضغط العميل على منتج ليرى تفاصيله وصورته، تُغلَق النافذة تلقائياً بعد هذه المدة وتعود حركة السكرول.</div>
      </div>
      <div class="scroll-slider-wrap">
        <span class="scroll-slider-min">3 ث</span>
        <input type="range" id="overlay-dur-slider" min="3000" max="30000" step="1000"
               value="${_overlayDuration}"
               oninput="previewOverlayDur(this.value)"
               onchange="saveOverlayDur(this.value)">
        <span class="scroll-slider-max">30 ث</span>
      </div>
      <div class="scroll-presets">
        ${[5000,8000,12000,20000].map(v =>
          `<button class="preset ${_overlayDuration===v?'preset--active':''}"
                   onclick="saveOverlayDur(${v},true)">
             ${fmtSec(v)}
           </button>`
        ).join('')}
      </div>
    </div>

    <!-- ══ إعدادات Overlay / Crossfade ══ -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-layer-group"></i> إعدادات نافذة المنتج</div>
      <div class="screen-note" style="margin-bottom:14px">
        <i class="fa-solid fa-circle-info"></i>
        <div>التحكم في سرعة تأثيرات التبديل داخل نافذة تفاصيل المنتج.</div>
      </div>

      <!-- تبديل الصورة -->
      <div class="overlay-setting-row">
        <div class="overlay-setting-label">
          <i class="fa-solid fa-image"></i>
          <span>مدة Crossfade الصورة</span>
          <small>التبديل بين صور المنتجات</small>
        </div>
        <div class="overlay-setting-ctrl">
          <button class="slide-dur-btn" onclick="adjustOverlaySetting('crossfade',-50)">−</button>
          <span class="overlay-setting-val" id="ov-crossfade-val">${_crossfadeDur} ms</span>
          <button class="slide-dur-btn" onclick="adjustOverlaySetting('crossfade',50)">+</button>
        </div>
      </div>

      <!-- تبديل المنتج -->
      <div class="overlay-setting-row">
        <div class="overlay-setting-label">
          <i class="fa-solid fa-arrows-rotate"></i>
          <span>مدة تبديل المنتج</span>
          <small>تلاشي النص عند تغيير المنتج</small>
        </div>
        <div class="overlay-setting-ctrl">
          <button class="slide-dur-btn" onclick="adjustOverlaySetting('change',-20)">−</button>
          <span class="overlay-setting-val" id="ov-change-val">${_ovChangeDur} ms</span>
          <button class="slide-dur-btn" onclick="adjustOverlaySetting('change',20)">+</button>
        </div>
      </div>

      <!-- إغلاق النافذة -->
      <div class="overlay-setting-row">
        <div class="overlay-setting-label">
          <i class="fa-solid fa-door-closed"></i>
          <span>مدة إغلاق النافذة</span>
          <small>تأثير الإغلاق عند انتهاء العرض</small>
        </div>
        <div class="overlay-setting-ctrl">
          <button class="slide-dur-btn" onclick="adjustOverlaySetting('close',-20)">−</button>
          <span class="overlay-setting-val" id="ov-close-val">${_ovCloseDur} ms</span>
          <button class="slide-dur-btn" onclick="adjustOverlaySetting('close',20)">+</button>
        </div>
      </div>
    </div>

    <!-- ══ إعادة الضبط الافتراضي ══ -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-rotate-left"></i> إعادة الضبط الافتراضي</div>
      <div class="screen-auto">
        <div class="screen-auto-desc">
          <strong>القيم الافتراضية</strong>
          <span>انتقال 3.5ث — انتظار 12ث — تفاصيل 8ث — Crossfade 520ms</span>
        </div>
        <button class="btn-reset" onclick="resetScrollDefaults()">
          <i class="fa-solid fa-rotate-left"></i> إعادة تعيين
        </button>
      </div>
    </div>
  `;
}

/* ── دوال التحكم في السكرول ── */
function setAutoScroll(checked) {
  _autoScroll = checked;
  localStorage.setItem(LS_AUTO_SCROLL, String(checked));
  _syncPush();
  toast(checked ? 'تم تفعيل السكرول التلقائي' : 'تم إيقاف السكرول التلقائي');
}

function previewItemDur(val) {
  _itemDuration = parseInt(val, 10);
  const el = document.getElementById('item-dur-val');
  if (el) el.textContent = (_itemDuration / 1000).toFixed(1).replace('.0','') + ' ث';
  _highlightActivePreset('scroll-presets-item', val);
}
function saveItemDur(val, fromPreset) {
  _itemDuration = parseInt(val, 10);
  localStorage.setItem(LS_ITEM_DURATION_KEY, String(_itemDuration));
  _syncPush();
  if (fromPreset) renderScrollTab($('dash-body'));
  else toast('تم حفظ زمن الانتقال: ' + (_itemDuration/1000).toFixed(1) + ' ث');
}

function previewPauseDur(val) {
  _pauseDuration = parseInt(val, 10);
  const el = document.getElementById('pause-dur-val');
  if (el) el.textContent = (_pauseDuration / 1000).toFixed(1).replace('.0','') + ' ث';
}
function savePauseDur(val, fromPreset) {
  _pauseDuration = parseInt(val, 10);
  localStorage.setItem(LS_PAUSE_DURATION_KEY, String(_pauseDuration));
  _syncPush();
  if (fromPreset) renderScrollTab($('dash-body'));
  else toast('تم حفظ فترة الانتظار: ' + (_pauseDuration/1000).toFixed(1) + ' ث');
}

function previewOverlayDur(val) {
  _overlayDuration = parseInt(val, 10);
  const el = document.getElementById('overlay-dur-val');
  if (el) el.textContent = (_overlayDuration / 1000).toFixed(1).replace('.0','') + ' ث';
}
function saveOverlayDur(val, fromPreset) {
  _overlayDuration = parseInt(val, 10);
  localStorage.setItem(LS_OVERLAY_DURATION_KEY, String(_overlayDuration));
  _syncPush();
  if (fromPreset) renderScrollTab($('dash-body'));
  else toast('تم حفظ زمن التفاصيل: ' + (_overlayDuration/1000).toFixed(1) + ' ث');
}

function adjustOverlaySetting(type, delta) {
  if (type === 'crossfade') {
    _crossfadeDur = Math.max(100, Math.min(2000, _crossfadeDur + delta));
    localStorage.setItem(LS_CROSSFADE_DUR, String(_crossfadeDur));
    const el = document.getElementById('ov-crossfade-val');
    if (el) el.textContent = _crossfadeDur + ' ms';
  } else if (type === 'change') {
    _ovChangeDur = Math.max(60, Math.min(800, _ovChangeDur + delta));
    localStorage.setItem(LS_OV_CHANGE_DUR, String(_ovChangeDur));
    const el = document.getElementById('ov-change-val');
    if (el) el.textContent = _ovChangeDur + ' ms';
  } else if (type === 'close') {
    _ovCloseDur = Math.max(100, Math.min(1000, _ovCloseDur + delta));
    localStorage.setItem(LS_OV_CLOSE_DUR, String(_ovCloseDur));
    const el = document.getElementById('ov-close-val');
    if (el) el.textContent = _ovCloseDur + ' ms';
  }
  _syncPush();
}
window.adjustOverlaySetting = adjustOverlaySetting;

function resetScrollDefaults() {
  _autoScroll      = true;
  _itemDuration    = 3500;
  _pauseDuration   = 12000;
  _overlayDuration = 8000;
  _crossfadeDur    = 520;
  _ovChangeDur     = 260;
  _ovCloseDur      = 430;
  localStorage.setItem(LS_AUTO_SCROLL,          'true');
  localStorage.setItem(LS_ITEM_DURATION_KEY,    '3500');
  localStorage.setItem(LS_PAUSE_DURATION_KEY,   '12000');
  localStorage.setItem(LS_OVERLAY_DURATION_KEY, '8000');
  localStorage.setItem(LS_CROSSFADE_DUR,        '520');
  localStorage.setItem(LS_OV_CHANGE_DUR,        '260');
  localStorage.setItem(LS_OV_CLOSE_DUR,         '430');
  _syncPush();
  renderScrollTab($('dash-body'));
  toast('تم إعادة تعيين إعدادات السكرول والـ Overlay');
}

window.setAutoScroll    = setAutoScroll;
window.previewItemDur   = previewItemDur;
window.saveItemDur      = saveItemDur;
window.previewPauseDur  = previewPauseDur;
window.savePauseDur     = savePauseDur;
window.previewOverlayDur= previewOverlayDur;
window.saveOverlayDur   = saveOverlayDur;
window.resetScrollDefaults = resetScrollDefaults;

/* ════════════════════════════════════════════════
   تبويب: إدارة الجهاز
════════════════════════════════════════════════ */
function renderDeviceTab(body) {
  const ua     = navigator.userAgent;
  const sw     = screen.width, sh = screen.height;
  const iw     = window.innerWidth, ih = window.innerHeight;
  const stor   = (() => {
    try { let s=0; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k?.startsWith('duo_')) s+=((localStorage.getItem(k)||'').length*2); } return (s/1024).toFixed(1); } catch { return '—'; }
  })();

  const lockOptions = [
    { v:0,  label:'معطّل' },
    { v:5,  label:'5 دقائق' },
    { v:10, label:'10 دقائق' },
    { v:15, label:'15 دقيقة' },
    { v:30, label:'30 دقيقة' },
  ];

  body.innerHTML = `

    <!-- ══ وضع الصيانة ══ -->
    <div class="card">
      <div class="card-title">
        <i class="fa-solid fa-wrench"></i> وضع الصيانة
        ${_maintenanceOn ? '<span class="maintenance-badge">مُفعَّل</span>' : ''}
      </div>
      <label class="row">
        <div class="row-icon" style="background:rgba(245,195,0,.12);border-color:rgba(245,195,0,.3);color:#f5c200">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div class="row-label">
          تفعيل وضع الصيانة
          <small>يوقف عرض المنيو ويظهر رسالة مخصصة على الشاشة</small>
        </div>
        <span class="toggle">
          <input type="checkbox" id="maintenance-toggle" ${_maintenanceOn ? 'checked' : ''}
                 onchange="setMaintenance(this.checked)">
          <span class="slider"></span>
        </span>
      </label>
      <div class="pair-field" style="margin-top:12px">
        <label>نص الرسالة</label>
        <input type="text" id="maintenance-msg-input"
               value="${_maintenanceMsg || ''}"
               placeholder="نعود قريباً — We'll be back soon"
               oninput="saveMaintMsg(this.value)">
      </div>
    </div>

    <!-- ══ قفل تلقائي ══ -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-lock"></i> قفل تلقائي للوحة التحكم</div>
      <div class="screen-note" style="margin-bottom:14px">
        <i class="fa-solid fa-circle-info"></i>
        <div>بعد فترة الخمول المحددة يُعاد التوجيه تلقائياً لصفحة المنيو، ولفتح لوحة التحكم تحتاج الرقم السري من جديد.</div>
      </div>
      <div class="lock-opts">
        ${lockOptions.map(o => `
          <button class="preset ${_lockTimeout===o.v?'preset--active':''}"
                  onclick="setLockTimeout(${o.v})">
            ${o.label}
          </button>`).join('')}
      </div>
    </div>

    <!-- ══ تصدير / استيراد الإعدادات ══ -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-cloud-arrow-up"></i> تصدير / استيراد الإعدادات</div>
      <div class="device-actions">
        <button class="btn-apply" onclick="exportSettings()">
          <i class="fa-solid fa-download"></i> تصدير كـ JSON
        </button>
        <label class="btn-apply" style="cursor:pointer">
          <i class="fa-solid fa-upload"></i> استيراد
          <input type="file" accept=".json" style="display:none"
                 onchange="importSettings(this)">
        </label>
      </div>
      <div class="pair-adv-note" style="margin-top:12px">
        <i class="fa-solid fa-circle-info"></i>
        يُصدَّر ملف JSON يحتوي كل إعدادات المنيو. يمكن استيراده على نفس الجهاز أو جهاز آخر لنقل الإعدادات.
      </div>
    </div>

    <!-- ══ إعادة ضبط المصنع ══ -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-trash-can" style="color:#f87171"></i> إعادة ضبط المصنع</div>
      <div class="screen-auto">
        <div class="screen-auto-desc">
          <strong style="color:#f87171">مسح جميع الإعدادات</strong>
          <span>يحذف كل إعدادات المنيو والإخفاء والشارات والإحصائيات نهائياً.</span>
        </div>
        <button class="btn-factory-reset" id="factory-reset-btn" onclick="factoryResetStep(this)">
          <i class="fa-solid fa-trash-can"></i> إعادة تعيين
        </button>
      </div>
    </div>

    <!-- ══ معلومات الجهاز ══ -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-circle-info"></i> معلومات الجهاز</div>
      <div class="device-info-grid">
        <div class="device-info-item">
          <span class="di-label">دقة الشاشة</span>
          <span class="di-val">${sw} × ${sh}</span>
        </div>
        <div class="device-info-item">
          <span class="di-label">حجم النافذة</span>
          <span class="di-val">${iw} × ${ih}</span>
        </div>
        <div class="device-info-item">
          <span class="di-label">مساحة الإعدادات</span>
          <span class="di-val">${stor} KB</span>
        </div>
        <div class="device-info-item">
          <span class="di-label">المتصفح</span>
          <span class="di-val di-val--sm">${ua.includes('iPad')||ua.includes('iPhone')?'iOS Safari':ua.includes('Chrome')?'Chrome':ua.includes('Firefox')?'Firefox':'Other'}</span>
        </div>
        <div class="device-info-item" style="grid-column:1/-1">
          <span class="di-label">User Agent</span>
          <span class="di-val di-val--xs">${ua.slice(0, 80)}…</span>
        </div>
      </div>
    </div>
  `;
}

/* ── وضع الصيانة ── */
function setMaintenance(on) {
  _maintenanceOn = on;
  localStorage.setItem(LS_MAINTENANCE, String(on));
  _syncPush();
  renderDeviceTab($('dash-body'));
  toast(on ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة');
}
function saveMaintMsg(val) {
  _maintenanceMsg = val;
  localStorage.setItem(LS_MAINTENANCE_MSG, val);
  _syncPush();
}
window.setMaintenance = setMaintenance;
window.saveMaintMsg   = saveMaintMsg;

/* ── قفل تلقائي ── */
let _lockTimer = null;
function setLockTimeout(minutes) {
  _lockTimeout = minutes;
  localStorage.setItem(LS_LOCK_TIMEOUT, String(minutes));
  _setupAutoLock();
  renderDeviceTab($('dash-body'));
  toast(minutes > 0 ? `قفل تلقائي بعد ${minutes} دقيقة` : 'تم تعطيل القفل التلقائي');
}
function _setupAutoLock() {
  clearTimeout(_lockTimer);
  if (_lockTimeout <= 0) return;
  const reset = () => {
    clearTimeout(_lockTimer);
    _lockTimer = setTimeout(() => {
      try { sessionStorage.removeItem('duo_admin_ok'); } catch (e) {}
      window.location.href = 'index.html';
    }, _lockTimeout * 60000);
  };
  ['mousedown', 'touchstart', 'keydown', 'scroll', 'click'].forEach(ev =>
    document.addEventListener(ev, reset, { passive: true, once: false })
  );
  reset();
}
window.setLockTimeout = setLockTimeout;

/* ── تصدير الإعدادات ── */
function exportSettings() {
  const data = { version: '1.1', exportedAt: new Date().toISOString(), ls: {}, ss: {} };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('duo_')) data.ls[k] = localStorage.getItem(k);
  }
  const ssKeys = [SS_ITEMS, SS_SLIDES, SS_DISCOUNT, SS_PHONE, SS_GAMES, SS_QRMENU, SS_VARIANTS];
  ssKeys.forEach(k => { const v = sessionStorage.getItem(k); if (v !== null) data.ss[k] = v; });
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url;
  a.download = 'duo_settings_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click(); URL.revokeObjectURL(url);
  toast('تم تصدير الإعدادات ✓');
}
/* ── استيراد الإعدادات ── */
function importSettings(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.ls && !data.ss) { toast('ملف غير صالح'); return; }
      Object.entries(data.ls  || {}).forEach(([k, v]) => localStorage.setItem(k, v));
      Object.entries(data.ss  || {}).forEach(([k, v]) => sessionStorage.setItem(k, v));
      toast('تم الاستيراد — جارٍ إعادة التحميل…');
      setTimeout(() => window.location.reload(), 1400);
    } catch { toast('خطأ في قراءة الملف'); }
  };
  reader.readAsText(file);
}
/* ── إعادة ضبط المصنع (خطوتان) ── */
function factoryResetStep(btn) {
  if (!btn.dataset.confirmed) {
    btn.dataset.confirmed = '1';
    btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> اضغط مرة أخرى للتأكيد';
    btn.style.background = '#7f1d1d';
    setTimeout(() => { delete btn.dataset.confirmed; btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> إعادة تعيين'; btn.style.background = ''; }, 4000);
    return;
  }
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('duo_')) keys.push(k); }
  keys.forEach(k => localStorage.removeItem(k));
  sessionStorage.clear();
  toast('تم إعادة الضبط — جارٍ إعادة التحميل…');
  setTimeout(() => window.location.reload(), 1400);
}
window.exportSettings    = exportSettings;
window.importSettings    = importSettings;
window.factoryResetStep  = factoryResetStep;

/* ════════════════════════════════════════════════
   تبويب: ضبط الشاشة
════════════════════════════════════════════════ */
function renderScreenTab(body) {
  const sw   = screen.width;
  const sh   = screen.height;
  const mode = localStorage.getItem(LS_SCALE_MODE) || 'auto';
  const layout = localStorage.getItem(LS_LAYOUT) || 'horizontal';
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
    <!-- ══ تخطيط المنيو ══ -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-table-columns"></i> تخطيط عرض المنيو</div>
      <div class="layout-picker">

        <button class="layout-btn ${layout === 'horizontal' ? 'layout-btn--active' : ''}"
                onclick="setLayout('horizontal')">
          <div class="layout-btn-icon">
            <i class="fa-solid fa-table-columns"></i>
          </div>
          <div class="layout-btn-body">
            <span class="layout-btn-title">أفقي — الوضع الحالي</span>
            <span class="layout-btn-sub">شرائح ترويجية + قائمة المنتجات جنباً لجنب</span>
          </div>
          ${layout === 'horizontal' ? '<i class="fa-solid fa-circle-check layout-btn-check"></i>' : ''}
        </button>

        <button class="layout-btn layout-btn--glass ${layout === 'vertical' ? 'layout-btn--active' : ''}"
                onclick="setLayout('vertical')">
          <div class="layout-btn-icon layout-btn-icon--glass">
            <i class="fa-solid fa-layer-group"></i>
          </div>
          <div class="layout-btn-body">
            <span class="layout-btn-title">عمودي</span></span>
            <span class="layout-btn-sub">صورة المنتج الكبيرة + أسماء الأصناف بتمرير ديناميكي</span>
          </div>
          ${layout === 'vertical' ? '<i class="fa-solid fa-circle-check layout-btn-check"></i>' : ''}
        </button>

      </div>
      <div class="layout-note">
        <i class="fa-solid fa-circle-info"></i>
        التغيير يسري عند فتح المنيو من جديد — <strong>أعِد تحميل الصفحة</strong> لرؤية التخطيط الجديد.
      </div>
    </div>

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
/* دفع كل الإعدادات للجهاز الآخر عبر Firebase */
function _syncPush() {
  if (!window.DuoSync) return;
  window.DuoSync.write({
    hiddenItems:    [..._hiddenItems],
    hiddenSlides:   [..._hiddenSlides],
    hiddenVariants: [..._hiddenVariants],
    discountHidden: _discountHidden,
    phoneHidden:    _phoneHidden,
    gamesHidden:    _gamesHidden,
    qrmenuHidden:   _qrmenuHidden,
    badges:         _badges,
    tempHide:       _tempHide,
    scrollSkip:     [..._scrollSkip],
    catSkip:        [..._catSkip],
    autoScroll:      _autoScroll,
    itemDuration:    _itemDuration,
    pauseDuration:   _pauseDuration,
    overlayDuration: _overlayDuration,
    crossfadeDur:    _crossfadeDur,
    ovChangeDur:     _ovChangeDur,
    ovCloseDur:      _ovCloseDur,
    maintenanceOn:   _maintenanceOn,
    maintenanceMsg:  _maintenanceMsg,
    slideDurations:  _slideDurations,
    pinnedSlide:     _pinnedSlide,
  });
}

function togglePhone(checked) {
  _phoneHidden = !checked;
  sessionStorage.setItem(SS_PHONE, String(_phoneHidden));
  _syncPush();
  toast(checked ? 'تم إظهار رقم الهاتف' : 'تم إخفاء رقم الهاتف');
}
function toggleDiscount(checked) {
  _discountHidden = !checked;
  sessionStorage.setItem(SS_DISCOUNT, String(_discountHidden));
  _syncPush();
  toast(checked ? 'تم إظهار زر الخصم' : 'تم إخفاء زر الخصم');
}
function toggleGames(checked) {
  _gamesHidden = !checked;
  sessionStorage.setItem(SS_GAMES, String(_gamesHidden));
  _syncPush();
  toast(checked ? 'تم إظهار زر الألعاب' : 'تم إخفاء زر الألعاب');
}
function toggleQRMenu(checked) {
  _qrmenuHidden = !checked;
  sessionStorage.setItem(SS_QRMENU, String(_qrmenuHidden));
  _syncPush();
  toast(checked ? 'تم إظهار زر منيو الجوال' : 'تم إخفاء زر منيو الجوال');
}
function toggleSlide(idx, checked) {
  if (checked) _hiddenSlides.delete(String(idx));
  else         _hiddenSlides.add(String(idx));
  sessionStorage.setItem(SS_SLIDES, JSON.stringify([..._hiddenSlides]));
  _syncPush();
  renderSlidesTab($('dash-body'));
}
function toggleItem(key, checked) {
  if (checked) _hiddenItems.delete(key);
  else         _hiddenItems.add(key);
  sessionStorage.setItem(SS_ITEMS, JSON.stringify([..._hiddenItems]));
  _syncPush();
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
  _syncPush();
}
function setBadge(key, badge, btn) {
  _badges[key] = badge;
  localStorage.setItem(LS_BADGES, JSON.stringify(_badges));
  _syncPush();
  btn.closest('.badge-btns').querySelectorAll('.badge-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.badge === badge)
  );
  toast(badge ? 'تم تعيين الشارة' : 'تمت إزالة الشارة');
}
/* ── إخفاء مؤقت ── */
function setTempHide(key, hours) {
  _tempHide[key] = Date.now() + hours * 3600000;
  localStorage.setItem(LS_TEMP_HIDE, JSON.stringify(_tempHide));
  _syncPush();
  renderProductsTab($('dash-body'));
  toast(`سيظهر المنتج تلقائياً بعد ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`);
}
function cancelTempHide(key) {
  delete _tempHide[key];
  localStorage.setItem(LS_TEMP_HIDE, JSON.stringify(_tempHide));
  _syncPush();
  renderProductsTab($('dash-body'));
  toast('تم إلغاء الإخفاء المؤقت');
}

/* ── تخطي في السكرول ── */
function toggleScrollSkip(key, checked) {
  if (checked) _scrollSkip.add(key);
  else         _scrollSkip.delete(key);
  localStorage.setItem(LS_SCROLL_SKIP, JSON.stringify([..._scrollSkip]));
  _syncPush();
  toast(checked ? 'سيتخطى السكرول هذا المنتج' : 'سيتوقف السكرول على هذا المنتج');
}
function toggleCatSkip(catId, checked) {
  if (checked) _catSkip.add(catId);
  else         _catSkip.delete(catId);
  localStorage.setItem(LS_CAT_SKIP, JSON.stringify([..._catSkip]));
  _syncPush();
  const cat = menuCategories.find(c => c.id === catId);
  toast(checked ? `سيتخطى السكرول قسم "${cat?.nameAr}"` : `سيتوقف السكرول على قسم "${cat?.nameAr}"`);
}

/* ── دوال مدة الشرائح ── */
function adjustSlideDur(idx, delta) {
  const defDur = slides[idx]?.duration ?? 5000;
  const cur    = (_slideDurations[String(idx)] !== undefined) ? _slideDurations[String(idx)] : defDur;
  const next   = Math.max(1000, Math.min(30000, cur + delta));
  _slideDurations[String(idx)] = next;
  localStorage.setItem(LS_SLIDE_DURATIONS, JSON.stringify(_slideDurations));
  _syncPush();
  renderSlidesTab($('dash-body'));
}
function resetSlideDur(idx) {
  delete _slideDurations[String(idx)];
  localStorage.setItem(LS_SLIDE_DURATIONS, JSON.stringify(_slideDurations));
  _syncPush();
  renderSlidesTab($('dash-body'));
  toast('تمت إعادة مدة الشريحة للافتراضي');
}
window.adjustSlideDur = adjustSlideDur;
window.resetSlideDur  = resetSlideDur;

window.togglePhone    = togglePhone;
window.toggleDiscount = toggleDiscount;
window.toggleGames    = toggleGames;
window.toggleQRMenu   = toggleQRMenu;
window.toggleSlide    = toggleSlide;
window.toggleItem     = toggleItem;
window.toggleVariant  = toggleVariant;
window.setBadge       = setBadge;
window.setTempHide    = setTempHide;
window.cancelTempHide = cancelTempHide;
window.toggleScrollSkip = toggleScrollSkip;
window.toggleCatSkip    = toggleCatSkip;

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

/* ── تخطيط المنيو ── */
function setLayout(mode) {
  localStorage.setItem(LS_LAYOUT, mode);
  const label = mode === 'vertical' ? 'العرض العمودي' : 'العرض الأفقي';
  toast(`تم تفعيل ${label} ✓`);
  // محاولة قفل الاتجاه مباشرةً (تعمل على Android، صامتة على iOS)
  try {
    const target = (mode === 'vertical') ? 'portrait' : 'landscape';
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      screen.orientation.lock(target).catch(() => {});
    }
  } catch (_) {}
  renderScreenTab($('dash-body'));
}
window.setLayout = setLayout;

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
  // احتياطي: الإعداد المضمّن في duo-config.js
  if ((!fb || !fb.databaseURL) && window.DUO_FIREBASE_CONFIG) fb = window.DUO_FIREBASE_CONFIG;
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

  // توحيد علامات الاقتباس الذكية التي يضيفها iPad/Safari إلى مستقيمة
  text = text
    .replace(/[“”„‟″‶]/g, '"')   // " " „ ‟ ″ ‶
    .replace(/[‘’‚‛′‵]/g, "'")   // ' ' ‚ ‛ ′ ‵
    .replace(/ /g, ' ');                                   // مسافة غير قابلة للكسر

  // محاولة JSON مباشرة
  try { const o = JSON.parse(text); if (o && typeof o === 'object' && o.databaseURL) return o; } catch (e) {}

  // استخراج الحقول بالتعبير النمطي من كائن JS
  const keys = ['apiKey','authDomain','databaseURL','projectId','storageBucket','messagingSenderId','appId','measurementId'];
  const o = {};
  keys.forEach(k => {
    const m = text.match(new RegExp(k + '\\s*:\\s*["\'`]([^"\'`]+)["\'`]'));
    if (m) o[k] = m[1];
  });

  // اشتقاق databaseURL إن غاب لكن projectId موجود (احتياطي)
  if (!o.databaseURL && o.projectId) {
    o.databaseURL = `https://${o.projectId}-default-rtdb.firebaseio.com`;
  }

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
        <span class="count">${fbOk ? '✓ مضمّن' : 'مطلوب'}</span>
      </div>
      <p class="pair-adv-note">
        الإعداد <b>مضمّن مسبقاً</b> في ملف <code>duo-config.js</code> لكل الأجهزة — لا حاجة للصق أي شيء.
        كل ما تحتاجه: اختيار الدور أعلاه وتفعيل الربط ثم الحفظ.
      </p>
      <details class="pair-adv">
        <summary><i class="fa-solid fa-pen"></i> تعديل إعداد Firebase (اختياري)</summary>
        <p class="pair-adv-note">اتركه فارغاً لاستخدام الإعداد المضمّن. الصق كائن firebaseConfig آخر فقط لو أردت تغييره على هذا الجهاز.</p>
        <div class="pair-field">
          <textarea id="pair-fb" class="pair-textarea" rows="9"
            autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false"
            placeholder='الإعداد المضمّن مُستخدَم حالياً. الصق firebaseConfig هنا فقط للتغيير.'></textarea>
        </div>
      </details>
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
        <div class="pair-step"><span>1</span> إعداد Firebase مضمّن مسبقاً — لا حاجة للصق أي شيء على أي جهاز.</div>
        <div class="pair-step"><span>2</span> على كل جهاز: اختر الدور (أيباد «يسار» والآخر «يمين») بنفس معرّف الفرع.</div>
        <div class="pair-step"><span>3</span> فعّل «الربط التلقائي» ثم اضغط «حفظ الإعداد».</div>
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

  // إعداد Firebase — اختياري (مضمّن في duo-config.js)
  const fbText = $('pair-fb')?.value || '';
  let fb = fbText.trim() ? parseFirebaseConfig(fbText) : null;
  if (fbText.trim() && !fb) { toast('تعذّر قراءة إعداد Firebase — تأكّد من نسخه كاملاً'); return; }

  // الإعداد الفعّال: الملصوق، وإلا المحفوظ/المضمّن
  const effectiveFb = fb || _pairCfg().fb;
  if (enabled && (!effectiveFb || !effectiveFb.databaseURL)) {
    toast('لا يوجد إعداد Firebase — تأكّد من ملف duo-config.js'); return;
  }

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
    show('bad', '<i class="fa-solid fa-circle-xmark"></i> لا يوجد إعداد Firebase على هذا الجهاز. الصق كائن firebaseConfig في الحقل أعلاه على <b>هذا الأيباد</b> ثم أعد الاختبار (الإعداد لا ينتقل من جهاز لآخر).');
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

/* تطبيق الإعدادات المشتركة (القادمة من الجهاز الآخر) على لوحة التحكم */
function _applyRemoteToDashboard(v) {
  if (!v || typeof v !== 'object') return;
  try {
    _hiddenItems    = new Set(v.hiddenItems    || []);
    _hiddenSlides   = new Set((v.hiddenSlides  || []).map(String));
    _hiddenVariants = new Set(v.hiddenVariants || []);
    _discountHidden = !!v.discountHidden;
    _phoneHidden    = !!v.phoneHidden;
    _gamesHidden    = !!v.gamesHidden;
    _qrmenuHidden   = !!v.qrmenuHidden;
    _badges         = v.badges || {};
    _tempHide       = v.tempHide   || {};
    _scrollSkip     = new Set(v.scrollSkip || []);
    _catSkip        = new Set(v.catSkip    || []);
    if (v.autoScroll      !== undefined) _autoScroll      = !!v.autoScroll;
    if (v.itemDuration    !== undefined) _itemDuration    = parseInt(v.itemDuration,    10) || 3500;
    if (v.pauseDuration   !== undefined) _pauseDuration   = parseInt(v.pauseDuration,   10) || 12000;
    if (v.overlayDuration !== undefined) _overlayDuration = parseInt(v.overlayDuration, 10) || 8000;
    sessionStorage.setItem(SS_ITEMS,    JSON.stringify([..._hiddenItems]));
    sessionStorage.setItem(SS_SLIDES,   JSON.stringify([..._hiddenSlides]));
    sessionStorage.setItem(SS_VARIANTS, JSON.stringify([..._hiddenVariants]));
    sessionStorage.setItem(SS_DISCOUNT, String(_discountHidden));
    sessionStorage.setItem(SS_PHONE,    String(_phoneHidden));
    sessionStorage.setItem(SS_GAMES,    String(_gamesHidden));
    sessionStorage.setItem(SS_QRMENU,  String(_qrmenuHidden));
    localStorage.setItem(LS_BADGES,            JSON.stringify(_badges));
    localStorage.setItem(LS_TEMP_HIDE,         JSON.stringify(_tempHide));
    localStorage.setItem(LS_SCROLL_SKIP,       JSON.stringify([..._scrollSkip]));
    localStorage.setItem(LS_CAT_SKIP,          JSON.stringify([..._catSkip]));
    localStorage.setItem(LS_AUTO_SCROLL,          String(_autoScroll));
    localStorage.setItem(LS_ITEM_DURATION_KEY,    String(_itemDuration));
    localStorage.setItem(LS_PAUSE_DURATION_KEY,   String(_pauseDuration));
    localStorage.setItem(LS_OVERLAY_DURATION_KEY, String(_overlayDuration));
    if (v.crossfadeDur    !== undefined) { _crossfadeDur    = parseInt(v.crossfadeDur,    10) || 520;  localStorage.setItem(LS_CROSSFADE_DUR,    String(_crossfadeDur)); }
    if (v.ovChangeDur     !== undefined) { _ovChangeDur     = parseInt(v.ovChangeDur,     10) || 260;  localStorage.setItem(LS_OV_CHANGE_DUR,    String(_ovChangeDur)); }
    if (v.ovCloseDur      !== undefined) { _ovCloseDur      = parseInt(v.ovCloseDur,      10) || 430;  localStorage.setItem(LS_OV_CLOSE_DUR,     String(_ovCloseDur)); }
    if (v.maintenanceOn   !== undefined) { _maintenanceOn   = !!v.maintenanceOn;                       localStorage.setItem(LS_MAINTENANCE,       String(_maintenanceOn)); }
    if (v.maintenanceMsg  !== undefined) { _maintenanceMsg  = String(v.maintenanceMsg);                localStorage.setItem(LS_MAINTENANCE_MSG,   _maintenanceMsg); }
    if (v.slideDurations  !== undefined) { _slideDurations  = v.slideDurations || {};                  localStorage.setItem(LS_SLIDE_DURATIONS,   JSON.stringify(_slideDurations)); }
    if (v.pinnedSlide     !== undefined) {
      _pinnedSlide = (v.pinnedSlide !== null && v.pinnedSlide !== undefined) ? parseInt(v.pinnedSlide, 10) : null;
      if (_pinnedSlide !== null) localStorage.setItem(LS_PINNED_SLIDE, String(_pinnedSlide));
      else localStorage.removeItem(LS_PINNED_SLIDE);
    }
    showTab(_activeTab);   // أعد رسم التبويب الحالي بالقيم الجديدة
  } catch (e) {}
}

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  const rn = $('dash-rest-name');
  if (rn && typeof restaurantInfo !== 'undefined') rn.textContent = restaurantInfo.nameEn || restaurantInfo.nameAr || 'DUO';
  showTab('header');

  // تفعيل القفل التلقائي إن كان مضبوطاً
  _setupAutoLock();

  // اجلب الإعدادات المشتركة من الجهاز الآخر (إن كان الربط مفعّلاً)
  if (window.DuoSync && typeof window.DuoSync.readOnce === 'function') {
    window.DuoSync.readOnce(v => { if (v) _applyRemoteToDashboard(v); });
  }
});
