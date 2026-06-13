const { ensureSchema, getSql, json, methodNotAllowed, serverError } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res);
    return;
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const id = String(req.query.id || "").trim();

    if (!id) {
      json(res, 400, { error: "Proof id is required" });
      return;
    }

    const rows = await sql`
      SELECT
        photo,
        location_lat AS "locationLat",
        location_lng AS "locationLng",
        location_accuracy AS "locationAccuracy",
        device_id AS "deviceId",
        geo_status AS "geoStatus",
        face_status AS "faceStatus",
        retention_until AS "retentionUntil"
      FROM proofs
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!rows[0]) {
      json(res, 404, { error: "Proof not found" });
      return;
    }

    json(res, 200, {
      photo: rows[0].photo,
      location: rows[0].locationLat !== null && rows[0].locationLng !== null ? {
        lat: rows[0].locationLat,
        lng: rows[0].locationLng,
        accuracy: rows[0].locationAccuracy,
      } : null,
      deviceId: rows[0].deviceId,
      geoStatus: rows[0].geoStatus,
      faceStatus: rows[0].faceStatus,
      retentionUntil: rows[0].retentionUntil,
    });
  } catch (error) {
    serverError(res, error);
  }
};
