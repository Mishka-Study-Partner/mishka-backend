/**
 * Swagger UI 5 filters only by tag name (case-sensitive). This plugin keeps the
 * filter box useful: case-insensitive match on tag, path, method, summary,
 * description, and x-scope (set in specEnrich).
 */
function mishkaOpsFilterPlugin(system) {
  const { Im } = system;
  const { List, Map } = Im;

  return {
    fn: {
      opsFilter(taggedOps, phrase) {
        if (phrase === true || phrase === false || phrase == null) {
          return taggedOps;
        }
        const raw = String(phrase).trim();
        if (raw === "") {
          return taggedOps;
        }

        const q = raw.toLowerCase();

        return taggedOps
          .map((tagObj, tag) => {
            const tagStr = String(tag);
            if (tagStr.toLowerCase().includes(q)) {
              return tagObj;
            }

            const ops = tagObj.get("operations");
            if (!List.isList(ops)) {
              return tagObj.set("operations", List());
            }

            const filtered = ops.filter((op) => {
              if (!Map.isMap(op)) return false;
              const path = String(op.get("path") ?? "");
              const method = String(op.get("method") ?? "");
              const operation = op.get("operation");
              const opMap = Map.isMap(operation) ? operation : Map();

              const summary = String(opMap.get("summary") ?? "");
              const description = String(opMap.get("description") ?? "");
              const operationId = String(opMap.get("operationId") ?? "");
              const xScope = String(opMap.get("x-scope") ?? "");

              const hay = `${path} ${method} ${summary} ${description} ${operationId} ${xScope}`.toLowerCase();
              return hay.includes(q);
            });

            return tagObj.set("operations", filtered);
          })
          .filter((tagObj) => {
            const ops = tagObj.get("operations");
            return ops && ops.size > 0;
          });
      },
    },
  };
}

module.exports = { mishkaOpsFilterPlugin };
