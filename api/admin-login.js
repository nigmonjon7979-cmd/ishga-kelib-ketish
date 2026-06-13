const { json, methodNotAllowed, readBody, serverError } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res);
    return;
  }

  try {
    const body = await readBody(req);
    const pin = String(body.pin || "");
    const adminPin = process.env.ADMIN_PIN || "1122";

    if (pin !== adminPin) {
      json(res, 401, { ok: false, error: "PIN noto'g'ri" });
      return;
    }

    json(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
};
