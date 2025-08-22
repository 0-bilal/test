// ===============================
// Active User Telegram Notifier (KSA format)
// ===============================

// ضع التوكن والمعرّف الصحيحين هنا
const BOT_TOKEN = "8395051529:AAFX1P2w8cICbTjZYoxf-1uEK8kaW58zkkU";
const CHAT_ID   = "-1002758733334";



// كم تعتبر الجلسة "حديثة" بعد تسجيل الدخول؟ (بالدقائق)
const FRESH_LOGIN_MINUTES = 10;

// اقرأ جلسة الدخول المخزّنة من login.js
function getQBSession() {
  try { return JSON.parse(localStorage.getItem("qb_session")); }
  catch { return null; }
}

// هل الجلسة صالحة وحديثة؟
function isFreshLogin(session) {
  if (!session || !session.user_id || !session.name) return false;
  const ts = Number(session.ts || 0);
  if (!ts) return false;
  const ageMs = Date.now() - ts;
  return ageMs >= 0 && ageMs <= FRESH_LOGIN_MINUTES * 60 * 1000;
}

// امنع التكرار لنفس الجلسة (تبعًا لـ user_id + توقيت الدخول)
function shouldNotifyOnce(session) {
  const key = `active_notified_${session.user_id}_${session.ts}`;
  if (sessionStorage.getItem(key) === "1") return false;
  sessionStorage.setItem(key, "1");
  return true;
}

// تنسيق التاريخ/الوقت: 2025/08/16 مـ 12:49 م  (بتوقيت الرياض)
function formatKSA(dt = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).formatToParts(dt);

  const get = (type) => parts.find(p => p.type === type)?.value || "";
  const yyyy = get("year");
  const mm   = get("month");
  const dd   = get("day");
  let hh     = get("hour");
  const min  = get("minute");
  const dp   = get("dayPeriod");
  if (hh.length === 1) hh = "0" + hh;
  const mer = dp === "AM" ? "ص" : "م";
  return `${yyyy}/${mm}/${dd} مـ ${hh}:${min} ${mer}`;
}

// واجهة جاهزة لو حبيت تستدعيها يدويًا بعد النجاح في login.js
async function notifyActiveUserIfLoggedIn() {
  const s = getQBSession();
  if (!isFreshLogin(s)) return;          // ⛔ لا ترسل قبل الدخول أو إن كانت الجلسة قديمة
  if (!shouldNotifyOnce(s)) return;      // ⛔ لا تكرر لنفس الجلسة

  // ⛔ شرط منع الإرسال إذا كان المستخدم Admin
  if (s.role && s.role.toLowerCase() === "admin") {
    console.log("المستخدم Admin — لن يتم إرسال إشعار الدخول.");
    return;
  }

  const name = s.name || "غير معروف";
  const message =
`📢 تم فتح QB-Nexa
 يوجد مستخدم نشط الآن
👤 المستخدم: ${name}
🕒 الوقت والتاريخ: ${formatKSA()}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message })
    });
    const data = await res.json();
    console.log("تم إرسال الإشعار:", data);
  } catch (err) {
    console.error("خطأ إرسال الإشعار:", err);
  }
}


// تشغيل تلقائي عند تحميل الصفحات "المحمية" فقط
window.addEventListener("load", () => {
  // لن يرسل شيئًا إذا لم تكن هناك جلسة حديثة
  notifyActiveUserIfLoggedIn();
});

// اختياري: اجعل الدالة متاحة عالميًا لاستدعائها من login.js مباشرة بعد النجاح
window.notifyActiveUserIfLoggedIn = notifyActiveUserIfLoggedIn;
