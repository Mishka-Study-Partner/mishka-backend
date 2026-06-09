/**
 * Stable error codes → English / Arabic copy for clients (Flutter maps on `error`).
 */
const ERROR_MESSAGES = {
  VALIDATION_ERROR: {
    en: "Validation failed",
    ar: "فشل التحقق من البيانات",
  },
  AUTH_MISSING_TOKEN: {
    en: "Missing Bearer token",
    ar: "رمز المصادقة غير موجود",
  },
  AUTH_INVALID_TOKEN: {
    en: "Invalid or expired token",
    ar: "رمز المصادقة غير صالح أو منتهي",
  },
  AUTH_INVALID_CREDENTIALS: {
    en: "Invalid credentials",
    ar: "بيانات تسجيل الدخول غير صحيحة",
  },
  NOT_FOUND: {
    en: "Resource not found",
    ar: "المورد غير موجود",
  },
  USER_NOT_FOUND: {
    en: "User not found",
    ar: "المستخدم غير موجود",
  },
  INVITE_USER_NOT_FOUND: {
    en: "No Mishka account found for that email or username",
    ar: "لا يوجد حساب بهذا البريد أو اسم المستخدم",
  },
  INVITE_SELF_NOT_ALLOWED: {
    en: "You cannot invite yourself. You are already in this community.",
    ar: "لا يمكنك دعوة نفسك. أنت عضو في هذا المجتمع بالفعل.",
  },
  PREFERENCES_NOT_FOUND: {
    en: "User preferences not found",
    ar: "تفضيلات المستخدم غير موجودة",
  },
  SUBJECT_NAME_IN_USE: {
    en: "A subject with this name already exists",
    ar: "توجد مادة بنفس الاسم مسبقاً",
  },
  UNIQUE_VIOLATION: {
    en: "A record with this value already exists",
    ar: "يوجد سجل بنفس القيمة مسبقاً",
  },
  INTERNAL_ERROR: {
    en: "Internal server error",
    ar: "حدث خطأ في الخادم",
  },
  CORS_FORBIDDEN: {
    en: "Origin not allowed by CORS",
    ar: "المصدر غير مسموح به",
  },
  FORBIDDEN: {
    en: "You do not have permission to perform this action",
    ar: "ليس لديك صلاحية لتنفيذ هذا الإجراء",
  },
  SERVICE_UNAVAILABLE: {
    en: "Service unavailable",
    ar: "الخدمة غير متاحة",
  },
  AI_SERVICE_ERROR: {
    en: "Upstream AI service error",
    ar: "خطأ في خدمة الذكاء الاصطناعي",
  },
  AI_SESSION_NOT_FOUND: {
    en: "AI tutor session expired or not found — start a new chat or re-upload your file",
    ar: "انتهت جلسة المعلّم أو لم تُعثر عليها — ابدأ محادثة جديدة أو أعد رفع الملف",
  },
  CHAT_SESSION_NOT_FOUND: {
    en: "Chat session not found",
    ar: "لم يتم العثور على جلسة المحادثة",
  },
  RESET_CODE_INVALID: {
    en: "Invalid or expired reset code",
    ar: "رمز إعادة التعيين غير صالح أو منتهي",
  },
  SIGNUP_OTP_INVALID: {
    en: "Invalid or expired signup verification code",
    ar: "رمز التحقق من التسجيل غير صالح أو منتهي",
  },
  SIGNUP_OTP_SEND_FAILED: {
    en: "Failed to create signup verification",
    ar: "فشل إنشاء رمز التحقق من التسجيل",
  },
  SIGNUP_OTP_STORAGE_NOT_READY: {
    en: "Signup OTP storage is not ready",
    ar: "خدمة تخزين رمز التحقق غير جاهزة",
  },
  AUTH_EMAIL_IN_USE: {
    en: "This email is already registered",
    ar: "هذا البريد الإلكتروني مسجل مسبقاً",
  },
  AUTH_PHONE_IN_USE: {
    en: "This phone number is already registered",
    ar: "رقم الهاتف مسجل مسبقاً",
  },
  SAVED_LIBRARY_NOT_SAVED: {
    en: "This item is not in your saved library",
    ar: "هذا العنصر غير موجود في مكتبتك المحفوظة",
  },
  QUIZ_NOT_FOUND: {
    en: "Quiz not found",
    ar: "الاختبار غير موجود",
  },
  FLASHCARD_SET_NOT_FOUND: {
    en: "Flashcard set not found",
    ar: "مجموعة البطاقات غير موجودة",
  },
  SUMMARY_NOT_FOUND: {
    en: "Summary not found",
    ar: "الملخص غير موجود",
  },
  MIND_MAP_NOT_FOUND: {
    en: "Mind map not found",
    ar: "الخريطة الذهنية غير موجودة",
  },
  AUTH_OAUTH_EMAIL_CONFLICT: {
    en: "This email is linked to another sign-in method",
    ar: "هذا البريد مرتبط بطريقة تسجيل أخرى",
  },
  OAUTH_NOT_CONFIGURED: {
    en: "This sign-in provider is not configured on the server",
    ar: "مزود تسجيل الدخول غير مهيأ على الخادم",
  },
  OAUTH_TOKEN_INVALID: {
    en: "Invalid or expired provider token",
    ar: "رمز مزود تسجيل الدخول غير صالح أو منتهي",
  },
  STREAK_FREEZE_EXHAUSTED: {
    en: "No streak freezes remaining",
    ar: "لا توجد أيام تجميد متبقية للسلسلة",
  },
  REPORT_EXPORT_EMAIL_NOT_CONFIGURED: {
    en: "Report email delivery is not configured on the server",
    ar: "إرسال التقرير بالبريد غير مهيأ على الخادم",
  },
  REPORT_NO_DATA: {
    en: "No report data for this period",
    ar: "لا توجد بيانات تقرير لهذه الفترة",
  },
  USAGE_DAY_CAP_EXCEEDED: {
    en: "Daily usage reporting cap exceeded for this date",
    ar: "تم تجاوز الحد الأقصى لتسجيل وقت الاستخدام لهذا اليوم",
  },
  STUDY_SESSION_START_FAILED: {
    en: "Failed to start study session",
    ar: "فشل بدء جلسة الدراسة",
  },
  INVALID_JSON_BODY: {
    en: "Invalid JSON in request body",
    ar: "محتوى الطلب ليس JSON صالحاً",
  },
  APP_PUBLIC_SETTINGS_FAILED: {
    en: "Failed to load app settings",
    ar: "فشل تحميل إعدادات التطبيق",
  },
};

function messagesForCode(code) {
  return ERROR_MESSAGES[code] || null;
}

module.exports = { ERROR_MESSAGES, messagesForCode };
