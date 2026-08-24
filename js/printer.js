/**
 * printer.js — الاتصال بطابعة الفواتير الحرارية Epson عبر الشبكة المحلية
 * ─────────────────────────────────────────────────────────────────────────
 * يعتمد على Epson ePOS SDK for JavaScript (assets/epos-2.27.0.js) المحمَّل قبله.
 * الطابعة والجهاز على نفس الشبكة المحلية للفرع، ويتم الاتصال بها عبر HTTP
 * (منفذ ePOS SDK — بلا تشفير SSL).
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
  const PORT_FIXED = 8008;       // منفذ ePOS SDK القياسي (HTTP بلا تشفير)
  const DEVICE_ID_FIXED = 'local_printer';

  /* ── الطابعات المدعومة (سلسلة Epson TM المتوافقة مع ePOS SDK) ── */
  const SUPPORTED_MODELS = [
    'TM-T20III', 'TM-T20II', 'TM-T82III', 'TM-T88VII', 'TM-T88VI',
    'TM-T88V', 'TM-m30II', 'TM-m30', 'TM-m10', 'TM-P20II', 'TM-U220',
  ];

  const DEFAULT_CONFIG = { ip: '192.168.0.147', model: SUPPORTED_MODELS[0] };

  let _eposDevice    = null; // كائن الاتصال بالشبكة (epson.ePOSDevice)
  let _printerDevice = null; // كائن الطابعة بعد createDevice (epson.ePOSPrint)

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
        onError && onError('فشل الاتصال بالطابعة (' + data + ')');
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
          onError && onError('فشل تجهيز الطابعة (' + retcode + ')');
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
      else onError && onError('فشلت عملية الطباعة (' + (res && res.code) + ')');
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
