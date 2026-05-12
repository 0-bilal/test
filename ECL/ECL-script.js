document.addEventListener('DOMContentLoaded', () => {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqxwJ5CBwjPSX-8CZSLVOSz5k7eOyd95mPOHGXXWo_Q_Gb7PgJUVizv_vTqIVqJ7CcIA/exec';

    const employeeDatabase = {
        "1000": "بلال الخواجة",
        "1101": "رمان",
        "1311": "محمد",
        "1551": "شاهين",
        "1421": "نسيم",
        "1711": "دورجا"
    };

    const branchEmployees = {
        "Muzahmiyah": [
            { ar: "رمان", en: "Rumaan" },
            { ar: "محمد", en: "Mohamed" }
        ],
        "Dawadimi": [
            { ar: "شاهين", en: "Shahin" },
            { ar: "دورجا", en: "Dwrja" },
            { ar: "نسيم", en: "Nasim" }
        ]
    };

    const els = {
        branchRadios : document.querySelectorAll('input[name="branch"]'),
        employeeGrid : document.getElementById('employeeGrid'),
        preview      : document.getElementById('imagePreview'),
        container    : document.getElementById('imagePreviewContainer'),
        drop         : document.getElementById('dropArea'),
        remove       : document.getElementById('removeImage'),
        form         : document.getElementById('cleaningReportForm'),
        submitBtn    : document.querySelector('button[type="submit"]'),
        modal        : document.getElementById('customModal'),
        modalTitle   : document.getElementById('modalTitle'),
        modalMsg     : document.getElementById('modalMessage'),
        modalIcon    : document.getElementById('modalIcon'),
        modalLoader  : document.getElementById('modalLoader'),
        modalClose   : document.getElementById('modalClose')
    };

    let compressedImageBase64 = null;

    // ===================================================
    //  تهيئة وحدة الكاميرا ECL-camera.js
    // ===================================================
    ECLCamera.init({
        maxWidth : 1024,
        maxHeight: 1024,
        quality  : 0.80,

        // ✅ يُستدعى عند قبول المستخدم للصورة
        onCapture: (base64Image) => {
            compressedImageBase64 = base64Image;
            els.preview.src = base64Image;
            els.container.classList.remove('hidden');
            els.drop.classList.add('hidden');
        },

        // ✅ يُستدعى عند إغلاق الكاميرا بدون التقاط
        onClose: () => {
            // لا نفعل شيئاً إذا لم تُلتقط صورة
        }
    });

    // ===================================================
    //  فتح الكاميرا عند الضغط على منطقة الرفع
    // ===================================================
    els.drop.addEventListener('click', (e) => {
        e.preventDefault();
        ECLCamera.open();
    });

    // ===================================================
    //  حذف الصورة وإعادة الضبط
    // ===================================================
    els.remove.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetImageState();
    });

    function resetImageState() {
        compressedImageBase64 = null;
        els.preview.src = '';
        els.container.classList.add('hidden');
        els.drop.classList.remove('hidden');
        els.drop.style.display = '';
        ECLCamera.reset();
        els.submitBtn.disabled = false;
        els.submitBtn.style.opacity = '1';
    }

    // ===================================================
    //  اختيار موظفي الفرع
    // ===================================================
    els.branchRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedBranch = e.target.value;
            const employees = branchEmployees[selectedBranch] || [];
            els.employeeGrid.innerHTML = '';
            employees.forEach((emp, index) => {
                const id = `emp_${index}`;
                els.employeeGrid.innerHTML += `
                    <div class="employee-option">
                        <input type="radio" id="${id}" name="employeeName" value="${emp.ar}" required>
                        <label for="${id}" class="branch-tile">
                            <i data-lucide="user"></i>
                            <div class="tile-text">
                                <span>${emp.ar}</span>
                                <small>${emp.en}</small>
                            </div>
                        </label>
                    </div>`;
            });
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    });

    // ===================================================
    //  Modal
    // ===================================================
    const showModal = (type, title, message) => {
        els.modal.classList.remove('hidden');
        els.modalTitle.innerText = title;
        els.modalMsg.innerText   = message;
        els.modalLoader.classList.add('hidden');
        els.modalClose.classList.add('hidden');
        els.modalIcon.innerHTML  = '';

        if (type === 'loading') {
            els.modalLoader.classList.remove('hidden');
        } else {
            els.modalClose.classList.remove('hidden');
            const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
            els.modalIcon.innerHTML = `<i data-lucide="${iconName}" class="${type}-icon"></i>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    };

    els.modalClose.onclick = () => els.modal.classList.add('hidden');

    // ===================================================
    //  إرسال النموذج
    // ===================================================
    els.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const branch    = document.querySelector('input[name="branch"]:checked');
        const empName   = document.querySelector('input[name="employeeName"]:checked');
        const equipment = document.querySelector('input[name="equipment"]:checked');
        const empId     = document.getElementById('employeeId').value;

        if (!branch || !empName || !equipment || !compressedImageBase64) {
            showModal('error', 'بيانات ناقصة', 'يرجى إكمال جميع الحقول والتقاط صورة المعدة.');
            return;
        }

        const employeeName = employeeDatabase[empId];
        if (!employeeName) {
            showModal('error', 'خطأ في التحقق', 'رقم الموظف المُدخَل غير مسجل في النظام.');
            return;
        }

        showModal('loading', 'جاري الإرسال', 'يرجى الانتظار، يتم تسجيل التقرير...');
        els.submitBtn.disabled = true;

        const payload = {
            branch      : branch.value === 'Muzahmiyah' ? 'المزاحمية' : 'الدوادمي',
            senderName  : employeeName,
            cleanerName : empName.value,
            equipmentAr : equipment.parentElement.querySelector('span').innerText,
            equipmentEn : equipment.parentElement.querySelector('small').innerText,
            equipmentId : equipment.getAttribute('data-id'),
            image       : compressedImageBase64
        };

        const formData = new URLSearchParams();
        formData.append('payload', JSON.stringify(payload));

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body  : formData,
                mode  : 'cors'
            });

            const result = await response.json();

            if (result.result === 'success') {
                showModal('success', 'تم الإرسال', `تم إرسال تقرير النظافة بنجاح برقم: ${result.id}`);
                els.form.reset();
                resetImageState();
            } else {
                throw new Error(result.message || 'فشل في معالجة البيانات');
            }
        } catch (error) {
            console.error('Submission Error:', error);
            showModal('error', 'خطأ في الإرسال', 'تعذّر الوصول للسيرفر. تأكد من الإنترنت وحاول مجدداً.');
        } finally {
            els.submitBtn.disabled = false;
            els.submitBtn.style.opacity = '1';
        }
    });
});