const { primaryCategoryLabel } = require("./communityDiscoverTaxonomy");

function normalizeCategoryTitle(raw) {
  if (raw == null) return null;
  const t = String(raw).trim();
  return t ? t.slice(0, 100) : null;
}

/**
 * Resolve display category from create/update body.
 * `newCategoryTitle` wins over `category` (pick existing). On partial update, omit both to leave unchanged.
 */
function resolveCategoryFromBody(body, { partial, subjectKeysForDefault, locale = "en" }) {
  const fromNew = normalizeCategoryTitle(body.newCategoryTitle);
  const fromExisting = normalizeCategoryTitle(body.category);
  if (fromNew) return fromNew;
  if (fromExisting) return fromExisting;
  if (partial) return undefined;
  return primaryCategoryLabel(subjectKeysForDefault, locale);
}

module.exports = { normalizeCategoryTitle, resolveCategoryFromBody };
