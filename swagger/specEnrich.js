const Ex = require("./examples");

/**
 * Remove Markdown bold markers (**text**) so Swagger UI does not render loud highlights.
 * Keeps the inner text (styling via customCss instead).
 */
function deepStripBold(obj) {
  if (typeof obj === "string") {
    return obj.replace(/\*\*([^*]*)\*\*/g, "$1").replace(/\*\*/g, "");
  }
  if (Array.isArray(obj)) return obj.map(deepStripBold);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = deepStripBold(v);
    }
    return out;
  }
  return obj;
}

function classifyAccess(pathTemplate, method, operation) {
  const m = method.toLowerCase();
  const p = pathTemplate;

  const noSecurity = !operation.security || operation.security.length === 0;
  if (noSecurity) return "Public";

  const mk = `${m}:${p}`;
  if (mk === "get:/users" || mk === "post:/users") return "Admin only";
  if (mk === "put:/public/app-settings") return "Admin only";
  if (mk === "get:/user-sessions") return "Admin only";

  if (p.startsWith("/password-reset-tokens")) return "Admin only";

  const catalogWrites = [
    ["post", "/categories"],
    ["put", "/categories"],
    ["delete", "/categories"],
    ["post", "/tips"],
    ["put", "/tips"],
    ["delete", "/tips"],
    ["post", "/icons"],
    ["put", "/icons"],
    ["delete", "/icons"],
    ["post", "/ai-tools"],
    ["put", "/ai-tools"],
    ["delete", "/ai-tools"],
  ];
  for (const [am, prefix] of catalogWrites) {
    if (m === am && (p === prefix || p.startsWith(`${prefix}/`))) return "Admin only";
  }

  return "Authenticated user";
}

function appendScopeDescription(operation, scope) {
  const hint =
    `\n\nScope: ${scope}. Filter bar (case-insensitive): matches tag names, paths, summaries, this Scope line, and x-scope — try "${scope}", admin, auth, /users, etc.`;
  if (operation.description && typeof operation.description === "string") {
    operation.description += hint;
  } else if (operation.summary) {
    operation.description = String(operation.summary) + hint;
  } else {
    operation.description = hint.trim();
  }
  operation["x-scope"] = scope;
}

function ensureResponseExamples(operation, pathTemplate, method) {
  const responses = operation.responses;
  if (!responses || typeof responses !== "object") return;

  const verb = method.toUpperCase();

  for (const [statusCode, resp] of Object.entries(responses)) {
    if (!resp || typeof resp !== "object") continue;
    const content = resp.content && resp.content["application/json"];
    if (!content || typeof content !== "object") continue;

    const hasExample =
      content.example !== undefined ||
      (content.examples && typeof content.examples === "object" && Object.keys(content.examples).length > 0);
    if (hasExample) continue;

    const codeNum = parseInt(statusCode, 10);
    const isSuccess = codeNum >= 200 && codeNum < 300;
    content.examples = {
      sample: {
        summary: `Example ${statusCode} body`,
        value: isSuccess
          ? Ex.envelopeSuccess({
              sample: true,
              route: `${verb} ${pathTemplate}`,
              hint: "See response schema / related component examples for full `data` shape.",
            })
          : Ex.envelopeError(statusCode === "401" ? "AUTH_INVALID_TOKEN" : "VALIDATION_ERROR", [
              { path: "field", message: "Reason (see error code)" },
            ]),
      },
    };
  }
}

/**
 * Post-process OpenAPI document: access scope text (for Swagger filter), strip **bold**, default examples.
 * @param {Record<string, unknown>} spec
 */
function enrichOpenApiSpec(spec) {
  const paths = spec.paths;
  if (!paths || typeof paths !== "object") return spec;

  for (const [pathTemplate, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const method of ["get", "post", "put", "patch", "delete", "options", "head"]) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== "object") continue;

      const scope = classifyAccess(pathTemplate, method, operation);
      appendScopeDescription(operation, scope);
      ensureResponseExamples(operation, pathTemplate, method);
    }
  }

  deepStripBold(spec);
  return spec;
}

module.exports = { enrichOpenApiSpec, classifyAccess, deepStripBold };
