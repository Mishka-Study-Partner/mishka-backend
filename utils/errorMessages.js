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
  PREFERENCES_NOT_FOUND: {
    en: "User preferences not found",
    ar: "تفضيلات المستخدم غير موجودة",
  },
  CONFLICT: {
    en: "Conflict",
    ar: "تعارض في البيانات",
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
  AUTH_EMAIL_IN_USE: {
    en: "This email is already registered",
    ar: "هذا البريد الإلكتروني مسجل مسبقاً",
  },
  AUTH_PHONE_IN_USE: {
    en: "This phone number is already registered",
    ar: "رقم الهاتف مسجل مسبقاً",
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
  USAGE_DAY_CAP_EXCEEDED: {
    en: "Daily usage reporting cap exceeded for this date",
    ar: "تم تجاوز الحد الأقصى لتسجيل وقت الاستخدام لهذا اليوم",
  },
};

function messagesForCode(code) {
  return ERROR_MESSAGES[code] || null;
}

module.exports = { ERROR_MESSAGES, messagesForCode };
