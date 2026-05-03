const { preferredLanguage } = require("../utils/locale");

const SUCCESS_TEXT = {
  OK: { en: "OK", ar: "تم" },
  CREATED: { en: "Created", ar: "تم الإنشاء" },
  DELETED: { en: "Deleted", ar: "تم الحذف" },
};

function pickSuccessMessage(key, lang) {
  const t = SUCCESS_TEXT[key] || SUCCESS_TEXT.OK;
  return {
    message_en: t.en,
    message_ar: t.ar,
    message: lang === "ar" ? t.ar : t.en,
  };
}

/**
 * Attaches res.apiSuccess / res.apiCreated helpers. All JSON responses use one envelope.
 */
function apiEnvelope(req, res, next) {
  const lang = () => preferredLanguage(req);

  res.apiSuccess = (data, messageKey = "OK", status = 200) => {
    const t = pickSuccessMessage(messageKey, lang());
    return res.status(status).json({
      success: true,
      message: t.message,
      message_en: t.message_en,
      message_ar: t.message_ar,
      data,
      error: null,
      details: null,
    });
  };

  res.apiCreated = (data, messageKey = "CREATED") => {
    const t = pickSuccessMessage(messageKey, lang());
    return res.status(201).json({
      success: true,
      message: t.message,
      message_en: t.message_en,
      message_ar: t.message_ar,
      data,
      error: null,
      details: null,
    });
  };

  next();
}

module.exports = { apiEnvelope };
