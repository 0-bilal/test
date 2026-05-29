/**
 * endpoints.js — مركز إدارة روابط Google Apps Script
 * ═══════════════════════════════════════════════════════════════
 *
 * ┌─ الوضع الحالي (GitHub Pages) ──────────────────────────────┐
 * │  الروابط مباشرة لـ Apps Script (مرئية في المتصفح)         │
 * └────────────────────────────────────────────────────────────┘
 *
 * ┌─ عند الانتقال للاستضافة (PHP) ─────────────────────────────┐
 * │  1. ارفع ملف /api/proxy.php على الاستضافة                  │
 * │  2. غيّر USE_PROXY = false  →  USE_PROXY = true            │
 * │  3. غيّر PROXY_URL لرابط موقعك الفعلي                      │
 * │  كل ملفات JS ستتحول تلقائياً دون أي تعديل آخر             │
 * └────────────────────────────────────────────────────────────┘
 */

(function (window) {

  // ── إعداد الوضع ────────────────────────────────────────────
  const USE_PROXY  = false;                          // ← غيّر لـ true عند رفع proxy.php
  const PROXY_URL  = 'https://yourdomain.com/api/proxy.php'; // ← رابط موقعك

  // ── روابط Apps Script المباشرة ─────────────────────────────
  // (لا تُستخدم عند USE_PROXY = true)
  const DIRECT = {
    MVR:       'https://script.google.com/macros/s/AKfycbx_POHL57HNVHzNIyprpx1nTeLVplV7teZL4FJCu1bjFVLgo4KXtU8PCJOiYlRmZQHciA/exec',
    REM:       'https://script.google.com/macros/s/AKfycbx-Wtt6Bwjd4thIxzCRa1ijepyfJKYjxLyAsOei9jvXr3xqhQre8MWZo6i-zAfdwi4t2w/exec',
    CPV:       'https://script.google.com/macros/s/AKfycbxxp3azw2izwMptP4mnXiHP60bJW8RqA6vbNRdaF7oROolvdMgjpnx5l-JoC2AgaF_2yA/exec',
    PCR:       'https://script.google.com/macros/s/AKfycbx7ILyVa_UIwK2tMnozn9WfKHgf6YHe1rdqLfxOhbEI9mMcmNx35s7CpTbBK5Y8yQIAzQ/exec',
    EDR:       'https://script.google.com/macros/s/AKfycbyFPschAXnLhXweuYS_LAQwPQZje3Cj2MbXLWa8q5ZE6JSDdYP0h4ytam8gAJqaT-r4wA/exec',
    ATT:       'https://script.google.com/macros/s/AKfycbwGpMtn5R96F1e9qbGonE_neD8X3k7_9epv2Xiflu7Aq3EKqjUDGnmuh93tDyUTamFc/exec',
    RMM:       'https://script.google.com/macros/s/AKfycbx8Y6u3MyZ647BXc0tyUb76mbcg72a4JuyFVeo548dl8utW1UKm8k0kK6rzIIC81or8/exec',
    ECL:       'https://script.google.com/macros/s/AKfycbxqxwJ5CBwjPSX-8CZSLVOSz5k7eOyd95mPOHGXXWo_Q_Gb7PgJUVizv_vTqIVqJ7CcIA/exec',
    FIL:       'https://script.google.com/macros/s/AKfycbyNsR7s7fmTsyEUarjdpoYSbO52M0cfniWjIh65EwuyUexaI15WM4yezdZ4ZgBaEYVIsg/exec',
    GENERATOR: 'https://script.google.com/macros/s/AKfycbwGpMtn5R96F1e9qbGonE_neD8X3k7_9epv2Xiflu7Aq3EKqjUDGnmuh93tDyUTamFc/exec',
  };

  /**
   * إرجاع الرابط الصحيح حسب الوضع الحالي:
   *   - USE_PROXY = false  →  رابط Apps Script المباشر
   *   - USE_PROXY = true   →  رابط proxy.php على الاستضافة
   *
   * @param {string} report  اسم التقرير: 'MVR' | 'REM' | 'CPV' | ...
   * @returns {string}
   */
  function getEndpoint(report) {
    if (USE_PROXY) return PROXY_URL;
    const url = DIRECT[report.toUpperCase()];
    if (!url) console.error('[QB Endpoints] تقرير غير معروف: ' + report);
    return url || '';
  }

  // ── الواجهة العامة ──────────────────────────────────────────
  window.QB_ENDPOINTS = {
    get:      getEndpoint,
    useProxy: USE_PROXY,

    // وصول مباشر بالاسم للراحة
    MVR:       getEndpoint('MVR'),
    REM:       getEndpoint('REM'),
    CPV:       getEndpoint('CPV'),
    PCR:       getEndpoint('PCR'),
    EDR:       getEndpoint('EDR'),
    ATT:       getEndpoint('ATT'),
    RMM:       getEndpoint('RMM'),
    ECL:       getEndpoint('ECL'),
    FIL:       getEndpoint('FIL'),
    GENERATOR: getEndpoint('GENERATOR'),
  };

})(window);
