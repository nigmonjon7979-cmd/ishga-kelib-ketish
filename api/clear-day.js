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
    const day = String(body.day || new Date().toISOString().slice(0, 10));

    await sql`DELETE FROM proofs WHERE day = ${day}`;
    await sql`DELETE FROM attendance WHERE day = ${day}`;

    json(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
};
