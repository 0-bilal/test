/**
 * cashier.js — شاشة الكاشير المُحسَّنة | DUO Burger
 * ─────────────────────────────────────────────────────────────
 * يتحكم الكاشير عبر هذه الشاشة في:
 *  • إخفاء / إظهار المنتجات والشرائح الترويجية فورياً
 *  • إرسال إجراءات للعميل (منتج، لعبة، خصم…)
 *  • التحكم الكامل بإعدادات شاشة العميل
 *  • متابعة حالة الاتصال، البطارية، الوقت
 *
 * يعتمد على: products.js · slides.js · duo-sync.js · duo-config.js
 */
'use strict';

/* ══════════ مفاتيح التخزين ══════════ */
const CLS_BADGES      = 'duo_badges';
const CLS_AUTO_SCROLL = 'duo_auto_scroll';
const CLS_MAINTENANCE = 'duo_maintenance';
const CLS_MAINT_MSG   = 'duo_maintenance_msg';
const CLS_SLIDE_DUR   = 'duo_slide_durations';
const CLS_PINNED      = 'duo_pinned_slide';
const CLS_LANG        = 'duo_cashier_lang';

/* ══════════ الحالة الداخلية ══════════ */
let _lang           = 'ar';
let _activeTab      = 'products';
let _activeCat      = null;
let _hiddenItems    = new Set();
let _hiddenSlides   = new Set();
let _discountHidden = false;
let _phoneHidden    = false;
let _gamesHidden    = false;
let _qrmenuHidden   = false;
let _autoScroll     = true;
let _maintenanceOn  = false;
let _maintenanceMsg = '';
let _slideDurations = {};
let _pinnedSlide    = null;
let _badges         = {};
let _tempHide       = {};
let _resetConfirmed = false;
let _resetTimer     = null;
let _lastSyncTs     = null;
let _devices        = [];      /* أجهزة العملاء المتصلة */
let _sidebarOpen    = true;    /* حالة الشريط الجانبي */

/* تقسيم الفاتورة */
let _splitPeople  = '';
let _splitAmount  = '';
let _splitField   = 'people';  /* الحقل النشط للوحة الأرقام: people | amount */
let _splitResult  = null;

const _ikey = (catId, nameAr) => catId + '||' + nameAr;

/* ══════════ i18n ══════════ */
const T = {
  ar: {
    products: 'المنتجات', slides: 'الشرائح', actions: 'إجراءات', settings: 'الإعدادات',
    productsSubtitle: 'تحكم بظهور المنتجات على شاشة العميل فوراً',
    slidesSubtitle: 'ترتيب وتشغيل شرائح العرض الترويجي',
    settingsSubtitle: 'أزرار الشاشة، الصيانة، ومعلومات الجهاز',
    itemsCount: n => `${n} منتج`, slidesCountStat: n => `${n} شريحة`,
    actionsGroupCustomer: 'تفاعل العميل', actionsGroupGames: 'ألعاب سريعة', actionsGroupControl: 'تحكم عام',
    allCats: 'الكل', visible: 'ظاهر', hidden: 'مخفي',
    showCustomer: 'عرض للعميل', pinSlide: 'تثبيت', unpinSlide: 'إلغاء التثبيت',
    showSlide: 'تشغيل', pinnedBanner: 'الشريحة المثبّتة — السلايدشو متوقف',
    sar: 'ريال', slideNum: n => `شريحة ${n}`, cal: 'سعرة',
    actionsTitle: 'إجراءات العميل',
    actionsSubtitle: 'تُنفَّذ فوراً على شاشة العميل كأنه هو من ضغط',
    showDiscount: 'عرض الخصم', showDiscountSub: 'يفتح نافذة الخصم / التقييم',
    showQR: 'منيو الجوال', showQRSub: 'يعرض QR code لفتح المنيو على الجوال',
    openGames: 'شاشة الألعاب', openGamesSub: 'يفتح شاشة اختيار اللعبة',
    launchReaction: 'لعبة رد الفعل', launchReactionSub: 'لعبة مَن يدفع الحساب',
    launchXO: 'لعبة إكس-أو', launchXOSub: 'يبدأ لعبة إكس-أو السريعة',
    closePanel: 'إغلاق النافذة', closePanelSub: 'يغلق أي نافذة مفتوحة',
    settingsBtns: 'أزرار الشاشة', settingsScroll: 'التمرير التلقائي',
    settingsMaint: 'وضع الصيانة', maintMsg: 'رسالة الصيانة',
    maintMsgPlaceholder: 'نعود قريباً — We\'ll be back soon',
    discountBtn: 'زر الخصم', phoneBtn: 'زر الهاتف',
    gamesBtn: 'زر الألعاب', qrBtn: 'زر منيو الجوال',
    autoScrollLabel: 'تفعيل التمرير التلقائي',
    maintLabel: 'تفعيل وضع الصيانة',
    resetAll: 'إعادة الضبط الكامل',
    resetConfirm: 'اضغط مرة ثانية للتأكيد',
    sentOk: 'تم الإرسال ✓', appliedOk: 'تم التطبيق ✓',
    noSync: 'Firebase غير مُعدَّل',
    connected: 'متصل', waiting: 'انتظار', connecting: 'يتصل',
    offline: 'غير متصل', error: 'خطأ', idle: 'غير مفعّل',
    cashierRole: 'شاشة الكاشير',
    hiddenItems: n => `${n} منتج مخفي`,
    hiddenSlides: n => `${n} شريحة مخفية`,
    noHiddenItems: 'كل المنتجات ظاهرة',
    noHiddenSlides: 'كل الشرائح ظاهرة',
    pinned: idx => `مثبّتة: ${idx + 1}`,
    noPinned: 'لا تثبيت',
    maintOn: 'صيانة: تشغيل', maintOff: 'صيانة: إيقاف',
    syncNow: n => `آخر مزامنة ${n}`,
    noSync2: 'لم تتم المزامنة',
    charging: 'يشحن', notCharging: 'لا يشحن',
    devices: 'الأجهزة', devicesTitle: 'الأجهزة المتصلة',
    devicesSubtitle: 'حالة كل شاشة عميل مرتبطة بنفس الفرع',
    noDevices: 'لا توجد أجهزة مرتبطة', noDevicesSub: 'افتح شاشة المنيو على أجهزة العملاء',
    devOnline: 'متصل', devOffline: 'غير متصل',
    devBattery: 'البطارية', devNetwork: 'الشبكة', devPlatform: 'الجهاز',
    devLastSeen: n => `آخر ظهور: ${n}`,
    devRename: 'إعادة تسمية', devRenamePrompt: 'اسم الشاشة:',
    devRemove: 'فصل', devRemoveConfirm: n => `فصل "${n}" نهائياً من القائمة؟`,
    devRenamed: 'تم تغيير الاسم ✓', devRemoved: 'تم فصل الجهاز',
    devicesCountStat: n => `${n} جهاز`,
    devNewProducts: 'صورة منتجات جديدة',
    devNewProductsShown: 'تم إظهار الصورة على هذا الجهاز',
    devNewProductsHidden: 'تم إخفاء الصورة عن هذا الجهاز',
    split: 'تقسيم الفاتورة', splitSubtitle: 'قسّم مبلغ الفاتورة بالتساوي بين عدد من الأشخاص',
    splitPeopleLabel: 'عدد الأشخاص', splitAmountLabel: 'مبلغ الفاتورة',
    splitCalc: 'احسب القسمة', splitReset: 'تقسيم جديد',
    splitEnterBoth: 'أدخل عدد الأشخاص ومبلغ الفاتورة',
    splitPerPerson: 'للشخص الواحد', splitTotalLabel: n => `الإجمالي ${n} ريال`,
    splitPeopleShort: n => `${n} ${n === 1 ? 'شخص' : 'أشخاص'}`,
    splitPersonLabel: n => `شخص ${n}`,
    splitBreakdown: (extraCount, extraAmt, baseCount, baseAmt) => {
      const parts = [];
      if (extraCount > 0) parts.push(`${extraCount} × ${extraAmt} ريال`);
      if (baseCount  > 0) parts.push(`${baseCount} × ${baseAmt} ريال`);
      return parts.join(' + ');
    },
  },
  en: {
    products: 'Products', slides: 'Slides', actions: 'Actions', settings: 'Settings',
    productsSubtitle: 'Control what appears on the customer screen instantly',
    slidesSubtitle: 'Order and play promotional slides',
    settingsSubtitle: 'Screen buttons, maintenance, and device info',
    itemsCount: n => `${n} items`, slidesCountStat: n => `${n} slides`,
    actionsGroupCustomer: 'Customer Engagement', actionsGroupGames: 'Quick Games', actionsGroupControl: 'General Control',
    allCats: 'All', visible: 'Visible', hidden: 'Hidden',
    showCustomer: 'Show to Customer', pinSlide: 'Pin', unpinSlide: 'Unpin',
    showSlide: 'Play', pinnedBanner: 'Pinned slide — Slideshow paused',
    sar: 'SAR', slideNum: n => `Slide ${n}`, cal: 'kcal',
    actionsTitle: 'Customer Actions',
    actionsSubtitle: 'Executed instantly on the customer screen as if they tapped it',
    showDiscount: 'Show Discount', showDiscountSub: 'Opens discount / review overlay',
    showQR: 'Mobile Menu', showQRSub: 'Shows QR code for mobile menu',
    openGames: 'Games Hub', openGamesSub: 'Opens game selection screen',
    launchReaction: 'Reaction Game', launchReactionSub: 'Starts the who-pays reaction game',
    launchXO: 'Speed X-O', launchXOSub: 'Starts the speed X-O game',
    closePanel: 'Close Panel', closePanelSub: 'Closes any open panel',
    settingsBtns: 'Screen Buttons', settingsScroll: 'Auto Scroll',
    settingsMaint: 'Maintenance Mode', maintMsg: 'Maintenance Message',
    maintMsgPlaceholder: 'We\'ll be back soon — نعود قريباً',
    discountBtn: 'Discount Button', phoneBtn: 'Phone Button',
    gamesBtn: 'Games Button', qrBtn: 'Mobile Menu Button',
    autoScrollLabel: 'Enable Auto Scroll',
    maintLabel: 'Enable Maintenance Mode',
    resetAll: 'Factory Reset',
    resetConfirm: 'Tap again to confirm',
    sentOk: 'Sent ✓', appliedOk: 'Applied ✓',
    noSync: 'Firebase not configured',
    connected: 'Connected', waiting: 'Waiting', connecting: 'Connecting',
    offline: 'Offline', error: 'Error', idle: 'Disabled',
    cashierRole: 'Cashier Screen',
    hiddenItems: n => `${n} hidden`,
    hiddenSlides: n => `${n} hidden`,
    noHiddenItems: 'All visible',
    noHiddenSlides: 'All visible',
    pinned: idx => `Pinned: ${idx + 1}`,
    noPinned: 'No pin',
    maintOn: 'Maint: ON', maintOff: 'Maint: OFF',
    syncNow: n => `Synced ${n}`,
    noSync2: 'Not synced',
    charging: 'Charging', notCharging: 'Battery',
    devices: 'Devices', devicesTitle: 'Connected Devices',
    devicesSubtitle: 'Status of every customer screen linked to this branch',
    noDevices: 'No devices connected', noDevicesSub: 'Open the menu screen on customer devices',
    devOnline: 'Online', devOffline: 'Offline',
    devBattery: 'Battery', devNetwork: 'Network', devPlatform: 'Device',
    devLastSeen: n => `Last seen: ${n}`,
    devRename: 'Rename', devRenamePrompt: 'Screen name:',
    devRemove: 'Unlink', devRemoveConfirm: n => `Unlink "${n}" permanently?`,
    devRenamed: 'Renamed ✓', devRemoved: 'Device unlinked',
    devicesCountStat: n => `${n} device${n === 1 ? '' : 's'}`,
    devNewProducts: 'New Products Image',
    devNewProductsShown: 'Image shown on this device',
    devNewProductsHidden: 'Image hidden on this device',
    split: 'Split Bill', splitSubtitle: 'Split the bill amount evenly between a number of people',
    splitPeopleLabel: 'Number of People', splitAmountLabel: 'Bill Amount',
    splitCalc: 'Calculate', splitReset: 'New Split',
    splitEnterBoth: 'Enter the number of people and the bill amount',
    splitPerPerson: 'Per Person', splitTotalLabel: n => `Total ${n} SAR`,
    splitPeopleShort: n => `${n} ${n === 1 ? 'person' : 'people'}`,
    splitPersonLabel: n => `Person ${n}`,
    splitBreakdown: (extraCount, extraAmt, baseCount, baseAmt) => {
      const parts = [];
      if (extraCount > 0) parts.push(`${extraCount} × ${extraAmt} SAR`);
      if (baseCount  > 0) parts.push(`${baseCount} × ${baseAmt} SAR`);
      return parts.join(' + ');
    },
  }
};
const t  = k  => (T[_lang]?.[k]  ?? T.ar[k]  ?? k);
const tf = (k,...a) => { const v = T[_lang]?.[k] ?? T.ar[k]; return typeof v === 'function' ? v(...a) : v ?? k; };

/* ══════════ Firebase helpers ══════════ */
function _syncOk() {
  return !!(window.DuoSync && typeof window.DuoSync.writeAction === 'function');
}

function sendAction(action) {
  if (!_syncOk()) { cToast(t('noSync'), 'warn'); return; }
  const ok = window.DuoSync.writeAction(action);
  if (ok !== false) cToast(t('sentOk'), 'ok');
  else              cToast(t('noSync'), 'warn');
}

function _pushSettings() {
  if (!window.DuoSync || typeof window.DuoSync.write !== 'function') return;
  window.DuoSync.write({
    hiddenItems:     [..._hiddenItems],
    hiddenSlides:    [..._hiddenSlides],
    hiddenVariants:  [],
    discountHidden:  _discountHidden,
    phoneHidden:     _phoneHidden,
    gamesHidden:     _gamesHidden,
    qrmenuHidden:    _qrmenuHidden,
    badges:          _badges,
    tempHide:        _tempHide,
    scrollSkip:      [], catSkip:   [],
    autoScroll:      _autoScroll,
    itemDuration:    3500,
    pauseDuration:   12000,
    overlayDuration: 8000,
    crossfadeDur:    520,
    ovChangeDur:     260,
    ovCloseDur:      430,
    maintenanceOn:   _maintenanceOn,
    maintenanceMsg:  _maintenanceMsg,
    slideDurations:  _slideDurations,
    pinnedSlide:     _pinnedSlide,
  });
  _lastSyncTs = Date.now();
  _updateStats();
  cToast(t('appliedOk'), 'ok');
}

function _applyState(v) {
  if (!v || typeof v !== 'object') return;
  _hiddenItems    = new Set(v.hiddenItems    || []);
  _hiddenSlides   = new Set((v.hiddenSlides  || []).map(String));
  _discountHidden = !!v.discountHidden;
  _phoneHidden    = !!v.phoneHidden;
  _gamesHidden    = !!v.gamesHidden;
  _qrmenuHidden   = !!v.qrmenuHidden;
  _badges         = v.badges   || {};
  _tempHide       = v.tempHide || {};
  if (v.autoScroll      !== undefined) _autoScroll     = !!v.autoScroll;
  if (v.maintenanceOn   !== undefined) _maintenanceOn  = !!v.maintenanceOn;
  if (v.maintenanceMsg  !== undefined) _maintenanceMsg = String(v.maintenanceMsg || '');
  if (v.slideDurations  !== undefined) _slideDurations = v.slideDurations || {};
  if (v.pinnedSlide     !== undefined)
    _pinnedSlide = (v.pinnedSlide !== null && v.pinnedSlide !== undefined)
      ? parseInt(v.pinnedSlide, 10) : null;
  if (v.ts) _lastSyncTs = v.ts;
  _updateStats();
  _rerenderTab();
}

/* ══════════ اللغة ══════════ */
function cToggleLang() {
  _lang = _lang === 'ar' ? 'en' : 'ar';
  localStorage.setItem(CLS_LANG, _lang);
  document.documentElement.lang = _lang;
  document.documentElement.dir  = _lang === 'ar' ? 'rtl' : 'ltr';
  _updateLangBtn();
  _updateStaticLabels();
  _updateStats();
  _rerenderTab();
}
window.cToggleLang = cToggleLang;

function _updateLangBtn() {
  const btn = document.getElementById('lang-btn');
  if (btn) btn.textContent = _lang === 'ar' ? 'EN' : 'AR';
}
function _updateStaticLabels() {
  _setText('t-products',  t('products'));
  _setText('t-slides',    t('slides'));
  _setText('t-actions',   t('actions'));
  _setText('t-split',     t('split'));
  _setText('t-devices',   t('devices'));
  _setText('t-settings',  t('settings'));
  _setText('h-role-label', t('cashierRole'));
  const nm = typeof restaurantInfo !== 'undefined' ? restaurantInfo.nameAr : 'DUO Burger';
  _setText('h-rest-name', nm);
}

/* ══════════ الشريط الجانبي ══════════ */
function cToggleSidebar() {
  _sidebarOpen = !_sidebarOpen;
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('collapsed', !_sidebarOpen);
}
window.cToggleSidebar = cToggleSidebar;

/* ══════════ التابات ══════════ */
function cShowTab(name) {
  _activeTab = name;
  document.querySelectorAll('.snav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.csection').forEach(s => s.classList.toggle('active', s.id === 'tab-' + name));
  _rerenderTab();
}
window.cShowTab = cShowTab;

function _rerenderTab() {
  switch (_activeTab) {
    case 'products': _renderProducts(); break;
    case 'slides':   _renderSlides();   break;
    case 'actions':  _renderActions();  break;
    case 'split':    _renderSplit();    break;
    case 'devices':  _renderDevices();  break;
    case 'settings': _renderSettings(); break;
  }
}

/* ══════════ TAB 1 — المنتجات ══════════ */
function _renderProducts() {
  _renderCatFilter();
  _renderProductGrid();
}

function _renderCatFilter() {
  const el = document.getElementById('cat-filter');
  if (!el || typeof menuCategories === 'undefined') return;
  let html = `<button class="cat-chip ${_activeCat === null ? 'cat-chip--active' : ''}" onclick="cSetCat(null)">
    <i class="fa-solid fa-border-all"></i> ${t('allCats')}
  </button>`;
  menuCategories.forEach(cat => {
    html += `<button class="cat-chip ${_activeCat === cat.id ? 'cat-chip--active' : ''}" onclick="cSetCat('${cat.id}')">
      <i class="fa-solid ${cat.icon}"></i>
      ${_lang === 'ar' ? cat.nameAr : (cat.nameEn || cat.nameAr)}
    </button>`;
  });
  el.innerHTML = html;
}

function cSetCat(id) { _activeCat = id; _renderProducts(); }
window.cSetCat = cSetCat;

function _renderProductGrid() {
  const el = document.getElementById('products-grid');
  if (!el || typeof menuCategories === 'undefined') return;
  const cats = _activeCat ? menuCategories.filter(c => c.id === _activeCat) : menuCategories;
  const totalAll = menuCategories.reduce((n, c) => n + c.items.length, 0);

  let html = `<div class="section-head">
    <div class="section-head-icon"><i class="fa-solid fa-burger"></i></div>
    <div class="section-head-text">
      <div class="section-head-title">${t('products')}</div>
      <div class="section-head-sub">${t('productsSubtitle')}</div>
    </div>
    <div class="section-head-stat">${tf('itemsCount', totalAll)}</div>
  </div>`;
  cats.forEach(cat => {
    const total  = cat.items.length;
    const hidden = cat.items.filter(item => _hiddenItems.has(_ikey(cat.id, item.nameAr))).length;
    html += `<div class="pcat-section">
      <div class="pcat-header">
        <div class="pcat-icon"><i class="fa-solid ${cat.icon}"></i></div>
        <div class="pcat-title">${_lang === 'ar' ? cat.nameAr : (cat.nameEn || cat.nameAr)}</div>
        <div class="pcat-count">${hidden > 0 ? `${hidden}/${total} ${t('hidden')}` : `${total}`}</div>
      </div>
      <div class="pcat-row">`;
    cat.items.forEach(item => {
      const key    = _ikey(cat.id, item.nameAr);
      const isHid  = _hiddenItems.has(key);
      const name   = _lang === 'ar' ? item.nameAr : (item.nameEn || item.nameAr);
      const safe   = item.nameAr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      html += `<div class="pcard ${isHid ? 'pcard--hidden' : ''}">
        <div class="pcard-img ${!item.image ? 'pcard-img--empty' : ''}"
          ${item.image ? `style="background-image:url('${item.image}')"` : ''}>
          ${!item.image ? '<i class="fa-solid fa-burger"></i>' : ''}
          ${isHid ? `<div class="pcard-hidden-badge"><i class="fa-solid fa-eye-slash"></i> ${t('hidden')}</div>` : ''}
        </div>
        <div class="pcard-body">
          <div class="pcard-name" title="${name}">${name}</div>
          <div class="pcard-meta">
            ${item.price != null ? `<span class="pcard-price">${item.price} <span>${t('sar')}</span></span>` : ''}
            ${item.calories ? `<span class="pcard-cal">${item.calories} ${t('cal')}</span>` : ''}
          </div>
        </div>
        <div class="pcard-actions">
          <button class="btn-show-cust" onclick="cSendShowProduct('${cat.id}','${safe}')">
            <i class="fa-solid fa-eye"></i> ${t('showCustomer')}
          </button>
          <label class="mini-toggle" title="${isHid ? t('hidden') : t('visible')}">
            <input type="checkbox" ${!isHid ? 'checked' : ''} onchange="cToggleItem('${cat.id}','${safe}')">
            <span class="mt-slider"></span>
          </label>
        </div>
      </div>`;
    });
    html += `</div></div>`;
  });
  el.innerHTML = html;
}

function cToggleItem(catId, nameAr) {
  const key = _ikey(catId, nameAr);
  if (_hiddenItems.has(key)) _hiddenItems.delete(key);
  else _hiddenItems.add(key);
  _pushSettings();
  _renderProductGrid();
}
window.cToggleItem = cToggleItem;

function cSendShowProduct(catId, nameAr) {
  sendAction({ type: 'showProduct', catId, nameAr });
}
window.cSendShowProduct = cSendShowProduct;

/* ══════════ TAB 2 — الشرائح ══════════ */
function _renderSlides() {
  const el = document.getElementById('slides-list');
  if (!el || typeof slides === 'undefined') return;
  const hasPinned = _pinnedSlide !== null && !isNaN(_pinnedSlide);
  let html = `<div class="section-head">
    <div class="section-head-icon"><i class="fa-solid fa-images"></i></div>
    <div class="section-head-text">
      <div class="section-head-title">${t('slides')}</div>
      <div class="section-head-sub">${t('slidesSubtitle')}</div>
    </div>
    <div class="section-head-stat">${tf('slidesCountStat', slides.length)}</div>
  </div>`;
  if (hasPinned) {
    const ps   = slides[_pinnedSlide];
    const pName = _lang === 'ar'
      ? (ps?.titleAr || tf('slideNum', _pinnedSlide + 1))
      : (ps?.titleEn || ps?.titleAr || tf('slideNum', _pinnedSlide + 1));
    html += `<div class="pinned-banner">
      <i class="fa-solid fa-thumbtack"></i>
      <div class="pinned-banner-txt">${t('pinnedBanner')}: <strong>${pName}</strong></div>
    </div>`;
  }
  slides.forEach((sl, i) => {
    const vis    = !_hiddenSlides.has(String(i));
    const pinned = _pinnedSlide === i;
    const name   = _lang === 'ar'
      ? (sl.titleAr || tf('slideNum', i+1))
      : (sl.titleEn || sl.titleAr || tf('slideNum', i+1));
    html += `<div class="slide-row ${pinned ? 'slide-row--pinned' : ''} ${!vis ? 'slide-row--hidden' : ''}">
      <div class="slide-num">${i + 1}</div>
      <div class="slide-thumb">
        ${sl.isGame
          ? `<div class="slide-thumb-game"><i class="fa-solid ${sl.icon || 'fa-gamepad'}"></i></div>`
          : (sl.image
              ? `<img src="${sl.image}" alt="" loading="lazy">`
              : '<div class="slide-thumb-game"><i class="fa-solid fa-image"></i></div>')}
      </div>
      <div class="slide-info">
        <div class="slide-name">${name}</div>
        <div class="slide-tags">
          ${!vis   ? `<span class="stag stag--hidden"><i class="fa-solid fa-eye-slash"></i> ${t('hidden')}</span>` : ''}
          ${pinned ? `<span class="stag stag--pinned"><i class="fa-solid fa-thumbtack"></i> ${_lang==='ar'?'مثبّتة':'Pinned'}</span>` : ''}
        </div>
      </div>
      <div class="slide-btns">
        <button class="sbtn sbtn-play" onclick="cSendGoToSlide(${i})" title="${t('showSlide')}">
          <i class="fa-solid fa-play"></i>
        </button>
        <button class="sbtn ${pinned ? 'sbtn-pin-on' : 'sbtn-pin'}" onclick="cTogglePinSlide(${i})"
          title="${pinned ? t('unpinSlide') : t('pinSlide')}">
          <i class="fa-solid fa-thumbtack"></i>
        </button>
        <button class="sbtn ${vis ? 'sbtn-eye-on' : 'sbtn-eye-off'}" onclick="cToggleSlide(${i})">
          <i class="fa-solid ${vis ? 'fa-eye' : 'fa-eye-slash'}"></i>
        </button>
      </div>
    </div>`;
  });
  el.innerHTML = html;
}

function cToggleSlide(idx) {
  const s = String(idx);
  if (_hiddenSlides.has(s)) _hiddenSlides.delete(s);
  else _hiddenSlides.add(s);
  _pushSettings();
  _renderSlides();
}
window.cToggleSlide = cToggleSlide;

function cTogglePinSlide(idx) {
  _pinnedSlide = _pinnedSlide === idx ? null : idx;
  if (_pinnedSlide !== null) localStorage.setItem(CLS_PINNED, String(_pinnedSlide));
  else localStorage.removeItem(CLS_PINNED);
  _pushSettings();
  _renderSlides();
}
window.cTogglePinSlide = cTogglePinSlide;

function cSendGoToSlide(idx) { sendAction({ type: 'goToSlide', idx }); }
window.cSendGoToSlide = cSendGoToSlide;

/* ══════════ TAB 3 — إجراءات ══════════ */
function _renderActions() {
  const el = document.getElementById('actions-grid');
  if (!el) return;

  const groups = [
    { labelKey: 'actionsGroupCustomer', items: [
      { icon:'fa-percent', color:'green',  key:'showDiscount', subKey:'showDiscountSub', fn:`cAction('showDiscount')` },
      { icon:'fa-qrcode',  color:'purple', key:'showQR',       subKey:'showQRSub',       fn:`cAction('showQRMenu')` },
      { icon:'fa-gamepad', color:'teal',   key:'openGames',    subKey:'openGamesSub',    fn:`cAction('showGames')` },
    ]},
    { labelKey: 'actionsGroupGames', items: [
      { icon:'fa-bolt',    color:'gold', key:'launchReaction', subKey:'launchReactionSub', fn:`cAction('launchGame','reaction')` },
      { icon:'fa-hashtag', color:'red',  key:'launchXO',       subKey:'launchXOSub',       fn:`cAction('launchGame','xo')` },
    ]},
    { labelKey: 'actionsGroupControl', items: [
      { icon:'fa-circle-xmark', color:'gray', key:'closePanel', subKey:'closePanelSub', fn:`cAction('hideOverlay')` },
    ]},
  ];

  let html = `<div class="section-head">
    <div class="section-head-icon"><i class="fa-solid fa-hand-pointer"></i></div>
    <div class="section-head-text">
      <div class="section-head-title">${t('actionsTitle')}</div>
      <div class="section-head-sub">${t('actionsSubtitle')}</div>
    </div>
  </div>`;

  groups.forEach(g => {
    html += `<div class="group-label">${t(g.labelKey)}</div><div class="action-cards">`;
    g.items.forEach(a => {
      html += `<button class="acard acard--${a.color}" onclick="${a.fn}">
        <div class="acard-icon"><i class="fa-solid ${a.icon}"></i></div>
        <div class="acard-label">${t(a.key)}</div>
        <div class="acard-sub">${t(a.subKey)}</div>
      </button>`;
    });
    html += `</div>`;
  });

  el.innerHTML = html;
}

function cAction(type, game) {
  const action = { type };
  if (game) action.game = game;
  sendAction(action);
}
window.cAction = cAction;

/* ══════════ TAB 4 — تقسيم الفاتورة ══════════ */

/**
 * يقسّم مبلغاً صحيحاً بالتساوي بين عدد من الأشخاص دون كسور:
 * الأساس = المبلغ ÷ العدد (لأسفل)، والباقي يُوزَّع ريالاً واحداً إضافياً
 * على أقل عدد ممكن من الأشخاص حتى يتطابق المجموع مع المبلغ الأصلي تماماً.
 * مثال: 134 على 4 أشخاص → أساس 33، الباقي 2 → شخصان يدفعان 34 وشخصان يدفعان 33.
 */
function _computeSplit(amount, people) {
  amount = Math.max(0, Math.round(amount));
  people = Math.max(1, Math.round(people));
  const base       = Math.floor(amount / people);
  const extraCount = amount - base * people;
  const baseCount  = people - extraCount;
  return { amount, people, base, extra: base + 1, extraCount, baseCount };
}

function _renderSplit() {
  const el = document.getElementById('split-content');
  if (!el) return;

  const peopleVal = _splitPeople || '0';
  const amountVal = _splitAmount || '0';

  const keys = [1,2,3,4,5,6,7,8,9].map(n =>
    `<button class="split-key" onclick="cSplitKey('${n}')">${n}</button>`).join('');

  let html = `<div class="section-head">
    <div class="section-head-icon"><i class="fa-solid fa-scale-balanced"></i></div>
    <div class="section-head-text">
      <div class="section-head-title">${t('split')}</div>
      <div class="section-head-sub">${t('splitSubtitle')}</div>
    </div>
  </div>

  <div class="split-layout">
    <div class="split-panel">
      <div class="split-fields">
        <button class="split-field ${_splitField === 'people' ? 'split-field--active' : ''}" onclick="cSplitSetField('people')">
          <span class="split-field-label"><i class="fa-solid fa-users"></i> ${t('splitPeopleLabel')}</span>
          <span class="split-field-value">${peopleVal}</span>
        </button>
        <button class="split-field ${_splitField === 'amount' ? 'split-field--active' : ''}" onclick="cSplitSetField('amount')">
          <span class="split-field-label"><i class="fa-solid fa-sack-dollar"></i> ${t('splitAmountLabel')}</span>
          <span class="split-field-value">${amountVal} <span class="split-field-unit">${t('sar')}</span></span>
        </button>
      </div>

      <div class="split-numpad">
        ${keys}
        <button class="split-key split-key--action" onclick="cSplitClear()" title="${t('splitReset')}"><i class="fa-solid fa-rotate-left"></i></button>
        <button class="split-key" onclick="cSplitKey('0')">0</button>
        <button class="split-key split-key--action" onclick="cSplitBackspace()"><i class="fa-solid fa-delete-left"></i></button>
      </div>

      <button class="split-calc-btn" onclick="cSplitCalc()">
        <i class="fa-solid fa-calculator"></i> ${t('splitCalc')}
      </button>
    </div>

    <div class="split-result-panel">
      ${_splitResult ? _splitResultHtml(_splitResult) : `
        <div class="split-empty">
          <i class="fa-solid fa-scale-balanced"></i>
          <p>${t('splitEnterBoth')}</p>
        </div>`}
    </div>
  </div>`;

  el.innerHTML = html;
}

function _splitResultHtml(r) {
  const breakdown = tf('splitBreakdown', r.extraCount, r.extra, r.baseCount, r.base);

  let cardsHtml = '';
  let idx = 1;
  for (let i = 0; i < r.extraCount; i++, idx++) {
    cardsHtml += `<div class="split-person-card split-person-card--extra">
      <div class="split-person-num">${tf('splitPersonLabel', idx)}</div>
      <div class="split-person-amt">${r.extra}<span>${t('sar')}</span></div>
    </div>`;
  }
  for (let i = 0; i < r.baseCount; i++, idx++) {
    cardsHtml += `<div class="split-person-card">
      <div class="split-person-num">${tf('splitPersonLabel', idx)}</div>
      <div class="split-person-amt">${r.base}<span>${t('sar')}</span></div>
    </div>`;
  }

  return `
    <div class="split-summary">
      <div class="split-summary-row">
        <span class="split-summary-total">${tf('splitTotalLabel', r.amount)}</span>
        <span class="split-summary-people">${tf('splitPeopleShort', r.people)}</span>
      </div>
      <div class="split-summary-breakdown">${breakdown}</div>
    </div>
    <div class="split-people-grid">${cardsHtml}</div>
    <button class="split-reset-btn" onclick="cSplitReset()">
      <i class="fa-solid fa-rotate-right"></i> ${t('splitReset')}
    </button>`;
}

function cSplitSetField(f) { _splitField = f; _renderSplit(); }
window.cSplitSetField = cSplitSetField;

function cSplitKey(d) {
  const maxLen = _splitField === 'people' ? 3 : 7;
  if (_splitField === 'people') {
    if (_splitPeople.length >= maxLen) return;
    _splitPeople = (_splitPeople === '0' ? '' : _splitPeople) + d;
  } else {
    if (_splitAmount.length >= maxLen) return;
    _splitAmount = (_splitAmount === '0' ? '' : _splitAmount) + d;
  }
  _splitResult = null;
  _renderSplit();
}
window.cSplitKey = cSplitKey;

function cSplitBackspace() {
  if (_splitField === 'people') _splitPeople = _splitPeople.slice(0, -1);
  else _splitAmount = _splitAmount.slice(0, -1);
  _splitResult = null;
  _renderSplit();
}
window.cSplitBackspace = cSplitBackspace;

function cSplitClear() {
  if (_splitField === 'people') _splitPeople = '';
  else _splitAmount = '';
  _splitResult = null;
  _renderSplit();
}
window.cSplitClear = cSplitClear;

function cSplitCalc() {
  const people = parseInt(_splitPeople, 10);
  const amount = parseInt(_splitAmount, 10);
  if (!people || people < 1 || !amount || amount < 1) {
    cToast(t('splitEnterBoth'), 'warn');
    return;
  }
  _splitResult = _computeSplit(amount, people);
  _renderSplit();
}
window.cSplitCalc = cSplitCalc;

function cSplitReset() {
  _splitPeople = ''; _splitAmount = ''; _splitResult = null; _splitField = 'people';
  _renderSplit();
}
window.cSplitReset = cSplitReset;

/* ══════════ الشريط الجانبي — بطاقات الأجهزة ══════════ */
function _renderSidebarDevices() {
  const list  = document.getElementById('sb-devs-list');
  const badge = document.getElementById('sb-dev-count');
  if (!list) return;

  const now = Date.now();

  function _ago(ts) {
    if (!ts) return '—';
    const s = Math.round((now - ts) / 1000);
    if (s < 60) return _lang === 'ar' ? `${s} ث` : `${s}s`;
    const m = Math.round(s / 60);
    if (m < 60) return _lang === 'ar' ? `${m} د` : `${m}m`;
    return _lang === 'ar' ? `${Math.round(m/60)} س` : `${Math.round(m/60)}h`;
  }

  function _battClass(pct) {
    if (pct === null || pct === undefined) return '';
    if (pct <= 15) return 'lvl-low';
    if (pct <= 35) return 'lvl-mid';
    if (pct <= 60) return 'lvl-ok';
    return 'lvl-good';
  }

  const online  = _devices.filter(d => d.online);
  const offline = _devices.filter(d => !d.online);

  if (badge) badge.textContent = _devices.length;

  if (!_devices.length) {
    list.innerHTML = `<div class="sdev-empty">
      <i class="fa-solid fa-tv"></i>
      <span>${t('noDevices')}</span>
    </div>`;
    return;
  }

  const platformIcon = p => {
    if (!p) return 'fa-display';
    p = p.toLowerCase();
    if (p.includes('ipad'))    return 'fa-tablet-screen-button';
    if (p.includes('iphone'))  return 'fa-mobile-screen-button';
    if (p.includes('android')) return 'fa-mobile-screen-button';
    return 'fa-display';
  };

  const sorted = [...online, ...offline];
  let html = '';

  sorted.forEach((d, idx) => {
    const isOnline  = d.online;
    const pct       = (d.battery !== null && d.battery !== undefined) ? d.battery : null;
    const charging  = d.batteryCharging;
    const net       = d.netType || '—';
    const platform  = d.platform || '—';
    const shortId   = (d.devId || '').replace('dev_', '').toUpperCase().slice(0, 5);
    const name      = _esc(d.name || platform || (idx + 1));
    const bc        = _battClass(pct);

    const battRow = pct !== null ? `
      <div class="sdev-batt-row">
        <div class="sdev-batt-bar">
          <div class="sdev-batt-fill ${charging ? 'charging' : bc}" style="width:${pct}%"></div>
        </div>
        <span class="sdev-batt-pct ${bc}">${pct}%</span>
        ${charging ? `<i class="fa-solid fa-bolt sdev-bolt"></i>` : ''}
      </div>` : '';

    const onlinePill = isOnline
      ? `<span class="sdev-pill good"><i class="fa-solid fa-circle" style="font-size:6px"></i> ${t('devOnline')}</span>`
      : `<span class="sdev-pill warn"><i class="fa-solid fa-circle" style="font-size:6px"></i> ${t('devOffline')}</span>`;

    const netPill = net !== '—'
      ? `<span class="sdev-pill"><i class="fa-solid fa-wifi"></i> ${net}</span>` : '';

    html += `<div class="sdev-card ${isOnline ? 'is-online' : 'is-offline'}">
      <div class="sdev-top">
        <div class="sdev-icon"><i class="fa-solid ${platformIcon(platform)}"></i></div>
        <div class="sdev-info">
          <div class="sdev-name" title="${name}">${name}</div>
          <div class="sdev-id">${platform}${shortId ? ' · #' + shortId : ''}</div>
        </div>
        <button class="sdev-rename-btn" onclick="event.stopPropagation();cRenameDevice('${d.devId}')" title="${t('devRename')}">
          <i class="fa-solid fa-pen"></i>
        </button>
        <div class="sdev-status-dot"></div>
      </div>
      ${battRow}
      <div class="sdev-meta">${onlinePill}${netPill}</div>
      <div class="sdev-np-row" onclick="event.stopPropagation()">
        <span class="sdev-np-label"><i class="fa-solid fa-image"></i> ${t('devNewProducts')}</span>
        <label class="set-toggle set-toggle--sm">
          <input type="checkbox" ${d.newProductsVisible ? 'checked' : ''}
            onchange="cToggleDeviceNewProducts('${d.devId}', this.checked)">
          <span class="set-slider"></span>
        </label>
      </div>
      <div class="sdev-last">${_ago(d.ts)}</div>
    </div>`;
  });

  list.innerHTML = html;
}

/* ══════════ TAB 4 — الأجهزة ══════════ */
function _renderDevices() {
  const el = document.getElementById('devices-grid');
  if (!el) return;

  const now = Date.now();

  function _ago(ts) {
    if (!ts) return '—';
    const s = Math.round((now - ts) / 1000);
    if (s < 60) return _lang === 'ar' ? `${s} ث` : `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return _lang === 'ar' ? `${m} د` : `${m}m ago`;
    const h = Math.round(m / 60);
    return _lang === 'ar' ? `${h} س` : `${h}h ago`;
  }

  function _battColor(pct) {
    if (pct === null || pct === undefined) return '';
    if (pct <= 15) return 'danger';
    if (pct <= 30) return 'warn';
    return 'good';
  }

  if (!_devices || _devices.length === 0) {
    el.innerHTML = `
      <div class="section-head">
        <div class="section-head-icon"><i class="fa-solid fa-tv"></i></div>
        <div class="section-head-text">
          <div class="section-head-title">${t('devicesTitle')}</div>
          <div class="section-head-sub">${t('devicesSubtitle')}</div>
        </div>
      </div>
      <div class="devices-empty">
        <i class="fa-solid fa-tv"></i>
        <p>${t('noDevices')}</p>
        <small>${t('noDevicesSub')}</small>
      </div>`;
    return;
  }

  // sort: online first, then by ts desc
  const sorted = [..._devices].sort((a, b) => {
    if (a.online && !b.online) return -1;
    if (!a.online && b.online) return 1;
    return (b.ts || 0) - (a.ts || 0);
  });

  const platformIcon = p => {
    if (!p) return 'fa-display';
    p = p.toLowerCase();
    if (p.includes('ipad'))    return 'fa-tablet-screen-button';
    if (p.includes('iphone'))  return 'fa-mobile-screen-button';
    if (p.includes('android')) return 'fa-mobile-screen-button';
    return 'fa-display';
  };

  let html = `
    <div class="section-head">
      <div class="section-head-icon"><i class="fa-solid fa-tv"></i></div>
      <div class="section-head-text">
        <div class="section-head-title">${t('devicesTitle')}</div>
        <div class="section-head-sub">${t('devicesSubtitle')}</div>
      </div>
      <div class="section-head-stat">${tf('devicesCountStat', sorted.length)}</div>
    </div>
    <div class="devices-cards">`;

  sorted.forEach((d, idx) => {
    const online  = d.online;
    const pct     = (d.battery !== null && d.battery !== undefined) ? d.battery : null;
    const charging= d.batteryCharging;
    const net     = d.netType || '—';
    const platform= d.platform || '—';
    const lastSeen= _ago(d.ts);
    const battColor = _battColor(pct);
    const shortId  = (d.devId || '').replace('dev_', '').toUpperCase().slice(0, 6);
    const name     = _esc(d.name || platform || (idx + 1));

    let battHtml = '';
    if (pct !== null) {
      battHtml = `
        <div class="dbatt">
          <div class="dbatt-bar"><div class="dbatt-fill dbatt-fill--${battColor}" style="width:${pct}%"></div></div>
          <span class="dcard-row-val ${battColor}">${pct}% ${charging ? '<i class="fa-solid fa-bolt"></i>' : ''}</span>
        </div>`;
    } else {
      battHtml = `<span class="dcard-row-val muted">—</span>`;
    }

    html += `
      <div class="dcard ${online ? 'is-online' : 'is-offline'}">
        <div class="dcard-top">
          <div class="dcard-device-icon"><i class="fa-solid ${platformIcon(platform)}"></i></div>
          <div class="dcard-info">
            <div class="dcard-name" title="${name}">${name}</div>
            <div class="dcard-status ${online ? 'online' : 'offline'}">
              <i class="fa-solid fa-circle" style="font-size:7px"></i>
              ${online ? t('devOnline') : t('devOffline')}
            </div>
          </div>
        </div>
        <div class="dcard-rows">
          <div class="dcard-row">
            <span class="dcard-row-label"><i class="fa-solid fa-battery-half"></i> ${t('devBattery')}</span>
            ${battHtml}
          </div>
          <div class="dcard-row">
            <span class="dcard-row-label"><i class="fa-solid fa-mobile-screen-button"></i> ${t('devPlatform')}</span>
            <span class="dcard-row-val">${platform}${shortId ? ` <span class="dcard-id">#${shortId}</span>` : ''}</span>
          </div>
          <div class="dcard-row">
            <span class="dcard-row-label"><i class="fa-solid fa-wifi"></i> ${t('devNetwork')}</span>
            <span class="dcard-row-val">${net}</span>
          </div>
          <div class="dcard-row">
            <span class="dcard-row-label"><i class="fa-solid fa-image"></i> ${t('devNewProducts')}</span>
            <label class="set-toggle">
              <input type="checkbox" ${d.newProductsVisible ? 'checked' : ''}
                onchange="cToggleDeviceNewProducts('${d.devId}', this.checked)">
              <span class="set-slider"></span>
            </label>
          </div>
        </div>
        <div class="dcard-foot">
          <div class="dcard-last-seen">${tf('devLastSeen', lastSeen)}</div>
          <div class="dcard-actions">
            <button class="dcard-btn" onclick="cRenameDevice('${d.devId}')" title="${t('devRename')}">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="dcard-btn dcard-btn--danger" onclick="cRemoveDevice('${d.devId}')" title="${t('devRemove')}">
              <i class="fa-solid fa-link-slash"></i>
            </button>
          </div>
        </div>
      </div>`;
  });

  html += `</div>`;
  el.innerHTML = html;
}

function _findDevice(devId) { return _devices.find(d => d.devId === devId); }

function cToggleDeviceNewProducts(devId, checked) {
  if (!_syncOk() || !window.DuoSync || typeof window.DuoSync.setDeviceFlag !== 'function') return;
  window.DuoSync.setDeviceFlag(devId, { newProductsVisible: checked });
  cToast(checked ? t('devNewProductsShown') : t('devNewProductsHidden'), 'ok');
}
window.cToggleDeviceNewProducts = cToggleDeviceNewProducts;

function cRenameDevice(devId) {
  const d = _findDevice(devId);
  const current = d ? (d.name || '') : '';
  const name = prompt(t('devRenamePrompt'), current);
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed || !_syncOk() || typeof window.DuoSync.renameDevice !== 'function') return;
  window.DuoSync.renameDevice(devId, trimmed.slice(0, 40));
  cToast(t('devRenamed'), 'ok');
}
window.cRenameDevice = cRenameDevice;

function cRemoveDevice(devId) {
  const d = _findDevice(devId);
  const name = d ? (d.name || d.platform || devId) : devId;
  if (!confirm(tf('devRemoveConfirm', name))) return;
  if (!_syncOk() || typeof window.DuoSync.removeDevice !== 'function') return;
  window.DuoSync.removeDevice(devId);
  cToast(t('devRemoved'), 'ok');
}
window.cRemoveDevice = cRemoveDevice;

/* ══════════ TAB 5 — إعدادات ══════════ */
function _renderSettings() {
  const el = document.getElementById('settings-content');
  if (!el) return;

  const chk = (val, fn) => `<label class="set-toggle">
    <input type="checkbox" ${val ? 'checked' : ''} onchange="${fn}">
    <span class="set-slider"></span>
  </label>`;

  const row = (icon, label, sub, val, fn) => `<div class="set-row">
    <div class="set-label">
      <i class="fa-solid ${icon}"></i>
      <div>
        <div>${label}</div>
        ${sub ? `<div class="set-label-sub">${sub}</div>` : ''}
      </div>
    </div>
    ${chk(val, fn)}
  </div>`;

  /* معلومات الجهاز */
  const branch   = localStorage.getItem('duo_pair_branch') || 'Branch01';
  const platform = navigator.platform || navigator.userAgentData?.platform || '—';
  const ua       = /iPad|iPhone|Android/i.test(navigator.userAgent)
    ? /iPad/i.test(navigator.userAgent) ? 'iPad'
    : /iPhone/i.test(navigator.userAgent) ? 'iPhone' : 'Android'
    : 'Desktop';

  const deviceInfo = [
    { icon:'fa-code-branch', label: _lang==='ar'?'الفرع':'Branch',       val: branch },
    { icon:'fa-mobile-alt',  label: _lang==='ar'?'الجهاز':'Device',      val: ua },
    { icon:'fa-globe',       label: _lang==='ar'?'الاتصال':'Network',
      val: (navigator.onLine ? (_lang==='ar'?'متصل':'Online') : (_lang==='ar'?'غير متصل':'Offline')) },
    { icon:'fa-wifi',        label: _lang==='ar'?'نوع الشبكة':'Net Type',
      val: (navigator.connection?.effectiveType || '—').toUpperCase() },
  ];

  let html = `
  <div class="section-head">
    <div class="section-head-icon"><i class="fa-solid fa-sliders"></i></div>
    <div class="section-head-text">
      <div class="section-head-title">${t('settings')}</div>
      <div class="section-head-sub">${t('settingsSubtitle')}</div>
    </div>
  </div>

  <!-- معلومات الجهاز -->
  <div class="set-card">
    <div class="set-card-title"><i class="fa-solid fa-circle-info"></i>
      ${_lang==='ar'?'معلومات الجهاز':'Device Info'}
    </div>
    ${deviceInfo.map(d => `<div class="set-row">
      <div class="set-label"><i class="fa-solid ${d.icon}"></i> ${d.label}</div>
      <span style="font-size:13px;font-weight:800;color:var(--blue)">${d.val}</span>
    </div>`).join('')}
  </div>

  <!-- أزرار الشاشة -->
  <div class="set-card">
    <div class="set-card-title"><i class="fa-solid fa-toggle-on"></i> ${t('settingsBtns')}</div>
    ${row('fa-percent', t('discountBtn'), '', !_discountHidden, 'cToggleDiscount()')}
    ${row('fa-phone',   t('phoneBtn'),   '', !_phoneHidden,    'cTogglePhone()')}
    ${row('fa-gamepad', t('gamesBtn'),   '', !_gamesHidden,    'cToggleGames()')}
    ${row('fa-qrcode',  t('qrBtn'),      '', !_qrmenuHidden,   'cToggleQR()')}
  </div>

  <!-- التمرير -->
  <div class="set-card">
    <div class="set-card-title"><i class="fa-solid fa-rotate"></i> ${t('settingsScroll')}</div>
    ${row('fa-rotate', t('autoScrollLabel'), '', _autoScroll, 'cToggleAutoScroll()')}
  </div>

  <!-- الصيانة -->
  <div class="set-card">
    <div class="set-card-title"><i class="fa-solid fa-wrench"></i> ${t('settingsMaint')}</div>
    ${row('fa-wrench', t('maintLabel'), '', _maintenanceOn, 'cToggleMaintenance()')}
    <div class="set-row set-row--input">
      <div class="set-label"><i class="fa-solid fa-comment"></i> ${t('maintMsg')}</div>
      <input class="set-input" id="maint-input" type="text"
        value="${_maintenanceMsg.replace(/"/g,'&quot;')}"
        placeholder="${t('maintMsgPlaceholder')}"
        onblur="cUpdateMaintMsg(this.value)">
    </div>
  </div>

  <!-- إعادة الضبط -->
  <div class="set-card set-card--danger">
    <button class="btn-reset" id="reset-btn" onclick="cFactoryReset()">
      <i class="fa-solid fa-trash-can"></i> ${t('resetAll')}
    </button>
  </div>`;

  el.innerHTML = html;
}

function cToggleDiscount()    { _discountHidden = !_discountHidden; _pushSettings(); _renderSettings(); }
function cTogglePhone()       { _phoneHidden    = !_phoneHidden;    _pushSettings(); _renderSettings(); }
function cToggleGames()       { _gamesHidden    = !_gamesHidden;    _pushSettings(); _renderSettings(); }
function cToggleQR()          { _qrmenuHidden   = !_qrmenuHidden;   _pushSettings(); _renderSettings(); }
function cToggleAutoScroll()  { _autoScroll     = !_autoScroll;     _pushSettings(); _renderSettings(); }
function cToggleMaintenance() { _maintenanceOn  = !_maintenanceOn;  _pushSettings(); _renderSettings(); }
function cUpdateMaintMsg(v)   { _maintenanceMsg = v; _pushSettings(); }

window.cToggleDiscount   = cToggleDiscount;
window.cTogglePhone      = cTogglePhone;
window.cToggleGames      = cToggleGames;
window.cToggleQR         = cToggleQR;
window.cToggleAutoScroll = cToggleAutoScroll;
window.cToggleMaintenance= cToggleMaintenance;
window.cUpdateMaintMsg   = cUpdateMaintMsg;

function cFactoryReset() {
  const btn = document.getElementById('reset-btn');
  if (!_resetConfirmed) {
    _resetConfirmed = true;
    if (btn) { btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${t('resetConfirm')}`; btn.classList.add('btn-reset--confirm'); }
    clearTimeout(_resetTimer);
    _resetTimer = setTimeout(() => {
      _resetConfirmed = false;
      if (btn) { btn.innerHTML = `<i class="fa-solid fa-trash-can"></i> ${t('resetAll')}`; btn.classList.remove('btn-reset--confirm'); }
    }, 4000);
    return;
  }
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('duo_')) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
  sessionStorage.clear();
  setTimeout(() => location.reload(), 800);
}
window.cFactoryReset = cFactoryReset;

/* ══════════ حالة الاتصال ══════════ */
const CONN_COLORS = {
  connected:'#22c55e', waiting:'#3b82f6', connecting:'#f5c200',
  offline:'#f87171', error:'#f87171', idle:'#6b7280'
};
const CONN_CLASS = {
  connected:'is-connected', waiting:'', connecting:'is-connecting',
  offline:'is-offline', error:'is-offline', idle:''
};

function _updateConn(state) {
  const dot = document.getElementById('conn-dot');
  const lbl = document.getElementById('conn-label');
  if (!dot || !lbl) return;
  const c = CONN_COLORS[state] || '#6b7280';
  dot.className = 'conn-dot ' + (CONN_CLASS[state] || '');
  dot.style.background = c;
  lbl.textContent = t(state) || state;
  lbl.style.color  = c;
}

/* ══════════ Battery API ══════════ */
function _initBattery() {
  const bolt   = document.getElementById('battery-bolt');
  const fill   = document.getElementById('battery-fill');
  const pct    = document.getElementById('battery-pct');
  const badge  = document.getElementById('battery-badge');

  function _applyBattery(b) {
    const lvl    = Math.round(b.level * 100);
    const charge = b.charging;
    if (pct)  pct.textContent = lvl + '%';
    if (fill) {
      fill.style.width = lvl + '%';
      fill.className   = 'battery-fill'
        + (charge     ? ' charging'   : '')
        + (!charge && lvl <= 15 ? ' lvl-low'  : '')
        + (!charge && lvl > 15 && lvl <= 35 ? ' lvl-mid' : '')
        + (!charge && lvl > 35 && lvl <= 60 ? ' lvl-ok'  : '')
        + (!charge && lvl > 60 ? ' lvl-good' : '');
    }
    if (bolt) {
      if (charge) bolt.classList.remove('hidden');
      else        bolt.classList.add('hidden');
    }
    /* تلوين الشارة عند بطارية منخفضة */
    if (badge && !charge && lvl <= 15) {
      badge.style.borderColor = 'rgba(248,113,113,.4)';
    } else if (badge) {
      badge.style.borderColor = '';
    }
    /* تحديث شريط المعلومات */
    _updateStats();
  }

  if ('getBattery' in navigator) {
    navigator.getBattery().then(b => {
      _applyBattery(b);
      b.addEventListener('levelchange',   () => _applyBattery(b));
      b.addEventListener('chargingchange',() => _applyBattery(b));
    }).catch(() => { if (pct) pct.textContent = '—'; });
  } else {
    if (pct)  pct.textContent = '—';
    if (badge) badge.title = 'غير مدعوم';
  }
}

/* ══════════ الساعة ══════════ */
function _initClock() {
  const DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  function _tick() {
    const now  = new Date();
    const hh   = String(now.getHours()).padStart(2, '0');
    const mm   = String(now.getMinutes()).padStart(2, '0');
    const day  = _lang === 'ar' ? DAYS_AR[now.getDay()] : DAYS_EN[now.getDay()];
    const d    = now.getDate();
    const mon  = _lang === 'ar' ? MONTHS_AR[now.getMonth()] : now.toLocaleString('en-US',{month:'short'});
    _setText('ch-time', `${hh}:${mm}`);
    _setText('ch-date', `${day}، ${d} ${mon}`);
  }
  _tick();
  setInterval(_tick, 1000);
}

/* ══════════ Stats bar ══════════ */
function _updateStats() {
  /* hidden items */
  const hItems = _hiddenItems.size;
  const spItems = document.getElementById('sp-items-txt');
  const spItemsEl = document.querySelector('.spill--items');
  if (spItems) spItems.textContent = hItems > 0 ? tf('hiddenItems', hItems) : t('noHiddenItems');
  if (spItemsEl) spItemsEl.classList.toggle('has-hidden', hItems > 0);

  /* hidden slides */
  const hSlides = _hiddenSlides.size;
  const spSl = document.getElementById('sp-slides-txt');
  const spSlEl = document.querySelector('.spill--slides');
  if (spSl) spSl.textContent = hSlides > 0 ? tf('hiddenSlides', hSlides) : t('noHiddenSlides');
  if (spSlEl) spSlEl.classList.toggle('has-hidden', hSlides > 0);

  /* pin */
  const spPin = document.getElementById('sp-pin-txt');
  const spPinEl = document.getElementById('spill-pin');
  if (spPin) spPin.textContent = _pinnedSlide !== null ? tf('pinned', _pinnedSlide) : t('noPinned');
  if (spPinEl) spPinEl.classList.toggle('is-pinned', _pinnedSlide !== null);

  /* maintenance */
  const spMaint = document.getElementById('sp-maint-txt');
  const spMaintEl = document.getElementById('spill-maint');
  if (spMaint) spMaint.textContent = _maintenanceOn ? t('maintOn') : t('maintOff');
  if (spMaintEl) spMaintEl.classList.toggle('is-on', _maintenanceOn);

  /* branch */
  const branch = localStorage.getItem('duo_pair_branch') || 'Branch01';
  _setText('sp-branch-txt', branch);

  /* sync time */
  const spSync = document.getElementById('sp-sync-txt');
  const spSyncEl = document.querySelector('.spill--sync');
  const spSyncIcon = document.getElementById('sp-sync-icon');
  if (_lastSyncTs) {
    const diff = Math.round((Date.now() - _lastSyncTs) / 1000);
    const label = diff < 60
      ? (diff + (_lang==='ar'?' ث':' s'))
      : (Math.round(diff/60) + (_lang==='ar'?' د':' m'));
    if (spSync) spSync.textContent = tf('syncNow', label);
    if (spSyncEl) spSyncEl.classList.add('synced');
    if (spSyncIcon) spSyncIcon.style.animation = '';
  } else {
    if (spSync) spSync.textContent = t('noSync2');
    if (spSyncEl) spSyncEl.classList.remove('synced');
  }
}

/* ══════════ Toast ══════════ */
let _toastTimer = null;
const TOAST_ICONS = { ok:'fa-check-circle', err:'fa-circle-xmark', warn:'fa-triangle-exclamation' };

function cToast(msg, type) {
  const el   = document.getElementById('cashier-toast');
  const icon = document.getElementById('toast-icon');
  const txt  = document.getElementById('toast-msg');
  if (!el) return;
  const tp = type || 'ok';
  if (txt)  txt.textContent = msg;
  if (icon) icon.className  = `ct-icon fa-solid ${TOAST_ICONS[tp] || TOAST_ICONS.ok}`;
  el.className = `cashier-toast toast--${tp} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ══════════ DOM helpers ══════════ */
function _setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════ التهيئة ══════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* اللغة */
  _lang = localStorage.getItem(CLS_LANG) || 'ar';
  document.documentElement.lang = _lang;
  document.documentElement.dir  = _lang === 'ar' ? 'rtl' : 'ltr';
  _updateLangBtn();
  _updateStaticLabels();

  /* الساعة والبطارية */
  _initClock();
  _initBattery();
  _updateStats();

  /* تفعيل المزامنة */
  if (!localStorage.getItem('duo_pair_branch'))
    localStorage.setItem('duo_pair_branch', 'Branch01');
  localStorage.setItem('duo_pair_enabled', 'true');

  /* تحميل الحالة من Firebase */
  if (window.DuoSync && typeof window.DuoSync.readOnce === 'function') {
    window.DuoSync.readOnce(v => {
      if (v) _applyState(v);
      else   _rerenderTab();
    });
    if (typeof window.DuoSync.listen === 'function') {
      window.DuoSync.listen(v => _applyState(v));
    }
    if (typeof window.DuoSync.watchDevices === 'function') {
      window.DuoSync.watchDevices(devs => {
        _devices = devs;
        _updateStats();
        _renderSidebarDevices();
        if (_activeTab === 'devices') _renderDevices();
      });
    }
  } else {
    _rerenderTab();
  }

  /* مراقبة Firebase */
  (function _watchConn() {
    try {
      if (typeof firebase === 'undefined') { _updateConn('idle'); return; }
      const fbCfg = window.DUO_FIREBASE_CONFIG;
      if (!fbCfg || !fbCfg.databaseURL) { _updateConn('idle'); return; }
      const apps = firebase.apps || [];
      const app  = apps.find(a => a?.name === 'duoApp')
                || apps.find(a => a?.name === 'duoSync')
                || firebase.initializeApp(fbCfg, 'duoSync');
      const db   = firebase.database(app);
      _updateConn('connecting');
      db.ref('.info/connected').on('value', snap => {
        _updateConn(snap.val() === true ? 'connected' : 'offline');
      });
    } catch(e) { _updateConn('error'); }
  })();

  /* تحديث stats كل دقيقة (لوقت المزامنة) */
  setInterval(_updateStats, 60000);

  _renderSidebarDevices();
  _rerenderTab();
});