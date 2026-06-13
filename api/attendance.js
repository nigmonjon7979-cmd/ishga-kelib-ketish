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
        day,
        employee_id AS "employeeId",
        arrival,
        departure,
        arrival_photo_id AS "arrivalPhoto",
        departure_photo_id AS "departurePhoto",
        arrival_saved_at AS "arrivalSavedAt",
        departure_saved_at AS "departureSavedAt"
      FROM attendance
      WHERE day = ${day}
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
      };
    });

    json(res, 200, { employees, attendance });
  } catch (error) {
    serverError(res, error);
  }
};
