/**
 * products.js — بيانات مطعم البرجر
 * عدّل هذا الملف لإضافة منتجاتك الحقيقية
 */

const restaurantInfo = {
  nameAr:       'ديو برجر',
  nameEn:       'DUO Burger',
  taglineAr:    'نكهة لا تُنسى في كل قضمة',
  logo:         'images/logo.ico',
  phone:        '059 301 1999',
  workingHours: '12:00 م – 03:00 ص',
  workingDays:  'طوال أيام الأسبوع',
  instagram:    'duo_burger1@',
  tiktok:       'theduoburger@',
  address:      'مكه - حي الشوقية',
  taxNote:      'الأسعار شاملة ضريبة القيمة المضافة 15%',
  googleMapsUrl: 'https://maps.app.goo.gl//ديو+برجر+DUO+BURGER%E2%80%AD/@21.377399,39.769425,16.83z/data=!4m6!3m5!1s0x15c21b003ee4d6c3:0xfae4e901ae19f8e0!8m2!3d21.3781865!4d39.768244!16s%2Fg%2F11zc3dx62w?entry=ttu&g_ep=EgoyMDI2MDYyOS4wIKXMDSoASAFQAw%3D%3D',   // ← ضع رابط صفحة تقييم المطعم
  googleMapsQr:  'images/review-qr.png',                     // ← صورة QR Code (اختياري)
};

const menuCategories = [

  /* ──────────────────────────────────────
     الأطباق الرئيسية
  ────────────────────────────────────── */
  {
    id: 'main',
    nameAr: 'الأطباق الرئيسية',
    nameEn: 'Main Dishes',
    icon: 'fa-burger',
    items: [
      {
        nameAr:        'دبل ديو برجر',
        nameEn:        'Double DUO Burder',
        image:         'images/products/duo-burger.jpg',
        price:         23,
        calories:      630,
        descriptionAr: 'برجر اسماش دبل 140 غرام من اللحم المشوي، مع صوص، يعطي لذعة حموضة',
        ingredients: [
          { nameAr: 'خبز بريوش', removable: false },
          { nameAr: 'لحم سماش دبل 140غ', removable: false },
          { nameAr: 'جبنة شيدر', removable: false },
          { nameAr: 'مخلل', removable: true },
          { nameAr: 'صوص ديو', removable: false },
        ],
      },
      {
        nameAr:        'دبل اوريقا برجر',
        nameEn:        'Double Origa Burger',
        image:         'images/products/origa-burger.jpg',
        price:         23,
        calories:      946,
        descriptionAr: 'برجر اسماش دبل 140 غرام من اللحم المشوي، معصوص يعطي اللحمة بعضا من الحلاوة',
        ingredients: [
          { nameAr: 'خبز بريوش', removable: false },
          { nameAr: 'لحم سماش دبل 140غ', removable: false },
          { nameAr: 'جبنة شيدر', removable: false },
          { nameAr: 'صوص اوريقا', removable: false },
        ],
      },
      {
        nameAr:        'دبل ترافل برجر',
        nameEn:        'Double Truffle Burger',
        image:         'images/products/truffle-burger.png',
        price:         26,
        descriptionAr: 'برجر اسماش دبل 140 غرام لعشاق النكهات العميقة والفريدة، ليقدم مزيجاً لا يُقاوم من المكونات الفاخرة التي تذوب في الفم وتأخذ حواسك إلى مستوى آخر',
        ingredients: [
          { nameAr: 'خبز بريوش', removable: false },
          { nameAr: 'لحم سماش دبل 140غ', removable: false },
          { nameAr: 'جبنة شيدر', removable: false },
          { nameAr: 'صوص ترافل', removable: false },
        ],
      },
      {
        nameAr:        'أضافة شريحة لحم',
        nameEn:        'Add a ٍٍٍٍٍٍslice Of Meat',
        image:         '',
        price:         6,
        calories:      120,        
        descriptionAr: 'كملها بإضافة شريحة لحم على البرجر ليصبح تريبل، أو. كواردير تصل شريحة اللحم الواحدة 70 غم',
      },
      {
        nameAr:        'وجبة برجر',
        nameEn:        'Burger Meal',
        image:         'images/products/burger-meal.jpg',
        price:         33,
        isMeal:        true,
        descriptionAr: 'وجبة من البرجر، ديو، أو أوريغا مع البطاطس المقلية المبهرة والمشروب',
      },
      
    ],
  },

  /* ──────────────────────────────────────
     الأطباق الجانبية
  ────────────────────────────────────── */
  {
    id: 'sides',
    nameAr: 'الأطباق الجانبية',
    nameEn: 'Side Dishes',
    icon: 'fa-bowl-food',
    items: [
      {
        nameAr:        'بطاطس مبهرة',
        nameEn:        'Seasoned Potatoes',
        image:         'images/products/fries.jpg',
        price:         7,
        calories:      311,
        descriptionAr: 'بطاطس مقلية ذهبية ببهارات ديو',
      },
      {
        nameAr:        'أضلاع الذرة',
        nameEn:        'Corn Ribs',
        image:         'images/products/corn-ribs.jpg',
        price:         14,
        calories:      200,
        descriptionAr: '6 قطع من أضلاع، الدرة الذهبية المقلية. معصوص الكريمة والبهارات ديو',
      },
      {
        nameAr:        'تكساس فرايز',
        nameEn:        'Spicy Wedges',
        image:         'images/products/spicy-wedges.jpg',
        price:         19,
        descriptionAr: 'البطاطس المقلية الذهبية معصوص ديو أو أوريغا من اختيارك و اللحم. وصوص الجبنة وقطع الهليبينو',
        sauceOptions:  ['صوص الديو', 'صوص أوريقا'],
      },
    ],
  },

  /* ──────────────────────────────────────
     المشروبات
  ────────────────────────────────────── */
  {
    id: 'drinks',
    nameAr: 'المشروبات',
    nameEn: 'Drinks',
    icon: 'fa-glass-water',
    items: [
      {
        nameAr:        'مشروبات غازية',
        nameEn:        'Soft Drink',
        image:         '',
        price:         3,
        variants:      ['كولا', 'كولا دايت', 'كولا زيرو', 'سبرايت'],
      },
      {
        nameAr:        'مياه',
        nameEn:        'Water',
        image:         '',
        price:         1,
      },
    ],
  },

  /* ──────────────────────────────────────
     الصوصات
  ────────────────────────────────────── */
  {
    id: 'sauces',
    nameAr: 'الصوصات',
    nameEn: 'Sauces',
    icon: 'fa-bottle-droplet',
    items: [
      {
        nameAr:        'صوص ديو',
        nameEn:        'DUO Sauce',
        image:         'images/products/duo-sauce.jpg',
        price:         3,
        calories:      105,
        descriptionAr: 'صوص ديو لخليط سري، في نكهة. الليمون',
      },
      {
        nameAr:        'صوص اوريقا',
        nameEn:        'Origa Sauce',
        image:         'images/products/origa-sauce.jpg',
        price:         3,
        calories:      105,
        descriptionAr: 'صوص ارويقا في نكهة حالية',
      },
      {
        nameAr:        'صوص ترافل',
        nameEn:        'Truffle Sauce',
        price:         4,
        descriptionAr: 'صوص ترافل لعشاق النكهات العميقة والفريدة',
      },
      {
        nameAr:        'صوص جبنه',
        nameEn:        'Cheese Sauce',
        price:         3,
        descriptionAr: '',
      },
      {
        nameAr:        'قطع مخلل',
        nameEn:        'Pickled pieces',
        price:         2,
        descriptionAr: '',
      },
      {
        nameAr:        'قطع هلابينو',
        nameEn:        'Jalapeño Slices',
        price:         2,
        descriptionAr: '',
      },
      
    ],
  },

];
