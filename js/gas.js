/************* أدوات مساعدة *************/
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function openSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(SHEET_SOM);
  if (!sh) {
    sh = ss.insertSheet(SHEET_SOM);
    // رؤوس الأعمدة بالعربية (مرة واحدة عند الإنشاء)
    sh.appendRow(['وقت الخادم','معرّف المستخدم','اسم العملية','الحقول المخزّنة','الإصدار']);
  }
  return sh;
}

/************* للتجربة السريعة *************/
function doGet(e) {
  return json_({ ok: true, msg: 'GAS GET OK' });
}

/************* الاستقبال *************/
function doPost(e) {
  let p = {};
  try {
    p = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
  } catch (err) {
    return json_({ ok: false, error: 'JSON_PARSE_ERROR' });
  }

  // نتوقع action = save_operation
  const action = String(p.action || '').trim().toLowerCase();
  if (action !== 'save_operation') {
    return json_({ ok: false, error: 'UNKNOWN_ACTION', received: action });
  }

  // الحقول المطلوبة
  const user_id        = String(p.user_id || '').trim();
  const operation_name = String(p.operation_name || '').trim();
  const data_compact   = String(p.data_compact || '').trim();
  const version        = String(p.version || '').trim();

  if (!user_id)        return json_({ ok: false, error: 'MISSING_user_id' });
  if (!operation_name) return json_({ ok: false, error: 'MISSING_operation_name' });
  if (!data_compact)   return json_({ ok: false, error: 'MISSING_data_compact' });

  const sh = openSheet_();
  const now = new Date();

  sh.appendRow([ now, user_id, operation_name, data_compact, (version || '-') ]);

  return json_({ ok: true, wrote: SHEET_SOM });
}
