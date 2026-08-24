/**
 * printer.js — الاتصال بطابعة الفواتير الحرارية Epson عبر الشبكة المحلية
 * ─────────────────────────────────────────────────────────────────────────
 * يعتمد على Epson ePOS SDK for JavaScript (assets/epos-2.27.0.js) المحمَّل قبله.
 * الطابعة والجهاز على نفس الشبكة المحلية للفرع، ويتم الاتصال بها عبر HTTPS
 * (منفذ 8043 — الاتصال المشفّر SSL/TLS بشهادة الطابعة الذاتية التوقيع).
 *
 * لماذا HTTPS؟ لأن الموقع نفسه يُقدَّم عبر HTTPS، ومتصفحات iOS/Safari تمنع
 * أي طلب شبكة غير مشفّر (Mixed Content) صادر من صفحة آمنة — حتى لو كان
 * الطلب موجّهاً لجهاز على الشبكة المحلية — ويظهر ذلك للمستخدم كـ ERROR_TIMEOUT
 * بدل رسالة حظر واضحة. مكتبة epos SDK تحدّد البروتوكول تلقائياً بحسب رقم
 * المنفذ الممرَّر لـ connect(): المنفذ 8008 فقط يُستخدم مع HTTP، وأي منفذ
 * آخر (8043 هنا) يُستخدم تلقائياً مع HTTPS.
 *
 * ⚠️ لتعمل الطباعة عبر HTTPS يجب أن يثق الجهاز (iPad/iPhone) بشهادة الطابعة
 * الذاتية التوقيع أولاً، وإلا فشل الاتصال الصامت (نفس عرض ERROR_TIMEOUT):
 *   1) افتح على نفس الجهاز في تبويب Safari عادي: https://<IP-الطابعة>:8043/
 *   2) عند ظهور تحذير "This Connection Is Not Private" اضغط
 *      Show Details ← visit this website، وأكّد المتابعة.
 *   3) للثقة الدائمة (يُنصح بها لتعمل داخل تطبيق PWA المثبّت وليس فقط
 *      تبويب Safari): ثبّت شهادة الطابعة كملف Configuration Profile على
 *      الجهاز، ثم فعّلها من: الإعدادات ← عام ← حول ← Certificate Trust
 *      Settings.
 *
 * الإعدادات (IP وموديل الطابعة) تُحفظ في localStorage ويمكن تعديلها من
 * واجهة الكاشير (قسم الطباعة ← إعدادات الطابعة) دون تعديل الكود.
 *
 * الاستخدام (تسلسل الخطوات الأربع):
 *   DuoPrinter.connectPrinter(function (eposDevice) {
 *     DuoPrinter.createPrinterDevice(eposDevice, function (printer) {
 *       const builder = DuoPrinter.buildReceipt();
 *       // أضف محتوى الفاتورة داخل buildReceipt() نفسها، أو ابنِ builder خاصاً بك
 *       DuoPrinter.sendPrint(printer, builder,
 *         () => console.log('تمت الطباعة'),
 *         (msg) => console.warn(msg));
 *     }, (msg) => console.warn(msg));
 *   }, (msg) => console.warn(msg));
 */
window.DuoPrinter = (function () {
  'use strict';

  const LS_KEY = 'duo_printer_config';
  const PORT_FIXED = 8043;       // منفذ ePOS SDK المشفّر (HTTPS/SSL) — 8008 = HTTP بلا تشفير
  const DEVICE_ID_FIXED = 'local_printer';

  /* ── الطابعات المدعومة (سلسلة Epson TM المتوافقة مع ePOS SDK) ── */
  const SUPPORTED_MODELS = [
    'TM-T20III', 'TM-T20II', 'TM-T82III', 'TM-T88VII', 'TM-T88VI',
    'TM-T88V', 'TM-m30II', 'TM-m30', 'TM-m10', 'TM-P20II', 'TM-U220',
  ];

  const DEFAULT_CONFIG = { ip: '192.168.0.147', model: SUPPORTED_MODELS[0] };

  let _eposDevice    = null; // كائن الاتصال بالشبكة (epson.ePOSDevice)
  let _printerDevice = null; // كائن الطابعة بعد createDevice (epson.ePOSPrint)

  /* ── ترجمة رموز أخطاء Epson ePOS SDK إلى رسائل مفهومة للكاشير ── */
  const ERROR_MESSAGES = {
    ERROR_TIMEOUT: 'انتهت مهلة الاتصال بالطابعة. تأكد أن الطابعة مُشغّلة ومتصلة بنفس شبكة الواي فاي، وأن عنوان IP في إعدادات الطباعة مطابق لعنوان الطابعة الحالي. إن استمر الخطأ فالسبب الأرجح هو أن المتصفح لا يثق بشهادة SSL الذاتية للطابعة — افتح https://<IP-الطابعة>:8043/ في تبويب Safari عادي وأكّد الثقة بالشهادة أولاً.',
    ERROR_DEVICE_NOT_FOUND: 'تعذّر العثور على الطابعة على هذا العنوان. تحقّق من عنوان IP وموديل الطابعة في الإعدادات.',
    ERROR_BADPORT: 'تعذّر فتح منفذ الاتصال بالطابعة (تأكد من تفعيل خدمة ePOS-Print على الطابعة).',
    ERROR_PARAMETER: 'إعدادات الطابعة (العنوان أو الموديل) غير صحيحة.',
    ERROR_DEVICE_BUSY: 'الطابعة مشغولة حالياً بعملية أخرى، أعد المحاولة بعد قليل.',
    ERROR_DEVICE_IN_USE: 'الطابعة مستخدَمة من جهاز آخر حالياً.',
    ERROR_NOT_OPENED: 'لم يتم فتح اتصال بالطابعة بعد.',
    ERROR_ALREADY_OPENED: 'يوجد اتصال قائم بالفعل بالطابعة.',
    ERROR_SYSTEM: 'خطأ نظام أثناء الاتصال بالطابعة.',
    SchemaError: 'استجابة غير متوقعة من الطابعة. غالباً بسبب انقطاع الاتصال أثناء الطباعة أو عدم تطابق موديل الطابعة المُختار في الإعدادات مع الطابعة الفعلية. أعد المحاولة، وأعد تشغيل الطابعة إذا تكرر الخطأ.',
    PrintSystemError: 'خطأ داخلي في نظام الطباعة بالطابعة. أعد تشغيل الطابعة وحاول مجدداً.',
    EPTR_COVER_OPEN: 'غطاء الطابعة مفتوح.',
    EPTR_REC_EMPTY: 'نفد ورق الطابعة.',
    EPTR_MECHANICAL: 'خطأ ميكانيكي في الطابعة.',
    EPTR_AUTOMATICAL: 'خطأ تلقائي في الطابعة (تحقق من الورق والغطاء).',
    EPTR_UNRECOVERABLE: 'خطأ غير قابل للإصلاح في الطابعة، أعد تشغيلها.',
  };

  function friendlyError(code) {
    return ERROR_MESSAGES[code] || ('رمز الخطأ: ' + code);
  }

  /* ══════════ إعدادات الطابعة (IP + الموديل) ══════════ */
  function getConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      return { ...DEFAULT_CONFIG, ...saved };
    } catch (e) {
      return { ...DEFAULT_CONFIG };
    }
  }

  function setConfig(partial) {
    const merged = { ...getConfig(), ...partial };
    localStorage.setItem(LS_KEY, JSON.stringify(merged));
    // أي تغيير في الإعدادات يُبطل الاتصال الحالي ليُعاد فتحه بالبيانات الجديدة
    _eposDevice = null;
    _printerDevice = null;
    return merged;
  }

  function getSupportedModels() { return SUPPORTED_MODELS.slice(); }

  /* ══════════ 1) الاتصال بالطابعة ══════════ */
  function connectPrinter(onSuccess, onError) {
    if (typeof epson === 'undefined' || !epson.ePOSDevice) {
      onError && onError('مكتبة epos-2.27.0.js غير محمَّلة في الصفحة');
      return;
    }

    if (_eposDevice) { onSuccess && onSuccess(_eposDevice); return; } // اتصال قائم مسبقاً

    const { ip } = getConfig();
    _eposDevice = new epson.ePOSDevice();

    _eposDevice.connect(ip, PORT_FIXED, function (data) {
      if (data === 'OK' || data === 'SSL_CONNECT_OK') {
        onSuccess && onSuccess(_eposDevice);
      } else {
        _eposDevice = null;
        onError && onError('فشل الاتصال بالطابعة: ' + friendlyError(data));
      }
    });
  }

  /* ══════════ 2) إنشاء كائن الطابعة ══════════ */
  function createPrinterDevice(eposDevice, onSuccess, onError) {
    if (_printerDevice) { onSuccess && onSuccess(_printerDevice); return; } // جاهز مسبقاً

    eposDevice.createDevice(
      DEVICE_ID_FIXED,
      eposDevice.DEVICE_TYPE_PRINTER,
      { crypto: false, buffer: false },
      function (deviceObj, retcode) {
        if (retcode === 'OK') {
          _printerDevice = deviceObj;
          onSuccess && onSuccess(_printerDevice);
        } else {
          onError && onError('فشل تجهيز الطابعة: ' + friendlyError(retcode));
        }
      }
    );
  }

  /* ══════════ 3) بناء الفاتورة (الأساسيات فقط) ══════════ */
  function buildReceipt() {
    const builder = new epson.ePOSBuilder();

    builder.addTextLang('ar');

    /* ═══════════════════════════════════════════════════════════════
       ✏️ ابدأ تصميم محتوى الفاتورة من هنا (نصوص، أحجام خط، باركود، صور…)
       مثال:
         builder.addTextSize(2, 2);
         builder.addText('مرحباً بك\n');
         builder.addTextSize(1, 1);
       ═══════════════════════════════════════════════════════════════ */



    builder.addCut(builder.CUT_FEED);

    return builder;
  }

  /* ══════════ 4) إرسال أمر الطباعة ومراقبة النتيجة ══════════ */
  function sendPrint(printerDevice, builder, onSuccess, onError) {
    printerDevice.onreceive = function (res) {
      if (res && res.success) onSuccess && onSuccess(res);
      else onError && onError('فشلت عملية الطباعة: ' + friendlyError(res && res.code));
    };
    printerDevice.onerror = function () {
      onError && onError('خطأ في الاتصال بالطابعة أثناء الطباعة');
    };
    printerDevice.send(builder.toString());
  }

  return {
    connectPrinter, createPrinterDevice, buildReceipt, sendPrint,
    getConfig, setConfig, getSupportedModels,
  };
})();
