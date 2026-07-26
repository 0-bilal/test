/**
 * duo-config.js — إعداد Firebase الموحّد لمطعم DUO
 * ────────────────────────────────────────────────────────────
 * مضمّن هنا مرة واحدة لكل الأجهزة، فلا حاجة للصقه في لوحة التحكم
 * على أي جهاز. كل جهاز يحتاج فقط اختيار دوره (يسار/يمين) وتفعيل الربط.
 *
 * ملاحظة: مفتاح apiKey في Firebase ليس سرّاً — الحماية تكون عبر
 * قواعد قاعدة البيانات (Rules)، وليس بإخفاء الإعداد.
 */
window.DUO_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDZ1ZAlgCje5sYezB2FdCfS5_l5-klWWf4",
  authDomain:        "duo-burger.firebaseapp.com",
  databaseURL:       "https://duo-burger-default-rtdb.firebaseio.com",
  projectId:         "duo-burger",
  storageBucket:     "duo-burger.firebasestorage.app",
  messagingSenderId: "403226496636",
  appId:             "1:403226496636:web:183fbbb04a0aaa0c4bc3f9",
  measurementId:     "G-S231CYJV4D"
};
