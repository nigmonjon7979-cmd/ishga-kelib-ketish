const { ensureSchema, getSql, json, methodNotAllowed, serverError } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res);
    return;
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const day = req.query.day || new Date().toISOString().slice(0, 10);

    const employees = await sql`
      SELECT
        id,
        name,
        role,
        phone,
        location_id AS "locationId",
        shift_start AS "shiftStart",
        shift_end AS "shiftEnd",
        status,
        photo,
        code
      FROM employees
      ORDER BY created_at ASC
    `;

    const rows = await sql`
      SELECT
        a.day,
        a.employee_id AS "employeeId",
        a.arrival,
        a.departure,
        a.arrival_photo_id AS "arrivalPhoto",
        a.departure_photo_id AS "departurePhoto",
        a.arrival_saved_at AS "arrivalSavedAt",
        a.departure_saved_at AS "departureSavedAt",
        pa.face_status AS "arrivalFaceStatus",
        pa.geo_status AS "arrivalGeoStatus",
        pd.face_status AS "departureFaceStatus",
        pd.geo_status AS "departureGeoStatus"
      FROM attendance a
      LEFT JOIN proofs pa ON pa.id = a.arrival_photo_id
      LEFT JOIN proofs pd ON pd.id = a.departure_photo_id
      WHERE a.day = ${day}
    `;

    const attendance = { [day]: {} };
    rows.forEach((row) => {
      attendance[day][row.employeeId] = {
        arrival: row.arrival || undefined,
        departure: row.departure || undefined,
        arrivalPhoto: row.arrivalPhoto || undefined,
        departurePhoto: row.departurePhoto || undefined,
        arrivalSavedAt: row.arrivalSavedAt || undefined,
        departureSavedAt: row.departureSavedAt || undefined,
        arrivalFaceStatus: row.arrivalFaceStatus || undefined,
        arrivalGeoStatus: row.arrivalGeoStatus || undefined,
        departureFaceStatus: row.departureFaceStatus || undefined,
        departureGeoStatus: row.departureGeoStatus || undefined,
      };
    });

    json(res, 200, { employees, attendance });
  } catch (error) {
    serverError(res, error);
  }
};
