const { randomUUID } = require("crypto");
const { ensureSchema, getSql, json, methodNotAllowed, readBody, serverError, shiftStartFor } = require("./_db");

function dataUrlToBlob(photo) {
  const [header, base64] = photo.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  return new Blob([Buffer.from(base64, "base64")], { type: mime });
}

function minutesFromTime(time) {
  if (!time || !time.includes(":")) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (v) => v * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function sendTelegramText(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) console.error(`Telegram sendMessage failed: ${await res.text()}`);
}

async function notifyTelegram({ employee, action, day, time, photo, location, lateMinutes, geoStatus, distance, radius }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const label = action === "in" ? "✅ Keldi" : "🏁 Ketdi";
  const hasLocation = location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng));
  const accuracy = Number(location?.accuracy);
  const caption = [
    `👤 Xodim: ${employee.name}`,
    `📌 Holat: ${label}`,
    `📅 Sana: ${day}`,
    `⏰ Vaqt: ${time}`,
    action === "in" && lateMinutes > 0 ? `⚠️ ${employee.name} ${lateMinutes} daqiqa kechikdi` : "",
    hasLocation ? `📍 Lokatsiya: https://maps.google.com/?q=${location.lat},${location.lng}` : "",
    Number.isFinite(accuracy) && accuracy > 0 ? `🎯 Aniqlik: ${Math.round(accuracy)} m` : "",
    geoStatus === "ok" ? `🟢 GeoFence: mos${Number.isFinite(distance) ? ` (${Math.round(distance)} m / ${radius} m)` : ""}` : "",
  ].filter(Boolean).join("\n");

  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("photo", dataUrlToBlob(photo), `${employee.id}-${action}-${day}-${time}.jpg`);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
  if (!res.ok) console.error(`Telegram sendPhoto failed: ${await res.text()}`);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { methodNotAllowed(res); return; }

  try {
    await ensureSchema();
    const sql = getSql();
    const body = await readBody(req);

    const code = String(body.code || "").trim();
    const action = String(body.action || "").trim();
    const photo = String(body.photo || "");
    const time = String(body.time || "").trim();
    const day = String(body.day || new Date().toISOString().slice(0, 10));
    const location = body.location || {};
    const locationLat = Number(location.lat);
    const locationLng = Number(location.lng);
    const locationAccuracy = Number(location.accuracy || 0);
    const deviceId = String(body.deviceId || "").trim();

    if (!code || !["in", "out"].includes(action) || !time || !photo.startsWith("data:image/") || !Number.isFinite(locationLat) || !Number.isFinite(locationLng) || !deviceId) {
      json(res, 400, { error: "Kod, amal, vaqt, rasm, lokatsiya va qurilma kerak." });
      return;
    }

    const employees = await sql`
      SELECT id, name, location_id AS "locationId", shift_start AS "shiftStart"
      FROM employees WHERE code = ${code} LIMIT 1
    `;
    const employee = employees[0];
    if (!employee) { json(res, 404, { error: "Employee not found" }); return; }

    // Fetch device record and geofence in parallel
    const [deviceRows, geofenceRows] = await Promise.all([
      sql`SELECT device_id AS "deviceId" FROM employee_devices WHERE employee_id = ${employee.id} LIMIT 1`,
      sql`SELECT branch_id AS "branchId", name, lat, lng, radius_m AS "radius" FROM branch_geofences WHERE branch_id = ${employee.locationId} LIMIT 1`,
    ]);

    const linkedDevice = deviceRows[0];
    if (linkedDevice && linkedDevice.deviceId !== deviceId) {
      await Promise.all([
        sql`INSERT INTO admin_logs (id, action, employee_id, employee_name, detail, reason) VALUES (${randomUUID()}, 'device_mismatch', ${employee.id}, ${employee.name}, ${`Bog'langan: ${linkedDevice.deviceId}; uringan: ${deviceId}`}, 'Boshqa telefondan urinish')`,
        sendTelegramText(`🚨 Qurilma mos emas\n👤 ${employee.name}\n📅 ${day}\n⏰ ${time}\nBoshqa telefondan Keldim/Ketdim qilishga urindi.`),
      ]);
      json(res, 403, { error: "Bu xodim boshqa telefonga bog'langan. Admin bilan bog'laning." });
      return;
    }

    // Register or update device (fire-and-forget, doesn't affect response)
    const deviceOp = linkedDevice
      ? sql`UPDATE employee_devices SET last_seen_at = NOW() WHERE employee_id = ${employee.id}`
      : sql`INSERT INTO employee_devices (employee_id, device_id) VALUES (${employee.id}, ${deviceId}) ON CONFLICT (employee_id) DO NOTHING`;

    const geofence = geofenceRows[0] || { radius: 100 };
    const radius = Number(geofence.radius || 100);
    let distance = null;
    let geoStatus = "ok";

    if (Number.isFinite(locationAccuracy) && locationAccuracy > radius) {
      geoStatus = "low_accuracy";
    } else if (Number.isFinite(Number(geofence.lat)) && Number.isFinite(Number(geofence.lng))) {
      distance = distanceMeters(
        { lat: Number(geofence.lat), lng: Number(geofence.lng) },
        { lat: locationLat, lng: locationLng },
      );
      if (distance > radius) geoStatus = "outside";
    }

    if (geoStatus !== "ok") {
      const blockedProofId = randomUUID();
      await Promise.all([
        deviceOp,
        sql`INSERT INTO proofs (id, employee_id, day, type, punch_time, photo, location_lat, location_lng, location_accuracy, device_id, geo_status, face_status, retention_until) VALUES (${blockedProofId}, ${employee.id}, ${day}, ${action === "in" ? "arrival" : "departure"}, ${time}, ${photo}, ${locationLat}, ${locationLng}, ${Number.isFinite(locationAccuracy) ? locationAccuracy : null}, ${deviceId}, ${geoStatus}, 'pending', NOW() + INTERVAL '1 year')`,
        sql`INSERT INTO admin_logs (id, action, employee_id, employee_name, detail, reason) VALUES (${randomUUID()}, 'gps_mismatch', ${employee.id}, ${employee.name}, ${`Proof: ${blockedProofId}; Geo: ${geoStatus}; masofa: ${Number.isFinite(distance) ? Math.round(distance) : "no"}; radius: ${radius}; accuracy: ${Number.isFinite(locationAccuracy) ? Math.round(locationAccuracy) : "no"}`}, 'GPS mos emas')`,
        sendTelegramText([
          "⚠️ GPS mos emas",
          `👤 ${employee.name}`,
          `🏢 ${geofence.name || employee.locationId}`,
          `📅 ${day}`,
          `⏰ ${time}`,
          Number.isFinite(distance) ? `Masofa: ${Math.round(distance)} m` : "",
          `Ruxsat etilgan: ${radius} m`,
          Number.isFinite(locationAccuracy) ? `GPS aniqligi: ${Math.round(locationAccuracy)} m` : "",
        ].filter(Boolean).join("\n")),
      ]);
      json(res, 403, {
        error: geoStatus === "outside"
          ? `Lokatsiya filial radiusiga mos emas. Ruxsat: ${radius} m.`
          : `GPS aniqligi past. Ruxsat: ${radius} m, telefon aniqligi: ${Math.round(locationAccuracy)} m.`,
      });
      return;
    }

    // Check last punch to allow multiple in/out per day
    const lastPunchRows = await sql`
      SELECT type FROM proofs WHERE employee_id = ${employee.id} AND day = ${day} ORDER BY saved_at DESC LIMIT 1
    `;
    const lastType = lastPunchRows[0]?.type;

    if (action === "in" && lastType === "arrival") {
      json(res, 409, { error: `${employee.name} hozir ishda. Avval "Ketdim" tugmasini bosing.` }); return;
    }
    if (action === "out" && lastType !== "arrival") {
      json(res, 409, { error: `${employee.name} avval "Keldim" tugmasini bosishi kerak.` }); return;
    }

    const proofId = randomUUID();
    const proofType = action === "in" ? "arrival" : "departure";

    // For "in": set arrival only on first punch (COALESCE keeps original)
    // For "out": always update departure to the latest check-out time
    const attendanceOp = action === "in"
      ? sql`INSERT INTO attendance (day, employee_id, arrival, arrival_photo_id, arrival_saved_at) VALUES (${day}, ${employee.id}, ${time}, ${proofId}, NOW()) ON CONFLICT (day, employee_id) DO UPDATE SET arrival = COALESCE(attendance.arrival, EXCLUDED.arrival), arrival_photo_id = COALESCE(attendance.arrival_photo_id, EXCLUDED.arrival_photo_id), arrival_saved_at = COALESCE(attendance.arrival_saved_at, EXCLUDED.arrival_saved_at)`
      : sql`INSERT INTO attendance (day, employee_id, arrival, departure, departure_photo_id, departure_saved_at) VALUES (${day}, ${employee.id}, ${time}, ${time}, ${proofId}, NOW()) ON CONFLICT (day, employee_id) DO UPDATE SET departure = EXCLUDED.departure, departure_photo_id = EXCLUDED.departure_photo_id, departure_saved_at = NOW()`;

    // Save proof + attendance + device update in parallel
    await Promise.all([
      sql`INSERT INTO proofs (id, employee_id, day, type, punch_time, photo, location_lat, location_lng, location_accuracy, device_id, geo_status, face_status, retention_until) VALUES (${proofId}, ${employee.id}, ${day}, ${proofType}, ${time}, ${photo}, ${locationLat}, ${locationLng}, ${Number.isFinite(locationAccuracy) ? locationAccuracy : null}, ${deviceId}, ${geoStatus}, 'pending', NOW() + INTERVAL '1 year')`,
      attendanceOp,
      deviceOp,
    ]);

    const shiftStart = shiftStartFor(employee);
    const late = action === "in" ? Math.max(0, (minutesFromTime(time) || 0) - (minutesFromTime(shiftStart) || 0)) : 0;

    // Telegram notification — fire and forget, don't block the response
    notifyTelegram({
      employee, action, day, time, photo, lateMinutes: late, geoStatus, distance, radius,
      location: { lat: locationLat, lng: locationLng, accuracy: Number.isFinite(locationAccuracy) ? locationAccuracy : null },
    }).catch((err) => console.error("Telegram notify failed:", err));

    json(res, 200, {
      ok: true,
      employee,
      record: action === "in"
        ? { arrival: time, arrivalPhoto: proofId, arrivalSavedAt: new Date().toISOString() }
        : { departure: time, departurePhoto: proofId, departureSavedAt: new Date().toISOString() },
    });
  } catch (error) {
    serverError(res, error);
  }
};
