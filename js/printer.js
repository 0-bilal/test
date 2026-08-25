/**
 * printer.js — الاتصال بطابعة الفواتير الحرارية Epson عبر الشبكة المحلية
 * ─────────────────────────────────────────────────────────────────────────
 * يعتمد على Epson ePOS SDK for JavaScript (assets/epos-2.27.0.js) المحمَّل قبله.
 * الطابعة والجهاز على نفس الشبكة المحلية للفرع. المنفذ يُختار تلقائياً بحسب
 * بروتوكول الصفحة الحالية (انظر PORT_FIXED أسفله): 8008/HTTP إن كانت الصفحة
 * نفسها http (مثل local-server على شبكة الفرع)، أو 8043/HTTPS إن كانت الصفحة
 * https (مثل GitHub Pages) — لأن متصفحات iOS/Safari تمنع أي طلب شبكة غير
 * مشفّر (Mixed Content) صادر من صفحة آمنة حتى لو كان الطلب موجّهاً لجهاز على
 * الشبكة المحلية، ويظهر ذلك للمستخدم كـ ERROR_TIMEOUT بدل رسالة حظر واضحة.
 *
 * ⚠️ عبر HTTPS/8043 يجب أن يثق الجهاز (iPad/iPhone) بشهادة الطابعة الذاتية
 * التوقيع، وإلا فشل الاتصال الصامت (نفس عرض ERROR_TIMEOUT). على أندرويد/كروم
 * تكفي زيارة الرابط وقبول التحذير مرة واحدة، لكن على iOS/Safari تحديداً
 * زيارة الرابط وقبول التحذير **لا تكفي** لثقة طلبات الشبكة الخلفية (XHR) —
 * هذا قيد معروف في WebKit. الحل الموثوق الوحيد على iOS:
 *   1) احصل على ملف شهادة الطابعة (.cer/.pem) — إمّا من صفحة إعدادات الطابعة
 *      نفسها (Network ← SSL/TLS Certificate) إن وفّرت تصديراً، أو بزيارة
 *      https://<IP-الطابعة>:8043/ من متصفح Mac/Windows وتصدير الشهادة من
 *      أيقونة القفل في شريط العنوان.
 *   2) انقل الملف لجهاز iPad (AirDrop/بريد) وافتحه — سيُضاف كملف Configuration
 *      Profile تحت: الإعدادات ← عام ← VPN وإدارة الجهاز، ثبّته من هناك.
 *   3) الخطوة الإلزامية الأخيرة (يُغفل عنها غالباً): الإعدادات ← عام ← حول ←
 *      Certificate Trust Settings ← فعّل الثقة الكاملة لهذه الشهادة تحديداً.
 *      بدون هذه الخطوة، تثبيت الملف وحده لا يكفي لثقة TLS.
 *   4) البديل الأبسط الذي يتجنّب كل ما سبق: إن كان جهاز الكاشير والطابعة على
 *      نفس شبكة الفرع، شغّل local-server/server.js على كمبيوتر بالفرع وافتح
 *      الكاشير عبر رابطه المحلي (http://<IP-الكمبيوتر>:9000/cashier.html)
 *      بدل رابط GitHub Pages — عندها تُستخدم 8008/HTTP تلقائياً بلا أي شهادة.
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
  const PORT_HTTP  = 8008; // منفذ ePOS SDK بلا تشفير
  const PORT_HTTPS = 8043; // منفذ ePOS SDK المشفّر (SSL) — إلزامي إن كانت الصفحة نفسها https
  /* الصفحة إن كانت مفتوحة عبر HTTPS (مثل GitHub Pages) يجب الاتصال بالطابعة عبر
     8043/SSL وإلا يحظر المتصفح الطلب كـ Mixed Content. أما إن كانت الصفحة نفسها
     مفتوحة عبر HTTP عادي (مثل local-server على شبكة الفرع)، فلا داعٍ لـ SSL
     إطلاقاً، ويُفضَّل تفادي تعقيد شهادة SSL الذاتية (خصوصاً على Safari/iOS). */
  const PORT_FIXED = (typeof location !== 'undefined' && location.protocol === 'https:') ? PORT_HTTPS : PORT_HTTP;
  const DEVICE_ID_FIXED = 'local_printer';

  /* ── الطابعات المدعومة (سلسلة Epson TM المتوافقة مع ePOS SDK) ── */
  const SUPPORTED_MODELS = [
    'TM-T20III', 'TM-T20II', 'TM-T82III', 'TM-T88VII', 'TM-T88VI',
    'TM-T88V', 'TM-m30II', 'TM-m30', 'TM-m10', 'TM-P20II', 'TM-U220',
  ];

  /* ── عروض الورق المدعومة (نقطة = بيكسل الصورة عند طباعتها) ── */
  const SUPPORTED_PAPER_WIDTHS = [
    { value: 576, label: '80mm (576 نقطة)' },
    { value: 384, label: '58mm (384 نقطة)' },
  ];

  const DEFAULT_CONFIG = { ip: '192.168.0.147', model: SUPPORTED_MODELS[0], paperWidth: 576 };

  let _eposDevice    = null; // كائن الاتصال بالشبكة (epson.ePOSDevice)
  let _printerDevice = null; // كائن الطابعة بعد createDevice (epson.ePOSPrint)

  /* ── ترجمة رموز أخطاء Epson ePOS SDK إلى رسائل مفهومة للكاشير ── */
  const ERROR_MESSAGES = {
    ERROR_TIMEOUT: 'انتهت مهلة الاتصال بالطابعة. تأكد أن الطابعة مُشغّلة ومتصلة بنفس شبكة الواي فاي، وأن عنوان IP في إعدادات الطباعة مطابق لعنوان الطابعة الحالي. إن استمر الخطأ عبر HTTPS فالسبب الأرجح أن الجهاز لا يثق بشهادة SSL الذاتية للطابعة — على Safari/iOS تحديداً، زيارة رابط الطابعة وقبول التحذير لا تكفي؛ يلزم تثبيت الشهادة كملف Configuration Profile وتفعيل الثقة الكاملة لها من الإعدادات ← عام ← حول ← Certificate Trust Settings.',
    ERROR_DEVICE_NOT_FOUND: 'تعذّر العثور على الطابعة على هذا العنوان. تحقّق من عنوان IP وموديل الطابعة في الإعدادات.',
    ERROR_BADPORT: 'تعذّر فتح منفذ الاتصال بالطابعة (تأكد من تفعيل خدمة ePOS-Print على الطابعة).',
    ERROR_PARAMETER: 'إعدادات الطابعة (العنوان أو الموديل) غير صحيحة.',
    ERROR_DEVICE_BUSY: 'الطابعة مشغولة حالياً بعملية أخرى، أعد المحاولة بعد قليل.',
    ERROR_DEVICE_IN_USE: 'الطابعة مستخدَمة من جهاز آخر حالياً.',
    ERROR_NOT_OPENED: 'لم يتم فتح اتصال بالطابعة بعد.',
    ERROR_ALREADY_OPENED: 'يوجد اتصال قائم بالفعل بالطابعة.',
    ERROR_SYSTEM: 'خطأ نظام أثناء الاتصال بالطابعة.',
    SchemaError: 'الطابعة رفضت محتوى أمر الطباعة. تأكد من عدم إرسال أمر طباعة آخر متزامن، وأعد تشغيل الطابعة إذا تكرر الخطأ.',
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

  /* رابط صفحة الطابعة نفسها (بلا منفذ — المنفذ 8043/SSL الخاص بـ ePOS-Print
     لا يستجيب لصفحة متصفح عادية ويرفض الاتصال فوراً؛ لوحة تحكم الطابعة على
     المنفذ الافتراضي هي التي تفتح فعلياً). زيارتها يدوياً مرة في تبويب
     متصفح عادي (وليس تطبيق PWA مثبَّت) تُفعِّل ثقة شهادة SSL الذاتية لبقية
     تبويبات نفس المتصفح في نفس الجلسة على iOS، حيث لا توجد طريقة أخرى
     موثوقة لجعل التطبيق المثبَّت يشارك هذه الثقة. */
  function getPrinterPageUrl() {
    const { ip } = getConfig();
    const proto = (typeof location !== 'undefined') ? location.protocol : 'http:';
    return proto + '//' + ip + '/';
  }
  function getSupportedPaperWidths() { return SUPPORTED_PAPER_WIDTHS.slice(); }

  /* ══════════ رسم نص عربي/مختلط كصورة — يتجاوز محدودية خط الطابعة ══════════
     خطوط الطابعات الحرارية غالباً لا تدعم "ربط" الحروف العربية (كل حرف
     يُطبع منفصلاً بشكله المعزول)، لأن الطابعة لا تُشكِّل الحروف حسب موقعها
     في الكلمة. المتصفح نفسه يُشكِّل العربية بشكل صحيح عبر Canvas، لذلك
     نرسم النص في المتصفح ونطبعه كصورة (بكسلات) بدل إرساله كنص للطابعة. */
  function _renderLines(lines, widthPx) {
    const PAD = 14;
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    const ctx = canvas.getContext('2d');
    const fontStack = '"Tahoma","Segoe UI","Arial",sans-serif';
    /* حجم أساسي أكبر ووزن شبه-عريض دائماً (حتى للأسطر العادية) — الخطوط
       الرفيعة (regular) تُطبع باهتة/غير واضحة على الطابعات الحرارية لأن
       رأس الطباعة الحراري يحتاج سماكة خط كافية ليُسخِّن الورق بشكل متصل،
       فتظهر الحروف الرفيعة متقطّعة أو خفيفة جداً. */
    const fontPxFor = size => Math.round(34 * (size || 1));
    const weightFor = bold => bold ? '700' : '600';

    const rows = [];
    let y = PAD;

    lines.forEach(line => {
      if (line.rule) { rows.push({ rule: true, y: y + 10 }); y += 26; return; }
      const fontPx = fontPxFor(line.size);
      ctx.font = weightFor(line.bold) + ' ' + fontPx + 'px ' + fontStack;
      const lineHeight = Math.round(fontPx * 1.55);
      const words = String(line.text == null ? '' : line.text).split(' ');
      const wrapped = [];
      let cur = '';
      words.forEach(w => {
        const test = cur ? cur + ' ' + w : w;
        if (cur && ctx.measureText(test).width > widthPx - PAD * 2) { wrapped.push(cur); cur = w; }
        else cur = test;
      });
      if (cur) wrapped.push(cur);
      wrapped.forEach(t => {
        y += lineHeight;
        rows.push({ text: t, y: y - lineHeight * 0.3, fontPx, bold: line.bold, align: line.align || 'center' });
      });
      y += (line.spacing || 6);
    });

    canvas.height = y + PAD;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.direction = 'rtl';

    rows.forEach(r => {
      if (r.rule) { ctx.fillRect(PAD, r.y, widthPx - PAD * 2, 3); return; }
      ctx.font = weightFor(r.bold) + ' ' + r.fontPx + 'px ' + fontStack;
      ctx.textAlign = r.align;
      const x = r.align === 'center' ? widthPx / 2 : (r.align === 'right' ? widthPx - PAD : PAD);
      ctx.fillText(r.text, x, r.y);
    });

    return { ctx, width: canvas.width, height: canvas.height };
  }

  /* يضيف كتلة نص (مصفوفة أسطر) كصورة إلى builder — يستبدل addTextLang('ar')+addText
     غير الموثوقة على أغلب طابعات ESC/POS الحرارية للنصوص العربية. */
  function addImageBlock(builder, lines) {
    const { paperWidth } = getConfig();
    const { ctx, width, height } = _renderLines(lines, paperWidth || 576);
    /* HALFTONE_THRESHOLD (أبيض/أسود صريح) بدل التظليل الافتراضي (Dither) —
       التظليل مصمَّم للصور الفوتوغرافية ويجعل حواف النص مرقّطة وغير واضحة؛
       أما النص فيحتاج حدوداً حادة صريحة لطباعة أوضح. */
    builder.halftone = builder.HALFTONE_THRESHOLD;
    builder.addImage(ctx, 0, 0, width, height, builder.COLOR_1, builder.MODE_MONO);
    return builder;
  }

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
    /* ⚠️ printerDevice.send(xml) في هذا الإصدار من الـ SDK لا يقبل XML كوسيط أول —
       عند استدعائه بوسيط واحد يُعامله كـ printjobid ويطبع محتوى printerDevice
       الداخلي (الفارغ) بدل محتوى builder، فيسبب SchemaError من الطابعة دائماً.
       لذلك نَنسخ محتوى builder المبني إلى printerDevice نفسه، ثم نستدعي send()
       بلا أي وسائط — وهو الاستدعاء الوحيد الذي يُرسل محتوى الطابعة الداخلي فعلياً. */
    printerDevice.message = builder.message;
    printerDevice.send();
  }

  return {
    connectPrinter, createPrinterDevice, buildReceipt, sendPrint,
    getConfig, setConfig, getSupportedModels, getSupportedPaperWidths, addImageBlock,
    getPrinterPageUrl,
  };
})();
