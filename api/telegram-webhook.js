const { ensureSchema, getSql, json, methodNotAllowed, readBody, serverError } = require("./_db");

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function allowedPhones() {
  return String(process.env.ALLOWED_TELEGRAM_PHONES || "998998567979")
    .split(",")
    .map(normalizePhone)
    .filter(Boolean);
}

function adminChatId() {
  return String(process.env.TELEGRAM_CHAT_ID || "");
}

function accessCode() {
  return String(process.env.TELEGRAM_ACCESS_CODE || process.env.BOT_ACCESS_CODE || process.env.ADMIN_PIN || "1122").trim();
}

function siteUrl() {
  return process.env.SITE_URL || "https://ishga-kelib-ketish.vercel.app";
}

function todayKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function nowTime() {
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function minutesFromTime(time) {
  if (!time || !time.includes(":")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatDuration(minutes) {
  if (!minutes || minutes < 1) return "0 daq";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours} soat ${mins} daq`;
  if (hours) return `${hours} soat`;
  return `${mins} daq`;
}

const LOCATIONS = {
  c5: { name: "C5 showroom", start: "09:00", end: "21:00" },
  "ibn-sino": { name: "Ibn Sino showroom", start: "09:00", end: "20:00" },
  "eco-bozor": { name: "Eco Bozor showroom", start: "10:00", end: "20:00" },
  alfraganus: { name: "Alfraganus showroom", start: "10:00", end: "20:00" },
  sklad: { name: "Sklad", start: "09:00", end: "" },
};
const BRANCH_IDS = ["c5", "ibn-sino", "eco-bozor", "alfraganus", "sklad"];

function getSchedule(employee) {
  const base = LOCATIONS[employee.locationId] || {};
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

function employeeKeyboard() {
  return {
    keyboard: [
      [{ text: "👤 Profilim" }, { text: "📅 Bugungi davomatim" }],
      [{ text: "📊 Oylik davomatim" }, { text: "📝 Kechikish sababi" }],
      [{ text: "🏖 Ta'til so'rash" }, { text: "📞 Admin bilan bog'lanish" }],
      [{ text: "⚙️ Sozlamalar" }],
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

function isManagerChat(chatId) {
  return String(chatId) === adminChatId();
}

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
}

async function sendTelegramDocument({ chatId, filename, content, caption }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN env var is required");

  const form = new FormData();
  form.append("chat_id", chatId);
  if (caption) form.append("caption", caption);
  form.append("document", new Blob([content], { type: "text/csv;charset=utf-8" }), filename);

  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendDocument failed: ${body}`);
  }
}

async function sendMenu(chatId) {
  const manager = isManagerChat(chatId);
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: manager
      ? "Rahbar / HR menyusi tayyor. Kerakli bo'limni tanlang."
      : "Xodim menyusi tayyor. Kerakli amalni tanlang.",
    reply_markup: manager ? managerKeyboard() : employeeKeyboard(),
  });
}

async function isAllowedChat(chatId) {
  if (isManagerChat(chatId)) return true;
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`SELECT phone FROM telegram_access WHERE chat_id = ${String(chatId)} AND status = 'allowed' LIMIT 1`;
  return String(rows[0]?.phone || "").startsWith("employee:");
}

async function requestPermit(chatId) {
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: [
      "🔐 Botga kirish uchun o'zingizning 4 xonali xodim kodingizni yuboring.",
      "Masalan: 1234",
      "",
      "Kod yuborilgandan keyin rahbar/HR tasdiqlaydi.",
      "Kodingizni bilmasangiz rahbar/admindan so'rang.",
    ].join("\n"),
    reply_markup: { remove_keyboard: true },
  });
}

async function requestPhone(chatId) {
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: "Davomat tizimiga kirish uchun telefon raqamingizni tasdiqlang.",
    reply_markup: {
      keyboard: [[{ text: "Telefon raqamni yuborish", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

async function sendAccessLink(chatId) {
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: "Raqam tasdiqlandi. Quyidagi tugma orqali davomat tizimiga kiring.",
    reply_markup: {
      inline_keyboard: [[{ text: "Davomat tizimini ochish", url: siteUrl() }]],
    },
  });
  await sendMenu(chatId);
}

async function denyAccess(chatId) {
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: "Botga kirish ruxsati berilmadi. Admin bilan bog'laning.",
    reply_markup: { remove_keyboard: true },
  });
}

async function grantPermitAccess({ chatId, message }) {
  await ensureSchema();
  const sql = getSql();
  const name = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");
  const permitKey = `permit:${chatId}`;

  await sql`
    INSERT INTO telegram_access (phone, chat_id, name, status, decided_at)
    VALUES (${permitKey}, ${String(chatId)}, ${name}, 'allowed', NOW())
    ON CONFLICT (phone)
    DO UPDATE SET chat_id = EXCLUDED.chat_id, name = EXCLUDED.name, status = 'allowed', decided_at = NOW()
  `;

  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: "✅ Ruxsatnoma tasdiqlandi. Bot menyusi ochildi.",
  });
  await sendMenu(chatId);
}

async function grantEmployeeCodeAccess({ chatId, message, code }) {
  await ensureSchema();
  const sql = getSql();
  const name = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");
  const rows = await sql`
    SELECT id, name, status
    FROM employees
    WHERE code = ${code}
    LIMIT 1
  `;
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
      text: "❌ Bu xodim hozir faol holatda emas. Rahbar/HR bilan bog'laning.",
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  const employeeKey = `employee:${employee.id}`;
  const linkedRows = await sql`
    SELECT chat_id AS "chatId", status
    FROM telegram_access
    WHERE phone = ${employeeKey}
    LIMIT 1
  `;
  const linked = linkedRows[0];
  if (linked?.status === "allowed" && String(linked.chatId) === String(chatId)) {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: `✅ Bot allaqachon ${employee.name} nomiga ulangan.`,
    });
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

function employeeCodeFromText(text) {
  const cleaned = String(text || "").trim();
  const match = cleaned.match(/(?:kod|code|ruxsat)?\s*:?\s*(\d{4})$/i);
  return match?.[1] || "";
}

function isPermitText(text) {
  const cleaned = String(text || "").trim();
  const code = accessCode();
  return cleaned === code || cleaned.toLowerCase() === `ruxsat: ${code}` || cleaned.toLowerCase() === `kod: ${code}`;
}

async function answerCallback(callbackId, text) {
  await sendTelegram("answerCallbackQuery", {
    callback_query_id: callbackId,
    text,
    show_alert: false,
  });
}

async function editAdminDecision(message, text) {
  await sendTelegram("editMessageText", {
    chat_id: message.chat.id,
    message_id: message.message_id,
    text,
  });
}

async function requestAdminDecision({ phone, chatId, name }) {
  const adminId = adminChatId();
  if (!adminId) return;

  await sendTelegram("sendMessage", {
    chat_id: adminId,
    text: [
      "Yangi foydalanuvchi kirish so'radi:",
      `Ism: ${name || "Noma'lum"}`,
      `Telefon: +${phone}`,
      `Chat ID: ${chatId}`,
    ].join("\n"),
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

async function handleAccessDecision(callback) {
  const [scope, decision, phone] = String(callback.data || "").split(":");
  if (scope !== "access" || !["allow", "deny"].includes(decision) || !phone) return false;

  const fromChatId = String(callback.message?.chat?.id || "");
  if (fromChatId !== adminChatId()) {
    await answerCallback(callback.id, "Bu amal uchun ruxsat yo'q.");
    return true;
  }

  await ensureSchema();
  const sql = getSql();
  const status = decision === "allow" ? "allowed" : "denied";
  const rows = await sql`
    UPDATE telegram_access
    SET status = ${status}, decided_at = NOW()
    WHERE phone = ${phone}
    RETURNING chat_id AS "chatId", name
  `;

  const access = rows[0];
  if (!access) {
    await answerCallback(callback.id, "So'rov topilmadi.");
    return true;
  }

  if (decision === "allow") {
    await sendAccessLink(access.chatId);
    await answerCallback(callback.id, "Ruxsat berildi.");
    await editAdminDecision(callback.message, `Ruxsat berildi: +${phone} (${access.name || "Noma'lum"})`);
  } else {
    await denyAccess(access.chatId);
    await answerCallback(callback.id, "Rad etildi.");
    await editAdminDecision(callback.message, `Rad etildi: +${phone} (${access.name || "Noma'lum"})`);
  }

  return true;
}

async function handleEmployeeAccessDecision(callback) {
  const [scope, decision, code, targetChatId] = String(callback.data || "").split(":");
  if (scope !== "emp" || !["allow", "deny"].includes(decision) || !code || !targetChatId) return false;

  const fromChatId = String(callback.message?.chat?.id || "");
  if (fromChatId !== adminChatId()) {
    await answerCallback(callback.id, "Bu amal uchun ruxsat yo'q.");
    return true;
  }

  await ensureSchema();
  const sql = getSql();
  const employeeRows = await sql`
    SELECT id, name
    FROM employees
    WHERE code = ${code}
    LIMIT 1
  `;
  const employee = employeeRows[0];
  const requestKey = `request:${targetChatId}:${code}`;
  const requestRows = await sql`
    SELECT chat_id AS "chatId", name
    FROM telegram_access
    WHERE phone = ${requestKey} AND status = 'pending'
    LIMIT 1
  `;
  const request = requestRows[0];

  if (!employee || !request) {
    await answerCallback(callback.id, "So'rov topilmadi yoki eskirgan.");
    await editAdminDecision(callback.message, "So'rov topilmadi yoki eskirgan.");
    return true;
  }

  if (decision === "deny") {
    await sql`
      UPDATE telegram_access
      SET status = 'denied', decided_at = NOW()
      WHERE phone = ${requestKey}
    `;
    await denyAccess(targetChatId);
    await answerCallback(callback.id, "Rad etildi.");
    await editAdminDecision(callback.message, `❌ Rad etildi: ${employee.name} (${request.name || "Noma'lum"})`);
    return true;
  }

  const employeeKey = `employee:${employee.id}`;
  const linkedRows = await sql`
    SELECT chat_id AS "chatId"
    FROM telegram_access
    WHERE phone = ${employeeKey} AND status = 'allowed'
    LIMIT 1
  `;
  const linked = linkedRows[0];
  if (linked && String(linked.chatId) !== String(targetChatId)) {
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
  await sql`DELETE FROM telegram_access WHERE phone = ${requestKey}`;

  await sendTelegram("sendMessage", {
    chat_id: targetChatId,
    text: `✅ Rahbar tasdiqladi. Bot ${employee.name} nomiga ulandi.`,
  });
  await sendMenu(targetChatId);
  await answerCallback(callback.id, "Tasdiqlandi.");
  await editAdminDecision(callback.message, `✅ Tasdiqlandi: ${employee.name} (${request.name || "Noma'lum"})`);
  return true;
}

async function handleContact({ chatId, message, phone }) {
  await ensureSchema();
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
  if (existing[0]?.status === "allowed") {
    await sendAccessLink(chatId);
    return;
  }

  if (existing[0]?.status === "denied") {
    await denyAccess(chatId);
    return;
  }

  await sql`
    INSERT INTO telegram_access (phone, chat_id, name, status)
    VALUES (${phone}, ${String(chatId)}, ${name}, 'pending')
    ON CONFLICT (phone)
    DO UPDATE SET chat_id = EXCLUDED.chat_id, name = EXCLUDED.name, status = 'pending', requested_at = NOW(), decided_at = NULL
  `;
  await requestAdminDecision({ phone, chatId, name });
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text: "So'rovingiz adminga yuborildi. Ruxsat berilsa, kirish tugmasi shu yerga keladi.",
    reply_markup: { remove_keyboard: true },
  });
}

async function getDashboardData(day = todayKey()) {
  await ensureSchema();
  const sql = getSql();
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
      code
    FROM employees
    ORDER BY created_at ASC
  `;
  const rows = await sql`
    SELECT
      a.employee_id AS "employeeId",
      a.arrival,
      a.departure,
      a.arrival_photo_id AS "arrivalPhoto",
      a.departure_photo_id AS "departurePhoto",
      p.location_accuracy AS "locationAccuracy"
    FROM attendance a
    LEFT JOIN proofs p ON p.id = a.arrival_photo_id
    WHERE a.day = ${day}
  `;
  const attendance = new Map(rows.map((row) => [row.employeeId, row]));
  const records = employees
    .filter((employee) => !["inactive", "vacation", "sick"].includes(employee.status))
    .map((employee) => ({ employee, record: attendance.get(employee.id) || {} }));
  return { day, employees, records };
}

async function employeeByChat(chatId) {
  await ensureSchema();
  const sql = getSql();
  const accessRows = await sql`SELECT phone FROM telegram_access WHERE chat_id = ${String(chatId)} AND status = 'allowed' LIMIT 1`;
  const accessKey = String(accessRows[0]?.phone || "");
  if (accessKey.startsWith("employee:")) {
    const employeeId = accessKey.slice("employee:".length);
    const rows = await sql`
      SELECT
        id,
        name,
        role,
        phone,
        location_id AS "locationId",
        shift_start AS "shiftStart",
        shift_end AS "shiftEnd",
        status,
        code
      FROM employees
      WHERE id = ${employeeId}
      LIMIT 1
    `;
    return rows[0] || null;
  }

  const phone = normalizePhone(accessKey);
  if (!phone || accessKey.startsWith("permit:")) return null;

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
      code
    FROM employees
  `;
  return employees.find((employee) => normalizePhone(employee.phone).endsWith(phone.slice(-9))) || null;
}

function recordLine({ employee, record }) {
  const late = lateMinutes(employee, record);
  return `${employee.name} - ${record.arrival || "--:--"}${late ? ` (+${late} daq)` : ""}`;
}

function branchStatusLine(branchId, records) {
  const branch = LOCATIONS[branchId];
  const branchRecords = records.filter(({ employee }) => employee.locationId === branchId);
  const inWork = branchRecords.filter(({ record }) => record.arrival && !record.departure).length;
  return `🏢 ${branch.name}: ${inWork}/${branchRecords.length}`;
}

function gpsIssueRows(records) {
  return records
    .filter(({ record }) => record.arrival && (!record.arrivalPhoto || Number(record.locationAccuracy || 0) > 100))
    .map(({ employee, record }) => ({
      employee,
      reason: !record.arrivalPhoto ? "GPS/selfie dalili yo'q" : "GPS aniqligi past",
      distance: record.locationAccuracy ? Math.round(Number(record.locationAccuracy)) : null,
      allowed: 100,
    }));
}

function selfieIssueRows(records) {
  return records.filter(({ record }) => record.arrival && !record.arrivalPhoto);
}

function employeeSearchRows(employees, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized || normalized.length < 2) return [];
  return employees
    .filter((employee) => {
      const haystack = [
        employee.name,
        employee.code,
        employee.phone,
        employee.role,
        getSchedule(employee).name,
      ].join(" ").toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, 10);
}

async function sendOpenSite(chatId, text) {
  await sendTelegram("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: {
      inline_keyboard: [[{ text: "Davomat tizimini ochish", url: siteUrl() }]],
    },
  });
}

async function handleEmployeeMenu(chatId, text) {
  if (["✅ Keldim", "🚪 Ketdim", "📍 Lokatsiya yuborish", "📸 Selfie yuborish"].includes(text)) {
    await sendOpenSite(chatId, "Kamera va GPS xavfsiz tekshiruv uchun sayt orqali belgilanadi.");
    return true;
  }

  if (["👤 Profilim", "👤 Mening davomatim", "📅 Bugungi davomatim", "🕒 Bugungi ish vaqtim", "📊 Oylik davomatim"].includes(text)) {
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
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: [
        text === "👤 Profilim" ? "👤 Profilim" : "📅 Bugungi davomatim",
        "",
        `Ism: ${employee.name}`,
        `Kod: ${employee.code}`,
        `Lavozim: ${employee.role || "ko'rsatilmagan"}`,
        `Filial: ${getSchedule(employee).name}`,
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

  if (text === "📝 Kechikish sababi" || text === "📝 Sabab yozish") {
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

  if (text === "⚙️ Sozlamalar") {
    await sendMenu(chatId);
    return true;
  }

  if (text.startsWith("Ta'til:") || text.startsWith("Sabab:") || text.startsWith("Admin:")) {
    const adminId = adminChatId();
    if (adminId) {
      await sendTelegram("sendMessage", {
        chat_id: adminId,
        text: `📝 Xodimdan xabar:\nChat ID: ${chatId}\n${text}`,
      });
    }
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "Xabaringiz rahbar/HR ga yuborildi.",
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
  const vacationRows = employees.filter((employee) => employee.status === "vacation");
  const openRows = records.filter(({ record }) => record.arrival && !record.departure);
  const gpsRows = gpsIssueRows(records);
  const selfieRows = selfieIssueRows(records);

  if (text === "📊 Bugungi holat" || text === "📈 Hisobotlar" || text === "📊 Kunlik hisobot") {
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
        `📸 Selfie tekshiruv: ${selfieRows.length}`,
      ].join("\n"),
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "👥 Bugun kimlar keldi") {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: ["👥 Bugun kelganlar:", ...records.filter(({ record }) => record.arrival).map(recordLine)].join("\n") || "Kelganlar yo'q.",
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "⏰ Kechikkanlar") {
    const critical = lateRows.filter(({ employee, record }) => lateMinutes(employee, record) > 60);
    const medium = lateRows.filter(({ employee, record }) => {
      const late = lateMinutes(employee, record);
      return late >= 15 && late <= 60;
    });
    const light = lateRows.filter(({ employee, record }) => {
      const late = lateMinutes(employee, record);
      return late > 0 && late < 15;
    });
    const section = (title, rows) => [
      title,
      rows.length ? rows.map(({ employee, record }) => `• ${employee.name} - ${lateMinutes(employee, record)} daq`).join("\n") : "• Yo'q",
    ].join("\n");
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: lateRows.length
        ? [
          "⏰ Kechikkanlar",
          "",
          section("🔴 1 soatdan ko'p", critical),
          "",
          section("🟠 15-60 daqiqa", medium),
          "",
          section("🟢 1-15 daqiqa", light),
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
        ? ["❌ Kelmaganlar:", ...absentRows.map(({ employee }) => employee.name)].join("\n")
        : "❌ Kelmaganlar yo'q.",
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "🚨 Muammolar" || text === "⚠️ Ogohlantirishlar") {
    const notCheckedOut = records.filter(({ record }) => record.arrival && !record.departure);
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: [
        "🚨 Muammolar",
        "",
        `❌ Kelmaganlar: ${absentRows.length}`,
        absentRows.length ? absentRows.map(({ employee }) => `• ${employee.name}`).join("\n") : "• Yo'q",
        "",
        `⏰ Kechikkanlar: ${lateRows.length}`,
        lateRows.length ? lateRows.map(({ employee, record }) => `• ${employee.name} - ${lateMinutes(employee, record)} daq`).join("\n") : "• Yo'q",
        "",
        `📍 GPS xatolari: ${gpsRows.length}`,
        `📸 Selfie muammolari: ${selfieRows.length}`,
        `🚪 Ketishni bosmagan: ${notCheckedOut.length}`,
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
    const lines = BRANCH_IDS.map((branchId) => branchStatusLine(branchId, records));
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: [
        "🏢 Filiallar bo'yicha holat",
        "",
        `📍 GPS xatolari: ${gpsRows.length}`,
        `📸 Selfie muammolari: ${selfieRows.length}`,
        "",
        ...lines,
      ].join("\n"),
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "👤 Xodimlar" || text === "👥 Xodimlar") {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: [
        "👤 Xodimlar",
        "",
        "🔍 Ism yoki kod kiriting:",
        "Masalan: Nig'monjon yoki 2038",
        "",
        ...employees.slice(0, 12).map((employee) => `• ${employee.name} - kod: ${employee.code} - ${getSchedule(employee).name}`),
      ].join("\n"),
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "📍 GPS" || text === "📍 GPS xatoliklari") {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: gpsRows.length
        ? [
          "📍 GPS xatoliklari",
          "",
          ...gpsRows.map(({ employee, reason, distance, allowed }) => [
            `⚠️ ${employee.name}`,
            `Sabab: ${reason}`,
            `Masofa/aniqlik: ${distance ? `${distance} m` : "noma'lum"}`,
            `Ruxsat etilgan: ${allowed} m`,
          ].join("\n")),
        ].join("\n\n")
        : "✅ GPS bo'yicha tezkor xatolik yo'q.",
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "📸 Selfie" || text === "📸 Selfie tekshirish") {
    const approved = records.filter(({ record }) => record.arrival && record.arrivalPhoto).length;
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: [
        "📸 Selfie tekshirish",
        "",
        `🤖 AI tasdiqlagan: ${approved}`,
        `⚠️ Tekshirish kerak: ${selfieRows.length}`,
        "",
        selfieRows.length ? selfieRows.map(({ employee }) => `• ${employee.name} - selfie/GPS dalili yo'q`).join("\n") : "Shubhali rasm yo'q.",
      ].join("\n"),
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "📥 Excel hisobot" || text === "📥 Excel yuklash" || text === "📥 Hisobot yuklash") {
    const rows = [["Sana", "Xodim", "Telefon", "Filial", "Kelgan", "Ketgan", "Ish vaqti", "Kechikish"]];
    records.forEach(({ employee, record }) => {
      rows.push([day, employee.name, employee.phone || "", getSchedule(employee).name, record.arrival || "", record.departure || "", formatDuration(workedMinutes(record)), formatDuration(lateMinutes(employee, record))]);
    });
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    await sendTelegramDocument({
      chatId,
      filename: `davomat-${day}.csv`,
      content: csv,
      caption: "📥 Kunlik CSV hisobot",
    });
    return true;
  }

  const searchRows = employeeSearchRows(employees, text);
  if (searchRows.length) {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: [
        "🔍 Xodim topildi:",
        "",
        ...searchRows.map((employee) => {
          const row = records.find((item) => item.employee.id === employee.id) || { record: {} };
          return [
            `👤 ${employee.name}`,
            `Kod: ${employee.code}`,
            `Telefon: ${employee.phone || "yo'q"}`,
            `Lavozim: ${employee.role || "ko'rsatilmagan"}`,
            `Filial: ${getSchedule(employee).name}`,
            `Kelgan: ${row.record.arrival || "--:--"}`,
            `Ketgan: ${row.record.departure || "--:--"}`,
          ].join("\n");
        }),
      ].join("\n\n"),
      reply_markup: managerKeyboard(),
    });
    return true;
  }

  if (text === "⚙️ Sozlamalar") {
    await sendMenu(chatId);
    return true;
  }

  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res);
    return;
  }

  try {
    const update = await readBody(req);
    if (update.callback_query && await handleEmployeeAccessDecision(update.callback_query)) {
      json(res, 200, { ok: true });
      return;
    }
    if (update.callback_query && await handleAccessDecision(update.callback_query)) {
      json(res, 200, { ok: true });
      return;
    }

    const message = update.message || update.channel_post;
    const chatId = message?.chat?.id;
    const text = String(message?.text || "");
    const contactPhone = message?.contact?.phone_number;

    if (chatId && text.startsWith("/start")) {
      if (await isAllowedChat(chatId)) {
        await sendMenu(chatId);
      } else {
        await requestPermit(chatId);
      }
    } else if (chatId && contactPhone) {
      await requestPermit(chatId);
    } else if (chatId && text) {
      if (!await isAllowedChat(chatId)) {
        const employeeCode = employeeCodeFromText(text);
        if (employeeCode) {
          await grantEmployeeCodeAccess({ chatId, message, code: employeeCode });
        } else {
          await requestPermit(chatId);
        }
        json(res, 200, { ok: true });
        return;
      }
      if (isManagerChat(chatId) && await handleManagerMenu(chatId, text)) {
        json(res, 200, { ok: true });
        return;
      }
      if (await handleEmployeeMenu(chatId, text)) {
        json(res, 200, { ok: true });
        return;
      }
      await sendMenu(chatId);
    }

    json(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
};
