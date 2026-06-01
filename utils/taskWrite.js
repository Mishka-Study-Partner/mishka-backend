/**
 * Map task create/update body and set `completedAt` when status transitions.
 * @param {object} body
 * @param {{ status?: string, completedAt?: Date | null } | null} [existing]
 */
function mapTaskWriteData(body, existing = null) {
  const data = { ...body };
  if (data.status === "completed") {
    if (!existing || existing.status !== "completed") {
      if (data.completedAt == null) data.completedAt = new Date();
      else if (typeof data.completedAt === "string") data.completedAt = new Date(data.completedAt);
    }
  } else if (data.status != null && data.status !== "completed" && existing?.status === "completed") {
    data.completedAt = null;
  }
  return data;
}

module.exports = { mapTaskWriteData };
