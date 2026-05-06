const swaggerUi = require("swagger-ui-express");
const { buildOpenApi } = require("./openapi");
const { mishkaOpsFilterPlugin } = require("./swaggerFilterPlugin");

/**
 * Serves OpenAPI 3 spec + Swagger UI. Must be registered **before** any global
 * `app.use(requireAuth)` in `index.js` so `/api-docs` and `/openapi.json` stay public.
 *
 * @param {import("express").Express} app
 */
function setupSwagger(app) {
  const spec = buildOpenApi();

  app.get("/openapi.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(spec);
  });

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: "Mishka API — Swagger",
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: "list",
        filter: true,
        tryItOutEnabled: true,
        tagsSorter: "alpha",
        operationsSorter: "alpha",
        // Do not pass SwaggerUIBundle.plugins.DownloadUrl from Node: swagger-ui-express
        // inlines functions into swagger-ui-init.js, and DownloadUrl references bundle
        // internals (e.g. lt) that only exist when the fn runs inside swagger-ui-bundle.
        plugins: [mishkaOpsFilterPlugin],
      },
      customCss: `
.swagger-ui .markdown strong {
  font-weight: 500 !important;
  color: #556478 !important;
  background: transparent !important;
}
.swagger-ui .markdown code {
  font-weight: normal !important;
  color: #384452 !important;
  background-color: #eef2f6 !important;
}
.swagger-ui .filter .operation-filter-input {
  border-radius: 6px;
}
`,
    })
  );
}

module.exports = { setupSwagger };
