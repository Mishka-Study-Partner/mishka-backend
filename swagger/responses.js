const json = (schemaRef, description) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: schemaRef },
    },
  },
});

module.exports = {
  OkEnvelope: json("#/components/schemas/ApiSuccessEnvelope", "Success"),
  CreatedEnvelope: json("#/components/schemas/ApiSuccessEnvelope", "Created"),
  BadRequest: json("#/components/schemas/ApiErrorEnvelope", "Validation or bad request"),
  Unauthorized: json("#/components/schemas/ApiErrorEnvelope", "Missing or invalid JWT"),
  Forbidden: json("#/components/schemas/ApiErrorEnvelope", "Forbidden (e.g. not admin, wrong user)"),
  NotFound: json("#/components/schemas/ApiErrorEnvelope", "Not found"),
  Conflict: json("#/components/schemas/ApiErrorEnvelope", "Conflict / unique violation"),
  ServiceUnavailable: json("#/components/schemas/ApiErrorEnvelope", "Service unavailable (e.g. AI URL unset)"),
  InternalError: json("#/components/schemas/ApiErrorEnvelope", "Internal error"),
  defaultError: json("#/components/schemas/ApiErrorEnvelope", "Error"),
};
