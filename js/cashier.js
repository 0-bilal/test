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
let _splitPayments = {};       /* { رقم الشخص: 'cash' | 'network' } */

/* الموازنة */
const BAL_DENOMS = [1, 5, 10, 20, 50, 100, 200, 500];
const BAL_CASH_MODES = ['full', 'final', 'custody']; /* كاملة، نهائية (للإيداع)، عهدة */
function _balEmptyDenoms() {
  const denoms = {};
  BAL_DENOMS.forEach(d => denoms[d] = '');
  return denoms;
}
function _balDefaultState() {
  const cash = {};
  BAL_CASH_MODES.forEach(m => cash[m] = _balEmptyDenoms());
  return {
    cash,
    custodyTarget: '500', /* المبلغ المتفق عليه/الثابت للعهدة — يُخصَم من الكاملة في الحساب */
    cancelled: '', /* مبلغ العمليات الملغاة (كنسل) — يُخصَم من الكاملة أيضاً لأنه ليس مبيعات فعلية */
    devices: [{ visa: '', mc: '', mada: '' }, { visa: '', mc: '', mada: '' }],
    report: { sales: '', cash: '', network: '' },
  };
}
let _bal        = _balDefaultState();
let _balCashTab = 'full'; /* أي عملية عدّ نقود مفتوحة حالياً أسفل أزرار التبديل الثلاثة */

/* الطباعة */
const DISCOUNT_PERCENTS = [5, 10, 15, 20, 30];
/* أسماء الخصومات — عدّلها لاحقاً لتطابق الأسماء الفعلية المستخدمة في الفرع */
const DISCOUNT_NAMES = [
  'خصم عشان عيونك',
  'خصم عزيمة ديو',
  'خصم أنت الـ VIP',
  'خصم عربون محبة',
  'خصم ابتسامتك تكفي',
  'خصم عشانك غالي',
];
const MESSAGE_PRESETS = [
  'شكراً لزيارتكم، بانتظاركم دائماً',
  'نتمنى لكم وجبة شهية',
  'يسعدنا استقبال ملاحظاتكم واقتراحاتكم',
];
const COUPON_EXPIRY_DAYS = [1, 3, 7, 15, 30]; /* خيارات مدة صلاحية الكوبون بالأيام */
let _selPct     = null;
let _selDName   = DISCOUNT_NAMES[0];
let _selExpiry  = 7;
let _couponCode = null;
let _msgText    = '';
let _printBusy  = false;
let _printerSettingsOpen = false;
const BAL_FIELD_DEFAULT = 'cash:full:1';
let _balField    = BAL_FIELD_DEFAULT;  /* معرّف الحقل النشط للوحة الأرقام */

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
    splitPayCash: 'كاش', splitPayNetwork: 'شبكة', splitPayPending: 'بانتظار الدفع',
    balance: 'الموازنة', balanceSubtitle: 'عدّ نقدية الدرج وأجهزة الشبكة وقارنها بتقرير الكاشير',
    balCashGroup: 'عدّ نقدية الدرج',
    balCashGroupSub: '"الكاملة" هي أساس الحساب المحاسبي (صافي الكاش = الكاملة − مبلغ العهدة − المبلغ الملغى). عدّ "النهائية" و"العهدة" اختياري للتحقق فقط ولا يؤثر على الحساب',
    balCashMode_full: 'نقود كاملة', balCashMode_final: 'نقود نهائية (للإيداع)', balCashMode_custody: 'نقود العهدة',
    balCustodyTarget: 'مبلغ العهدة المحدد', balCustodyTargetHint: 'عدّ نقود العهدة أعلاه لمقارنتها بهذا المبلغ (تحقق فقط، لا يدخل في الحساب)',
    balFinalCheckHint: 'عدّ النقود النهائية أعلاه لمقارنتها بصافي الكاش المحسوب (تحقق فقط، لا يدخل في الحساب)',
    balDeductionsTitle: 'خصومات من الكاش الكاملة', balCancelled: 'المبلغ الملغى (كنسل)',
    balCashForBank: 'النقود الكاش المُسلَّمة للبنك', balCustodyInDrawer: 'مبلغ العهدة الموجود في الكاشير',
    balNetworkGroup: 'أجهزة نقاط البيع (الشبكة)',
    balDevice: n => `جهاز ${n}`, balAddDevice: 'إضافة جهاز', balRemoveDevice: 'حذف الجهاز',
    balVisa: 'فيزا', balMastercard: 'ماستركارد', balMada: 'مدى',
    balReportGroup: 'تقرير جهاز الكاشير', balReportSub: 'أدخل الأرقام كما تظهر في تقرير الإقفال المطبوع',
    balReportSales: 'إجمالي المبيعات', balReportCash: 'إجمالي الكاش', balReportNetwork: 'إجمالي الشبكة',
    balNoteUnit: n => `${n} ريال`, balNoteCountUnit: 'ورقة',
    balSummaryTitle: 'ملخص الموازنة', balActiveField: 'الحقل النشط',
    balNetCash: 'صافي مبيعات الكاش', balCalcNetwork: 'إجمالي الشبكة المحسوب',
    balCashCompare: 'مقارنة الكاش', balNetworkCompare: 'مقارنة الشبكة', balSalesCompare: 'مقارنة الإجمالي',
    balTotalCompareNote: '(مقارنة الكاش + مقارنة الشبكة)',
    balShort: 'عجز', balOver: 'زيادة', balMatch: 'مطابق',
    balDiffAmt: n => `${n} ريال`,
    balReset: 'موازنة جديدة', balNoDeviceRemove: 'يجب أن يبقى جهاز واحد على الأقل',
    balSelectField: 'اضغط على أي حقل بالأعلى ثم استخدم لوحة الأرقام لتعبئته',
    balReportCheck: 'تحقق أرقام التقرير',
    balReportCheckSub: 'الفرق بين "إجمالي المبيعات" ومجموع "الكاش + الشبكة" في نفس تقرير الكاشير — أي فرق هنا غالبًا خطأ إدخال وليس عجزًا فعليًا',
    balReportOk: 'متطابق', balReportMismatch: 'فرق إدخال',
    balExport: 'تصدير', balImport: 'استعادة', balPrint: 'طباعة',
    balPrintTitle: 'تقرير الموازنة',
    balExportOk: 'تم تصدير الموازنة ✓', balImportOk: 'تم استعادة الموازنة ✓', balImportErr: 'ملف غير صالح',
    settingsUpdate: 'تحديث النظام',
    updateAppLabel: 'تحديث المتصفح والأكواد', updateAppSub: 'يمسح الذاكرة المؤقتة ويحمّل آخر نسخة من أكواد الموقع',
    updateAppBtn: 'تحديث الآن', updatingApp: 'جاري التحديث...',
    updateAppDone: 'تم التحديث ✓', updateAppOk: 'تم مسح الذاكرة المؤقتة، جاري إعادة التحميل...',
    updateAppNothing: 'لا توجد ذاكرة مؤقتة محفوظة — جاري إعادة التحميل فقط...',
    updateAppErr: 'تعذّر التحديث، حاول مرة أخرى',
    printing: 'الطباعة', printingSubtitle: 'طباعة كوبونات الخصم ورسائل العملاء على طابعة الفواتير',
    printCouponTitle: 'كوبون خصم', printPctLabel: 'نسبة الخصم', printNameLabel: 'اسم الخصم',
    printCouponBtn: 'طباعة الكوبون', printSelectPctFirst: 'اختر نسبة الخصم أولاً',
    printCouponSub: (pct, name) => `${pct}% — ${name}`,
    printMsgTitle: 'رسالة للعميل', printPresetLabel: 'رسائل جاهزة', printCustomLabel: 'أو اكتب رسالة مخصصة',
    printCustomPlaceholder: 'اكتب رسالتك هنا...', printMsgBtn: 'طباعة الرسالة',
    printConnecting: 'جاري الاتصال بالطابعة...', printSending: 'جاري الطباعة...',
    printDone: 'تمت الطباعة ✓', printFailed: 'فشلت الطباعة',
    printerLibMissing: 'مكتبة الطابعة غير محمَّلة',
    printerSettingsTitle: 'إعدادات الطابعة', printerIpLabel: 'عنوان IP الخاص بالطابعة',
    printerModelLabel: 'موديل الطابعة', printerPaperLabel: 'عرض ورق الطابعة', printerSaveBtn: 'حفظ الإعدادات',
    printerSavedOk: 'تم حفظ إعدادات الطابعة ✓', printerIpInvalid: 'عنوان IP غير صحيح',
    printerTestBtn: 'اختبار الاتصال بالطابعة', printerTesting: 'جارٍ اختبار الاتصال…',
    printerTestOk: ms => `نجح الاتصال بالطابعة ✓ (${ms} مللي ثانية)`,
    printerEnvApp: 'تطبيق مثبّت (PWA)', printerEnvBrowser: 'متصفح Safari (تبويب عادي)',
    printerTestEnv: (env, proto) => `بيئة التشغيل: ${env} — البروتوكول: ${proto}`,
    printerTestPrintBtn: 'طباعة صفحة اختبار (نص إنجليزي فقط)',
    printerOpenPageBtn: 'افتح صفحة الطابعة', printerOpenPageSub: 'اضغط هذا أولاً في كل جلسة متصفح جديدة (وليس داخل التطبيق المثبَّت) على iOS',
    printExpiryLabel: 'مدة صلاحية الكوبون', printExpiryDays: n => `${n} ${n === 1 ? 'يوم' : 'أيام'}`,
    printPreviewLabel: 'معاينة شكل الكوبون', printCouponCode: 'كود الكوبون',
    printIssueDate: 'تاريخ الإصدار', printValidUntil: 'صالح حتى',
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
    splitPayCash: 'Cash', splitPayNetwork: 'Network', splitPayPending: 'Pending',
    balance: 'Balance', balanceSubtitle: 'Count the drawer cash and network devices, compare against the register report',
    balCashGroup: 'Drawer Cash Count',
    balCashGroupSub: '"Full" is the basis of the accounting calculation (Net Cash = Full − Float Amount − Cancelled Amount). Counting "Final" and "Float" is optional, for verification only, and does not affect the calculation',
    balCashMode_full: 'Full Cash', balCashMode_final: 'Final Cash (for deposit)', balCashMode_custody: 'Float Cash',
    balCustodyTarget: 'Fixed Float Amount', balCustodyTargetHint: 'Count the float cash above to compare it to this amount (verification only, not part of the calculation)',
    balFinalCheckHint: 'Count the final cash above to compare it to the calculated net cash (verification only, not part of the calculation)',
    balDeductionsTitle: 'Deductions from Full Cash', balCancelled: 'Cancelled Amount',
    balCashForBank: 'Cash Delivered to Bank', balCustodyInDrawer: 'Float Amount in Drawer',
    balNetworkGroup: 'POS Devices (Network)',
    balDevice: n => `Device ${n}`, balAddDevice: 'Add Device', balRemoveDevice: 'Remove Device',
    balVisa: 'Visa', balMastercard: 'Mastercard', balMada: 'Mada',
    balReportGroup: 'Register Report', balReportSub: 'Enter the numbers as printed on the closing report',
    balReportSales: 'Total Sales', balReportCash: 'Total Cash', balReportNetwork: 'Total Network',
    balNoteUnit: n => `${n} SAR`, balNoteCountUnit: 'notes',
    balSummaryTitle: 'Balance Summary', balActiveField: 'Active Field',
    balNetCash: 'Net Cash Sales', balCalcNetwork: 'Calculated Network Total',
    balCashCompare: 'Cash Comparison', balNetworkCompare: 'Network Comparison', balSalesCompare: 'Total Comparison',
    balTotalCompareNote: '(Cash comparison + Network comparison)',
    balShort: 'Short', balOver: 'Over', balMatch: 'Matched',
    balDiffAmt: n => `${n} SAR`,
    balReset: 'New Balance', balNoDeviceRemove: 'At least one device must remain',
    balSelectField: 'Tap any field above, then use the keypad to fill it in',
    balReportCheck: 'Report Figures Check',
    balReportCheckSub: 'Difference between "Total Sales" and "Cash + Network" on the same register report — any gap here is usually a data-entry mistake, not an actual shortage',
    balReportOk: 'Matched', balReportMismatch: 'Entry Mismatch',
    balExport: 'Export', balImport: 'Restore', balPrint: 'Print',
    balPrintTitle: 'Balance Report',
    balExportOk: 'Balance exported ✓', balImportOk: 'Balance restored ✓', balImportErr: 'Invalid file',
    settingsUpdate: 'System Update',
    updateAppLabel: 'Update Browser & Code', updateAppSub: 'Clears the cache and downloads the latest version of the site code',
    updateAppBtn: 'Update Now', updatingApp: 'Updating...',
    updateAppDone: 'Updated ✓', updateAppOk: 'Cache cleared, reloading...',
    updateAppNothing: 'No cache stored — just reloading...',
    updateAppErr: 'Update failed, try again',
    printing: 'Printing', printingSubtitle: 'Print discount coupons and customer messages on the receipt printer',
    printCouponTitle: 'Discount Coupon', printPctLabel: 'Discount Percentage', printNameLabel: 'Discount Name',
    printCouponBtn: 'Print Coupon', printSelectPctFirst: 'Select a discount percentage first',
    printCouponSub: (pct, name) => `${pct}% — ${name}`,
    printMsgTitle: 'Customer Message', printPresetLabel: 'Quick Messages', printCustomLabel: 'Or write a custom message',
    printCustomPlaceholder: 'Type your message here...', printMsgBtn: 'Print Message',
    printConnecting: 'Connecting to printer...', printSending: 'Printing...',
    printDone: 'Printed ✓', printFailed: 'Print failed',
    printerLibMissing: 'Printer library not loaded',
    printerSettingsTitle: 'Printer Settings', printerIpLabel: 'Printer IP Address',
    printerModelLabel: 'Printer Model', printerPaperLabel: 'Paper Width', printerSaveBtn: 'Save Settings',
    printerSavedOk: 'Printer settings saved ✓', printerIpInvalid: 'Invalid IP address',
    printerTestBtn: 'Test Printer Connection', printerTesting: 'Testing connection…',
    printerTestOk: ms => `Connected to printer ✓ (${ms} ms)`,
    printerEnvApp: 'Installed app (PWA)', printerEnvBrowser: 'Safari browser (regular tab)',
    printerTestEnv: (env, proto) => `Runtime: ${env} — Protocol: ${proto}`,
    printerTestPrintBtn: 'Print Test Page (English text only)',
    printerOpenPageBtn: 'Open Printer Page', printerOpenPageSub: 'Tap this first each new browser session (not inside the installed app) on iOS',
    printExpiryLabel: 'Coupon Validity', printExpiryDays: n => `${n} day${n === 1 ? '' : 's'}`,
    printPreviewLabel: 'Coupon Preview', printCouponCode: 'Coupon Code',
    printIssueDate: 'Issue Date', printValidUntil: 'Valid Until',
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
  _setText('t-balance',   t('balance'));
  _setText('t-printing',  t('printing'));
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
    case 'balance':  _renderBalance();  break;
    case 'printing': _renderPrinting(); break;
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

function _splitPersonCard(idx, amount, extra) {
  const pay = _splitPayments[idx] || null;
  return `<div class="split-person-card ${extra ? 'split-person-card--extra' : ''} ${pay ? 'split-person-card--paid' : ''}">
    <div class="split-person-num">${tf('splitPersonLabel', idx)}</div>
    <div class="split-person-amt">${amount}<span>${t('sar')}</span></div>
    <div class="split-pay-toggle">
      <button class="split-pay-btn split-pay-btn--cash ${pay === 'cash' ? 'split-pay-btn--active' : ''}" onclick="cSplitSetPayment(${idx}, 'cash')">
        <i class="fa-solid fa-money-bill-wave"></i> ${t('splitPayCash')}
      </button>
      <button class="split-pay-btn split-pay-btn--network ${pay === 'network' ? 'split-pay-btn--active' : ''}" onclick="cSplitSetPayment(${idx}, 'network')">
        <i class="fa-solid fa-wifi"></i> ${t('splitPayNetwork')}
      </button>
    </div>
  </div>`;
}

function _splitResultHtml(r) {
  const breakdown = tf('splitBreakdown', r.extraCount, r.extra, r.baseCount, r.base);

  const people = [];
  let idx = 1;
  for (let i = 0; i < r.extraCount; i++, idx++) people.push({ idx, amount: r.extra, extra: true });
  for (let i = 0; i < r.baseCount;  i++, idx++) people.push({ idx, amount: r.base,  extra: false });

  const cardsHtml = people.map(p => _splitPersonCard(p.idx, p.amount, p.extra)).join('');

  let cashTotal = 0, networkTotal = 0, cashCount = 0, networkCount = 0, pendingCount = 0;
  people.forEach(p => {
    const pay = _splitPayments[p.idx];
    if (pay === 'cash')         { cashTotal    += p.amount; cashCount++; }
    else if (pay === 'network') { networkTotal += p.amount; networkCount++; }
    else pendingCount++;
  });

  return `
    <div class="split-summary">
      <div class="split-summary-row">
        <span class="split-summary-total">${tf('splitTotalLabel', r.amount)}</span>
        <span class="split-summary-people">${tf('splitPeopleShort', r.people)}</span>
      </div>
      <div class="split-summary-breakdown">${breakdown}</div>
    </div>
    <div class="split-people-grid">${cardsHtml}</div>
    <div class="split-pay-summary">
      <div class="split-pay-summary-row">
        <span><i class="fa-solid fa-money-bill-wave"></i> ${t('splitPayCash')} · ${cashCount}</span>
        <b>${cashTotal} ${t('sar')}</b>
      </div>
      <div class="split-pay-summary-row">
        <span><i class="fa-solid fa-wifi"></i> ${t('splitPayNetwork')} · ${networkCount}</span>
        <b>${networkTotal} ${t('sar')}</b>
      </div>
      ${pendingCount > 0 ? `
      <div class="split-pay-summary-row split-pay-summary-row--pending">
        <span><i class="fa-solid fa-circle-exclamation"></i> ${t('splitPayPending')}</span>
        <b>${pendingCount}</b>
      </div>` : ''}
    </div>
    <button class="split-reset-btn" onclick="cSplitReset()">
      <i class="fa-solid fa-rotate-right"></i> ${t('splitReset')}
    </button>`;
}

function cSplitSetPayment(idx, method) {
  if (_splitPayments[idx] === method) delete _splitPayments[idx];
  else _splitPayments[idx] = method;
  _renderSplit();
}
window.cSplitSetPayment = cSplitSetPayment;

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
  _splitPayments = {};
  _renderSplit();
}
window.cSplitCalc = cSplitCalc;

function cSplitReset() {
  _splitPeople = ''; _splitAmount = ''; _splitResult = null; _splitField = 'people'; _splitPayments = {};
  _renderSplit();
}
window.cSplitReset = cSplitReset;

/* ══════════ TAB — الموازنة ══════════ */
function _balGet(id) {
  if (id === 'custodyTarget') return _bal.custodyTarget;
  if (id === 'cancelled') return _bal.cancelled;
  if (id.startsWith('cash:')) {
    const [, mode, d] = id.split(':');
    return _bal.cash[mode]?.[d] || '';
  }
  if (id.startsWith('dev:')) {
    const [, idx, key] = id.split(':');
    return _bal.devices[+idx]?.[key] || '';
  }
  if (id.startsWith('rep:')) return _bal.report[id.slice(4)] || '';
  return '';
}

function _balSet(id, val) {
  if (id === 'custodyTarget') { _bal.custodyTarget = val; return; }
  if (id === 'cancelled') { _bal.cancelled = val; return; }
  if (id.startsWith('cash:')) {
    const [, mode, d] = id.split(':');
    if (_bal.cash[mode]) _bal.cash[mode][d] = val;
    return;
  }
  if (id.startsWith('dev:')) {
    const [, idx, key] = id.split(':');
    if (_bal.devices[+idx]) _bal.devices[+idx][key] = val;
    return;
  }
  if (id.startsWith('rep:')) { _bal.report[id.slice(4)] = val; return; }
}

function _balCashModeTotal(mode) {
  return BAL_DENOMS.reduce((s, d) => s + d * (parseInt(_bal.cash[mode][d], 10) || 0), 0);
}
function _balCashModeHasEntries(mode) {
  return BAL_DENOMS.some(d => (parseInt(_bal.cash[mode][d], 10) || 0) > 0);
}

function _computeBalance() {
  const fullTotal    = _balCashModeTotal('full');
  const finalTotal   = _balCashModeTotal('final');
  const custodyTotal = _balCashModeTotal('custody');
  const hasFull    = _balCashModeHasEntries('full');
  const hasFinal   = _balCashModeHasEntries('final');
  const hasCustody = _balCashModeHasEntries('custody');

  const custodyTarget = parseInt(_bal.custodyTarget, 10) || 0;
  const cancelled     = parseInt(_bal.cancelled, 10) || 0;

  /* الحساب المحاسبي الرسمي الوحيد: صافي مبيعات الكاش = النقود الكاملة −
     مبلغ العهدة المحدد − المبلغ الملغى (كنسل، ليس مبيعات فعلية). عدّ
     "النقود النهائية" و"نقود العهدة" أدوات تحقّق اختيارية للموظف فقط
     (هل ما جهّزته يطابق المتوقع؟) ولا تُغيّران هذا الحساب مطلقاً. */
  const netCash = fullTotal - custodyTarget - cancelled;

  /* تحقق اختياري: هل عهدة الدرج المعدودة فعلياً تطابق المبلغ الثابت المحدد؟ */
  const custodyTargetDiff = hasCustody ? (custodyTotal - custodyTarget) : null;
  /* تحقق اختياري: هل النقود النهائية المعدودة (للإيداع) تطابق صافي الكاش المحسوب؟ */
  const finalCheckDiff = hasFinal ? (finalTotal - netCash) : null;

  const totalNetwork  = _bal.devices.reduce((s, dv) =>
    s + (parseInt(dv.visa, 10) || 0) + (parseInt(dv.mc, 10) || 0) + (parseInt(dv.mada, 10) || 0), 0);
  const reportSales   = parseInt(_bal.report.sales,   10) || 0;
  const reportCash    = parseInt(_bal.report.cash,    10) || 0;
  const reportNetwork = parseInt(_bal.report.network, 10) || 0;
  const cashDiff    = netCash - reportCash;
  const networkDiff = totalNetwork - reportNetwork;
  return {
    fullTotal, finalTotal, custodyTotal, hasFull, hasFinal, hasCustody,
    custodyTarget, custodyTargetDiff, finalCheckDiff, cancelled,
    netCash, totalNetwork,
    reportSales, reportCash, reportNetwork,
    cashDiff, networkDiff,
    /* الفرق الإجمالي = فرق الكاش + فرق الشبكة فقط — وليس مقارنة مستقلة بحقل "إجمالي المبيعات" */
    totalDiff: cashDiff + networkDiff,
    /* تحقق داخلي: هل "إجمالي المبيعات" في التقرير يساوي (كاش التقرير + شبكة التقرير) في نفس التقرير؟ */
    reportCheckDiff: reportSales - (reportCash + reportNetwork),
  };
}

function _balDiffBadge(diff) {
  const cls = diff === 0 ? 'bal-badge--match' : (diff > 0 ? 'bal-badge--over' : 'bal-badge--short');
  const label = diff === 0 ? t('balMatch') : (diff > 0 ? t('balOver') : t('balShort'));
  return `<span class="bal-badge ${cls}">${label}${diff !== 0 ? ` · ${tf('balDiffAmt', Math.abs(diff))}` : ''}</span>`;
}

function _balCheckBadge(diff) {
  if (diff === 0) return `<span class="bal-badge bal-badge--match">${t('balReportOk')}</span>`;
  return `<span class="bal-badge bal-badge--short">${t('balReportMismatch')} · ${tf('balDiffAmt', Math.abs(diff))}</span>`;
}

function _balFieldTile(id, label, unit) {
  const val = _balGet(id);
  const active = _balField === id ? 'bal-field--active' : '';
  return `<button class="bal-field ${active}" onclick="cBalSetField('${id}')">
    <span class="bal-field-label">${label}</span>
    <span class="bal-field-value">${val || '0'}${unit ? ` <span class="bal-field-unit">${unit}</span>` : ''}</span>
  </button>`;
}

function _balDenomTile(mode, d) {
  const id = `cash:${mode}:${d}`;
  const raw   = _bal.cash[mode][d];
  const count = parseInt(raw, 10) || 0;
  const amount = count * d;
  const active = _balField === id ? 'bal-field--active' : '';
  return `<button class="bal-field bal-field--denom ${active}" onclick="cBalSetField('${id}')">
    <span class="bal-field-label">${tf('balNoteUnit', d)}</span>
    <span class="bal-field-value">${raw || '0'} <span class="bal-field-unit">${t('balNoteCountUnit')}</span></span>
    <span class="bal-field-sub">${count > 0 ? `= ${tf('balDiffAmt', amount)}` : '—'}</span>
  </button>`;
}

/* زر أعلى الصفحة لأحد عمليات عدّ النقود الثلاث — الضغط عليه يفتح شبكة
   عدّ فئاته أسفله (زر واحد نشط في كل مرة). */
function _balCashTabBtn(mode, icon) {
  const total = _balCashModeTotal(mode);
  const has = _balCashModeHasEntries(mode);
  const active = _balCashTab === mode ? 'bal-cash-tab--active' : '';
  return `<button class="bal-cash-tab ${active}" onclick="cBalSetCashTab('${mode}')">
    <span class="bal-cash-tab-label">
      <i class="fa-solid ${icon}"></i> ${t('balCashMode_' + mode)}
      ${has ? '<i class="fa-solid fa-circle-check bal-cash-tab-check"></i>' : ''}
    </span>
    <span class="bal-cash-tab-value">${tf('balDiffAmt', total)}</span>
  </button>`;
}

function _renderBalance() {
  const el = document.getElementById('balance-content');
  if (!el) return;

  const r = _computeBalance();

  const cashTabs = _balCashTabBtn('full', 'fa-layer-group')
    + _balCashTabBtn('final', 'fa-building-columns')
    + _balCashTabBtn('custody', 'fa-vault');

  const deductionsHtml = `
  <div class="bal-cash-deductions">
    <div class="bal-cash-deductions-title"><i class="fa-solid fa-minus"></i> ${t('balDeductionsTitle')}</div>
    <div class="bal-cash-deductions-fields">
      ${_balFieldTile('custodyTarget', t('balCustodyTarget'), t('sar'))}
      ${_balFieldTile('cancelled',     t('balCancelled'),     t('sar'))}
    </div>
  </div>`;

  /* شريط تحقّق اختياري يظهر فقط أسفل تبويبي "نهائية"/"عهدة" — لا يظهر
     تحت "كاملة" لأنها أساس الحساب نفسه وليست عملية تحقّق. */
  const activeCheckHtml = _balCashTab === 'final'
    ? `<div class="bal-cash-section-check">${r.hasFinal ? _balDiffBadge(r.finalCheckDiff) : ''}<span class="bal-check-sub">${t('balFinalCheckHint')}</span></div>`
    : (_balCashTab === 'custody'
      ? `<div class="bal-cash-section-check">${r.hasCustody ? _balDiffBadge(r.custodyTargetDiff) : ''}<span class="bal-check-sub">${t('balCustodyTargetHint')}</span></div>`
      : '');

  const activeDenomGrid = `<div class="bal-denom-grid">${BAL_DENOMS.map(d => _balDenomTile(_balCashTab, d)).join('')}</div>`;

  const deviceCards = _bal.devices.map((dv, i) => `
    <div class="bal-device-card">
      <div class="bal-device-head">
        <span class="bal-device-title"><i class="fa-solid fa-credit-card"></i> ${tf('balDevice', i + 1)}</span>
        ${_bal.devices.length > 1
          ? `<button class="bal-device-remove" onclick="cBalRemoveDevice(${i})" title="${t('balRemoveDevice')}"><i class="fa-solid fa-xmark"></i></button>`
          : ''}
      </div>
      <div class="bal-device-fields">
        ${_balFieldTile(`dev:${i}:visa`,  t('balVisa'),       t('sar'))}
        ${_balFieldTile(`dev:${i}:mc`,    t('balMastercard'), t('sar'))}
        ${_balFieldTile(`dev:${i}:mada`,  t('balMada'),       t('sar'))}
      </div>
    </div>`).join('');

  const activeLabel = _balFieldLabel(_balField);
  const activeDenomMatch = _balField.startsWith('cash:') ? _balField.split(':') : null;
  const activeDenom = activeDenomMatch ? parseInt(activeDenomMatch[2], 10) : null;
  const activeDenomAmt = activeDenom !== null ? (parseInt(_balGet(_balField), 10) || 0) * activeDenom : null;

  const html = `
  <div class="section-head">
    <div class="section-head-icon"><i class="fa-solid fa-cash-register"></i></div>
    <div class="section-head-text">
      <div class="section-head-title">${t('balance')}</div>
      <div class="section-head-sub">${t('balanceSubtitle')}</div>
    </div>
    <div class="bal-head-actions">
      <button class="bal-head-btn" id="bal-print-btn" onclick="cBalPrint()">
        <i class="fa-solid fa-print"></i> <span><div>${t('balPrint')}</div></span>
      </button>
      <button class="bal-head-btn" onclick="cBalExport()">
        <i class="fa-solid fa-file-export"></i> ${t('balExport')}
      </button>
      <button class="bal-head-btn" onclick="cBalImportClick()">
        <i class="fa-solid fa-file-import"></i> ${t('balImport')}
      </button>
      <input type="file" id="bal-import-input" accept="application/json,.json" class="bal-import-input" onchange="cBalImportFile(this)">
    </div>
  </div>

  <div class="bal-layout">
    <div class="bal-fields-col">

      <div class="bal-group">
        <div class="bal-group-title"><i class="fa-solid fa-sack-dollar"></i> ${t('balCashGroup')}</div>
        <div class="bal-group-sub">${t('balCashGroupSub')}</div>
        <div class="bal-cash-tabs">${cashTabs}</div>
        ${deductionsHtml}
        ${activeCheckHtml}
        ${activeDenomGrid}
      </div>

      <div class="bal-group">
        <div class="bal-group-title"><i class="fa-solid fa-wifi"></i> ${t('balNetworkGroup')}</div>
        <div class="bal-devices-list">${deviceCards}</div>
        <button class="bal-add-device-btn" onclick="cBalAddDevice()">
          <i class="fa-solid fa-plus"></i> ${t('balAddDevice')}
        </button>
      </div>

      <div class="bal-group">
        <div class="bal-group-title"><i class="fa-solid fa-receipt"></i> ${t('balReportGroup')}</div>
        <div class="bal-group-sub">${t('balReportSub')}</div>
        <div class="bal-report-grid">
          ${_balFieldTile('rep:sales',   t('balReportSales'),   t('sar'))}
          ${_balFieldTile('rep:cash',    t('balReportCash'),    t('sar'))}
          ${_balFieldTile('rep:network', t('balReportNetwork'), t('sar'))}
        </div>
        <div class="bal-check-row">
          <div class="bal-check-text">
            <span class="bal-check-title">${t('balReportCheck')}</span>
            <span class="bal-check-sub">${t('balReportCheckSub')}</span>
          </div>
          ${_balCheckBadge(r.reportCheckDiff)}
        </div>
      </div>

    </div>

    <div class="bal-side-col">
      <div class="bal-numpad-panel">
        <div class="bal-active-field">
          <span class="bal-active-field-label">${t('balActiveField')}</span>
          <span class="bal-active-field-name">${activeLabel}</span>
          ${activeDenomAmt !== null ? `<span class="bal-active-field-amt">= ${tf('balDiffAmt', activeDenomAmt)}</span>` : ''}
        </div>
        <div class="bal-numpad">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="bal-key" onclick="cBalKey('${n}')">${n}</button>`).join('')}
          <button class="bal-key bal-key--action" onclick="cBalClear()" title="${t('splitReset')}"><i class="fa-solid fa-rotate-left"></i></button>
          <button class="bal-key" onclick="cBalKey('0')">0</button>
          <button class="bal-key bal-key--action" onclick="cBalBackspace()"><i class="fa-solid fa-delete-left"></i></button>
        </div>
        <p class="bal-hint">${t('balSelectField')}</p>
      </div>

      <div class="bal-summary-panel">
        <div class="bal-summary-title">${t('balSummaryTitle')}</div>
        <div class="bal-summary-row"><span>${t('balCashMode_full')}</span><b>${tf('balDiffAmt', r.fullTotal)}</b></div>
        <div class="bal-summary-row"><span>− ${t('balCustodyTarget')}</span><b>${tf('balDiffAmt', r.custodyTarget)}</b></div>
        ${r.cancelled > 0 ? `<div class="bal-summary-row"><span>− ${t('balCancelled')}</span><b>${tf('balDiffAmt', r.cancelled)}</b></div>` : ''}
        <div class="bal-summary-row bal-summary-row--total">
          <span>${t('balNetCash')}</span>
          <b>${tf('balDiffAmt', r.netCash)}</b>
        </div>
        <div class="bal-summary-row bal-summary-row--total"><span>${t('balCalcNetwork')}</span><b>${tf('balDiffAmt', r.totalNetwork)}</b></div>

        <div class="bal-compare-row">
          <span>${t('balCashCompare')}</span>
          ${_balDiffBadge(r.cashDiff)}
        </div>
        <div class="bal-compare-row">
          <span>${t('balNetworkCompare')}</span>
          ${_balDiffBadge(r.networkDiff)}
        </div>
        <div class="bal-compare-row">
          <span class="bal-compare-label-wrap">
            <span>${t('balSalesCompare')}</span>
            <span class="bal-compare-note">${t('balTotalCompareNote')}</span>
          </span>
          ${_balDiffBadge(r.totalDiff)}
        </div>
      </div>

      <button class="split-reset-btn" onclick="cBalReset()">
        <i class="fa-solid fa-rotate-right"></i> ${t('balReset')}
      </button>
    </div>
  </div>`;

  el.innerHTML = html;
}

function _balFieldLabel(id) {
  if (id === 'custodyTarget') return t('balCustodyTarget');
  if (id === 'cancelled') return t('balCancelled');
  if (id.startsWith('cash:')) {
    const [, mode, d] = id.split(':');
    return `${t('balCashMode_' + mode)} — ${tf('balNoteUnit', d)}`;
  }
  if (id.startsWith('dev:')) {
    const [, idx, key] = id.split(':');
    const names = { visa: t('balVisa'), mc: t('balMastercard'), mada: t('balMada') };
    return `${tf('balDevice', +idx + 1)} — ${names[key]}`;
  }
  if (id.startsWith('rep:')) {
    const names = { sales: t('balReportSales'), cash: t('balReportCash'), network: t('balReportNetwork') };
    return names[id.slice(4)];
  }
  return '';
}

function cBalSetField(id) { _balField = id; _renderBalance(); }
window.cBalSetField = cBalSetField;

function cBalKey(d) {
  const cur = _balGet(_balField);
  if (cur.length >= 7) return;
  _balSet(_balField, (cur === '0' ? '' : cur) + d);
  _renderBalance();
}
window.cBalKey = cBalKey;

function cBalBackspace() {
  const cur = _balGet(_balField);
  _balSet(_balField, cur.slice(0, -1));
  _renderBalance();
}
window.cBalBackspace = cBalBackspace;

function cBalClear() {
  _balSet(_balField, '');
  _renderBalance();
}
window.cBalClear = cBalClear;

function cBalAddDevice() {
  _bal.devices.push({ visa: '', mc: '', mada: '' });
  _balField = `dev:${_bal.devices.length - 1}:visa`;
  _renderBalance();
}
window.cBalAddDevice = cBalAddDevice;

function cBalRemoveDevice(idx) {
  if (_bal.devices.length <= 1) { cToast(t('balNoDeviceRemove'), 'warn'); return; }
  _bal.devices.splice(idx, 1);
  if (_balField.startsWith('dev:')) _balField = BAL_FIELD_DEFAULT;
  _renderBalance();
}
window.cBalRemoveDevice = cBalRemoveDevice;

function cBalReset() {
  _bal = _balDefaultState();
  _balField = BAL_FIELD_DEFAULT;
  _balCashTab = 'full';
  _renderBalance();
}
window.cBalReset = cBalReset;

function cBalSetCashTab(mode) {
  _balCashTab = mode;
  if (_balField.startsWith('cash:')) _balField = `cash:${mode}:1`;
  _renderBalance();
}
window.cBalSetCashTab = cBalSetCashTab;

function _balDateStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

function cBalExport() {
  const payload = { type: 'duo-balance', version: 1, exportedAt: new Date().toISOString(), data: _bal };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `موازنة-${_balDateStamp()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  cToast(t('balExportOk'), 'ok');
}
window.cBalExport = cBalExport;

function cBalImportClick() {
  const input = document.getElementById('bal-import-input');
  if (input) input.click();
}
window.cBalImportClick = cBalImportClick;

function cBalImportFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const data = parsed && typeof parsed === 'object' && parsed.data ? parsed.data : parsed;
      if (!data || typeof data !== 'object' || !data.devices || !data.report || (!data.cash && !data.denoms)) {
        throw new Error('invalid balance file');
      }
      const cash = {};
      BAL_CASH_MODES.forEach(mode => {
        const src = data.cash?.[mode]
          /* توافق مع ملفات موازنة قديمة (denoms بلا أوضاع متعددة) — تُستورد كـ "نقود كاملة" فقط */
          ?? (mode === 'full' ? data.denoms : null);
        const denoms = _balEmptyDenoms();
        BAL_DENOMS.forEach(d => { denoms[d] = String(src?.[d] ?? ''); });
        cash[mode] = denoms;
      });
      const devices = Array.isArray(data.devices) && data.devices.length
        ? data.devices.map(dv => ({
            visa: String(dv?.visa ?? ''), mc: String(dv?.mc ?? ''), mada: String(dv?.mada ?? ''),
          }))
        : [{ visa: '', mc: '', mada: '' }, { visa: '', mc: '', mada: '' }];
      _bal = {
        cash,
        custodyTarget: String(data.custodyTarget ?? data.custody ?? '500'),
        cancelled: String(data.cancelled ?? ''),
        devices,
        report: {
          sales:   String(data.report?.sales   ?? ''),
          cash:    String(data.report?.cash    ?? ''),
          network: String(data.report?.network ?? ''),
        },
      };
      _balField = BAL_FIELD_DEFAULT;
      _balCashTab = 'full';
      _renderBalance();
      cToast(t('balImportOk'), 'ok');
    } catch (e) {
      cToast(t('balImportErr'), 'err');
    }
    input.value = '';
  };
  reader.readAsText(file);
}
window.cBalImportFile = cBalImportFile;

/* ══════════ TAB — الطباعة ══════════ */
function _genCouponCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; /* بلا أحرف/أرقام متشابهة (I, O, 0, 1) */
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return 'DUO-' + code;
}

/* calendar:'gregory' إلزامي — لغة ar-SA تتحول تلقائياً للتقويم الهجري (أم القرى)
   في أغلب المتصفحات إن لم يُفرض التقويم الميلادي صراحة. */
function _fmtDate(d) {
  return d.toLocaleDateString(_lang === 'ar' ? 'ar-SA' : 'en-GB',
    { day: '2-digit', month: '2-digit', year: 'numeric', calendar: 'gregory' });
}
function _fmtDateTime(d) {
  return d.toLocaleString(_lang === 'ar' ? 'ar-SA' : 'en-GB',
    { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', calendar: 'gregory' });
}

function _couponDates() {
  const issue  = new Date();
  const expiry = new Date(issue.getTime() + _selExpiry * 86400000);
  return { issue, expiry };
}

function _renderPrinting() {
  const el = document.getElementById('printing-content');
  if (!el) return;

  if (!_couponCode) _couponCode = _genCouponCode();

  const pctChips = DISCOUNT_PERCENTS.map(p =>
    `<button class="pct-chip ${_selPct === p ? 'pct-chip--active' : ''}" onclick="cSelectDiscountPct(${p})">${p}%</button>`
  ).join('');

  const nameOptions = DISCOUNT_NAMES.map(n =>
    `<option value="${_esc(n)}" ${n === _selDName ? 'selected' : ''}>${_esc(n)}</option>`
  ).join('');

  const expiryChips = COUPON_EXPIRY_DAYS.map(n =>
    `<button class="pct-chip ${_selExpiry === n ? 'pct-chip--active' : ''}" onclick="cSelectExpiry(${n})">${tf('printExpiryDays', n)}</button>`
  ).join('');

  const presetChips = MESSAGE_PRESETS.map((m, idx) =>
    `<button class="msg-preset ${m === _msgText ? 'msg-preset--active' : ''}" onclick="cFillMsgPreset(${idx})">${_esc(m)}</button>`
  ).join('');

  const pCfg = DuoPrinter.getConfig();
  const modelOptions = DuoPrinter.getSupportedModels().map(m =>
    `<option value="${_esc(m)}" ${m === pCfg.model ? 'selected' : ''}>${_esc(m)}</option>`
  ).join('');
  const paperOptions = DuoPrinter.getSupportedPaperWidths().map(p =>
    `<option value="${p.value}" ${p.value === pCfg.paperWidth ? 'selected' : ''}>${_esc(p.label)}</option>`
  ).join('');

  const settingsPopover = _printerSettingsOpen ? `
  <div class="printer-settings-popover">
    <div class="set-card-title"><i class="fa-solid fa-gear"></i> ${t('printerSettingsTitle')}</div>
    <div class="print-body">
      <div class="print-field-label">${t('printerIpLabel')}</div>
      <input class="set-input" id="printer-ip-input" type="text" inputmode="decimal"
        placeholder="192.168.0.147" value="${_esc(pCfg.ip)}">

      <div class="print-field-label">${t('printerModelLabel')}</div>
      <select class="set-input" id="printer-model-input">${modelOptions}</select>

      <div class="print-field-label">${t('printerPaperLabel')}</div>
      <select class="set-input" id="printer-paper-input">${paperOptions}</select>

      <button class="print-action-btn" id="printer-settings-save-btn" onclick="cSavePrinterSettings()">
        <i class="fa-solid fa-check"></i>
        <span><div>${t('printerSaveBtn')}</div></span>
      </button>

      <button class="print-action-btn" id="printer-test-btn" onclick="cTestPrinterConnection()">
        <i class="fa-solid fa-satellite-dish"></i>
        <span><div>${t('printerTestBtn')}</div></span>
      </button>

      <button class="print-action-btn" onclick="cOpenPrinterPage()">
        <i class="fa-solid fa-arrow-up-right-from-square"></i>
        <span>
          <div>${t('printerOpenPageBtn')}</div>
          <small>${t('printerOpenPageSub')}</small>
        </span>
      </button>

      <button class="print-action-btn" id="printer-test-print-btn" onclick="cTestPrinterPrint()">
        <i class="fa-solid fa-file"></i>
        <span><div>${t('printerTestPrintBtn')}</div></span>
      </button>
    </div>
  </div>` : '';

  const { issue, expiry } = _couponDates();

  el.innerHTML = `
  ${_printerSettingsOpen ? `<div class="popover-backdrop" onclick="cTogglePrinterSettings()"></div>` : ''}

  <div class="section-head">
    <div class="section-head-icon"><i class="fa-solid fa-print"></i></div>
    <div class="section-head-text">
      <div class="section-head-title">${t('printing')}</div>
      <div class="section-head-sub">${t('printingSubtitle')}</div>
    </div>
    <div class="printer-settings-wrap">
      <button class="section-head-btn ${_printerSettingsOpen ? 'is-active' : ''}" onclick="cTogglePrinterSettings()" title="${t('printerSettingsTitle')}">
        <i class="fa-solid fa-gear"></i>
      </button>
      ${settingsPopover}
    </div>
  </div>

  <!-- كوبون خصم -->
  <div class="set-card">
    <div class="set-card-title"><i class="fa-solid fa-percent"></i> ${t('printCouponTitle')}</div>
    <div class="coupon-layout">
      <div class="print-body">
        <div class="print-field-label">${t('printPctLabel')}</div>
        <div class="pct-chip-row">${pctChips}</div>

        <div class="print-field-label">${t('printNameLabel')}</div>
        <select class="set-input" onchange="cSelectDiscountName(this.value)">${nameOptions}</select>

        <div class="print-field-label">${t('printExpiryLabel')}</div>
        <div class="pct-chip-row">${expiryChips}</div>

        <button class="print-action-btn" id="print-coupon-btn" onclick="cPrintCoupon()" ${_selPct ? '' : 'disabled'}>
          <i class="fa-solid fa-print"></i>
          <span>
            <div>${t('printCouponBtn')}</div>
            <small>${_selPct ? tf('printCouponSub', _selPct, _selDName) : t('printSelectPctFirst')}</small>
          </span>
        </button>
      </div>

      <div class="coupon-preview">
        <div class="print-field-label"><i class="fa-solid fa-eye"></i> ${t('printPreviewLabel')}</div>
        <div class="coupon-receipt-mock">
          <div class="crm-name">${_esc(restaurantInfo.nameAr)}</div>
          <div class="crm-addr">${_esc(restaurantInfo.address)}</div>
          <div class="crm-sep"></div>
          <div class="crm-title">${t('printCouponTitle')}</div>
          <div class="crm-pct">${_selPct ? _selPct + '%' : '--%'}</div>
          <div class="crm-dname">${_esc(_selDName)}</div>
          <div class="crm-sep"></div>
          <div class="crm-code-label">${t('printCouponCode')}</div>
          <div class="crm-code">${_couponCode}</div>
          <div class="crm-sep"></div>
          <div class="crm-row"><span>${t('printIssueDate')}</span><span>${_fmtDate(issue)}</span></div>
          <div class="crm-row"><span>${t('printValidUntil')}</span><span>${_fmtDate(expiry)}</span></div>
          <div class="crm-cut"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- رسالة للعميل -->
  <div class="set-card">
    <div class="set-card-title"><i class="fa-solid fa-comment-dots"></i> ${t('printMsgTitle')}</div>
    <div class="print-body">
      <div class="print-field-label">${t('printPresetLabel')}</div>
      <div class="msg-preset-list">${presetChips}</div>

      <div class="print-field-label">${t('printCustomLabel')}</div>
      <textarea class="set-input print-textarea" id="print-msg-input"
        placeholder="${t('printCustomPlaceholder')}"
        oninput="cSetMsgText(this.value)">${_esc(_msgText)}</textarea>

      <button class="print-action-btn" id="print-message-btn" onclick="cPrintMessage()" ${_msgText.trim() ? '' : 'disabled'}>
        <i class="fa-solid fa-print"></i>
        <span><div>${t('printMsgBtn')}</div></span>
      </button>
    </div>
  </div>`;
}

function cTogglePrinterSettings() { _printerSettingsOpen = !_printerSettingsOpen; _renderPrinting(); }
window.cTogglePrinterSettings = cTogglePrinterSettings;

function cSavePrinterSettings() {
  const ipInput    = document.getElementById('printer-ip-input');
  const modelInput = document.getElementById('printer-model-input');
  const paperInput = document.getElementById('printer-paper-input');
  const ip = (ipInput?.value || '').trim();

  const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = ip.match(ipPattern);
  const valid = m && m.slice(1).every(n => Number(n) >= 0 && Number(n) <= 255);
  if (!valid) { cToast(t('printerIpInvalid'), 'err'); return; }

  DuoPrinter.setConfig({ ip, model: modelInput?.value, paperWidth: Number(paperInput?.value) || 576 });
  cToast(t('printerSavedOk'), 'ok');
  _printerSettingsOpen = false;
  _renderPrinting();
}
window.cSavePrinterSettings = cSavePrinterSettings;

/* يفتح صفحة الطابعة نفسها في تبويب متصفح عادي — على iOS، قبول شهادة SSL
   الذاتية للطابعة يُخزَّن على مستوى المتصفح نفسه ويشمل كل تبويباته، لكن
   تطبيق PWA المثبَّت على الشاشة الرئيسية يعمل في بيئة معزولة عن المتصفح لا
   تشارك هذه الثقة إطلاقاً (قيد نظام iOS، لا حل له من الإعدادات). لذلك يلزم
   من متصفح عادي (وليس PWA) زيارة هذه الصفحة مرة كل جلسة متصفح قبل الطباعة. */
function cOpenPrinterPage() {
  if (typeof DuoPrinter === 'undefined') { cToast(t('printerLibMissing'), 'err'); return; }
  window.open(DuoPrinter.getPrinterPageUrl(), '_blank');
}
window.cOpenPrinterPage = cOpenPrinterPage;

function cTestPrinterConnection() {
  const btn = document.getElementById('printer-test-btn');
  if (typeof DuoPrinter === 'undefined') { cToast(t('printerLibMissing'), 'err'); return; }
  if (btn) btn.disabled = true;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const envInfo = tf('printerTestEnv', isStandalone ? t('printerEnvApp') : t('printerEnvBrowser'), location.protocol);

  DuoPrinter.setConfig({}); // يبطل أي اتصال مخزَّن مسبقاً كي يكون الاختبار حياً وليس من الذاكرة المؤقتة
  cToast(`${t('printerTesting')} — ${envInfo}`, 'ok');
  const started = performance.now();

  const fail = (msg) => {
    if (btn) btn.disabled = false;
    cToast(`${msg} — ${envInfo}`, 'err');
  };

  DuoPrinter.connectPrinter(eposDevice => {
    DuoPrinter.createPrinterDevice(eposDevice, () => {
      const ms = Math.round(performance.now() - started);
      if (btn) btn.disabled = false;
      cToast(`${tf('printerTestOk', ms)} — ${envInfo}`, 'ok');
    }, fail);
  }, fail);
}
window.cTestPrinterConnection = cTestPrinterConnection;

function cTestPrinterPrint() {
  _printViaPrinter(_buildTestPrintBuilder(), 'printer-test-print-btn');
}
window.cTestPrinterPrint = cTestPrinterPrint;

function cSelectDiscountPct(pct) { _selPct = pct; _couponCode = _genCouponCode(); _renderPrinting(); }
window.cSelectDiscountPct = cSelectDiscountPct;

function cSelectDiscountName(name) { _selDName = name; _couponCode = _genCouponCode(); _renderPrinting(); }
window.cSelectDiscountName = cSelectDiscountName;

function cSelectExpiry(days) { _selExpiry = days; _couponCode = _genCouponCode(); _renderPrinting(); }
window.cSelectExpiry = cSelectExpiry;

function cFillMsgPreset(idx) { _msgText = MESSAGE_PRESETS[idx] || ''; _renderPrinting(); }
window.cFillMsgPreset = cFillMsgPreset;

function cSetMsgText(v) {
  _msgText = v;
  const btn = document.getElementById('print-message-btn');
  if (btn) btn.disabled = !v.trim();
}
window.cSetMsgText = cSetMsgText;

/* بناء فاتورة كوبون الخصم — رأس المطعم + النسبة + اسم الخصم + كود فريد + تاريخ الإصدار والانتهاء */
function _buildCouponBuilder(pct, name, expiryDays, code) {
  const { issue, expiry } = (() => {
    const i = new Date();
    return { issue: i, expiry: new Date(i.getTime() + expiryDays * 86400000) };
  })();

  const b = new epson.ePOSBuilder();
  /* النص يُطبع كصورة (Canvas) وليس كنص مباشر: خطوط أغلب الطابعات الحرارية
     لا تُشكِّل الحروف العربية (تطبعها منفصلة/غير متصلة)، بينما رسم النص في
     المتصفح يُنتج تشكيلاً صحيحاً للحروف دائماً بغض النظر عن دعم الطابعة. */
  DuoPrinter.addImageBlock(b, [
    { text: restaurantInfo.nameAr, size: 2, bold: true },
    { text: restaurantInfo.address, size: 1 },
    { rule: true },
    { text: 'كوبون خصم', size: 1 },
    { text: pct + '%', size: 4, bold: true },
    { text: name, size: 1 },
    { rule: true },
    { text: 'كود الكوبون', size: 1 },
    { text: code, size: 2, bold: true },
    { rule: true },
    { text: 'تاريخ الإصدار: ' + _fmtDateTime(issue), size: 1 },
    { text: 'صالح حتى: ' + _fmtDate(expiry), size: 1 },
  ]);

  b.addFeed();
  b.addCut(b.CUT_FEED);
  return b;
}

/* فاتورة اختبار بنص إنجليزي فقط (بلا addTextLang) — لعزل مشكلة دعم اللغة العربية في الطابعة */
function _buildTestPrintBuilder() {
  const b = new epson.ePOSBuilder();
  b.addTextAlign(b.ALIGN_CENTER);
  b.addTextSize(2, 2);
  b.addText('TEST PRINT\n');
  b.addTextSize(1, 1);
  b.addText('--------------------------------\n');
  b.addText(new Date().toISOString() + '\n');
  b.addText('--------------------------------\n');
  b.addFeed();
  b.addCut(b.CUT_FEED);
  return b;
}

/* بناء فاتورة رسالة نصية بسيطة للعميل */
function _buildMessageBuilder(msg) {
  const b = new epson.ePOSBuilder();
  DuoPrinter.addImageBlock(b, [
    { text: restaurantInfo.nameAr, size: 2, bold: true },
    { rule: true },
    { text: msg, size: 1 },
    { rule: true },
    { text: _fmtDateTime(new Date()), size: 1 },
  ]);

  b.addFeed();
  b.addCut(b.CUT_FEED);
  return b;
}

/* بناء تقرير الموازنة — تفاصيل الشبكة، إجمالي المبيعات، الكاش، والشبكة */
/* صفوف تفاصيل الشبكة — سطر منفصل لكل نوع شبكة بكل جهاز، بقيمة قصيرة تناسب عمود الجدول */
function _balDeviceNetworkRows() {
  const rows = [];
  _bal.devices.forEach((dv, i) => {
    const prefix = _bal.devices.length > 1 ? `${tf('balDevice', i + 1)} — ` : '';
    rows.push({ row: true, label: prefix + t('balVisa'),       value: tf('balDiffAmt', parseInt(dv.visa, 10) || 0), size: 1 });
    rows.push({ row: true, label: prefix + t('balMastercard'), value: tf('balDiffAmt', parseInt(dv.mc,   10) || 0), size: 1 });
    rows.push({ row: true, label: prefix + t('balMada'),       value: tf('balDiffAmt', parseInt(dv.mada, 10) || 0), size: 1 });
  });
  return rows;
}

/* تقرير الموازنة المطبوع — جدول تسمية/قيمة بلا أي مقارنات عجز أو فروقات،
   يعرض فقط الأرقام النهائية المطلوبة للتسليم والأرشفة. */
function _buildBalanceReceiptBuilder() {
  const r = _computeBalance();

  const b = new epson.ePOSBuilder();
  DuoPrinter.addImageBlock(b, [
    { text: restaurantInfo.nameAr, size: 2, bold: true },
    { text: t('balPrintTitle'), size: 1, bold: true },
    { text: _fmtDateTime(new Date()), size: 1 },
    { rule: true },
    { row: true, label: t('balReportSales'),  value: tf('balDiffAmt', r.reportSales),  bold: true, size: 1 },
    { row: true, label: t('balReportCash'),    value: tf('balDiffAmt', r.reportCash),    size: 1 },
    { row: true, label: t('balReportNetwork'), value: tf('balDiffAmt', r.reportNetwork), size: 1 },
    { rule: true },
    { text: t('balNetworkGroup'), size: 1, bold: true },
    ..._balDeviceNetworkRows(),
    { row: true, label: t('balCalcNetwork'), value: tf('balDiffAmt', r.totalNetwork), bold: true, size: 1 },
    { rule: true },
    { row: true, label: t('balCashForBank'),   value: tf('balDiffAmt', r.netCash),      bold: true, size: 1 },
    { row: true, label: t('balCustodyInDrawer'), value: tf('balDiffAmt', r.custodyTotal), bold: true, size: 1 },
  ]);

  b.addFeed();
  b.addCut(b.CUT_FEED);
  return b;
}

function cBalPrint() {
  _printViaPrinter(_buildBalanceReceiptBuilder(), 'bal-print-btn');
}
window.cBalPrint = cBalPrint;

/* تسلسل موحّد: اتصال → تجهيز الطابعة → إرسال، مع تغذية راجعة على الزر */
function _printViaPrinter(builder, btnId, afterSuccess) {
  if (_printBusy) return;
  if (typeof DuoPrinter === 'undefined') { cToast(t('printerLibMissing'), 'err'); return; }

  const btn = document.getElementById(btnId);
  const setBtn = (iconCls, label) => {
    if (!btn) return;
    const i = btn.querySelector('i');
    const d = btn.querySelector('div');
    if (i) i.className = `fa-solid ${iconCls}`;
    if (d) d.textContent = label;
  };

  _printBusy = true;
  if (btn) { btn.disabled = true; btn.classList.remove('is-error'); btn.classList.add('is-loading'); }
  setBtn('fa-spinner fa-spin', t('printConnecting'));

  const fail = (msg) => {
    _printBusy = false;
    if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); btn.classList.add('is-error'); }
    setBtn('fa-triangle-exclamation', t('printFailed'));
    cToast(msg || t('printFailed'), 'err');
  };

  DuoPrinter.connectPrinter(eposDevice => {
    DuoPrinter.createPrinterDevice(eposDevice, printer => {
      setBtn('fa-spinner fa-spin', t('printSending'));
      DuoPrinter.sendPrint(printer, builder, () => {
        _printBusy = false;
        btn?.classList.remove('is-loading');
        btn?.classList.add('is-success');
        setBtn('fa-check', t('printDone'));
        cToast(t('printDone'), 'ok');
        afterSuccess && afterSuccess();
        setTimeout(() => _renderPrinting(), 1400);
      }, fail);
    }, fail);
  }, fail);
}

function cPrintCoupon() {
  if (!_selPct) return;
  _printViaPrinter(
    _buildCouponBuilder(_selPct, _selDName, _selExpiry, _couponCode),
    'print-coupon-btn',
    () => { _couponCode = _genCouponCode(); }
  );
}
window.cPrintCoupon = cPrintCoupon;

function cPrintMessage() {
  const msg = _msgText.trim();
  if (!msg) return;
  _printViaPrinter(_buildMessageBuilder(msg), 'print-message-btn');
}
window.cPrintMessage = cPrintMessage;

/* ══════════ شارة عدد الأجهزة في التنقّل ══════════ */
function _updateDevBadge() {
  const badge = document.getElementById('nav-dev-badge');
  if (!badge) return;
  const online = _devices.filter(d => d.online).length;
  badge.textContent = _devices.length;
  badge.classList.toggle('has-online', online > 0);
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

  <!-- تحديث النظام -->
  <div class="set-card">
    <div class="set-card-title"><i class="fa-solid fa-cloud-arrow-down"></i> ${t('settingsUpdate')}</div>
    <button class="btn-update" id="update-app-btn" onclick="cForceUpdate()">
      <i class="fa-solid fa-arrows-rotate"></i>
      <span>
        <div>${t('updateAppLabel')}</div>
        <small>${t('updateAppSub')}</small>
      </span>
    </button>
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

async function cForceUpdate() {
  const btn = document.getElementById('update-app-btn');
  const setBtn = (iconCls, label) => {
    if (!btn) return;
    const i = btn.querySelector('i');
    const d = btn.querySelector('div');
    if (i) i.className = `fa-solid ${iconCls}`;
    if (d) d.textContent = label;
  };

  if (btn) { btn.disabled = true; btn.classList.remove('is-error'); btn.classList.add('is-loading'); }
  setBtn('fa-spinner fa-spin', t('updatingApp'));

  let clearedCaches = 0, clearedSW = 0, failed = false;
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      clearedCaches = keys.length;
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      clearedSW = regs.length;
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch (e) {
    console.warn('[Update] Cache clear error:', e);
    failed = true;
  }

  if (failed) {
    if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); btn.classList.add('is-error'); }
    setBtn('fa-triangle-exclamation', t('updateAppErr'));
    cToast(t('updateAppErr'), 'err');
    return;
  }

  btn?.classList.remove('is-loading');
  btn?.classList.add('is-success');
  setBtn('fa-check', t('updateAppDone'));
  cToast(clearedCaches || clearedSW ? t('updateAppOk') : t('updateAppNothing'), 'ok');

  setTimeout(() => window.location.reload(), 1400);
}
window.cForceUpdate = cForceUpdate;

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
        _updateDevBadge();
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

  _updateDevBadge();
  _rerenderTab();
});