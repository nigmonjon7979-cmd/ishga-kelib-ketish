const { randomUUID } = require("crypto");
const { ensureSchema, getSql, json, methodNotAllowed, readBody, serverError, BRANCH_CONFIG, BRANCH_IDS, shiftStartFor } = require("./_db");

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function allowedPhones() {
  return String(process.env.ALLOWED_TELEGRAM_PHONES || "")
    .split(",")
    .map(normalizePhone)
    .filter(Boolean);
}

function adminChatId() {
  return String(process.env.TELEGRAM_CHAT_ID || "");
}

function siteUrl() {
  return process.env.SITE_URL || "https://ishga-kelib-ketish.vercel.app";
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function nowTime() {
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function minutesFromTime(time) {
  if (!time || !time.includes(":")) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatDuration(minutes) {
  if (!minutes || minutes < 1) return "0 daq";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} soat ${m} daq`;
  if (h) return `${h} soat`;
  return `${m} daq`;
}

function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (v) => v * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getSchedule(employee) {
  const base = BRANCH_CONFIG[employee.locationId] || {};
  return {
    name: base.name || employee.locationId || "Belgilanmagan",
    start: employee.shiftStart || base.start || "09:00",
    end: employee.shiftEnd || base.end || "",
  };
}

function lateMinutes(employee, record) {
  if (!record?.arrival) return 0;
  const arrival = minutesFromTime(record.arrival);
  const start = minutesFromTime(getSchedule(employee).start);
  if (arrival === null || start === null) return 0;
  return Math.max(0, arrival - start);
}

function workedMinutes(record) {
  if (!record?.arrival) return 0;
  const start = minutesFromTime(record.arrival);
  const end = minutesFromTime(record.departure || nowTime());
  if (start === null || end === null) return 0;
  return Math.max(0, end - start);
}

function isAbsent(employee, record) {
  if (record?.arrival) return false;
  const start = minutesFromTime(getSchedule(employee).start);
  const now = minutesFromTime(nowTime());
  return start !== null && now !== null && now >= start + 240;
}

function isSuperAdmin(chatId) {
  return String(chatId) === adminChatId();
}

async function isAdminChat(chatId) {
  if (isSuperAdmin(chatId)) return true;
  const sql = getSql();
  const rows = await sql`
    SELECT phone FROM telegram_access
    WHERE chat_id = ${String(chatId)} AND status = 'allowed' AND phone LIKE 'admin:%'
    LIMIT 1
  `;
  return rows.length > 0;
}

// ─── Keyboards ───────────────────────────────────────────────────────────────

function employeeKeyboard() {
  return {
    keyboard: [
      [{ text: "✅ Keldim" }, { text: "🚪 Ketdim" }],
      [{ text: "👤 Profilim" }, { text: "📅 Bugungi davomatim" }],
      [{ text: "📊 Oylik davomatim" }, { text: "📝 Kechikish sababi" }],
      [{ text: "🏖 Ta'til so'rash" }, { text: "📞 Admin bilan bog'lanish" }],
      [{ text: "📸 Yuzni yangilash" }],
    ],
    resize_keyboard: true,
  };
}

function managerKeyboard() {
  return {
    keyboard: [
      [{ text: "📊 Bugungi holat" }, { text: "🚨 Muammolar" }],
      [{ text: "🏢 Filiallar" }, { text: "🟢 Hozir ishda" }],
      [{ text: "👤 Xodimlar" }, { text: "⏰ Kechikkanlar" }],
      [{ text: "❌ Kelmaganlar" }, { text: "👥 Bugun kimlar keldi" }],
      [{ text: "📍 GPS" }, { text: "📸 Selfie" }],
      [{ text: "📈 Hisobotlar" }, { text: "📥 Excel hisobot" }],
      [{ text: "⚙️ Sozlamalar" }],
    ],
    resize_keyboard: true,
  };
}

// ─── Telegram API ────────────────────────────────────────────────────────────

async function sendTelegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN env var is required");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram ${method} failed: ${body}`);
  }
  return response.json();
}

async function sendTelegramDocument({ chatId, filename, content, caption }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN env var is required");
  const form = new FormData();
  form.append("chat_id", chatId);
  if (caption) form.append("caption", caption);
  form.append("document", new Blob([content], { type: "text/csv;charset=utf-8" }), filename);
  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Telegram sendDocument failed: ${await response.text()}`);
}

async function downloadTelegramPhoto(fileId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const fileData = await fileRes.json();
  const filePath = fileData.result?.file_path;
  if (!filePath) throw new Error("Could not get Telegram file path");
  const photoRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  const buffer = await photoRes.arrayBuffer();
  return Buffer.from(buffer);
}

// ─── AI Face comparison (Face++ API) ─────────────────────────────────────────

async function compareFacesAI(refFileId, punchFileId) {
  const apiKey = process.env.FACEPP_API_KEY;
  const apiSecret = process.env.FACEPP_API_SECRET;
  if (!apiKey || !apiSecret) return null; // not configured → manual review

  try {
    // Download both photos in parallel
    const [refBuf, punchBuf] = await Promise.all([
      downloadTelegramPhoto(refFileId),
      downloadTelegramPhoto(punchFileId),
    ]);

    const form = new FormData();
    form.append("api_key", apiKey);
    form.append("api_secret", apiSecret);
    form.append("image_base641", refBuf.toString("base64"));
    form.append("image_base642", punchBuf.toString("base64"));

    const res = await fetch("https://api-us.faceplusplus.com/facepp/v3/compare", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok || data.error_message) {
      console.error("Face++ error:", data.error_message || res.status);
      return null;
    }
    // confidence: 0–100; threshold ~75 for "same person"
    return { confidence: data.confidence, threshold: data.thresholds?.["1e-3"] || 65 };
  } catch (err) {
    console.error("compareFacesAI error:", err);
    return null;
  }
}

async function sendPhotoToChat(chatId, photoDataUrl, caption) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const [header, base64] = photoDataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption);
  form.append("photo", new Blob([Buffer.from(base64, "base64")], { type: mime }), "proof.jpg");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`sendPhoto failed: ${await res.text()}`);
}

// ─── State management (for multi-step punch flow) ────────────────────────────

async function getState(chatId) {
  const sql = getSql();
  const rows = await sql`
    SELECT action, step, location_lat, location_lng, location_accuracy
    FROM telegram_state
    WHERE chat_id = ${String(chatId)} AND expires_at > NOW()
    LIMIT 1
  `;
  return rows[0] || null;
}

async function setState(chatId, { action, step, lat, lng, accuracy }) {
  const sql = getSql();
  await sql`
    INSERT INTO telegram_state (chat_id, action, step, location_lat, location_lng, location_accuracy, expires_at)
    VALUES (${String(chatId)}, ${action}, ${step}, ${lat ?? null}, ${lng ?? null}, ${accuracy ?? null}, NOW() + INTERVAL '5 minutes')
    ON CONFLICT (chat_id)
    DO UPDATE SET action = EXCLUDED.action, step = EXCLUDED.step,
      location_lat = EXCLUDED.location_lat, location_lng = EXCLUDED.location_lng,
      location_accuracy = EXCLUDED.location_accuracy, expires_at = EXCLUDED.expires_at
  `;
}

async function clearState(chatId) {
  const sql = getSql();
  await sql`DELETE FROM telegram_state WHERE chat_id = ${String(chatId)}`;
}

// ─── Punch via Telegram ──────────────────────────────────────────────────────

async function doPunch({ employee, action, day, time, photo, lat, lng, accuracy, chatId }) {
  const sql = getSql();

  const geofenceRows = await sql`
    SELECT name, lat, lng, radius_m AS radius
    FROM branch_geofences
    WHERE branch_id = ${employee.locationId}
    LIMIT 1
  `;
  const geofence = geofenceRows[0];
  const radius = Number(geofence?.radius || 100);
  let distance = null;
  let geoStatus = "ok";

  if (geofence && Number.isFinite(Number(geofence.lat)) && Number.isFinite(Number(geofence.lng))) {
    distance = distanceMeters(
      { lat: Number(geofence.lat), lng: Number(geofence.lng) },
      { lat, lng },
    );
    if (distance > radius) geoStatus = "outside";
  }
  if (Number.isFinite(accuracy) && accuracy > radius) geoStatus = "low_accuracy";

  if (geoStatus !== "ok") {
    return { ok: false, geoStatus, distance, radius, geofenceName: geofence?.name };
  }

  const lastPunchRows = await sql`
    SELECT type FROM proofs WHERE employee_id = ${employee.id} AND day = ${day} ORDER BY saved_at DESC LIMIT 1
  `;
  const lastType = lastPunchRows[0]?.type;

  if (action === "in" && lastType === "arrival") {
    return { ok: false, error: `Siz hozir ishdasiz. Avval "Ketdim" tugmasini bosing.` };
  }
  if (action === "out" && lastType !== "arrival") {
    return { ok: false, error: `Avval "Keldim" tugmasini bosing.` };
  }

  const proofId = randomUUID();
  const proofType = action === "in" ? "arrival" : "departure";
  const deviceId = `telegram:${chatId}`;

  const attendanceOp = action === "in"
    ? sql`INSERT INTO attendance (day, employee_id, arrival, arrival_photo_id, arrival_saved_at) VALUES (${day}, ${employee.id}, ${time}, ${proofId}, NOW()) ON CONFLICT (day, employee_id) DO UPDATE SET arrival = COALESCE(attendance.arrival, EXCLUDED.arrival), arrival_photo_id = COALESCE(attendance.arrival_photo_id, EXCLUDED.arrival_photo_id), arrival_saved_at = COALESCE(attendance.arrival_saved_at, EXCLUDED.arrival_saved_at)`
    : sql`INSERT INTO attendance (day, employee_id, arrival, departure, departure_photo_id, departure_saved_at) VALUES (${day}, ${employee.id}, ${time}, ${time}, ${proofId}, NOW()) ON CONFLICT (day, employee_id) DO UPDATE SET departure = EXCLUDED.departure, departure_photo_id = EXCLUDED.departure_photo_id, departure_saved_at = NOW()`;

  await Promise.all([
    sql`INSERT INTO proofs (id, employee_id, day, type, punch_time, photo, location_lat, location_lng, location_accuracy, device_id, geo_status, face_status, retention_until) VALUES (${proofId}, ${employee.id}, ${day}, ${proofType}, ${time}, ${photo}, ${lat}, ${lng}, ${Number.isFinite(accuracy) ? accuracy : null}, ${deviceId}, 'ok', 'pending', NOW() + INTERVAL '1 year')`,
    attendanceOp,
  ]);

  const late = action === "in"
    ? Math.max(0, (minutesFromTime(time) || 0) - (minutesFromTime(shiftStartFor(employee)) || 0))
    : 0;

  return { ok: true, proofId, lateMinutes: late, distance, radius };
}

// ─── Access control ──────────────────────────────────────────────────────────

async function isAllowedChat(chatId) {
  if (isSuperAdmin(chatId)) return true;
  const sql = getSql();
  const rows = await sql`
    SELECT phone FROM telegram_access WHERE chat_id = ${String(chatId)} AND status = 'allowed' LIMIT 1
  `;
  return Boolean(rows[0]?.phone);
}

async function employeeByChat(chatId) {
  const sql = getSql();
  const accessRows = await sql`
    SELECT phone FROM telegram_access WHERE chat_id = ${String(chatId)} AND status = 'allowed' LIMIT 1
  `;
  const accessKey = String(accessRows[0]?.phone || "");

  if (accessKey.startsWith("employee:")) {
    const employeeId = accessKey.slice("employee:".length);
    const rows = await sql`
      SELECT id, name, role, phone, location_id AS "locationId", shift_start AS "shiftStart", shift_end AS "shiftEnd", status, code, face_file_id AS "faceFileId"
      FROM employees WHERE id = ${employeeId} LIMIT 1
    `;
    return rows[0] || null;
  }

  const phone = normalizePhone(accessKey);
  if (!phone || accessKey.startsWith("permit:")) return null;

  const employees = await sql`
    SELECT id, name, role, phone, location_id AS "locationId", shift_start AS "shiftStart", shift_end AS "shiftEnd", status, code, face_file_id AS "faceFileId"
    FROM employees
  `;
  return employees.find((e) => normalizePhone(e.phone).endsWith(phone.slice(-9))) || null;
}

// ─── Messaging helpers ───────────────────────────────────────────────────────

async function sendMenu(chatId) {
  const isAdmin = await isAdminChat(chatId);
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: isAdmin
      ? "👔 Rahbar / HR menyusi. Kerakli bo'limni tanlang."
      : "👤 Xodim menyusi. Keldim yoki Ketdim tugmasini bosing.",
    reply_markup: isAdmin ? managerKeyboard() : employeeKeyboard(),
  });
}

async function sendNewAccessRequest({ chatId, message }) {
  const sql = getSql();
  const name = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") || "Noma'lum";
  const username = message.from?.username ? `@${message.from.username}` : "—";

  const pendingKey = `pending:${chatId}`;
  await sql`
    INSERT INTO telegram_access (phone, chat_id, name, status)
    VALUES (${pendingKey}, ${String(chatId)}, ${name}, 'pending')
    ON CONFLICT (phone)
    DO UPDATE SET chat_id = EXCLUDED.chat_id, name = EXCLUDED.name, status = 'pending', requested_at = NOW(), decided_at = NULL
  `;

  const superAdminId = adminChatId();
  if (superAdminId) {
    await sendTelegram("sendMessage", {
      chat_id: superAdminId,
      text: [
        "🔐 Yangi kirish so'rovi:",
        `👤 Ism: ${name}`,
        `🆔 Username: ${username}`,
        `📱 Chat ID: ${chatId}`,
        "",
        "Ushbu foydalanuvchiga qanday rol berasiz?",
      ].join("\n"),
      reply_markup: {
        inline_keyboard: [[
          { text: "👔 Admin", callback_data: `role:admin:${chatId}` },
          { text: "👤 Xodim", callback_data: `role:employee:${chatId}` },
          { text: "❌ Rad etish", callback_data: `role:deny:${chatId}` },
        ]],
      },
    });
  }

  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: "🔐 Bu bot faqat ruxsat berilgan foydalanuvchilar uchun.\n\n⏳ So'rovingiz rahbarga yuborildi. Ruxsat berilgach xabar keladi.",
    reply_markup: { remove_keyboard: true },
  });
}

async function denyAccess(chatId) {
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: "Botga kirish ruxsati berilmadi. Admin bilan bog'laning.",
    reply_markup: { remove_keyboard: true },
  });
}

async function sendAccessLink(chatId) {
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: "✅ Tasdiqlandi! Davomat tizimiga kirish uchun quyidagi tugmani bosing yoki Keldim/Ketdim tugmalarini ishlating.",
    reply_markup: {
      inline_keyboard: [[{ text: "Davomat tizimini ochish", url: siteUrl() }]],
    },
  });
  await sendMenu(chatId);
}

// ─── Contact / phone auth ────────────────────────────────────────────────────

async function handleContact({ chatId, message, phone }) {
  const sql = getSql();
  const name = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");

  if (allowedPhones().includes(phone)) {
    await sql`
      INSERT INTO telegram_access (phone, chat_id, name, status, decided_at)
      VALUES (${phone}, ${String(chatId)}, ${name}, 'allowed', NOW())
      ON CONFLICT (phone)
      DO UPDATE SET chat_id = EXCLUDED.chat_id, name = EXCLUDED.name, status = 'allowed', decided_at = NOW()
    `;
    await sendAccessLink(chatId);
    return;
  }

  const existing = await sql`SELECT status FROM telegram_access WHERE phone = ${phone} LIMIT 1`;
  if (existing[0]?.status === "allowed") { await sendAccessLink(chatId); return; }
  if (existing[0]?.status === "denied") { await denyAccess(chatId); return; }

  await sql`
    INSERT INTO telegram_access (phone, chat_id, name, status)
    VALUES (${phone}, ${String(chatId)}, ${name}, 'pending')
    ON CONFLICT (phone)
    DO UPDATE SET chat_id = EXCLUDED.chat_id, name = EXCLUDED.name, status = 'pending', requested_at = NOW(), decided_at = NULL
  `;
  await requestAdminDecision({ phone, chatId, name });
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: "So'rovingiz adminga yuborildi. Ruxsat berilsa, kirish menyusi ochiladi.",
    reply_markup: { remove_keyboard: true },
  });
}

// ─── Role decision (super admin picks admin/xodim/deny) ─────────────────────

async function handleRoleDecision(callback) {
  const [scope, role, ...rest] = String(callback.data || "").split(":");
  const targetChatId = rest.join(":");
  if (scope !== "role" || !["admin", "employee", "deny"].includes(role) || !targetChatId) return false;

  if (!isSuperAdmin(callback.message?.chat?.id)) {
    await answerCallback(callback.id, "Bu amal faqat super admin uchun.");
    return true;
  }

  const sql = getSql();
  const pendingKey = `pending:${targetChatId}`;
  const pendingRows = await sql`SELECT name FROM telegram_access WHERE phone = ${pendingKey} LIMIT 1`;
  const pending = pendingRows[0];

  if (!pending) {
    await answerCallback(callback.id, "So'rov topilmadi yoki eskirgan.");
    await editAdminDecision(callback.message, "So'rov topilmadi yoki eskirgan.");
    return true;
  }

  if (role === "deny") {
    await sql`UPDATE telegram_access SET status = 'denied', decided_at = NOW() WHERE phone = ${pendingKey}`;
    await denyAccess(targetChatId);
    await answerCallback(callback.id, "Rad etildi.");
    await editAdminDecision(callback.message, `❌ Rad etildi: ${pending.name || targetChatId}`);
    return true;
  }

  if (role === "admin") {
    const adminKey = `admin:${targetChatId}`;
    await sql`
      INSERT INTO telegram_access (phone, chat_id, name, status, decided_at)
      VALUES (${adminKey}, ${String(targetChatId)}, ${pending.name || ""}, 'allowed', NOW())
      ON CONFLICT (phone)
      DO UPDATE SET chat_id = EXCLUDED.chat_id, name = EXCLUDED.name, status = 'allowed', decided_at = NOW()
    `;
    await sql`DELETE FROM telegram_access WHERE phone = ${pendingKey}`;
    await sendTelegram("sendMessage", {
      chat_id: targetChatId,
      text: "✅ Siz admin sifatida tasdiqlandi! Rahbar menyusi ochildi.",
      reply_markup: managerKeyboard(),
    });
    await answerCallback(callback.id, "Admin sifatida tasdiqlandi.");
    await editAdminDecision(callback.message, `✅ Admin: ${pending.name || targetChatId}`);
    return true;
  }

  if (role === "employee") {
    await sql`UPDATE telegram_access SET status = 'code_pending', decided_at = NOW() WHERE phone = ${pendingKey}`;
    await sendTelegram("sendMessage", {
      chat_id: targetChatId,
      text: "✅ Xodim sifatida tasdiqlandi!\n\n📝 Endi 4 xonali xodim kodingizni yuboring (rahbar bergan kod):",
      reply_markup: { remove_keyboard: true },
    });
    await answerCallback(callback.id, "Xodim — kod kutilmoqda.");
    await editAdminDecision(callback.message, `👤 Xodim: ${pending.name || targetChatId} — kod kutilmoqda`);
    return true;
  }

  return false;
}

async function linkEmployeeCode({ chatId, message, code }) {
  const sql = getSql();
  const rows = await sql`SELECT id, name, status, face_file_id AS "faceFileId" FROM employees WHERE code = ${code} LIMIT 1`;
  const employee = rows[0];

  if (!employee) {
    await sendTelegram("sendMessage", { chat_id: chatId, text: "❌ Bu kod bo'yicha xodim topilmadi. Qayta yuboring:" });
    return;
  }
  if (["inactive", "vacation", "sick"].includes(employee.status)) {
    await sendTelegram("sendMessage", { chat_id: chatId, text: "❌ Bu xodim hozir faol emas. Rahbar bilan bog'laning." });
    return;
  }

  const employeeKey = `employee:${employee.id}`;
  const linked = await sql`SELECT chat_id AS "chatId" FROM telegram_access WHERE phone = ${employeeKey} AND status = 'allowed' LIMIT 1`;
  if (linked[0] && String(linked[0].chatId) !== String(chatId)) {
    await sendTelegram("sendMessage", { chat_id: chatId, text: "❌ Bu kod boshqa Telegram akkauntga ulangan. Rahbar bilan bog'laning." });
    return;
  }

  const name = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");
  await sql`
    INSERT INTO telegram_access (phone, chat_id, name, status, decided_at)
    VALUES (${employeeKey}, ${String(chatId)}, ${name || employee.name}, 'allowed', NOW())
    ON CONFLICT (phone)
    DO UPDATE SET chat_id = EXCLUDED.chat_id, name = EXCLUDED.name, status = 'allowed', decided_at = NOW()
  `;
  await sql`DELETE FROM telegram_access WHERE chat_id = ${String(chatId)} AND status = 'code_pending'`;

  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: `✅ Muvaffaqiyatli ulandi!\n👤 ${employee.name} sifatida tizimga kirdingiz.`,
    reply_markup: { remove_keyboard: true },
  });

  // Ask for face enrollment if no reference photo yet
  if (!employee.faceFileId) {
    await startFaceEnroll(chatId);
  } else {
    await sendMenu(chatId);
  }
}

// ─── Face enrollment ─────────────────────────────────────────────────────────

async function startFaceEnroll(chatId) {
  await setState(chatId, { action: "enroll", step: "face_enroll" });
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: [
      "📸 Yuzingiz tekshiruvi uchun bir martalik selfi yuboring.",
      "",
      "• Yuz aniq ko'rinsin",
      "• Yaxshi yorug'lik bo'lsin",
      "• Ko'zoynak yoki niqob bo'lmasin",
    ].join("\n"),
    reply_markup: { remove_keyboard: true },
  });
}

// ─── Employee code auth ──────────────────────────────────────────────────────

function employeeCodeFromText(text) {
  const cleaned = String(text || "").trim();
  const match = cleaned.match(/^\d{4}$/);
  return match ? cleaned : "";
}

async function grantEmployeeCodeAccess({ chatId, message, code }) {
  const sql = getSql();
  const name = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");
  const rows = await sql`SELECT id, name, status FROM employees WHERE code = ${code} LIMIT 1`;
  const employee = rows[0];

  if (!employee) {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "❌ Bu kod bo'yicha xodim topilmadi. Kodni tekshirib qayta yuboring.",
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  if (["inactive", "vacation", "sick"].includes(employee.status)) {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "❌ Bu xodim hozir faol emas. Rahbar/HR bilan bog'laning.",
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  const employeeKey = `employee:${employee.id}`;
  const linkedRows = await sql`SELECT chat_id AS "chatId", status FROM telegram_access WHERE phone = ${employeeKey} LIMIT 1`;
  const linked = linkedRows[0];

  if (linked?.status === "allowed" && String(linked.chatId) === String(chatId)) {
    await sendTelegram("sendMessage", { chat_id: chatId, text: `✅ Bot allaqachon ${employee.name} nomiga ulangan.` });
    await sendMenu(chatId);
    return;
  }

  if (linked?.status === "allowed" && String(linked.chatId) !== String(chatId)) {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "❌ Bu xodim kodi boshqa Telegram akkauntga ulangan. Rahbar/HR bilan bog'laning.",
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  const requestKey = `request:${chatId}:${code}`;
  await sql`
    INSERT INTO telegram_access (phone, chat_id, name, status, decided_at)
    VALUES (${requestKey}, ${String(chatId)}, ${name || employee.name}, 'pending', NULL)
    ON CONFLICT (phone)
    DO UPDATE SET chat_id = EXCLUDED.chat_id, name = EXCLUDED.name, status = 'pending', requested_at = NOW(), decided_at = NULL
  `;
  await requestEmployeeDecision({ chatId, code, employee, name });
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: `⏳ Kod qabul qilindi. Rahbar/HR tasdiqlagandan keyin bot ${employee.name} nomiga ochiladi.`,
    reply_markup: { remove_keyboard: true },
  });
}

// ─── Admin decision helpers ──────────────────────────────────────────────────

async function answerCallback(callbackId, text) {
  await sendTelegram("answerCallbackQuery", { callback_query_id: callbackId, text, show_alert: false });
}

async function editAdminDecision(message, text) {
  await sendTelegram("editMessageText", { chat_id: message.chat.id, message_id: message.message_id, text });
}

async function requestAdminDecision({ phone, chatId, name }) {
  const adminId = adminChatId();
  if (!adminId) return;
  await sendTelegram("sendMessage", {
    chat_id: adminId,
    text: [`Yangi foydalanuvchi kirish so'radi:`, `Ism: ${name || "Noma'lum"}`, `Telefon: +${phone}`, `Chat ID: ${chatId}`].join("\n"),
    reply_markup: {
      inline_keyboard: [[
        { text: "Allow", callback_data: `access:allow:${phone}` },
        { text: "Deny", callback_data: `access:deny:${phone}` },
      ]],
    },
  });
}

async function requestEmployeeDecision({ chatId, code, employee, name }) {
  const adminId = adminChatId();
  if (!adminId) return;
  await sendTelegram("sendMessage", {
    chat_id: adminId,
    text: [
      "🔐 Yangi xodim botga ulanishni so'radi:",
      `👤 Xodim: ${employee.name}`,
      `Kod: ${code}`,
      `Telegram: ${name || "Noma'lum"}`,
      `Chat ID: ${chatId}`,
      "",
      "Tasdiqlasangiz shu Telegram ID xodimga biriktiriladi.",
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ Tasdiqlash", callback_data: `emp:allow:${code}:${chatId}` },
        { text: "❌ Rad etish", callback_data: `emp:deny:${code}:${chatId}` },
      ]],
    },
  });
}

// ─── Callback handlers ───────────────────────────────────────────────────────

async function handleAccessDecision(callback) {
  const parts = String(callback.data || "").split(":");
  const [scope, decision, ...rest] = parts;
  const phone = rest.join(":");
  if (scope !== "access" || !["allow", "deny"].includes(decision) || !phone) return false;

  if (String(callback.message?.chat?.id) !== adminChatId()) {
    await answerCallback(callback.id, "Bu amal uchun ruxsat yo'q.");
    return true;
  }

  const sql = getSql();
  const status = decision === "allow" ? "allowed" : "denied";
  const rows = await sql`
    UPDATE telegram_access SET status = ${status}, decided_at = NOW()
    WHERE phone = ${phone}
    RETURNING chat_id AS "chatId", name
  `;
  const access = rows[0];
  if (!access) { await answerCallback(callback.id, "So'rov topilmadi."); return true; }

  if (decision === "allow") {
    await sendAccessLink(access.chatId);
    await answerCallback(callback.id, "Ruxsat berildi.");
    await editAdminDecision(callback.message, `✅ Ruxsat berildi: +${phone} (${access.name || "Noma'lum"})`);
  } else {
    await denyAccess(access.chatId);
    await answerCallback(callback.id, "Rad etildi.");
    await editAdminDecision(callback.message, `❌ Rad etildi: +${phone} (${access.name || "Noma'lum"})`);
  }
  return true;
}

async function handleEmployeeAccessDecision(callback) {
  const [scope, decision, code, targetChatId] = String(callback.data || "").split(":");
  if (scope !== "emp" || !["allow", "deny"].includes(decision) || !code || !targetChatId) return false;

  if (String(callback.message?.chat?.id) !== adminChatId()) {
    await answerCallback(callback.id, "Bu amal uchun ruxsat yo'q.");
    return true;
  }

  const sql = getSql();
  const [employeeRows, requestRows] = await Promise.all([
    sql`SELECT id, name FROM employees WHERE code = ${code} LIMIT 1`,
    sql`SELECT chat_id AS "chatId", name FROM telegram_access WHERE phone = ${"request:" + targetChatId + ":" + code} AND status = 'pending' LIMIT 1`,
  ]);
  const employee = employeeRows[0];
  const request = requestRows[0];

  if (!employee || !request) {
    await answerCallback(callback.id, "So'rov topilmadi yoki eskirgan.");
    await editAdminDecision(callback.message, "So'rov topilmadi yoki eskirgan.");
    return true;
  }

  if (decision === "deny") {
    await sql`UPDATE telegram_access SET status = 'denied', decided_at = NOW() WHERE phone = ${"request:" + targetChatId + ":" + code}`;
    await denyAccess(targetChatId);
    await answerCallback(callback.id, "Rad etildi.");
    await editAdminDecision(callback.message, `❌ Rad etildi: ${employee.name} (${request.name || "Noma'lum"})`);
    return true;
  }

  const employeeKey = `employee:${employee.id}`;
  const linkedRows = await sql`SELECT chat_id AS "chatId" FROM telegram_access WHERE phone = ${employeeKey} AND status = 'allowed' LIMIT 1`;
  if (linkedRows[0] && String(linkedRows[0].chatId) !== String(targetChatId)) {
    await answerCallback(callback.id, "Bu xodim boshqa Telegramga ulangan.");
    await editAdminDecision(callback.message, `⚠️ Tasdiqlanmadi: ${employee.name} boshqa Telegram akkauntga ulangan.`);
    return true;
  }

  await sql`
    INSERT INTO telegram_access (phone, chat_id, name, status, decided_at)
    VALUES (${employeeKey}, ${String(targetChatId)}, ${request.name || employee.name}, 'allowed', NOW())
    ON CONFLICT (phone)
    DO UPDATE SET chat_id = EXCLUDED.chat_id, name = EXCLUDED.name, status = 'allowed', decided_at = NOW()
  `;
  await sql`DELETE FROM telegram_access WHERE phone = ${"request:" + targetChatId + ":" + code}`;
  await sendTelegram("sendMessage", { chat_id: targetChatId, text: `✅ Rahbar tasdiqladi. Bot ${employee.name} nomiga ulandi.`, reply_markup: { remove_keyboard: true } });
  // Start face enrollment if employee has no reference photo yet
  const faceRows = await sql`SELECT face_file_id FROM employees WHERE id = ${employee.id} LIMIT 1`;
  if (!faceRows[0]?.face_file_id) {
    await startFaceEnroll(targetChatId);
  } else {
    await sendMenu(targetChatId);
  }
  await answerCallback(callback.id, "Tasdiqlandi.");
  await editAdminDecision(callback.message, `✅ Tasdiqlandi: ${employee.name} (${request.name || "Noma'lum"})`);
  return true;
}

// ─── Location & Photo punch handlers ─────────────────────────────────────────

async function handleLocation({ chatId, message }) {
  const loc = message.location;
  if (!loc) return false;

  const state = await getState(chatId);
  if (!state || state.step !== "location") {
    // If no state, just ignore silently
    return false;
  }

  await setState(chatId, {
    action: state.action,
    step: "photo",
    lat: loc.latitude,
    lng: loc.longitude,
    accuracy: loc.horizontal_accuracy || null,
  });

  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: "✅ Lokatsiya qabul qilindi.\n\n📸 Endi selfi yuboring (kamera orqali rasm oling):",
    reply_markup: { remove_keyboard: true },
  });
  return true;
}

async function handlePhoto({ chatId, message }) {
  const photos = message.photo;
  if (!photos?.length) return false;

  const state = await getState(chatId);
  if (!state) return false;

  const bestPhoto = photos[photos.length - 1];
  const fileId = bestPhoto.file_id;

  // ── Face enrollment ──────────────────────────────────────────────────────
  if (state.step === "face_enroll") {
    const employee = await employeeByChat(chatId);
    if (!employee) {
      await clearState(chatId);
      await sendTelegram("sendMessage", { chat_id: chatId, text: "❌ Xodim topilmadi. /start bosing.", reply_markup: { remove_keyboard: true } });
      return true;
    }
    const sql = getSql();
    await sql`UPDATE employees SET face_file_id = ${fileId} WHERE id = ${employee.id}`;
    await clearState(chatId);
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "✅ Yuzingiz saqlandi! Endi har safar kelganda yuzingiz tekshiriladi.",
      reply_markup: employeeKeyboard(),
    });
    return true;
  }

  if (state.step !== "photo") return false;

  const employee = await employeeByChat(chatId);
  if (!employee) {
    await clearState(chatId);
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "❌ Xodim topilmadi. /start bosib qayta urinib ko'ring.",
      reply_markup: employeeKeyboard(),
    });
    return true;
  }

  // ── Enforce face enrollment before punch ─────────────────────────────────
  if (!employee.faceFileId) {
    await clearState(chatId);
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "⚠️ Avval yuzingizni ro'yxatdan o'tkazing:",
      reply_markup: { remove_keyboard: true },
    });
    await startFaceEnroll(chatId);
    return true;
  }

  try {
    // fileId is already defined above (from bestPhoto)
    const time = nowTime();
    const day = todayKey();
    const sql = getSql();

    // Get admin list while punching (parallel)
    const [result, adminRows] = await Promise.all([
      doPunch({
        employee,
        action: state.action,
        day,
        time,
        photo: `telegram:${fileId}`,
        lat: Number(state.location_lat),
        lng: Number(state.location_lng),
        accuracy: state.location_accuracy != null ? Number(state.location_accuracy) : null,
        chatId,
      }),
      sql`SELECT chat_id AS "chatId" FROM telegram_access WHERE phone LIKE 'admin:%' AND status = 'allowed'`,
    ]);

    if (!result.ok) {
      if (result.geoStatus === "outside") {
        // Re-ask location instead of forcing full restart
        await setState(chatId, { action: state.action, step: "location" });
        await sendTelegram("sendMessage", {
          chat_id: chatId,
          text: `❌ Siz filial maydonidan tashqaridasiz.\nMasofa: ${Math.round(result.distance)} m, ruxsat: ${result.radius} m\n\n📍 To'g'ri joydan qaytadan lokatsiya yuboring:`,
          reply_markup: {
            keyboard: [[{ text: "📍 Lokatsiyamni yuborish", request_location: true }], [{ text: "❌ Bekor qilish" }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      } else if (result.geoStatus === "low_accuracy") {
        await setState(chatId, { action: state.action, step: "location" });
        await sendTelegram("sendMessage", {
          chat_id: chatId,
          text: `❌ GPS aniqligi past (${Math.round(state.location_accuracy || 0)} m).\n\nOchiq joyga chiqib, qayta lokatsiya yuboring:`,
          reply_markup: {
            keyboard: [[{ text: "📍 Lokatsiyamni yuborish", request_location: true }], [{ text: "❌ Bekor qilish" }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      } else {
        await clearState(chatId);
        await sendTelegram("sendMessage", { chat_id: chatId, text: `❌ ${result.error}`, reply_markup: employeeKeyboard() });
      }
      return true;
    }

    await clearState(chatId);

    const label = state.action === "in" ? "✅ Keldi" : "🏁 Ketdi";
    const lateMsg = state.action === "in" && result.lateMinutes > 0
      ? `\n⚠️ Kechikish: ${result.lateMinutes} daqiqa`
      : "";

    // Confirm to employee immediately
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: `${label}\n👤 ${employee.name}\n⏰ ${time}${lateMsg}\n\nYaxshi ish kuni! 💼`,
      reply_markup: employeeKeyboard(),
    });

    // Build admin notification
    const lat = Number(state.location_lat);
    const lng = Number(state.location_lng);
    const accuracy = state.location_accuracy != null ? Number(state.location_accuracy) : null;
    const punchCaption = [
      `👤 ${employee.name}  |  ${label}`,
      `⏰ ${time}  📅 ${day}`,
      state.action === "in" && result.lateMinutes > 0 ? `⚠️ Kechikish: ${result.lateMinutes} daqiqa` : "",
      Number.isFinite(lat) && Number.isFinite(lng) ? `📍 https://maps.google.com/?q=${lat},${lng}` : "",
      Number.isFinite(accuracy) && accuracy > 0 ? `🎯 GPS aniqlik: ${Math.round(accuracy)} m` : "",
      Number.isFinite(result.distance) ? `✅ Geofence: ${Math.round(result.distance)}/${result.radius} m` : "",
    ].filter(Boolean).join("\n");

    // Collect all admin chat IDs (super admin + DB admins), deduplicated
    const superAdmin = adminChatId();
    const allAdminIds = new Set([
      ...(superAdmin ? [superAdmin] : []),
      ...adminRows.map((r) => String(r.chatId)),
    ].filter((id) => id && String(id) !== String(chatId)));

    // AI face comparison
    const faceResult = await compareFacesAI(employee.faceFileId, fileId);

    if (faceResult !== null) {
      // AI available — auto decision
      const faceOk = faceResult.confidence >= (faceResult.threshold || 65);
      const newFaceStatus = faceOk ? "ok" : "rejected";
      const sql2 = getSql();
      await sql2`UPDATE proofs SET face_status = ${newFaceStatus} WHERE id = ${result.proofId}`;

      const faceLabel = faceOk
        ? `✅ Yuz mos (${Math.round(faceResult.confidence)}%)`
        : `❌ Yuz mos emas (${Math.round(faceResult.confidence)}%, talab: ${Math.round(faceResult.threshold)}%)`;

      if (!faceOk) {
        await sendTelegram("sendMessage", {
          chat_id: chatId,
          text: `⚠️ Yuz tekshiruvidan o'tmadingiz (${Math.round(faceResult.confidence)}%).\nKelgan vaqtingiz qayd etildi, lekin rahbar ko'radi. Muammo bo'lsa admin bilan bog'laning.`,
          reply_markup: employeeKeyboard(),
        });
      }

      // Notify admins — no manual review needed, just FYI
      for (const adminId of allAdminIds) {
        (async () => {
          try {
            await sendTelegram("sendPhoto", {
              chat_id: adminId,
              photo: fileId,
              caption: punchCaption + `\n\n🤖 AI natija: ${faceLabel}`,
            });
          } catch (err) {
            console.error(`Admin notify failed (${adminId}):`, err);
          }
        })();
      }
    } else {
      // No AI configured — send to admin for manual review
      for (const adminId of allAdminIds) {
        (async () => {
          try {
            await sendTelegram("sendPhoto", {
              chat_id: adminId,
              photo: employee.faceFileId,
              caption: `🪪 Etalon yuz: ${employee.name}`,
            });
            await sendTelegram("sendPhoto", {
              chat_id: adminId,
              photo: fileId,
              caption: punchCaption + "\n\n🔍 Yuzni tekshiring:",
              reply_markup: {
                inline_keyboard: [[
                  { text: "✅ Yuz mos", callback_data: `face:ok:${result.proofId}:${chatId}` },
                  { text: "❌ Yuz mos emas", callback_data: `face:reject:${result.proofId}:${chatId}` },
                ]],
              },
            });
          } catch (err) {
            console.error(`Admin face-review notify failed (${adminId}):`, err);
          }
        })();
      }
    }
  } catch (err) {
    console.error("Telegram punch error:", err);
    await clearState(chatId);
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "❌ Texnik xatolik yuz berdi. Qayta urining.",
      reply_markup: employeeKeyboard(),
    });
  }
  return true;
}

// ─── Face decision callback ───────────────────────────────────────────────────

async function handleFaceDecision(callback) {
  const parts = String(callback.data || "").split(":");
  if (parts[0] !== "face") return false;
  const [, decision, proofId, employeeChatId] = parts;
  if (!["ok", "reject"].includes(decision) || !proofId) return false;

  if (!await isAdminChat(callback.message?.chat?.id)) {
    await answerCallback(callback.id, "Bu amal faqat adminlar uchun.");
    return true;
  }

  const sql = getSql();
  const newStatus = decision === "ok" ? "ok" : "rejected";
  await sql`UPDATE proofs SET face_status = ${newStatus} WHERE id = ${proofId}`;

  if (decision === "ok") {
    await answerCallback(callback.id, "✅ Yuz tasdiqlandi.");
    await sendTelegram("editMessageCaption", {
      chat_id: callback.message.chat.id,
      message_id: callback.message.message_id,
      caption: callback.message.caption + "\n\n✅ Yuz tasdiqlandi",
    }).catch(() => {});
    if (employeeChatId) {
      sendTelegram("sendMessage", {
        chat_id: employeeChatId,
        text: "✅ Yuzingiz rahbar tomonidan tasdiqlandi.",
      }).catch(() => {});
    }
  } else {
    await answerCallback(callback.id, "❌ Yuz rad etildi.");
    await sendTelegram("editMessageCaption", {
      chat_id: callback.message.chat.id,
      message_id: callback.message.message_id,
      caption: callback.message.caption + "\n\n❌ Yuz rad etildi",
    }).catch(() => {});
    if (employeeChatId) {
      sendTelegram("sendMessage", {
        chat_id: employeeChatId,
        text: "⚠️ Rahbar yuzingizni tasdiqlamadi. Kelgan vaqtingiz qayd etildi, lekin yuz tekshiruvi rad etildi. Muammo bo'lsa admin bilan bog'laning.",
        reply_markup: employeeKeyboard(),
      }).catch(() => {});
    }
  }
  return true;
}

// ─── Face re-enrollment ───────────────────────────────────────────────────────

async function handleReEnrollFace(chatId) {
  const employee = await employeeByChat(chatId);
  if (!employee) {
    await sendTelegram("sendMessage", { chat_id: chatId, text: "Xodim topilmadi.", reply_markup: employeeKeyboard() });
    return;
  }
  await startFaceEnroll(chatId);
}

// ─── Dashboard data ───────────────────────────────────────────────────────────

async function getDashboardData(day = todayKey()) {
  const sql = getSql();
  const [employees, rows] = await Promise.all([
    sql`SELECT id, name, role, phone, location_id AS "locationId", shift_start AS "shiftStart", shift_end AS "shiftEnd", status, code FROM employees ORDER BY created_at ASC`,
    sql`SELECT a.employee_id AS "employeeId", a.arrival, a.departure, a.arrival_photo_id AS "arrivalPhoto", p.location_accuracy AS "locationAccuracy" FROM attendance a LEFT JOIN proofs p ON p.id = a.arrival_photo_id WHERE a.day = ${day}`,
  ]);
  const attendance = new Map(rows.map((r) => [r.employeeId, r]));
  const records = employees
    .filter((e) => !["inactive", "vacation", "sick"].includes(e.status))
    .map((employee) => ({ employee, record: attendance.get(employee.id) || {} }));
  return { day, employees, records };
}

// ─── Menu handlers ────────────────────────────────────────────────────────────

function recordLine({ employee, record }) {
  const late = lateMinutes(employee, record);
  return `${employee.name} — ${record.arrival || "--:--"}${late ? ` (+${late} daq)` : ""}`;
}

function gpsIssueRows(records) {
  return records.filter(({ record }) =>
    record.arrival && (!record.arrivalPhoto || Number(record.locationAccuracy || 0) > 100),
  );
}

function employeeSearchRows(employees, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized || normalized.length < 2) return [];
  return employees.filter((e) => {
    const haystack = [e.name, e.code, e.phone, e.role, getSchedule(e).name].join(" ").toLowerCase();
    return haystack.includes(normalized);
  }).slice(0, 10);
}

async function handleEmployeeMenu(chatId, text) {
  if (text === "✅ Keldim" || text === "🚪 Ketdim") {
    const action = text === "✅ Keldim" ? "in" : "out";
    await setState(chatId, { action, step: "location" });
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: `${text} bosildi.\n\n📍 Lokatsiyangizni yuboring:`,
      reply_markup: {
        keyboard: [[{ text: "📍 Lokatsiyamni yuborish", request_location: true }], [{ text: "❌ Bekor qilish" }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
    return true;
  }

  if (text === "❌ Bekor qilish") {
    await clearState(chatId);
    await sendTelegram("sendMessage", { chat_id: chatId, text: "Bekor qilindi.", reply_markup: employeeKeyboard() });
    return true;
  }

  if (["👤 Profilim", "📅 Bugungi davomatim"].includes(text)) {
    const employee = await employeeByChat(chatId);
    if (!employee) {
      await sendTelegram("sendMessage", {
        chat_id: chatId,
        text: "Telegram bot xodim kartangizga ulanmagan. /start bosib o'zingizning 4 xonali xodim kodingizni kiriting.",
        reply_markup: employeeKeyboard(),
      });
      return true;
    }
    const { records } = await getDashboardData();
    const row = records.find((item) => item.employee.id === employee.id) || { employee, record: {} };
    const sched = getSchedule(employee);
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: [
        text === "👤 Profilim" ? "👤 Profilim" : "📅 Bugungi davomatim",
        "",
        `Ism: ${employee.name}`,
        `Kod: ${employee.code}`,
        `Lavozim: ${employee.role || "ko'rsatilmagan"}`,
        `Filial: ${sched.name}`,
        `Ish vaqti: ${sched.start}${sched.end ? " – " + sched.end : ""}`,
        `Telefon: ${employee.phone || "ko'rsatilmagan"}`,
        "",
        `✅ Kelgan: ${row.record.arrival || "--:--"}`,
        `🚪 Ketgan: ${row.record.departure || "--:--"}`,
        `🕒 Ish vaqti: ${formatDuration(workedMinutes(row.record))}`,
        `⏰ Kechikish: ${formatDuration(lateMinutes(employee, row.record))}`,
      ].join("\n"),
      reply_markup: employeeKeyboard(),
    });
    return true;
  }

  if (text === "🏖 Ta'til so'rash") {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "🏖 Ta'til so'rovi uchun shu formatda yozing:\nTa'til: 2026-06-12 dan 2026-06-15 gacha. Sabab: ...",
      reply_markup: employeeKeyboard(),
    });
    return true;
  }

  if (text === "📝 Kechikish sababi") {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "📝 Kechikish sababini shu formatda yuboring:\nSabab: yo'lda tirbandlik bo'ldi.",
      reply_markup: employeeKeyboard(),
    });
    return true;
  }

  if (text === "📞 Admin bilan bog'lanish") {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "📞 Admin bilan bog'lanish uchun xabaringizni shu formatda yuboring:\nAdmin: savolingiz...",
      reply_markup: employeeKeyboard(),
    });
    return true;
  }

  if (text.startsWith("Ta'til:") || text.startsWith("Sabab:") || text.startsWith("Admin:")) {
    const adminId = adminChatId();
    if (adminId) {
      sendTelegram("sendMessage", {
        chat_id: adminId,
        text: `📝 Xodimdan xabar (Chat ID: ${chatId}):\n${text}`,
      }).catch(() => {});
    }
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "Xabaringiz rahbar/HR ga yuborildi.",
      reply_markup: employeeKeyboard(),
    });
    return true;
  }

  if (text === "📸 Yuzni yangilash") {
    await handleReEnrollFace(chatId);
    return true;
  }

  if (text === "📊 Oylik davomatim") {
    const employee = await employeeByChat(chatId);
    if (!employee) {
      await sendTelegram("sendMessage", { chat_id: chatId, text: "Xodim topilmadi. /start bosing.", reply_markup: employeeKeyboard() });
      return true;
    }
    const sql = getSql();
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent" }));
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const monthStart = `${year}-${month}-01`;
    const monthEnd = `${year}-${month}-${String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
    const rows = await sql`
      SELECT day, arrival, departure FROM attendance
      WHERE employee_id = ${employee.id} AND day >= ${monthStart} AND day <= ${monthEnd}
      ORDER BY day ASC
    `;
    const totalDays = rows.length;
    const totalWorked = rows.reduce((sum, r) => sum + workedMinutes(r), 0);
    const lines = rows.map((r) => {
      const late = Math.max(0, (minutesFromTime(r.arrival) || 0) - (minutesFromTime(getSchedule(employee).start) || 0));
      return `${r.day}: ${r.arrival || "--:--"} → ${r.departure || "hali ketmagan"}${late > 0 ? ` (+${late} daq)` : ""}`;
    });
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: [
        `📊 ${year}-${month} oylik davomat`,
        `👤 ${employee.name}`,
        "",
        `📅 Kelgan kunlar: ${totalDays}`,
        `🕒 Jami ish vaqti: ${formatDuration(totalWorked)}`,
        "",
        ...(lines.length ? lines : ["Hali davomat yo'q."]),
      ].join("\n"),
      reply_markup: employeeKeyboard(),
    });
    return true;
  }

  return false;
}

async function handleManagerMenu(chatId, text) {
  const { day, employees, records } = await getDashboardData();
  const arrived = records.filter(({ record }) => record.arrival).length;
  const active = records.filter(({ record }) => record.arrival && !record.departure).length;
  const lateRows = records.filter(({ employee, record }) => lateMinutes(employee, record) > 0);
  const absentRows = records.filter(({ employee, record }) => isAbsent(employee, record));
  const vacationRows = employees.filter((e) => e.status === "vacation");
  const openRows = records.filter(({ record }) => record.arrival && !record.departure);
  const gpsRows = gpsIssueRows(records);

  if (text === "📊 Bugungi holat" || text === "📈 Hisobotlar") {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: [
        `📊 Bugungi holat (${day})`,
        "",
        `👥 Jami: ${records.length}`,
        `✅ Ishda: ${active}`,
        `⏰ Kechikkan: ${lateRows.length}`,
        `❌ Kelmagan: ${absentRows.length}`,
        `🏖 Ta'tilda: ${vacationRows.length}`,
        "",
        `☑️ Bugun kelgan: ${arrived}`,
        `📍 GPS xato: ${gpsRows.length}`,
      ].join("\n"),
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "👥 Bugun kimlar keldi") {
    const lines = records.filter(({ record }) => record.arrival).map(recordLine);
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: lines.length ? ["👥 Bugun kelganlar:", ...lines].join("\n") : "Hali hech kim kelmagan.",
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "⏰ Kechikkanlar") {
    const section = (title, rows) =>
      [title, rows.length ? rows.map(({ employee, record }) => `• ${employee.name} — ${lateMinutes(employee, record)} daq`).join("\n") : "• Yo'q"].join("\n");
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: lateRows.length
        ? [
            "⏰ Kechikkanlar",
            "",
            section("🔴 1 soatdan ko'p", lateRows.filter(({ employee, record }) => lateMinutes(employee, record) > 60)),
            "",
            section("🟠 15–60 daqiqa", lateRows.filter(({ employee, record }) => { const l = lateMinutes(employee, record); return l >= 15 && l <= 60; })),
            "",
            section("🟢 1–15 daqiqa", lateRows.filter(({ employee, record }) => { const l = lateMinutes(employee, record); return l > 0 && l < 15; })),
          ].join("\n")
        : "⏰ Kechikkanlar yo'q.",
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "❌ Kelmaganlar") {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: absentRows.length
        ? ["❌ Kelmaganlar:", ...absentRows.map(({ employee }) => `• ${employee.name}`)].join("\n")
        : "❌ Kelmaganlar yo'q.",
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "🚨 Muammolar") {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: [
        "🚨 Muammolar",
        "",
        `❌ Kelmaganlar: ${absentRows.length}`,
        absentRows.length ? absentRows.map(({ employee }) => `• ${employee.name}`).join("\n") : "• Yo'q",
        "",
        `⏰ Kechikkanlar: ${lateRows.length}`,
        lateRows.length ? lateRows.map(({ employee, record }) => `• ${employee.name} — ${lateMinutes(employee, record)} daq`).join("\n") : "• Yo'q",
        "",
        `📍 GPS xatolari: ${gpsRows.length}`,
        `🚪 Ketishni bosmagan: ${openRows.length}`,
      ].join("\n"),
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "🟢 Hozir ishda") {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: openRows.length
        ? [`🟢 Hozir ishda: ${openRows.length}`, "", ...openRows.map(({ employee }) => `• ${employee.name}`)].join("\n")
        : "🟢 Hozir ishda hech kim yo'q.",
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "🏢 Filiallar") {
    const lines = BRANCH_IDS.map((branchId) => {
      const branchRecords = records.filter(({ employee }) => employee.locationId === branchId);
      const inWork = branchRecords.filter(({ record }) => record.arrival && !record.departure).length;
      return `🏢 ${BRANCH_CONFIG[branchId]?.name || branchId}: ${inWork}/${branchRecords.length}`;
    });
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: ["🏢 Filiallar bo'yicha holat", "", ...lines].join("\n"),
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "👤 Xodimlar") {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: [
        "👤 Xodimlar",
        "",
        "🔍 Ism yoki kod kiriting:",
        "",
        ...employees.slice(0, 12).map((e) => `• ${e.name} — kod: ${e.code} — ${getSchedule(e).name}`),
      ].join("\n"),
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "📍 GPS") {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: gpsRows.length
        ? ["📍 GPS xatoliklari", "", ...gpsRows.map(({ employee }) => `⚠️ ${employee.name}`)].join("\n")
        : "✅ GPS bo'yicha xatolik yo'q.",
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "📸 Selfie") {
    const approved = records.filter(({ record }) => record.arrival && record.arrivalPhoto).length;
    const pending = records.filter(({ record }) => record.arrival && !record.arrivalPhoto).length;
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: [`📸 Selfie tekshirish`, "", `✅ Rasmli: ${approved}`, `⚠️ Rasmsiz: ${pending}`].join("\n"),
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "📥 Excel hisobot") {
    const csvRows = [["Sana", "Xodim", "Telefon", "Filial", "Kelgan", "Ketgan", "Ish vaqti", "Kechikish"]];
    records.forEach(({ employee, record }) => {
      csvRows.push([
        day, employee.name, employee.phone || "", getSchedule(employee).name,
        record.arrival || "", record.departure || "",
        formatDuration(workedMinutes(record)), formatDuration(lateMinutes(employee, record)),
      ]);
    });
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    await sendTelegramDocument({ chatId, filename: `davomat-${day}.csv`, content: csv, caption: "📥 Kunlik CSV hisobot" });
    return true;
  }

  if (text === "⚙️ Sozlamalar") { await sendMenu(chatId); return true; }

  // Employee search
  const searchRows = employeeSearchRows(employees, text);
  if (searchRows.length) {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: ["🔍 Xodim topildi:", "", ...searchRows.map((e) => {
        const row = records.find((item) => item.employee.id === e.id) || { record: {} };
        return [
          `👤 ${e.name}`, `Kod: ${e.code}`, `Filial: ${getSchedule(e).name}`,
          `Kelgan: ${row.record.arrival || "--:--"}`, `Ketgan: ${row.record.departure || "--:--"}`,
        ].join("\n");
      })].join("\n\n"),
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  return false;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { methodNotAllowed(res); return; }

  try {
    await ensureSchema();
    const update = await readBody(req);

    // Callback queries (inline button taps)
    if (update.callback_query) {
      if (await handleFaceDecision(update.callback_query)) { json(res, 200, { ok: true }); return; }
      if (await handleRoleDecision(update.callback_query)) { json(res, 200, { ok: true }); return; }
      if (await handleEmployeeAccessDecision(update.callback_query)) { json(res, 200, { ok: true }); return; }
      if (await handleAccessDecision(update.callback_query)) { json(res, 200, { ok: true }); return; }
      json(res, 200, { ok: true });
      return;
    }

    const message = update.message || update.channel_post;
    if (!message) { json(res, 200, { ok: true }); return; }

    const chatId = message.chat?.id;
    if (!chatId) { json(res, 200, { ok: true }); return; }

    const text = String(message.text || "").trim();
    const contactPhone = message.contact?.phone_number;

    const sql = getSql();

    // /menu or /help
    if (text === "/menu" || text === "/help") {
      if (await isAllowedChat(chatId)) {
        await sendMenu(chatId);
      } else {
        await sendTelegram("sendMessage", { chat_id: chatId, text: "Kirish ruxsati yo'q. /start bosing." });
      }
      json(res, 200, { ok: true });
      return;
    }

    // /start
    if (text.startsWith("/start")) {
      if (await isAllowedChat(chatId)) {
        await sendMenu(chatId);
      } else {
        const pending = await sql`SELECT status FROM telegram_access WHERE chat_id = ${String(chatId)} AND status IN ('pending','code_pending') LIMIT 1`;
        if (pending.length) {
          const msg = pending[0].status === "code_pending"
            ? "📝 4 xonali xodim kodingizni yuboring:"
            : "⏳ So'rovingiz ko'rib chiqilmoqda. Kuting.";
          await sendTelegram("sendMessage", { chat_id: chatId, text: msg, reply_markup: { remove_keyboard: true } });
        } else {
          await sendNewAccessRequest({ chatId, message });
        }
      }
      json(res, 200, { ok: true });
      return;
    }

    // Contact shared
    if (contactPhone) {
      await handleContact({ chatId, message, phone: normalizePhone(contactPhone) });
      json(res, 200, { ok: true });
      return;
    }

    // Location shared
    if (message.location) {
      if (!await isAllowedChat(chatId)) {
        await sendTelegram("sendMessage", { chat_id: chatId, text: "Kirish ruxsati yo'q. /start bosing." });
        json(res, 200, { ok: true }); return;
      }
      await handleLocation({ chatId, message });
      json(res, 200, { ok: true });
      return;
    }

    // Photo shared
    if (message.photo) {
      if (!await isAllowedChat(chatId)) { json(res, 200, { ok: true }); return; }
      if (await handlePhoto({ chatId, message })) { json(res, 200, { ok: true }); return; }
    }

    // Text messages
    if (text) {
      // User approved as employee but waiting for their code
      const codePending = await sql`SELECT phone FROM telegram_access WHERE chat_id = ${String(chatId)} AND status = 'code_pending' LIMIT 1`;
      if (codePending.length) {
        if (/^\d{4}$/.test(text)) {
          await linkEmployeeCode({ chatId, message, code: text });
        } else {
          await sendTelegram("sendMessage", { chat_id: chatId, text: "📝 Iltimos, 4 xonali xodim kodingizni yuboring:" });
        }
        json(res, 200, { ok: true });
        return;
      }

      if (!await isAllowedChat(chatId)) {
        const pending = await sql`SELECT status FROM telegram_access WHERE chat_id = ${String(chatId)} AND status = 'pending' LIMIT 1`;
        if (pending.length) {
          await sendTelegram("sendMessage", { chat_id: chatId, text: "⏳ So'rovingiz ko'rib chiqilmoqda. Kuting." });
        } else {
          await sendNewAccessRequest({ chatId, message });
        }
        json(res, 200, { ok: true });
        return;
      }

      if (await isAdminChat(chatId) && await handleManagerMenu(chatId, text)) { json(res, 200, { ok: true }); return; }
      if (await handleEmployeeMenu(chatId, text)) { json(res, 200, { ok: true }); return; }

      await sendMenu(chatId);
    }

    json(res, 200, { ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    // Always return 200 to Telegram to avoid retries
    json(res, 200, { ok: false, error: error.message });
  }
};
