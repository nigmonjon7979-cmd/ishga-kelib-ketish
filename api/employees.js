const { randomUUID } = require("crypto");
const { ensureSchema, getSql, json, methodNotAllowed, readBody, serverError } = require("./_db");

async function generateCode(sql) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const rows = await sql`SELECT code FROM employees WHERE code = ${code} LIMIT 1`;
    if (rows.length === 0) return code;
  }

  throw new Error("Could not generate employee code");
}

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === "POST") {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      const role = String(body.role || "").trim();
      const phone = String(body.phone || "").trim();
      const locationId = String(body.locationId || "").trim();
      const shiftStart = String(body.shiftStart || "").trim();
      const shiftEnd = String(body.shiftEnd || "").trim();
      const statusInput = String(body.status || "active").trim();
      const status = ["active", "inactive", "vacation", "sick"].includes(statusInput) ? statusInput : "active";
      const photo = String(body.photo || "").trim();

      if (!name || !locationId) {
        json(res, 400, { error: "Name and location are required" });
        return;
      }

      const employee = {
        id: randomUUID(),
        name,
        role,
        phone,
        locationId,
        shiftStart,
        shiftEnd,
        status,
        photo,
        code: await generateCode(sql),
      };

      await sql`
        INSERT INTO employees (id, name, role, phone, location_id, shift_start, shift_end, status, photo, code)
        VALUES (${employee.id}, ${employee.name}, ${employee.role}, ${employee.phone}, ${employee.locationId}, ${employee.shiftStart}, ${employee.shiftEnd}, ${employee.status}, ${employee.photo}, ${employee.code})
      `;

      await sql`
        INSERT INTO admin_logs (id, action, employee_id, employee_name, detail, reason)
        VALUES (${randomUUID()}, 'employee_created', ${employee.id}, ${employee.name}, ${employee.locationId}, 'Xodim qo''shildi')
      `;

      json(res, 201, { employee });
      return;
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "").trim();
      if (!id) {
        json(res, 400, { error: "Employee id is required" });
        return;
      }

      const employeeRows = await sql`SELECT name FROM employees WHERE id = ${id} LIMIT 1`;
      await sql`DELETE FROM employees WHERE id = ${id}`;
      await sql`
        INSERT INTO admin_logs (id, action, employee_id, employee_name, detail, reason)
        VALUES (${randomUUID()}, 'employee_deleted', ${id}, ${employeeRows[0]?.name || ""}, '', 'Xodim o''chirildi')
      `;
      json(res, 200, { ok: true });
      return;
    }

    methodNotAllowed(res);
  } catch (error) {
    serverError(res, error);
  }
};
