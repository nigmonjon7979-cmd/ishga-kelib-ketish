const { randomUUID } = require("crypto");
const { ensureSchema, getSql, json, methodNotAllowed, readBody, serverError } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res);
    return;
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const body = await readBody(req);
    const employeeId = String(body.employeeId || "").trim();
    const action = String(body.action || "").trim();
    const time = String(body.time || "").trim();
    const day = String(body.day || new Date().toISOString().slice(0, 10));
    const reason = String(body.reason || "").trim();

    if (!employeeId || !["in", "out"].includes(action) || !time || !reason) {
      json(res, 400, { error: "Employee, action, time, and reason are required" });
      return;
    }

    const employeeRows = await sql`SELECT name FROM employees WHERE id = ${employeeId} LIMIT 1`;
    const employeeName = employeeRows[0]?.name || "";

    if (action === "in") {
      await sql`
        INSERT INTO attendance (day, employee_id, arrival)
        VALUES (${day}, ${employeeId}, ${time})
        ON CONFLICT (day, employee_id)
        DO UPDATE SET arrival = EXCLUDED.arrival, departure = NULL
      `;
    } else {
      await sql`
        UPDATE attendance
        SET departure = ${time}
        WHERE day = ${day} AND employee_id = ${employeeId}
      `;
    }

    await sql`
      INSERT INTO admin_logs (id, action, employee_id, employee_name, detail, reason)
      VALUES (${randomUUID()}, ${action === "in" ? "manual_arrival" : "manual_departure"}, ${employeeId}, ${employeeName}, ${`${day} ${time}`}, ${reason})
    `;

    json(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
};
