const swaggerUi = require("swagger-ui-express");
const { buildOpenApi } = require("./openapi");

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
      },
    })
  );
}

module.exports = { setupSwagger };
