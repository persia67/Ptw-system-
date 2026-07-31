import type { PermitTypeId, Settings, WorkflowStep, ChecklistAnswer } from "./types";

export const PERMIT_TYPES: {
  id: PermitTypeId;
  title: string;
  short: string;
  color: string;
}[] = [
  { id: "hot", title: "کار گرم (جوشکاری و برشکاری)", short: "کار گرم", color: "hot" },
  { id: "height", title: "کار در ارتفاع", short: "ارتفاع", color: "height" },
  { id: "confined", title: "ورود به فضای بسته", short: "فضای بسته", color: "confined" },
  { id: "cold", title: "کار سرد (مکانیکی عمومی)", short: "کار سرد", color: "cold" },
  { id: "excavation", title: "حفاری و گودبرداری", short: "حفاری", color: "excavation" },
  { id: "electrical", title: "کار برقی / LOTO", short: "برق و LOTO", color: "electrical" },
  { id: "custom", title: "سایر (عنوان دستی)", short: "سایر", color: "custom" },
];

export const permitTypeTitle = (id: PermitTypeId, custom?: string) =>
  id === "custom" ? custom || "سایر" : (PERMIT_TYPES.find((t) => t.id === id)?.title ?? id);

export const permitTypeShort = (id: PermitTypeId, custom?: string) =>
  id === "custom" ? custom || "سایر" : (PERMIT_TYPES.find((t) => t.id === id)?.short ?? id);

export const STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس",
  pending: "در انتظار تایید",
  active: "فعال (صادر شده)",
  suspended: "معلق",
  cancelled: "باطل شده",
  closed: "بسته و بایگانی شده",
};

const mk = (items: string[]): ChecklistAnswer[] =>
  items.map((label, i) => ({ id: `c${i}`, label, value: null }));

export const HAZARDS_BY_TYPE: Record<PermitTypeId, string[]> = {
  hot: [
    "وجود مواد قابل اشتعال در شعاع ۱۱ متری",
    "جرقه و پاشش مذاب به طبقات پایین‌تر",
    "دود و گازهای جوشکاری",
    "برق‌گرفتگی از دستگاه جوش",
    "مجاورت با خطوط گاز یا روغن",
  ],
  height: [
    "سقوط از ارتفاع",
    "سقوط اشیاء بر روی افراد پایین",
    "ناپایداری داربست یا نردبان",
    "وزش باد شدید",
    "مجاورت با خطوط برق هوایی",
  ],
  confined: [
    "کمبود اکسیژن",
    "تجمع گازهای سمی یا قابل اشتعال",
    "ورود ناخواسته مواد از خطوط متصل",
    "راه‌اندازی ناگهانی تجهیزات داخل فضا",
    "دشواری امداد و نجات",
  ],
  cold: [
    "گیر افتادن در قطعات متحرک",
    "بریدگی و ضربه با ابزار دستی",
    "لغزش، سقوط هم‌سطح",
    "بار معلق و جابجایی دستی بار",
    "لبه‌های تیز ورق گالوانیزه",
  ],
  excavation: [
    "ریزش دیواره گود",
    "برخورد با تاسیسات مدفون (برق، گاز، آب)",
    "سقوط افراد یا ماشین‌آلات در گود",
    "تجمع آب یا گاز در گود",
    "ارتعاش و نشست سازه مجاور",
  ],
  electrical: [
    "برق‌گرفتگی و قوس الکتریکی",
    "انرژی ذخیره‌شده (خازن، فنر، هیدرولیک)",
    "راه‌اندازی ناخواسته تجهیز",
    "تغذیه برگشتی از منبع دوم",
    "کار روی تابلو تحت ولتاژ",
  ],
  custom: ["خطرات مکانیکی", "خطرات شیمیایی", "خطرات الکتریکی", "خطرات ارگونومیک", "خطرات محیطی"],
};

export const CONTROLS_BY_TYPE: Record<PermitTypeId, string[]> = {
  hot: [
    "پاکسازی محل از مواد قابل اشتعال",
    "استقرار کپسول اطفاء حریق مناسب و آماده",
    "تعیین نگهبان آتش تا ۳۰ دقیقه پس از پایان کار",
    "پوشش ضدجرقه (پتوی نسوز) روی تجهیزات مجاور",
    "گازسنجی محیط پیش از شروع کار",
    "قطع و ایزوله خطوط گاز و روغن مجاور",
  ],
  height: [
    "استفاده از هارنس کامل بدن با دو قلاب",
    "نصب نقطه اتصال (Anchor) مطمئن",
    "بازرسی و تاییدیه داربست (تگ سبز)",
    "محصور کردن و علامت‌گذاری محدوده زیر کار",
    "ممنوعیت حمل ابزار در دست هنگام بالا رفتن",
  ],
  confined: [
    "گازسنجی پیوسته پیش و حین کار",
    "برقراری تهویه اجباری",
    "تعیین دیده‌بان (Attendant) در دهانه ورودی",
    "کور کردن (Blinding) خطوط متصل",
    "اجرای کامل LOTO روی تجهیزات مرتبط",
    "آماده بودن تجهیزات نجات و ارتباط",
  ],
  cold: [
    "توقف و ایزوله تجهیز پیش از کار",
    "استفاده از ابزار سالم و استاندارد",
    "علامت‌گذاری و محصور کردن محل کار",
    "استفاده از دستکش مقاوم در برابر برش",
    "برگزاری جلسه توجیهی پیش از کار (TBM)",
  ],
  excavation: [
    "استعلام و شناسایی تاسیسات مدفون",
    "شیب‌دار کردن یا مهاربندی دیواره گود",
    "نصب حفاظ و علائم هشدار پیرامون گود",
    "تعبیه راه خروج اضطراری (نردبان)",
    "بازرسی روزانه گود پیش از شروع کار",
  ],
  electrical: [
    "قطع منبع تغذیه و اجرای قفل و برچسب (LOTO)",
    "تست عدم وجود ولتاژ با ابزار کالیبره",
    "اتصال زمین موقت",
    "استفاده از دستکش عایق و ابزار عایق‌دار",
    "نصب تابلوی «دست نزنید - در حال تعمیر»",
  ],
  custom: [
    "برگزاری جلسه توجیهی ایمنی پیش از کار",
    "محصور کردن و علامت‌گذاری محل کار",
    "استفاده از تجهیزات حفاظت فردی متناسب",
    "ایزوله کردن منابع انرژی",
  ],
};

export const PPE_OPTIONS = [
  "کلاه ایمنی",
  "عینک ایمنی",
  "شیلد صورت",
  "کفش ایمنی",
  "دستکش ضدبرش",
  "دستکش نسوز",
  "دستکش عایق برق",
  "گوشی ایمنی",
  "ماسک فیلتردار",
  "ماسک تنفسی هواساز",
  "هارنس کامل بدن",
  "لباس کار نسوز",
  "پیش‌بند چرمی",
  "گتر جوشکاری",
];

export const ENERGY_SOURCES = [
  "الکتریکی",
  "مکانیکی",
  "هیدرولیک",
  "پنوماتیک",
  "حرارتی",
  "ثقلی",
  "شیمیایی",
  "بخار",
];

export const buildChecklist = (labels: string[]) => mk(labels);

export const DEFAULT_WORKFLOW: WorkflowStep[] = [
  {
    id: "requester",
    title: "درخواست و تعهد مجری کار",
    roleTitle: "مجری / پیمانکار",
    required: true,
    onlyForTypes: [],
  },
  {
    id: "area_owner",
    title: "تایید سرپرست واحد بهره‌بردار",
    roleTitle: "سرپرست بهره‌برداری",
    required: true,
    onlyForTypes: [],
  },
  {
    id: "electrical",
    title: "تایید ایزولاسیون و قفل و برچسب",
    roleTitle: "سرپرست برق / تعمیرات",
    required: true,
    onlyForTypes: [],
    onlyIfLoto: true,
  },
  {
    id: "hse",
    title: "بازدید و تایید واحد HSE",
    roleTitle: "کارشناس ایمنی و بهداشت حرفه‌ای",
    required: true,
    onlyForTypes: [],
  },
  {
    id: "fire_watch",
    title: "تایید نگهبان آتش / دیده‌بان",
    roleTitle: "نگهبان آتش",
    required: true,
    onlyForTypes: ["hot", "confined"],
  },
  {
    id: "manager",
    title: "تایید نهایی و صدور مجوز",
    roleTitle: "مدیر کارخانه / مدیر فنی",
    required: true,
    onlyForTypes: [],
  },
];

export const DEFAULT_SETTINGS: Settings = {
  companyName: "شرکت تولید ورق گالوانیزه و رنگی",
  plantName: "کارخانه اصلی",
  units: [
    "خط گالوانیزه",
    "خط رنگ",
    "خط برش طولی (اسلیتر)",
    "خط برش عرضی",
    "کوره و پیش‌گرم",
    "واحد اسیدشویی",
    "تاسیسات و یوتیلیتی",
    "انبار محصول",
    "تعمیرگاه مرکزی",
    "محوطه و ساختمان اداری",
  ],
  people: [
    { name: "", position: "مجری / پیمانکار" },
    { name: "", position: "سرپرست بهره‌برداری" },
    { name: "", position: "سرپرست برق / تعمیرات" },
    { name: "", position: "کارشناس ایمنی و بهداشت حرفه‌ای" },
    { name: "", position: "نگهبان آتش" },
    { name: "", position: "مدیر کارخانه / مدیر فنی" },
  ],
  workflow: DEFAULT_WORKFLOW,
  defaultDurationHours: {
    hot: 8,
    height: 8,
    confined: 6,
    cold: 12,
    excavation: 12,
    electrical: 8,
    custom: 8,
  },
  currentUser: { name: "کارشناس ایمنی", position: "کارشناس ایمنی و بهداشت حرفه‌ای" },
};
