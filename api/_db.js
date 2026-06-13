const { neon } = require("@neondatabase/serverless");

let sqlClient;
let schemaReady;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL env var is required");
  }
  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}

async function ensureSchema() {
  if (schemaReady) return schemaReady;

  const sql = getSql();
  schemaReady = (async () => {
    // Base tables must be created in order (FK dependencies)
    await sql`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT DEFAULT '',
        location_id TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // All employee column additions in parallel
    await Promise.all([
      sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT ''`,
      sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_start TEXT`,
      sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_end TEXT`,
      sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`,
      sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo TEXT`,
    ]);

    // Dependent tables in parallel (both depend on employees)
    await Promise.all([
      sql`
        CREATE TABLE IF NOT EXISTS attendance (
          day TEXT NOT NULL,
          employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          arrival TEXT,
          departure TEXT,
          arrival_photo_id TEXT,
          departure_photo_id TEXT,
          arrival_saved_at TIMESTAMPTZ,
          departure_saved_at TIMESTAMPTZ,
          PRIMARY KEY (day, employee_id)
        )
      `,
      sql`
        CREATE TABLE IF NOT EXISTS proofs (
          id TEXT PRIMARY KEY,
          employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          day TEXT NOT NULL,
          type TEXT NOT NULL,
          punch_time TEXT NOT NULL,
          photo TEXT NOT NULL,
          saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `,
      sql`
        CREATE TABLE IF NOT EXISTS employee_devices (
          employee_id TEXT PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
          device_id TEXT NOT NULL,
          first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `,
      sql`
        CREATE TABLE IF NOT EXISTS branch_geofences (
          branch_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          lat DOUBLE PRECISION,
          lng DOUBLE PRECISION,
          radius_m INTEGER NOT NULL DEFAULT 100
        )
      `,
      sql`
        CREATE TABLE IF NOT EXISTS telegram_access (
          phone TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL,
          name TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT 'pending',
          requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          decided_at TIMESTAMPTZ
        )
      `,
      sql`
        CREATE TABLE IF NOT EXISTS admin_logs (
          id TEXT PRIMARY KEY,
          action TEXT NOT NULL,
          employee_id TEXT,
          employee_name TEXT DEFAULT '',
          detail TEXT DEFAULT '',
          reason TEXT DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `,
    ]);

    // Proofs column additions in parallel
    await Promise.all([
      sql`ALTER TABLE proofs ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION`,
      sql`ALTER TABLE proofs ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION`,
      sql`ALTER TABLE proofs ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION`,
      sql`ALTER TABLE proofs ADD COLUMN IF NOT EXISTS device_id TEXT`,
      sql`ALTER TABLE proofs ADD COLUMN IF NOT EXISTS geo_status TEXT DEFAULT 'pending'`,
      sql`ALTER TABLE proofs ADD COLUMN IF NOT EXISTS face_status TEXT DEFAULT 'pending'`,
      sql`ALTER TABLE proofs ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ`,
    ]);

    // Seed geofences and fix sklad radius in parallel
    await Promise.all([
      sql`
        INSERT INTO branch_geofences (branch_id, name, radius_m)
        VALUES
          ('c5', 'C5 showroom', 100),
          ('ibn-sino', 'Ibn Sino showroom', 100),
          ('eco-bozor', 'Eco Bozor showroom', 100),
          ('alfraganus', 'Alfraganus showroom', 100),
          ('sklad', 'Sklad', 150)
        ON CONFLICT (branch_id) DO NOTHING
      `,
      sql`UPDATE branch_geofences SET radius_m = 150 WHERE branch_id = 'sklad' AND radius_m = 100 AND lat IS NULL AND lng IS NULL`,
    ]);
  })();

  return schemaReady;
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 8_000_000) {
        reject(new Error("Payload is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) { resolve({}); return; }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function methodNotAllowed(res) {
  json(res, 405, { error: "Method not allowed" });
}

function serverError(res, error) {
  json(res, 500, { error: error.message || "Server error" });
}

// Shared branch config — single source of truth
const BRANCH_CONFIG = {
  c5:          { name: "C5 showroom",       start: "09:00", end: "21:00" },
  "ibn-sino":  { name: "Ibn Sino showroom", start: "09:00", end: "20:00" },
  "eco-bozor": { name: "Eco Bozor showroom",start: "10:00", end: "20:00" },
  alfraganus:  { name: "Alfraganus showroom",start: "10:00", end: "20:00" },
  sklad:       { name: "Sklad",             start: "09:00", end: "" },
};
const BRANCH_IDS = Object.keys(BRANCH_CONFIG);

function shiftStartFor(employee) {
  return employee.shiftStart || BRANCH_CONFIG[employee.locationId]?.start || "09:00";
}

module.exports = {
  ensureSchema,
  getSql,
  json,
  methodNotAllowed,
  readBody,
  serverError,
  BRANCH_CONFIG,
  BRANCH_IDS,
  shiftStartFor,
};
