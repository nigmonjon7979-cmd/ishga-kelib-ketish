const { ensureSchema, getSql, json, methodNotAllowed, serverError } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res);
    return;
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT
        id,
        action,
        employee_id AS "employeeId",
        employee_name AS "employeeName",
        detail,
        reason,
        created_at AS "createdAt"
      FROM admin_logs
      ORDER BY created_at DESC
      LIMIT 50
    `;
    json(res, 200, { logs: rows });
  } catch (error) {
    serverError(res, error);
  }
};
