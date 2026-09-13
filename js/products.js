/**
 * products.js — بيانات مطعم البرجر
 * عدّل هذا الملف لإضافة منتجاتك الحقيقية
 */

const restaurantInfo = {
  nameAr:       'ديو برجر',
  nameEn:       'DUO Burger',
  taglineAr:    'نكهة لا تُنسى في كل قضمة',
  taglineEn:    'An unforgettable flavor in every bite',
  logo:         'images/logo.ico',
  phone:        '059 301 1999',
  workingHours: '12:00 م – 03:00 ص',
  workingHoursEn: '12:00 PM – 3:00 AM',
  workingDays:  'طوال أيام الأسبوع',
  workingDaysEn: 'Every day of the week',
  instagram:    'duo_burger1@',
  tiktok:       'theduoburger@',
  address:      'مكه - حي الشوقية',
  addressEn:    'Makkah - Al-Shawqiyah District',
  taxNote:      'الأسعار شاملة ضريبة القيمة المضافة 15%',
  taxNoteEn:    'Prices include 15% VAT',
  googleMapsUrl: 'https://maps.app.goo.gl//ديو+برجر+DUO+BURGER%E2%80%AD/@21.377399,39.769425,16.83z/data=!4m6!3m5!1s0x15c21b003ee4d6c3:0xfae4e901ae19f8e0!8m2!3d21.3781865!4d39.768244!16s%2Fg%2F11zc3dx62w?entry=ttu&g_ep=EgoyMDI2MDYyOS4wIKXMDSoASAFQAw%3D%3D',   // ← ضع رابط صفحة تقييم المطعم
  googleMapsQr:  'images/review-qr.png',
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
        descriptionEn: 'A double smash burger made with 140g of grilled beef, topped with our signature sauce for a tangy kick.',
        ingredients: [
          { nameAr: 'خبز بريوش', nameEn: 'Brioche Bun', removable: false },
          { nameAr: 'لحم سماش دبل 140غ', nameEn: 'Double Smash Beef Patty (140g)', removable: false },
          { nameAr: 'جبنة شيدر', nameEn: 'Cheddar Cheese', removable: false },
          { nameAr: 'مخلل', nameEn: 'Pickles', removable: true },
          { nameAr: 'صوص ديو', nameEn: 'DUO Sauce', removable: false },
        ],
      },
      {
        nameAr:        'دبل اوريقا برجر',
        nameEn:        'Double Origa Burger',
        image:         'images/products/origa-burger.jpg',
        price:         23,
        calories:      946,
        descriptionAr: 'برجر سماش دبل 140 غرام من اللحم المشوي، مع صوص فيه نسبه حلاوه بسيطة',
        descriptionEn: 'A double smash burger made with 140g of grilled beef, topped with a subtly sweet signature sauce.',
        ingredients: [
          { nameAr: 'خبز بريوش', nameEn: 'Brioche Bun', removable: false },
          { nameAr: 'لحم سماش دبل 140غ', nameEn: 'Double Smash Beef Patty (140g)', removable: false },
          { nameAr: 'جبنة شيدر', nameEn: 'Cheddar Cheese', removable: false },
          { nameAr: 'صوص اوريقا', nameEn: 'Origa Sauce', removable: false },
        ],
      },
      {
        nameAr:        'دبل ترافل برجر',
        nameEn:        'Double Truffle Burger',
        image:         'images/products/truffle-burger.jpg',
        price:         26,
        descriptionAr: 'برجر اسماش دبل 140 غرام لعشاق النكهات العميقة والفريدة، ليقدم مزيجاً لا يُقاوم من المكونات الفاخرة التي تذوب في الفم وتأخذ حواسك إلى مستوى آخر',
        descriptionEn: 'A double smash burger made with 140g of grilled beef for lovers of deep, distinctive flavors — an irresistible blend of premium ingredients that melts in your mouth and takes your senses to another level.',
        ingredients: [
          { nameAr: 'خبز بريوش', nameEn: 'Brioche Bun', removable: false },
          { nameAr: 'لحم سماش دبل 140غ', nameEn: 'Double Smash Beef Patty (140g)', removable: false },
          { nameAr: 'جبنة شيدر', nameEn: 'Cheddar Cheese', removable: false },
          { nameAr: 'صوص ترافل', nameEn: 'Truffle Sauce', removable: false },
        ],
      },
      {
        nameAr:        'أضافة شريحة لحم',
        nameEn:        'Add Aslice Of Meat',
        image:         '',
        price:         6,
        calories:      120,
        descriptionAr: 'كملها بإضافة شريحة لحم على البرجر ليصبح تريبل، أو. كواردير تصل شريحة اللحم الواحدة 70 غم',
        descriptionEn: 'Complete your burger by adding an extra patty to make it a triple or quadruple — each additional patty weighs about 70g.',
      },
      {
        nameAr:        'وجبة برجر',
        nameEn:        'Burger Meal',
        image:         'images/products/burger-meal.jpg',
        price:         33,
        isMeal:        true,
        descriptionAr: 'وجبة من البرجر، ديو، أو أوريغا مع البطاطس المقلية المبهرة والمشروب',
        descriptionEn: 'A meal with your choice of DUO or Origa burger, served with seasoned fries and a drink.',
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
        descriptionEn: 'Golden fried potatoes seasoned with DUO\'s signature spice blend.',
      },
      {
        nameAr:        'أضلاع الذرة',
        nameEn:        'Corn Ribs',
        image:         'images/products/corn-ribs.jpg',
        price:         14,
        calories:      200,
        descriptionAr: '6 قطع من أضلاع، الدرة الذهبية المقلية. معصوص الكريمة والبهارات ديو',
        descriptionEn: '6 pieces of golden fried corn ribs, served with creamy sauce and DUO spices.',
      },
      {
        nameAr:        'تكساس فرايز',
        nameEn:        'Spicy Wedges',
        image:         'images/products/spicy-wedges.jpg',
        price:         19,
        descriptionAr: 'البطاطس المقلية الذهبية معصوص ديو أو أوريغا من اختيارك و اللحم. وصوص الجبنة وقطع الهليبينو',
        descriptionEn: 'Golden fried potato wedges topped with your choice of DUO or Origa sauce and meat, finished with cheese sauce and jalapeño slices.',
        sauceOptions:  ['صوص الديو', 'صوص أوريقا'],
        sauceOptionsEn: ['DUO Sauce', 'Origa Sauce'],
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
        variantsEn:    ['Cola', 'Diet Cola', 'Zero Cola', 'Sprite'],
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
        descriptionEn: 'DUO\'s secret-blend sauce with a hint of lemon flavor.',
      },
      {
        nameAr:        'صوص اوريقا',
        nameEn:        'Origa Sauce',
        image:         'images/products/origa-sauce.jpg',
        price:         3,
        calories:      105,
        descriptionAr: 'صوص ارويقا في نكهة حالية',
        descriptionEn: 'Origa sauce with a delightfully sweet flavor.',
      },
      {
        nameAr:        'صوص ترافل',
        nameEn:        'Truffle Sauce',
        price:         4,
        descriptionAr: 'صوص ترافل لعشاق النكهات العميقة والفريدة',
        descriptionEn: 'Truffle sauce for lovers of deep, distinctive flavors.',
      },
      {
        nameAr:        'صوص جبنه',
        nameEn:        'Cheese Sauce',
        price:         3,
        descriptionAr: '',
        descriptionEn: '',
      },
      {
        nameAr:        'قطع مخلل',
        nameEn:        'Pickled pieces',
        price:         2,
        descriptionAr: '',
        descriptionEn: '',
      },
      {
        nameAr:        'قطع هلابينو',
        nameEn:        'Jalapeño Slices',
        price:         2,
        descriptionAr: '',
        descriptionEn: '',
      },
      
    ],
  },

];
