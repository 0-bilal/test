/**
 * MVR-script.js — مراجعة الفروع الشهرية (Monthly Video Review)
 * يستخدم:
 *   · QB.employees        (من js/config.js)
 *   · QB.translateBranch  (من js/config.js)
 *   · window.QBSession    (من js/session.js)
 *   · window.showModal()  (من js/common.js)
 *   · window.MVRCamera    (من MVR/MVR-camera.js)
 */
document.addEventListener('DOMContentLoaded', () => {

    // ── رابط Google Apps Script (سيُضاف لاحقاً) ─────────────────────────
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwkCSRSC_Ox49l4RNoxoyDAOlG4mO3TsqNY-1mivzw4i5HhW30WPJsGkw466T1G2qKkfg/exec';

    // ── تهيئة الجلسة ─────────────────────────────────────────────────────
    QBSession.initPage();

    // ── تهيئة وحدة التسجيل ───────────────────────────────────────────────
    MVRCamera.init({
        onStateChange(state) {
            // تحديث حالة زر الإرسال حسب حالة التسجيل
            updateSubmitState();

            // في وضع review: لفت انتباه المستخدم لمراجعة الفيديو
            if (state === 'review') {
                const reviewSection = document.getElementById('mvr-state-review');
                if (reviewSection) {
                    reviewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        },
        onError(err) {
            const msg = err.name === 'NotAllowedError'
                ? 'لم يتم السماح بالوصول للكاميرا. يرجى منح الإذن من إعدادات المتصفح.'
                : 'تعذّر فتح الكاميرا. تأكد من أن الجهاز يدعم التسجيل.';
            showModal('error', 'خطأ في الكاميرا', msg);
        }
    });

    // ── عناصر النموذج ────────────────────────────────────────────────────
    const form      = document.getElementById('mvrForm');
    const submitBtn = document.getElementById('submitBtn');
    const keepBtn   = document.getElementById('mvrKeepBtn');
    const modalClose = document.getElementById('modalClose');

    // إغلاق المودال
    if (modalClose) {
        modalClose.onclick = () => document.getElementById('customModal').classList.add('hidden');
    }

    // تفعيل زر "استخدام هذا الفيديو"
    if (keepBtn) {
        keepBtn.onclick = () => {
            // تمرير الشاشة مباشرة إلى زر الإرسال
            if (submitBtn) {
                submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
    }

    // ── تحديث حالة زر الإرسال ─────────────────────────────────────────────
    function updateSubmitState() {
        if (!submitBtn) return;
        const state = MVRCamera.getState();
        const hasVideo = MVRCamera.hasRecording();

        if (state === 'recording') {
            // منع الإرسال أثناء التسجيل
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
        } else if (hasVideo) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        } else {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    }

    // ── إرسال النموذج ────────────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const branchRadio = document.querySelector('input[name="branch"]:checked');
        const empId       = document.getElementById('employeeId').value;

        // التحقق من الفرع ورقم الموظف
        if (!branchRadio || !empId) {
            showModal('error', 'بيانات ناقصة', 'يرجى اختيار الفرع وإدخال رقم الموظف.');
            return;
        }

        const employeeName = QB.getEmployee(empId);
        if (!employeeName) {
            showModal('error', 'خطأ في التحقق', 'رقم الموظف المدخل غير مسجل في النظام.');
            return;
        }

        // التحقق من وجود تسجيل
        if (!MVRCamera.hasRecording()) {
            showModal('error', 'لا يوجد فيديو', 'يرجى تسجيل فيديو مراجعة الفرع قبل الإرسال.');
            return;
        }

        // التحقق من أن المستخدم في وضع المراجعة (وليس التسجيل)
        if (MVRCamera.getState() === 'recording') {
            showModal('error', 'التسجيل جارٍ', 'يرجى إيقاف التسجيل أولاً قبل الإرسال.');
            return;
        }

        // التحقق من وجود SCRIPT_URL
        if (!SCRIPT_URL) {
            showModal('error', 'الباكند غير مفعّل', 'سيتم تفعيل الإرسال لاحقاً — الواجهة جاهزة.');
            return;
        }

        // ── إرسال البيانات ─────────────────────────────────────────────
        showModal('loading', 'جاري التحضير للرفع', 'يتم الآن تهيئة اتصال آمن مع السيرفر...', true);
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';

        try {
            const blob = MVRCamera.getBlob();
            const fileName = `MVR_${branchRadio.value}_${Date.now()}.mp4`;

            // المرحلة 1: الحصول على رابط رفع Resumable من Drive API عبر Apps Script
            const initResponse = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                body: new URLSearchParams({
                    payload: JSON.stringify({
                        action: 'getUploadUrl',
                        fileName: fileName,
                    mimeType: blob.type,
                    empId: empId,
                    employeeName: employeeName
                    })
                })
            });

            const initResult = await initResponse.json();
            if (initResult.result !== 'success') throw new Error(initResult.message);

            const uploadUrl = initResult.uploadUrl;
            showModal('loading', 'جاري رفع الفيديو', 'يرجى عدم إغلاق الصفحة حتى اكتمال شريط التقدم...', true);

            // المرحلة 2: الرفع الفعلي باستخدام XMLHttpRequest لمراقبة التقدم
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl, true);
            
            // Explicitly set the Content-Type to match the blob and the session initialization
            xhr.setRequestHeader('Content-Type', blob.type);
            
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    updateModalProgress(percentComplete);
                }
            };

            xhr.onload = async () => {
                if (xhr.status === 200 || xhr.status === 201) {
                    const fileData = JSON.parse(xhr.responseText);
                    
                    // المرحلة 3: تسجيل البيانات في جدول Google Sheets
                    const finalResponse = await fetch(SCRIPT_URL, {
                        method: 'POST',
                        mode: 'cors',
                        body: new URLSearchParams({
                            payload: JSON.stringify({
                                action: 'finishReport',
                                empId: empId,
                                employeeName: employeeName,
                                branch: QB.translateBranch(branchRadio.value),
                                fileId: fileData.id
                            })
                        })
                    });

                    const finalResult = await finalResponse.json();
                    if (finalResult.result === 'success') {
                        QBSession.save(empId, branchRadio.value);
                        showModal('success', 'تم الإرسال بنجاح', `تم تسجيل مراجعة الفرع بنجاح.`);
                        form.reset();
                        MVRCamera.reset();
                    } else {
                        throw new Error(finalResult.message);
                    }
                } else {
                    showModal('error', 'فشل الرفع', 'تعذر رفع ملف الفيديو. تأكد من ثبات الإنترنت.');
                }
            };

            xhr.onerror = () => showModal('error', 'خطأ اتصال', 'حدث خطأ أثناء محاولة الرفع.');
            xhr.send(blob);

        } catch (error) {
            console.error('MVR Submission Error:', error);
            showModal('error', 'خطأ في العملية', error.message || 'حدث خطأ غير متوقع.');
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    });

});
