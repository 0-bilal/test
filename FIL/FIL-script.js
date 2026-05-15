document.addEventListener('DOMContentLoaded', () => {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXUyG0W0EO_H836k4W8aeDJ_Grfmc25gj_3Qi36VBuKzmAg6vGOYtfntO_kBRFB3yoJg/exec';

    const employeeDatabase = {
        "1000": "بلال الخواجة",
        "1101": "رمان",
        "1311": "محمد",
        "1551": "شاهين",
        "1421": "نسيم",
        "1711": "دورجا"
    };

    const fruits = [
        { id: 'f1',  ar: 'فراولة',      en: 'Strawberry'  },
        { id: 'f2',  ar: 'مانجو',        en: 'Mango'       },
        { id: 'f3',  ar: 'أفوكادو',      en: 'Avocado'     },
        { id: 'f4',  ar: 'موز',          en: 'Banana'      },
        { id: 'f5',  ar: 'برتقال',       en: 'Orange'      },
        { id: 'f6',  ar: 'كيوي',         en: 'Kiwi'        },
        { id: 'f7',  ar: 'أناناس',       en: 'Pineapple'   },
        { id: 'f8',  ar: 'رمان',         en: 'Pomegranate' },
        { id: 'f9',  ar: 'الشمندر',      en: 'Beetroot'    },
        { id: 'f10', ar: 'جزر',          en: 'Carrot'      },
        { id: 'f11', ar: 'ليمون',        en: 'Lemon'       },
        { id: 'f12', ar: 'بطيخ',         en: 'Watermelon'  },
        { id: 'f13', ar: 'تفاح أخضر',    en: 'Green Apple' },
        { id: 'f14', ar: 'تفاح أحمر',    en: 'Red Apple'   },
        { id: 'f15', ar: 'شمام',         en: 'Sweet Melo'  },
        { id: 'f16', ar: 'توت أزرق',     en: 'Blueberry'   },
        { id: 'f17', ar: 'بلاك بيري',    en: 'Blackberry'  },
        { id: 'f18', ar: 'توت احمر',     en: 'Raspberry'   },
        { id: 'f19', ar: 'خوخ',          en: 'Peach'       },
        { id: 'f20', ar: 'عنب',          en: 'Geape'       },
        { id: 'f21', ar: 'نعناع',        en: 'Mint'        }
    ];

    const fruitGrid = document.getElementById('fruitGrid');
    const INITIAL_VISIBLE_COUNT = 3;

    const els = {
        form:         document.getElementById('fruitReportForm'),
        submitBtn:    document.getElementById('submitBtn'),
        photoCard:    document.getElementById('photoCard'),
        preview:      document.getElementById('imagePreview'),
        container:    document.getElementById('imagePreviewContainer'),
        dropArea:     document.getElementById('dropArea'),
        remove:       document.getElementById('removeImage'),
        modal:        document.getElementById('customModal'),
        modalIcon:    document.getElementById('modalIcon'),
        modalTitle:   document.getElementById('modalTitle'),
        modalMessage: document.getElementById('modalMessage'),
        modalLoader:  document.getElementById('modalLoader'),
        modalClose:   document.getElementById('modalClose')
    };

    let capturedImageBase64 = "";

    // ===================================================
    // تهيئة FILCamera
    // يتم تحديث بيانات الموظف/الفرع عند فتح الكاميرا
    // ===================================================
    function openCamera() {
        const empId  = document.getElementById('employeeId').value.trim();
        const branch = document.querySelector('input[name="branch"]:checked');

        FILCamera.init({
            employeeName: employeeDatabase[empId] || 'غير محدد',
            branchName:   branch
                ? (branch.value === 'Muzahmiyah' ? 'المزاحمية' : 'الدوادمي')
                : 'غير محدد',
            onCapture: handleCameraCapture
        });

        FILCamera.open();
    }

    // ===================================================
    // استقبال الصورة من FILCamera بعد التأكيد
    // الصورة تصل كـ base64 jpeg مع الـ watermark مدمج
    // ===================================================
    function handleCameraCapture(imageBase64) {
        capturedImageBase64 = imageBase64;
        els.preview.src = imageBase64;
        els.container.classList.remove('hidden');
        els.dropArea.classList.add('hidden');
    }

    // ===================================================
    // فتح الكاميرا عند الضغط على منطقة الرفع
    // ===================================================
    els.dropArea.addEventListener('click', (e) => {
        e.preventDefault();
        openCamera();
    });

    // ===================================================
    // إزالة الصورة وإعادة التعيين
    // ===================================================
    function resetImageState() {
        capturedImageBase64 = "";
        els.preview.src = '';
        els.container.classList.add('hidden');
        els.dropArea.classList.remove('hidden');
        els.dropArea.style.display = '';
        els.submitBtn.disabled = false;
        els.submitBtn.style.opacity = "1";
    }

    els.remove.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetImageState();
    });

    // ===================================================
    // بناء قائمة الفواكه
    // ===================================================
    if (fruitGrid) {
        fruits.forEach((fruit, index) => {
            const row = document.createElement('div');
            row.className = `fruit-row ${index >= INITIAL_VISIBLE_COUNT ? 'hidden-fruit' : ''}`;
            row.setAttribute('data-fruit-name', fruit.ar);
            row.innerHTML = `
                <div class="fruit-info">
                    <span class="fruit-name">${fruit.ar} <span class="req-star">*</span></span>
                    <small class="en-text">${fruit.en}</small>
                </div>
                <div class="fruit-options">
                    <label class="opt-label check">
                        <input type="checkbox" class="status-check" data-type="inspected" data-fruit="${fruit.id}">
                        <div class="opt-content">
                            <span class="lbl-ar">تم الفحص</span>
                            <span class="lbl-en">Inspected</span>
                        </div>
                    </label>
                    <label class="opt-label na">
                        <input type="checkbox" class="status-check" data-type="na" data-fruit="${fruit.id}">
                        <div class="opt-content">
                            <span class="lbl-ar">غير متوفر</span>
                            <span class="lbl-en">N/A</span>
                        </div>
                    </label>
                    <label class="opt-label damaged">
                        <input type="checkbox" class="status-check" data-type="damaged" data-fruit="${fruit.id}">
                        <div class="opt-content">
                            <span class="lbl-ar">يوجد تالف</span>
                            <span class="lbl-en">Damaged</span>
                        </div>
                    </label>
                </div>
                <div id="damage_input_${fruit.id}" class="damage-input-wrapper hidden">
                    <div class="modern-input">
                        <i data-lucide="scale"></i>
                        <input type="number" placeholder="الوزن (جرام)" class="damage-qty">
                    </div>
                </div>
            `;
            fruitGrid.appendChild(row);
        });

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'show-more-btn';
        toggleBtn.innerHTML = 'عرض القائمة كاملة / Show Full List <i data-lucide="chevron-down"></i>';
        toggleBtn.onclick = () => {
            document.querySelectorAll('.hidden-fruit').forEach(el => el.classList.remove('hidden-fruit'));
            toggleBtn.style.display = 'none';
        };
        fruitGrid.after(toggleBtn);
        lucide.createIcons();
    }

    // ===================================================
    // تغيير حالة الفاكهة
    // ===================================================
    fruitGrid.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-check')) {
            const fruitId = e.target.getAttribute('data-fruit');
            const type = e.target.getAttribute('data-type');
            const row = e.target.closest('.fruit-row');
            const damageWrapper = document.getElementById(`damage_input_${fruitId}`);

            const checks = {
                inspected: row.querySelector('[data-type="inspected"]'),
                damaged:   row.querySelector('[data-type="damaged"]'),
                na:        row.querySelector('[data-type="na"]')
            };

            row.classList.remove('row-error');

            if (type === 'na' && e.target.checked) {
                checks.inspected.checked = false;
                checks.damaged.checked = false;
                damageWrapper.classList.add('hidden');
            } else if (type === 'inspected' || type === 'damaged') {
                checks.na.checked = false;
                if (type === 'damaged' && e.target.checked) {
                    checks.inspected.checked = true;
                    damageWrapper.classList.remove('hidden');
                } else if (type === 'damaged' && !e.target.checked) {
                    damageWrapper.classList.add('hidden');
                }
            }

            const anyDamaged = document.querySelectorAll('.status-check[data-type="damaged"]:checked').length > 0;
            els.photoCard.classList.toggle('hidden', !anyDamaged);
        }
    });

    // ===================================================
    // Modal
    // ===================================================
    function showModal(type, title, message) {
        els.modal.classList.remove('hidden');
        els.modalLoader.classList.toggle('hidden', type !== 'loading');
        els.modalClose.classList.toggle('hidden', type === 'loading');

        if (type !== 'loading') {
            const icon  = type === 'success' ? 'check-circle' : 'alert-circle';
            const color = type === 'success' ? '#4caf50'      : '#f44336';
            els.modalIcon.innerHTML = `<i data-lucide="${icon}" style="width:60px;height:60px;color:${color}"></i>`;
            lucide.createIcons();
        } else {
            els.modalIcon.innerHTML = '';
        }
        els.modalTitle.innerText   = title;
        els.modalMessage.innerText = message;
    }

    els.modalClose.onclick = () => {
        els.modal.classList.add('hidden');
        if (els.modalTitle.innerText === 'تم الإرسال') {
            resetFullForm();
        }
    };

    function resetFullForm() {
        els.form.reset();
        capturedImageBase64 = "";
        document.querySelectorAll('.status-check').forEach(cb => cb.checked = false);
        document.querySelectorAll('.damage-input-wrapper').forEach(w => w.classList.add('hidden'));
        document.querySelectorAll('.fruit-row').forEach(row => row.classList.remove('row-error'));
        els.photoCard.classList.add('hidden');
        resetImageState();

        const toggleBtn = document.querySelector('.show-more-btn');
        if (toggleBtn) toggleBtn.style.display = 'flex';
        document.querySelectorAll('.fruit-row').forEach((row, index) => {
            row.classList.toggle('hidden-fruit', index >= INITIAL_VISIBLE_COUNT);
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ===================================================
    // إرسال النموذج
    // ===================================================
    els.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const empId  = document.getElementById('employeeId').value;
        const branch = document.querySelector('input[name="branch"]:checked');

        let inspected        = [];
        let na               = [];
        let damaged          = [];
        let missingSelection = [];
        let missingWeight    = [];

        document.querySelectorAll('.fruit-row').forEach(row => {
            const nameAr      = row.getAttribute('data-fruit-name');
            const isChecked   = row.querySelector('.status-check:checked');
            const isNA        = row.querySelector('[data-type="na"]').checked;
            const isDamaged   = row.querySelector('[data-type="damaged"]').checked;
            const isInspected = row.querySelector('[data-type="inspected"]').checked;
            const weightInput = row.querySelector('.damage-qty');

            if (!isChecked) {
                row.classList.add('row-error');
                missingSelection.push(nameAr);
            } else {
                if (isNA) {
                    na.push(nameAr);
                } else {
                    if (isInspected) inspected.push(nameAr);
                    if (isDamaged) {
                        if (!weightInput.value || parseFloat(weightInput.value) <= 0) {
                            row.classList.add('row-error');
                            missingWeight.push(nameAr);
                        } else {
                            damaged.push(`${nameAr} (${weightInput.value}g)`);
                        }
                    }
                }
            }
        });

        if (missingSelection.length > 0) {
            showModal('error', 'تقرير غير مكتمل', `يرجى فحص جميع الأصناف. لم يتم فحص: ${missingSelection.slice(0, 3).join('، ')}`);
            return;
        }
        if (missingWeight.length > 0) {
            showModal('error', 'وزن التالف مفقود', `يرجى إدخال وزن التالف لـ: ${missingWeight.slice(0, 3).join('، ')}`);
            return;
        }
        if (!branch || !employeeDatabase[empId]) {
            showModal('error', 'بيانات ناقصة', 'يرجى اختيار الفرع والتأكد من كود الموظف.');
            return;
        }

        const anyDamaged = damaged.length > 0;
        if (anyDamaged && !capturedImageBase64) {
            showModal('error', 'صورة مفقودة', 'يرجى تصوير الفواكه التالفة قبل الإرسال.');
            return;
        }

        showModal('loading', 'جاري الإرسال', 'يرجى الانتظار، يتم رفع البيانات والصور...');
        els.submitBtn.disabled = true;

        const payload = {
            reportType:    "فحص جودة الفواكه",
            branch:        branch.value === "Muzahmiyah" ? "المزاحمية" : "الدوادمي",
            employeeId:    empId,
            employeeName:  employeeDatabase[empId],
            inspectedList: inspected.join(" - "),
            naList:        na.join(" - "),
            damagedList:   damaged.join(" - "),
            image:         capturedImageBase64
        };

        const formData = new URLSearchParams();
        formData.append('payload', JSON.stringify(payload));

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: formData,
                mode: 'cors'
            });

            const result = await response.json();

            if (result.result === 'success') {
                showModal('success', 'تم الإرسال', `تم إرسال تقرير فحص الفاكهة بنجاح برقم: ${result.id}`);
                resetFullForm();
                // تحديث الإشعارات بعد الإرسال الناجح
                if (typeof FILNotifications !== 'undefined') {
                    FILNotifications.refresh();
                }
            } else {
                throw new Error(result.message || 'فشل السيرفر في معالجة الطلب');
            }
        } catch (error) {
            console.error("Submission Error:", error);
            showModal('error', 'فشل الإرسال', 'حدث خطأ في الاتصال بالسيرفر. يرجى التأكد من جودة الإنترنت وحاول مجدداً.');
        } finally {
            els.submitBtn.disabled = false;
            els.submitBtn.style.opacity = "1";
        }
    });
});