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
};

function messagesForCode(code) {
  return ERROR_MESSAGES[code] || null;
}

module.exports = { ERROR_MESSAGES, messagesForCode };
