const { randomUUID } = require("crypto");
const { ensureSchema, getSql, json, methodNotAllowed, readBody, serverError } = require("./_db");

async function sendTelegramDocument({ filename, content, caption }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("document", new Blob([content], { type: "application/json;charset=utf-8" }), filename);

  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Telegram backup failed: ${await response.text()}`);
  return true;
}

async function getGeofences(res, sql) {
  const rows = await sql`
    SELECT branch_id AS "branchId", name, lat, lng, radius_m AS "radius"
    FROM branch_geofences
    ORDER BY CASE branch_id
      WHEN 'c5' THEN 1
      WHEN 'ibn-sino' THEN 2
      WHEN 'eco-bozor' THEN 3
      WHEN 'alfraganus' THEN 4
      WHEN 'sklad' THEN 5
      ELSE 99
    END
  `;
  json(res, 200, { geofences: rows });
}

async function saveGeofence(res, sql, body) {
  const branchId = String(body.branchId || "").trim();
  const name = String(body.name || "").trim();
  const lat = body.lat === "" || body.lat === null || body.lat === undefined ? null : Number(body.lat);
  const lng = body.lng === "" || body.lng === null || body.lng === undefined ? null : Number(body.lng);
  const radius = Number(body.radius || 100);

  if (!branchId || !name || !Number.isFinite(radius) || radius < 20 || radius > 1000) {
    json(res, 400, { error: "Filial nomi va 20-1000 metr oralig'idagi radius kerak." });
    return;
  }

  if ((lat !== null && !Number.isFinite(lat)) || (lng !== null && !Number.isFinite(lng))) {
    json(res, 400, { error: "Latitude/longitude raqam bo'lishi kerak." });
    return;
  }

  await sql`
    INSERT INTO branch_geofences (branch_id, name, lat, lng, radius_m)
    VALUES (${branchId}, ${name}, ${lat}, ${lng}, ${Math.round(radius)})
    ON CONFLICT (branch_id)
    DO UPDATE SET name = EXCLUDED.name, lat = EXCLUDED.lat, lng = EXCLUDED.lng, radius_m = EXCLUDED.radius_m
  `;
  json(res, 200, { ok: true });
}

function parseMapsPoint(value) {
  let text = String(value || "").trim();
  try {
    text = decodeURIComponent(text);
  } catch (error) {
    // Keep the original text when it is not valid URI encoded data.
  }

  const atMatch = text.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };

  const dataMatch = text.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (dataMatch) return { lat: Number(dataMatch[1]), lng: Number(dataMatch[2]) };

  const direct = text.match(/(-?\d{1,2}(?:[.,]\d+)?)\s*,\s*(-?\d{1,3}(?:[.,]\d+)?)/);
  if (direct) {
    return {
      lat: Number(direct[1].replace(",", ".")),
      lng: Number(direct[2].replace(",", ".")),
    };
  }

  return null;
}

function validMapsPoint(point) {
  return point
    && Number.isFinite(point.lat)
    && Number.isFinite(point.lng)
    && Math.abs(point.lat) <= 90
    && Math.abs(point.lng) <= 180;
}

async function resolveGoogleMaps(res, body) {
  const rawUrl = String(body.url || "").trim();
  const directPoint = parseMapsPoint(rawUrl);
  if (validMapsPoint(directPoint)) {
    json(res, 200, { ok: true, point: directPoint });
    return;
  }

  if (!/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.[^/]+\/maps|google\.[^/]+\/maps)/i.test(rawUrl)) {
    json(res, 400, { error: "Google Maps link yoki koordinata kerak." });
    return;
  }

  const response = await fetch(rawUrl, {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  const finalUrl = response.url || rawUrl;
  let point = parseMapsPoint(finalUrl);
  if (!validMapsPoint(point)) {
    const html = await response.text();
    point = parseMapsPoint(html.slice(0, 200000));
  }
  if (!validMapsPoint(point)) {
    json(res, 404, { error: "Google Maps linkidan koordinata topilmadi." });
    return;
  }
  json(res, 200, { ok: true, point });
}

async function getSuspicious(req, res, sql) {
  const day = String(req.query.day || new Date().toISOString().slice(0, 10));

  // All three queries run in parallel
  const [proofRows, notCheckedOut, logRows] = await Promise.all([
    sql`
      SELECT
        p.id,
        p.employee_id AS "employeeId",
        e.name AS "employeeName",
        p.type,
        p.punch_time AS "time",
        p.geo_status AS "geoStatus",
        p.face_status AS "faceStatus",
        p.location_accuracy AS "accuracy"
      FROM proofs p
      JOIN employees e ON e.id = p.employee_id
      WHERE p.day = ${day}
        AND (
          COALESCE(p.geo_status, '') NOT IN ('ok', 'manual_approved')
          OR COALESCE(p.face_status, 'pending') IN ('pending', 'failed', 'rejected')
        )
      ORDER BY p.saved_at DESC
      LIMIT 50
    `,
    sql`
      SELECT a.employee_id AS "employeeId", e.name AS "employeeName", a.arrival AS "time"
      FROM attendance a
      JOIN employees e ON e.id = a.employee_id
      WHERE a.day = ${day} AND a.arrival IS NOT NULL AND a.departure IS NULL
      ORDER BY a.arrival ASC
    `,
    sql`
      SELECT id, action, employee_id AS "employeeId", employee_name AS "employeeName", detail, reason
      FROM admin_logs
      WHERE action IN ('device_mismatch', 'gps_mismatch', 'face_mismatch')
      ORDER BY created_at DESC
      LIMIT 30
    `,
  ]);

  const items = [
    ...logRows.map((row) => ({
      id: row.id,
      type: row.action === "device_mismatch" ? "device" : row.action === "face_mismatch" ? "face_failed" : "gps",
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      title: row.action === "device_mismatch" ? "Boshqa telefondan urinish" : row.action === "face_mismatch" ? "Yuz mos kelmadi (bloklandi)" : "GPS mos emas",
      detail: row.detail || row.reason || "",
      actionId: null,
    })),
    ...proofRows.map((row) => ({
      id: row.id,
      type: (row.faceStatus === "failed" || row.faceStatus === "rejected") ? "face_failed" : row.faceStatus === "pending" ? "face_pending" : "gps",
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      title: (row.faceStatus === "failed" || row.faceStatus === "rejected") ? "Yuz mos kelmadi" : row.faceStatus === "pending" ? "Yuz tekshiruvi kutilmoqda" : "GPS mos emas",
      detail: `${row.type} ${row.time || ""} | Geo: ${row.geoStatus || "pending"} | Face: ${row.faceStatus || "pending"}${row.accuracy ? ` | Aniqlik: ${Math.round(Number(row.accuracy))} m` : ""}`,
      actionId: row.id,
    })),
    ...notCheckedOut.map((row) => ({
      id: `open:${row.employeeId}`,
      type: "open",
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      title: "Ketdim bosilmagan",
      detail: `Kelgan: ${row.time || "--:--"}`,
      actionId: null,
    })),
  ];

  json(res, 200, { items });
}

async function resetDevice(res, sql, body) {
  const employeeId = String(body.employeeId || "").trim();
  const reason = String(body.reason || "").trim();
  if (!employeeId || !reason) {
    json(res, 400, { error: "Xodim va reset sababi kerak." });
    return;
  }

  const employees = await sql`SELECT name FROM employees WHERE id = ${employeeId} LIMIT 1`;
  if (!employees[0]) {
    json(res, 404, { error: "Xodim topilmadi." });
    return;
  }

  await sql`DELETE FROM employee_devices WHERE employee_id = ${employeeId}`;
  await sql`
    INSERT INTO admin_logs (id, action, employee_id, employee_name, detail, reason)
    VALUES (${randomUUID()}, 'device_reset', ${employeeId}, ${employees[0].name}, 'Qurilma reset qilindi', ${reason})
  `;
  json(res, 200, { ok: true });
}

async function reviewProof(res, sql, body) {
  const proofId = String(body.proofId || "").trim();
  const decision = String(body.decision || "").trim();
  const reason = String(body.reason || "").trim();
  if (!proofId || !["approve", "reject", "verified", "rejected"].includes(decision) || !reason) {
    json(res, 400, { error: "Dalil, qaror va sabab kerak." });
    return;
  }

  const status = decision === "approve" ? "manual_approved" : decision === "reject" ? "rejected" : decision;
  const rows = await sql`
    UPDATE proofs p
    SET
      face_status = ${status},
      geo_status = CASE
        WHEN ${status} = 'manual_approved' AND COALESCE(p.geo_status, '') <> 'ok' THEN 'manual_approved'
        ELSE p.geo_status
      END
    FROM employees e
    WHERE p.id = ${proofId} AND e.id = p.employee_id
    RETURNING p.employee_id AS "employeeId", e.name AS "employeeName", p.day, p.type, p.punch_time AS "time", p.id
  `;
  const proof = rows[0];
  if (!proof) {
    json(res, 404, { error: "Dalil topilmadi." });
    return;
  }

  if (status === "manual_approved") {
    if (proof.type === "arrival") {
      await sql`
        INSERT INTO attendance (day, employee_id, arrival, arrival_photo_id, arrival_saved_at)
        VALUES (${proof.day}, ${proof.employeeId}, ${proof.time}, ${proof.id}, NOW())
        ON CONFLICT (day, employee_id)
        DO UPDATE SET arrival = EXCLUDED.arrival, arrival_photo_id = EXCLUDED.arrival_photo_id, arrival_saved_at = NOW()
      `;
    } else if (proof.type === "departure") {
      await sql`
        UPDATE attendance
        SET departure = ${proof.time}, departure_photo_id = ${proof.id}, departure_saved_at = NOW()
        WHERE day = ${proof.day} AND employee_id = ${proof.employeeId}
      `;
    }
  }

  await sql`
    INSERT INTO admin_logs (id, action, employee_id, employee_name, detail, reason)
    VALUES (${randomUUID()}, 'proof_review', ${proof.employeeId}, ${proof.employeeName}, ${`${proof.type} ${proof.day} ${proof.time} -> ${status}`}, ${reason})
  `;
  json(res, 200, { ok: true, status });
}

async function backup(res, sql) {
  const today = new Date().toISOString().slice(0, 10);
  const [employees, attendance, geofences, logs] = await Promise.all([
    sql`SELECT * FROM employees ORDER BY created_at ASC`,
    sql`SELECT * FROM attendance ORDER BY day DESC LIMIT 5000`,
    sql`SELECT * FROM branch_geofences ORDER BY branch_id ASC`,
    sql`SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 1000`,
  ]);
  const content = JSON.stringify({ exportedAt: new Date().toISOString(), employees, attendance, geofences, logs }, null, 2);
  const sent = await sendTelegramDocument({ filename: `neon-backup-${today}.json`, content, caption: `🗄 Kunlik backup: ${today}` });
  json(res, 200, { ok: true, sent, bytes: content.length });
}

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    const sql = getSql();
    const type = String(req.query.type || "").trim();

    if (req.method === "GET" && type === "geofences") return getGeofences(res, sql);
    if (req.method === "GET" && type === "suspicious") return getSuspicious(req, res, sql);
    if (["GET", "POST"].includes(req.method) && type === "backup") return backup(res, sql);

    if (req.method === "POST") {
      const body = await readBody(req);
      if (type === "geofences") return saveGeofence(res, sql, body);
      if (type === "google-maps-resolve") return resolveGoogleMaps(res, body);
      if (type === "device-reset") return resetDevice(res, sql, body);
      if (type === "proof-review") return reviewProof(res, sql, body);
    }

    methodNotAllowed(res);
  } catch (error) {
    serverError(res, error);
  }
};
