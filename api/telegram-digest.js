const { ensureSchema, getSql, json, methodNotAllowed, serverError, BRANCH_CONFIG, BRANCH_IDS, shiftStartFor } = require("./_db");

const LOCATIONS = BRANCH_CONFIG;

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function minutesFromTime(time) {
  if (!time || !time.includes(":")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function lateMinutes(employee, record) {
  if (!record?.arrival) return 0;
  const arrival = minutesFromTime(record.arrival);
  const start = minutesFromTime(shiftStartFor(employee));
  if (arrival === null || start === null) return 0;
  return Math.max(0, arrival - start);
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

module.exports = async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    methodNotAllowed(res);
    return;
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const day = todayKey();
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) throw new Error("TELEGRAM_CHAT_ID env var is required");

    const employees = await sql`
      SELECT
        id,
        name,
        location_id AS "locationId",
        shift_start AS "shiftStart",
        shift_end AS "shiftEnd",
        status
      FROM employees
      ORDER BY created_at ASC
    `;
    const rows = await sql`
      SELECT
        employee_id AS "employeeId",
        arrival,
        departure,
        arrival_photo_id AS "arrivalPhoto",
        departure_photo_id AS "departurePhoto"
      FROM attendance
      WHERE day = ${day}
    `;
    const attendance = new Map(rows.map((row) => [row.employeeId, row]));
    const records = employees
      .filter((employee) => !["inactive", "vacation", "sick"].includes(employee.status))
      .map((employee) => ({ employee, record: attendance.get(employee.id) || {} }));

    const arrived = records.filter(({ record }) => record.arrival).length;
    const lateRows = records.filter(({ employee, record }) => lateMinutes(employee, record) > 0);
    const absentRows = records.filter(({ record }) => !record.arrival);
    const notCheckedOut = records.filter(({ record }) => record.arrival && !record.departure);
    const branchLines = BRANCH_IDS.map((branchId) => {
      const branchRecords = records.filter(({ employee }) => employee.locationId === branchId);
      const inWork = branchRecords.filter(({ record }) => record.arrival && !record.departure).length;
      return `${LOCATIONS[branchId].name}: ${inWork}/${branchRecords.length} ishda`;
    });

    const text = [
      `📊 Kun oxiri hisobot (${day})`,
      `👥 Jami faol xodim: ${records.length}`,
      `✅ Kelgan: ${arrived}`,
      `⏰ Kechikkan: ${lateRows.length}`,
      `❌ Kelmagan: ${absentRows.length}`,
      `🚪 Ketishni bosmagan: ${notCheckedOut.length}`,
      "",
      "🏢 Filiallar:",
      ...branchLines,
      "",
      lateRows.length ? "⏰ Kechikkanlar:" : "",
      ...lateRows.slice(0, 10).map(({ employee, record }) => `${employee.name} - ${lateMinutes(employee, record)} daq`),
      notCheckedOut.length ? "" : "",
      notCheckedOut.length ? "🚪 Ketishni bosmaganlar:" : "",
      ...notCheckedOut.slice(0, 10).map(({ employee }) => employee.name),
    ].filter(Boolean).join("\n");

    await sendTelegram("sendMessage", { chat_id: chatId, text });
    json(res, 200, { ok: true, sent: true });
  } catch (error) {
    serverError(res, error);
  }
};
