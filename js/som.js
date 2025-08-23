// ====== إعداد: ضع هنا رابط نشر Web App (ينتهي بـ /exec) ======
const SAVE_API_URL = "https://script.google.com/macros/s/AKfycbyciXCRLrLAJFUv0T5bPdv0XkUMO7NyG7drFoUtjuN4esEvLfmUxFp69Rkox2ZOfe3_/exec";

// قراءة جلسة المستخدم لإرسال user_id
function safeSession() {
  try {
    const s = JSON.parse(localStorage.getItem("qb_session") || "{}");
    return (s && s.user_id) ? s : null;
  } catch {
    return null;
  }
}

// رقم الإصدار (اختياري لكنه مفيد للتتبّع)
function getAppVersionSafe() {
  if (typeof APP_VERSION !== "undefined" && APP_VERSION) return APP_VERSION;
  const el = document.querySelector(".version-badge,#appVersion");
  return (el && el.textContent || "unknown").trim() || "unknown";
}

// تطبيع أي رقم للأرقام الإنجليزية مع نقطة عشرية (إزالة الرموز والفواصل العربية)
function normalizeNumberEn(v) {
  if (v == null) return "";
  let s = String(v).trim();

  // خرائط الأرقام العربية/الهندية → لاتينية
  const arabicIndic  = "٠١٢٣٤٥٦٧٨٩";
  const easternIndic = "۰۱۲۳۴۵۶۷۸۹";
  s = s.replace(/[٠-٩]/g, d => String(arabicIndic.indexOf(d)))
       .replace(/[۰-۹]/g, d => String(easternIndic.indexOf(d)));

  // الفواصل العربية والغربية → نقطة
  s = s.replace(/[،٬٫]/g, ".").replace(/,/g, ".");

  // إبقاء الأرقام والنقطة والسالب فقط
  s = s.replace(/[^0-9.\-]/g, "");

  // منع تعدد النقاط
  const parts = s.split(".");
  if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");

  return (s === "." || s === "-") ? "" : s;
}

/* ============== خريطة النوع من select إلى PT ============== */
/* وفقًا لملفك الأساسي:
   <select id="priceType">
     <option value="withTax">سعر بطاقة</option>          → نحفظ NOVAT
     <option value="withoutTax">سعر شامل الضريبة</option> → نحفظ VAT
   </select>
*/
function mapPriceTypeToPT() {
  const v = (document.getElementById("priceType")?.value || "").trim();
  if (v === "withTax")    return "NOVAT"; // سعر بطاقة (بدون ضريبة)
  if (v === "withoutTax") return "VAT";   // سعر شامل الضريبة
  return "NOVAT"; // افتراضيًا
}

/* ============== جمع الحقول التي يدخلها الموظف ============== */
/* تعدّل المعرفات هنا إذا كانت مختلفة عندك في الصفحة */
function collectInputFields() {
  return {
    // النوع + السعر الأساسي
    PT: mapPriceTypeToPT(),
    PRICE: normalizeNumberEn(document.getElementById("carPrice")?.value || ""),

    // بقية الحقول (أرقام)
    XB:  normalizeNumberEn(document.getElementById("extras")?.value || ""),
    SVC: normalizeNumberEn(document.getElementById("other1")?.value || ""),
    CB:  normalizeNumberEn(document.getElementById("cashback")?.value || ""),        // % بدون علامة
    SUP: normalizeNumberEn(document.getElementById("support")?.value || ""),         // % بدون علامة
    NP:  normalizeNumberEn(document.getElementById("other2")?.value || ""),
    DPR: normalizeNumberEn(document.getElementById("downPaymentRate")?.value || ""), // %
    BLR: normalizeNumberEn(document.getElementById("balloonRate")?.value || ""),     // %
    PR:  normalizeNumberEn(document.getElementById("profitRate")?.value || ""),      // %
    IR:  normalizeNumberEn(document.getElementById("insuranceRate")?.value || ""),   // %
    AR:  normalizeNumberEn(document.getElementById("adminRate")?.value || ""),
    Y:   normalizeNumberEn(document.getElementById("years")?.value || "")
  };
}

/* ============== بناء سلسلة الحفظ المضغوطة ============== */
/* الشكل النهائي مثال:
   PT=NOVAT|PRICE=65000|XB=500|SVC=0|CB=10|SUP=0|NP=0|DPR=10|BLR=30|PR=5|IR=2|AR=1|Y=5
*/
function buildDataCompactFrom(obj) {
  return Object.entries(obj)
    .filter(([_, v]) => v !== undefined && v !== null && String(v) !== "")
    .map(([k, v]) => `${k}=${String(v).replace(/\|/g, "¦")}`)
    .join("|");
}

/* ================= منطق حفظ العملية ================= */

async function saveOperation(operationName) {
  const session = safeSession();
  if (!session?.user_id) {
    alert("الرجاء تسجيل الدخول أولًا قبل حفظ العملية.");
    return;
  }

  const inputs = collectInputFields();             // كل الحقول التي يُدخلها الموظف
  const data_compact = buildDataCompactFrom(inputs); // PT, PRICE, XB, SVC, ...

  const payload = {
    action: "save_operation",
    user_id: session.user_id,
    operation_name: operationName,  // الاسم المُدخل في النافذة
    data_compact,                   // سلسلة القيم بالكامل
    version: getAppVersionSafe(),   // اختياري
    ts_client: Date.now()
  };

  try {
    const res = await fetch(SAVE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // لتفادي preflight
      body: JSON.stringify(payload)
    });

    const txt = await res.text();
    let json;
    try { json = JSON.parse(txt); } catch { json = { ok:false, error:"NON_JSON_RESPONSE", raw: txt }; }

    if (json && json.ok) {
      // نجاح — أظهر رسالة النجاح وأغلق النافذة
      showSaveSuccess();
    } else {
      console.warn("[SaveOperation] server error:", json);
      alert("تعذر حفظ العملية. تحقّق من نشر الويب آب واسم الورقة وصلاحيات الوصول.");
    }
  } catch (err) {
    console.error("[SaveOperation] network error:", err);
    alert("تعذر الاتصال بالخادم. تأكد من SAVE_API_URL والنشر كـ Web App (Anyone with the link).");
  }
}

/* ================= واجهة المستخدم للنافذة المنبثقة ================= */

function showSaveSuccess() {
  const success = document.getElementById("saveSuccess");
  const modal   = document.getElementById("saveModal");
  const form    = document.getElementById("saveForm");

  success?.classList.add("show");
  setTimeout(() => {
    modal?.classList.remove("active");
    form?.reset();
    success?.classList.remove("show");
    document.body.style.overflow = "";
  }, 2000);
}

function openSaveModal() {
  const modal = document.getElementById("saveModal");
  const nameInput = document.getElementById("operationName");
  const success = document.getElementById("saveSuccess");

  modal?.classList.add("active");
  nameInput?.focus();
  success?.classList.remove("show");
  document.body.style.overflow = "hidden";
}

function closeSaveModal() {
  const modal = document.getElementById("saveModal");
  const form  = document.getElementById("saveForm");
  const success = document.getElementById("saveSuccess");

  modal?.classList.remove("active");
  form?.reset();
  success?.classList.remove("show");
  document.body.style.overflow = "";
}

/* ================= ربط الأحداث عند التحميل ================= */

document.addEventListener("DOMContentLoaded", () => {
  // أزرار وحقول النافذة
  const saveBtn   = document.getElementById("saveDataBtn");
  const closeBtn  = document.getElementById("closeModal");
  const cancelBtn = document.getElementById("cancelSave");
  const modal     = document.getElementById("saveModal");
  const form      = document.getElementById("saveForm");
  const nameInput = document.getElementById("operationName");
  const success   = document.getElementById("saveSuccess");

  // فتح النافذة
  saveBtn?.addEventListener("click", openSaveModal);

  // إغلاق النافذة
  closeBtn?.addEventListener("click", closeSaveModal);
  cancelBtn?.addEventListener("click", closeSaveModal);
  modal?.addEventListener("click", (e) => { if (e.target === modal) closeSaveModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("active")) closeSaveModal();
  });

  // إرسال الحفظ
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const operationName = (nameInput?.value || "").trim();
    if (!operationName) { nameInput?.focus(); return; }
    saveOperation(operationName);
  });

  // تنظيف رسالة النجاح عند الكتابة
  nameInput?.addEventListener("input", () => {
    success?.classList.remove("show");
  });
});
