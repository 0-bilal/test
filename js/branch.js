/**
 * branch.js — اختيار فرع المطعم وتحميل ملف منتجاته وأسعاره
 * ─────────────────────────────────────────────────────────
 * كل فرع له ملف منتجات خاص (نفس شكل js/products.js) — عدّل أسعار ومنتجات
 * كل فرع في ملفه فقط.
 *
 * فتح فرع معيّن على أي جهاز (مرة واحدة تكفي — الجهاز يتذكّر الفرع):
 *   index.html?branch=1      ← الفرع الأول
 *   index.html?branch=2      ← الفرع الثاني
 * نفس الشيء لـ cashier.html و dashboard.html.
 *
 * لإضافة فرع ثالث: انسخ js/products-branch2.js باسم جديد وأضف سطراً هنا.
 */
(function () {
  'use strict';

  const BRANCHES = {
    '1': {
      nameAr:   'الفرع الأول',
      products: 'js/products.js',
      qr:       'images/mobile-menu-qr.png',   // باركود منيو الجوال
    },
    '2': {
      nameAr:   'الفرع الثاني',
      products: 'js/products-branch2.js',
      qr:       '',   // ← ضع هنا صورة باركود منيو الجوال الخاص بالفرع الثاني (فارغ = يُخفى الباركود)
    },
  };

  const LS_KEY = 'duo_menu_branch';
  const LS_PAIR = 'duo_pair_branch';
  const syncName = b => 'Branch' + String(b).padStart(2, '0');
  let id = null;
  try { id = new URLSearchParams(location.search).get('branch'); } catch (e) {}
  if (id && BRANCHES[id]) {
    try {
      const prev = localStorage.getItem(LS_KEY) || '1';
      localStorage.setItem(LS_KEY, id);
      // تبديل الفرع ينقل قناة الربط معه — إلا إذا كتبها المستخدم يدوياً باسم مختلف
      const pair = localStorage.getItem(LS_PAIR);
      if (prev !== id && pair && pair === syncName(prev)) localStorage.setItem(LS_PAIR, syncName(id));
    } catch (e) {}
  } else {
    try { id = localStorage.getItem(LS_KEY); } catch (e) { id = null; }
  }
  if (!id || !BRANCHES[id]) id = '1';

  const info = Object.assign({ id }, BRANCHES[id]);
  window.DUO_BRANCH = info;
  window.DUO_BRANCHES = BRANCHES;
  // اسم قناة الربط الافتراضية (Firebase) — كل فرع منفصل تلقائياً: Branch01 / Branch02
  window.DUO_SYNC_DEFAULT = syncName(id);

  // تحميل ملف منتجات الفرع بشكل متزامن (قبل main.js / cashier.js / dashboard.js)
  document.write('<script src="' + info.products + '"><\/script>');
})();
