if (location.protocol === "file:") {
  location.replace("https://ishga-kelib-ketish.vercel.app/");
}

const STORAGE_KEY = "attendance-control-v1";
const DB_NAME = "attendance-proof-db";
const DB_VERSION = 1;
const PROOF_STORE = "proofs";

const form = document.querySelector("#employeeForm");
const nameInput = document.querySelector("#employeeName");
const roleInput = document.querySelector("#employeeRole");
const phoneInput = document.querySelector("#employeePhone");
const locationInput = document.querySelector("#employeeLocation");
const shiftStartInput = document.querySelector("#employeeShiftStart");
const shiftEndInput = document.querySelector("#employeeShiftEnd");
const employeeStatusInput = document.querySelector("#employeeStatus");
const employeePhotoInput = document.querySelector("#employeePhoto");
const body = document.querySelector("#attendanceBody");
const rowTemplate = document.querySelector("#rowTemplate");
const searchInput = document.querySelector("#searchInput");
const emptyState = document.querySelector("#emptyState");
const exportBtn = document.querySelector("#exportBtn");
const clearDayBtn = document.querySelector("#clearDayBtn");
const employeeCodeInput = document.querySelector("#employeeCode");
const selfCheckInBtn = document.querySelector("#selfCheckInBtn");
const selfCheckOutBtn = document.querySelector("#selfCheckOutBtn");
const selfMessage = document.querySelector("#selfMessage");
const codeEmployeePreview = document.querySelector("#codeEmployeePreview");
const cameraPreview = document.querySelector("#cameraPreview");
const proofCanvas = document.querySelector("#proofCanvas");
const cameraStatus = document.querySelector("#cameraStatus");
const locationStatus = document.querySelector("#locationStatus");
const proofModal = document.querySelector("#proofModal");
const proofImage = document.querySelector("#proofImage");
const proofLocationText = document.querySelector("#proofLocationText");
const proofMapLink = document.querySelector("#proofMapLink");
const proofTitle = document.querySelector("#proofTitle");
const closeProofBtn = document.querySelector("#closeProofBtn");
const adminGate = document.querySelector("#adminGate");
const adminArea = document.querySelector("#adminArea");
const adminLoginForm = document.querySelector("#adminLoginForm");
const adminPinInput = document.querySelector("#adminPin");
const adminMessage = document.querySelector("#adminMessage");
const lockAdminBtn = document.querySelector("#lockAdminBtn");
const absentEmployees = document.querySelector("#absentEmployees");
const lateEmployeesDetail = document.querySelector("#lateEmployeesDetail");
const totalLateTime = document.querySelector("#totalLateTime");
const lateReportBody = document.querySelector("#lateReportBody");
const lateEmptyState = document.querySelector("#lateEmptyState");
const arrivalReportBody = document.querySelector("#arrivalReportBody");
const arrivalEmptyState = document.querySelector("#arrivalEmptyState");
const reportDateInput = document.querySelector("#reportDate");
const adminSummary = document.querySelector("#adminSummary");
const dashboardTabs = document.querySelectorAll("[data-dashboard-tab]");
const dashboardViews = document.querySelectorAll("[data-dashboard-view]");
const todayArrived = document.querySelector("#todayArrived");
const todayAbsent = document.querySelector("#todayAbsent");
const enabledEmployees = document.querySelector("#enabledEmployees");
const monthlyAttendance = document.querySelector("#monthlyAttendance");
const vacationEmployees = document.querySelector("#vacationEmployees");
const sickEmployees = document.querySelector("#sickEmployees");
const dashboardBranchStats = document.querySelector("#dashboardBranchStats");
const branchStats = document.querySelector("#branchStats");
const branchRanking = document.querySelector("#branchRanking");
const liveLocationStats = document.querySelector("#liveLocationStats");
const attendanceDetails = document.querySelector("#attendanceDetails");
const scheduleOverview = document.querySelector("#scheduleOverview");
const permitOverview = document.querySelector("#permitOverview");
const lateRanking = document.querySelector("#lateRanking");
const disciplineRanking = document.querySelector("#disciplineRanking");
const violationOverview = document.querySelector("#violationOverview");
const gpsOverview = document.querySelector("#gpsOverview");
const cameraOverview = document.querySelector("#cameraOverview");
const reportOverview = document.querySelector("#reportOverview");
const payrollOverview = document.querySelector("#payrollOverview");
const roleOverview = document.querySelector("#roleOverview");
const quickAlerts = document.querySelector("#quickAlerts");
const monthlyTrend = document.querySelector("#monthlyTrend");
const telegramDigest = document.querySelector("#telegramDigest");
const globalSearchInput = document.querySelector("#globalSearchInput");
const darkModeBtn = document.querySelector("#darkModeBtn");
const importExcelBtn = document.querySelector("#importExcelBtn");
const excelImportInput = document.querySelector("#excelImportInput");
const employeeCards = document.querySelector("#employeeCards");
const employeeModal = document.querySelector("#employeeModal");
const employeeDetailTitle = document.querySelector("#employeeDetailTitle");
const employeeDetailBody = document.querySelector("#employeeDetailBody");
const closeEmployeeModalBtn = document.querySelector("#closeEmployeeModalBtn");
const problemFilterButtons = document.querySelectorAll("[data-problem-filter]");
const problemList = document.querySelector("#problemList");
const monthlyExportBtn = document.querySelector("#monthlyExportBtn");
const adminLogBody = document.querySelector("#adminLogBody");
const branchModal = document.querySelector("#branchModal");
const branchDetailTitle = document.querySelector("#branchDetailTitle");
const branchDetailBody = document.querySelector("#branchDetailBody");
const closeBranchModalBtn = document.querySelector("#closeBranchModalBtn");
const branchQrGrid = document.querySelector("#branchQrGrid");
const geofencePanel = document.querySelector("#geofencePanel");
const suspiciousList = document.querySelector("#suspiciousList");
const mapPickerModal = document.querySelector("#mapPickerModal");
const mapPickerTitle = document.querySelector("#mapPickerTitle");
const mapPickerStatus = document.querySelector("#mapPickerStatus");
const closeMapPickerBtn = document.querySelector("#closeMapPickerBtn");
const useMapPointBtn = document.querySelector("#useMapPointBtn");
const useMapCenterBtn = document.querySelector("#useMapCenterBtn");
const mapZoomInBtn = document.querySelector("#mapZoomInBtn");
const mapZoomOutBtn = document.querySelector("#mapZoomOutBtn");
const mapSearchForm = document.querySelector("#mapSearchForm");
const mapSearchInput = document.querySelector("#mapSearchInput");
const openGoogleMapsBtn = document.querySelector("#openGoogleMapsBtn");
const googleMapsForm = document.querySelector("#googleMapsForm");
const googleMapsInput = document.querySelector("#googleMapsInput");

const API_BASE = "/api";
const PAGE = document.body.dataset.page || "employee";
const LOCATIONS = {
  c5: { name: "C5 showroom", start: "09:00", end: "21:00" },
  "ibn-sino": { name: "Ibn Sino showroom", start: "09:00", end: "20:00" },
  "eco-bozor": { name: "Eco Bozor showroom", start: "10:00", end: "20:00" },
  alfraganus: { name: "Alfraganus showroom", start: "10:00", end: "20:00" },
  sklad: { name: "Sklad", start: "09:00", end: "" },
};
const BRANCH_IDS = ["c5", "ibn-sino", "eco-bozor", "alfraganus", "sklad"];
const DEFAULT_PHOTO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='12' fill='%23edf6f1'/%3E%3Ccircle cx='40' cy='30' r='13' fill='%231f7a53'/%3E%3Cpath d='M18 68c3-15 14-24 22-24s19 9 22 24' fill='%231f7a53'/%3E%3C/svg%3E";

let state = loadLocalState();
let geofences = [];
let suspiciousItems = [];
let geofenceDrafts = {};
let activeMapCard = null;
let activeMapBranchId = null;
let mapPicker = null;
let mapCenter = { lat: 41.311081, lng: 69.240562 };
let mapZoom = 13;
let selectedMapPoint = null;
let mapDrag = null;
let cameraReady = false;
let proofDbPromise = null;
let serverMode = false;
let selectedDay = todayKey();
let problemFilter = "all";

if (localStorage.getItem("attendance-dark-mode") === "1") {
  document.body.classList.add("dark-mode");
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function getDeviceId() {
  let deviceId = localStorage.getItem("attendance-device-id");
  if (!deviceId) {
    deviceId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem("attendance-device-id", deviceId);
  }
  return deviceId;
}

function loadLocalState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { employees: [], attendance: {} };

  try {
    const parsed = JSON.parse(saved);
    return {
      employees: Array.isArray(parsed.employees) ? parsed.employees : [],
      attendance: parsed.attendance && typeof parsed.attendance === "object" ? parsed.attendance : {},
    };
  } catch {
    return { employees: [], attendance: {} };
  }
}

function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Server xatosi");
  return data;
}

async function loadServerState() {
  const [data, geofenceData, suspiciousData] = await Promise.all([
    apiRequest(`/attendance?day=${encodeURIComponent(selectedDay)}`),
    apiRequest("/security?type=geofences").catch(() => ({ geofences: [] })),
    apiRequest(`/security?type=suspicious&day=${encodeURIComponent(selectedDay)}`).catch(() => ({ items: [] })),
  ]);
  state = {
    employees: data.employees || [],
    attendance: data.attendance || { [selectedDay]: {} },
  };
  geofences = geofenceData.geofences || [];
  suspiciousItems = suspiciousData.items || [];
  serverMode = true;
  render();
  loadAdminLogs();
}

function openProofDb() {
  if (proofDbPromise) return proofDbPromise;

  proofDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROOF_STORE)) {
        db.createObjectStore(PROOF_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return proofDbPromise;
}

async function saveLocalProofPhoto(photo, meta = {}) {
  const db = await openProofDb();
  const id = crypto.randomUUID();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(PROOF_STORE, "readwrite");
    transaction.objectStore(PROOF_STORE).put({ id, photo, ...meta, savedAt: new Date().toISOString() });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  return id;
}

function readImageFile(input) {
  const file = input?.files?.[0];
  if (!file) return Promise.resolve("");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Xodim rasmi o'qilmadi."));
    reader.readAsDataURL(file);
  });
}

async function getLocalProofPhoto(proofIdOrPhoto) {
  if (!proofIdOrPhoto) return "";
  if (proofIdOrPhoto.startsWith("data:image/")) return proofIdOrPhoto;

  const db = await openProofDb();
  const record = await new Promise((resolve, reject) => {
    const transaction = db.transaction(PROOF_STORE, "readonly");
    const request = transaction.objectStore(PROOF_STORE).get(proofIdOrPhoto);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return record?.photo || "";
}

async function getLocalProofDetails(proofIdOrPhoto) {
  if (!proofIdOrPhoto) return { photo: "", location: null };
  if (proofIdOrPhoto.startsWith("data:image/")) return { photo: proofIdOrPhoto, location: null };

  const db = await openProofDb();
  const record = await new Promise((resolve, reject) => {
    const transaction = db.transaction(PROOF_STORE, "readonly");
    const request = transaction.objectStore(PROOF_STORE).get(proofIdOrPhoto);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return { photo: record?.photo || "", location: record?.location || null, geoStatus: record?.geoStatus || "local", faceStatus: record?.faceStatus || "local" };
}

async function deleteLocalProofPhoto(proofIdOrPhoto) {
  if (!proofIdOrPhoto || proofIdOrPhoto.startsWith("data:image/")) return;

  const db = await openProofDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(PROOF_STORE, "readwrite");
    transaction.objectStore(PROOF_STORE).delete(proofIdOrPhoto);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getProofPhoto(proofIdOrPhoto) {
  if (!proofIdOrPhoto) return "";
  if (proofIdOrPhoto.startsWith("data:image/")) return proofIdOrPhoto;
  if (!serverMode) return getLocalProofPhoto(proofIdOrPhoto);

  const data = await apiRequest(`/proof?id=${encodeURIComponent(proofIdOrPhoto)}`);
  return data.photo || "";
}

async function getProofDetails(proofIdOrPhoto) {
  if (!proofIdOrPhoto) return { photo: "", location: null };
  if (proofIdOrPhoto.startsWith("data:image/")) return { photo: proofIdOrPhoto, location: null };
  if (!serverMode) return getLocalProofDetails(proofIdOrPhoto);

  const data = await apiRequest(`/proof?id=${encodeURIComponent(proofIdOrPhoto)}`);
  return {
    photo: data.photo || "",
    location: data.location || null,
    geoStatus: data.geoStatus || "",
    faceStatus: data.faceStatus || "",
    retentionUntil: data.retentionUntil || "",
  };
}

let currentFacingMode = "environment";

async function startCamera(facingMode = currentFacingMode) {
  if (PAGE !== "employee") return;
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = "Kamera topilmadi";
    showSelfMessage("Kamera uchun sahifani http://localhost yoki Vercel manzili orqali oching.", "error");
    return;
  }

  // Stop any existing stream
  if (cameraPreview.srcObject) {
    cameraPreview.srcObject.getTracks().forEach(t => t.stop());
    cameraPreview.srcObject = null;
  }

  currentFacingMode = facingMode;

  try {
    let stream;
    const constraints = facingMode === "environment"
      ? [
          { video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
          { video: true, audio: false },
        ]
      : [
          { video: { facingMode: { exact: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
          { video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
          { video: true, audio: false },
        ];
    for (const c of constraints) {
      try { stream = await navigator.mediaDevices.getUserMedia(c); break; } catch {}
    }
    if (!stream) throw new Error("Kamera ochilmadi");
    cameraPreview.srcObject = stream;
    await cameraPreview.play();
    cameraReady = true;
    updateButtonState();
    const track = stream.getVideoTracks()[0];
    const facing = track?.getSettings?.()?.facingMode || facingMode;
    cameraStatus.textContent = facing === "environment" ? "Orqa kamera" : "Oldingi kamera";
    const flipBtn = document.querySelector("#cameraFlipBtn");
    if (flipBtn) flipBtn.title = facing === "environment" ? "Oldingi kameraga o'tish" : "Orqa kameraga o'tish";
  } catch {
    cameraStatus.textContent = "Kamera ruxsati berilmadi";
    showSelfMessage("Keldim/Ketdim qilish uchun kameraga ruxsat bering.", "error");
  }
}

async function switchCamera() {
  await startCamera(currentFacingMode === "environment" ? "user" : "environment");
}

function captureProof() {
  if (!cameraReady || !cameraPreview.videoWidth) return "";

  proofCanvas.width = 360;
  proofCanvas.height = Math.round((cameraPreview.videoHeight / cameraPreview.videoWidth) * proofCanvas.width);
  proofCanvas.getContext("2d").drawImage(cameraPreview, 0, 0, proofCanvas.width, proofCanvas.height);
  return proofCanvas.toDataURL("image/jpeg", 0.72);
}

function captureLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Telefon lokatsiyasi topilmadi."));
      return;
    }

    locationStatus.textContent = "📍 Lokatsiya olinmoqda...";
    locationStatus.className = "location-badge";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 0),
        };
        locationStatus.textContent = `📍 Lokatsiya tayyor (${location.accuracy} m)`;
        locationStatus.className = "location-badge success";
        resolve(location);
      },
      () => {
        locationStatus.textContent = "📍 Lokatsiyaga ruxsat berilmadi";
        locationStatus.className = "location-badge error";
        reject(new Error("Keldim/Ketdim qilish uchun lokatsiyaga ruxsat bering."));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

function generateEmployeeCode() {
  let code = "";
  const usedCodes = new Set(state.employees.map((employee) => employee.code).filter(Boolean));
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (usedCodes.has(code));
  return code;
}

function ensureEmployeeCodes() {
  state.employees.forEach((employee) => {
    if (!employee.code) employee.code = generateEmployeeCode();
  });
}

function minutesFromTime(time) {
  if (!time || !time.includes(":")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatDuration(minutes) {
  if (!minutes || minutes < 1) return "0 soat";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours} soat ${mins} daq`;
  if (hours) return `${hours} soat`;
  return `${mins} daq`;
}

function workedMinutes(record, day = selectedDay) {
  if (!record?.arrival) return 0;
  const start = minutesFromTime(record.arrival);
  const end = minutesFromTime(record.departure || (day === todayKey() ? nowTime() : record.arrival));
  return Math.max(0, end - start);
}

function earlyLeaveMinutes(employee, record) {
  if (!record?.departure) return 0;
  const end = minutesFromTime(record.departure);
  const shiftEnd = minutesFromTime(getSchedule(employee).end);
  if (end === null || shiftEnd === null) return 0;
  return Math.max(0, shiftEnd - end);
}

function lateMinutes(employee, record) {
  if (!record?.arrival) return 0;
  const arrival = minutesFromTime(record.arrival);
  const shift = minutesFromTime(getSchedule(employee).start);
  if (arrival === null || shift === null) return 0;
  return Math.max(0, arrival - shift);
}

function hasShiftStarted(employee, day = selectedDay) {
  const shift = minutesFromTime(getSchedule(employee).start);
  if (shift === null) return true;
  if (day < todayKey()) return true;
  if (day > todayKey()) return false;
  const now = minutesFromTime(nowTime());
  return now !== null && now >= shift;
}

function isAbsentDeadlinePassed(employee, day = selectedDay) {
  const shift = minutesFromTime(getSchedule(employee).start);
  if (shift === null) return true;
  if (day < todayKey()) return true;
  if (day > todayKey()) return false;
  const now = minutesFromTime(nowTime());
  return now !== null && now >= shift + 240;
}

function getRecord(employeeId, day = selectedDay) {
  state.attendance[day] ||= {};
  state.attendance[day][employeeId] ||= {};
  return state.attendance[day][employeeId];
}

function getSchedule(employee) {
  if (employee.shiftStart || employee.shiftEnd) {
    const base = LOCATIONS[employee.locationId] || {};
    return {
      name: base.name || employee.locationName || "Belgilanmagan",
      start: employee.shiftStart || base.start || "09:00",
      end: employee.shiftEnd || base.end || "",
    };
  }
  return LOCATIONS[employee.locationId] || {
    name: employee.locationName || "Belgilanmagan",
    start: employee.shiftStart || "09:00",
    end: employee.shiftEnd || "",
  };
}

function isEmployeeActive(employee) {
  return !["inactive", "vacation", "sick"].includes(employee.status) && employee.active !== false;
}

function formatSchedule(schedule) {
  if (schedule.end) return `${schedule.name}: ${schedule.start} - ${schedule.end}`;
  return `${schedule.name}: ${schedule.start}`;
}

function statusFor(employee, record) {
  if (!record.arrival && isAbsentDeadlinePassed(employee)) return { label: "Ishga kelmagan", className: "absent" };
  if (!record.arrival) return { label: "Kutilyapti", className: "waiting" };
  if (record.departure) return { label: "Ketgan", className: "out" };
  if (lateMinutes(employee, record) > 0) return { label: "Kech qoldi", className: "late" };
  return { label: "Ishda", className: "" };
}

function renderClock() {
  const now = new Date();
  document.querySelector("#clockLabel").textContent = now.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
  document.querySelector("#todayLabel").textContent = now.toLocaleDateString("uz-UZ", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function render() {
  ensureEmployeeCodes();
  const query = [searchInput?.value || "", globalSearchInput?.value || ""].join(" ").trim().toLowerCase();
  const employees = state.employees.filter((employee) => {
    const schedule = getSchedule(employee);
    return `${employee.name} ${employee.role} ${employee.phone || ""} ${employee.code} ${schedule.name}`.toLowerCase().includes(query);
  });

  body.innerHTML = "";
  renderEmployeeCards(employees);
  employees.forEach((employee) => {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    const record = getRecord(employee.id);
    const status = statusFor(employee, record);
    const schedule = getSchedule(employee);

    const photo = row.querySelector("[data-photo]");
    if (photo) {
      photo.src = employee.photo || DEFAULT_PHOTO;
      photo.hidden = false;
    }
    row.querySelector("[data-name]").textContent = employee.name;
    row.querySelector("[data-role]").textContent = [
      employee.role || "Lavozim kiritilmagan",
      isEmployeeActive(employee) ? "Faol" : "Nofaol",
    ].join(" | ");
    row.querySelector("[data-code]").textContent = employee.code;
    const phoneCell = row.querySelector("[data-phone]");
    if (phoneCell) phoneCell.textContent = employee.phone || "--";
    row.querySelector("[data-location]").textContent = formatSchedule(schedule);
    row.querySelector("[data-arrival]").textContent = record.arrival || "--:--";
    row.querySelector("[data-departure]").textContent = record.departure || "--:--";
    row.querySelector("[data-hours]").textContent = formatDuration(workedMinutes(record));
    row.querySelector("[data-late]").textContent = record.arrival
      ? formatDuration(lateMinutes(employee, record))
      : (isAbsentDeadlinePassed(employee) ? "Ishga kelmagan" : "Kutilyapti");

    const arrivalProofBtn = row.querySelector("[data-arrival-proof]");
    const departureProofBtn = row.querySelector("[data-departure-proof]");
    arrivalProofBtn.disabled = !record.arrivalPhoto;
    departureProofBtn.disabled = !record.departurePhoto;
    arrivalProofBtn.addEventListener("click", () => showProof(record.arrivalPhoto, `${employee.name} - kelgan dalili`));
    departureProofBtn.addEventListener("click", () => showProof(record.departurePhoto, `${employee.name} - ketgan dalili`));

    const statusEl = row.querySelector("[data-status]");
    statusEl.textContent = isEmployeeActive(employee) ? status.label : "Nofaol";
    statusEl.className = `status ${isEmployeeActive(employee) ? status.className : "waiting"}`.trim();

    const checkinBtn = row.querySelector("[data-checkin]");
    const checkoutBtn = row.querySelector("[data-checkout]");
    checkinBtn.disabled = !isEmployeeActive(employee) || Boolean(record.arrival);
    checkoutBtn.disabled = !isEmployeeActive(employee) || !record.arrival || Boolean(record.departure);
    checkinBtn.addEventListener("click", () => manualPunch(employee.id, "in"));
    checkoutBtn.addEventListener("click", () => manualPunch(employee.id, "out"));
    row.querySelector("[data-delete]").addEventListener("click", () => deleteEmployee(employee.id));
    row.querySelector(".person").addEventListener("click", () => showEmployeeCard(employee.id));

    body.append(row);
  });

  renderSummary();
  emptyState.classList.toggle("show", state.employees.length === 0);
}

function findEmployeeByCode() {
  const code = employeeCodeInput.value.trim();
  if (!code) return null;
  return state.employees.find((employee) => employee.code === code);
}

function updateButtonState() {
  const employee = findEmployeeByCode();
  const ready = cameraReady && Boolean(employee) && isEmployeeActive(employee);
  selfCheckInBtn.disabled = !ready;
  selfCheckOutBtn.disabled = !ready;
}

function updateEmployeePreview() {
  const code = employeeCodeInput.value.trim();
  if (code.length < 4) {
    codeEmployeePreview.textContent = "";
    codeEmployeePreview.className = "employee-preview";
    updateButtonState();
    return;
  }

  const employee = findEmployeeByCode();
  if (!employee) {
    codeEmployeePreview.textContent = "Bu kod bo'yicha xodim topilmadi";
    codeEmployeePreview.className = "employee-preview error";
    updateButtonState();
    return;
  }
  if (!isEmployeeActive(employee)) {
    showSelfMessage("Bu xodim nofaol holatda. Admin bilan bog'laning.", "error");
    updateButtonState();
    return;
  }

  codeEmployeePreview.textContent = `${employee.name} — ${getSchedule(employee).name}`;
  codeEmployeePreview.className = "employee-preview success";
  updateButtonState();
}

function showSelfMessage(message, type = "") {
  selfMessage.textContent = message;
  selfMessage.className = `self-message ${type}`.trim();
}

function showAdminMessage(message, type = "") {
  adminMessage.textContent = message;
  adminMessage.className = `self-message ${type}`.trim();
}

function setAdminOpen(isOpen) {
  adminArea.hidden = !isOpen;
  adminGate.hidden = isOpen;
  if (adminSummary) adminSummary.hidden = !isOpen;
  if (isOpen) {
    switchDashboardView("dashboard");
    renderBranchQr();
    renderGeofencePanel();
  }
  if (!isOpen) adminPinInput.value = "";
}

function switchDashboardView(viewName) {
  dashboardTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.dashboardTab === viewName);
  });
  dashboardViews.forEach((view) => {
    view.hidden = view.dataset.dashboardView !== viewName;
  });
}

async function showProof(proofId, title) {
  try {
    const proof = await getProofDetails(proofId);
    const { photo, location } = proof;
    if (!photo) throw new Error("Rasm bazadan topilmadi.");
    proofTitle.textContent = title;
    proofImage.src = photo;
    if (location?.lat !== undefined && location?.lng !== undefined) {
      const accuracy = Number(location.accuracy);
      proofLocationText.textContent = [
        `Lokatsiya: ${Number(location.lat).toFixed(6)}, ${Number(location.lng).toFixed(6)}`,
        Number.isFinite(accuracy) && accuracy > 0 ? `Aniqlik: ${Math.round(accuracy)} m` : "",
        proof.geoStatus ? `GeoFence: ${proof.geoStatus === "ok" ? "mos" : proof.geoStatus}` : "",
        proof.faceStatus ? `Face ID: ${proof.faceStatus === "pending" ? "tekshiruv kutilmoqda" : proof.faceStatus}` : "",
        proof.retentionUntil ? `Arxiv: ${new Date(proof.retentionUntil).toLocaleDateString("uz-UZ")} gacha` : "",
      ].filter(Boolean).join(" | ");
      proofLocationText.hidden = false;
      proofMapLink.href = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      proofMapLink.hidden = false;
    } else {
      proofLocationText.textContent = "";
      proofLocationText.hidden = true;
      proofMapLink.hidden = true;
      proofMapLink.removeAttribute("href");
    }
    proofModal.hidden = false;
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
}

function closeProof() {
  proofModal.hidden = true;
  proofImage.removeAttribute("src");
  proofLocationText.textContent = "";
  proofLocationText.hidden = true;
  proofMapLink.hidden = true;
  proofMapLink.removeAttribute("href");
}

async function selfPunch(action) {
  if (!cameraReady) {
    showSelfMessage("Avval kameraga ruxsat bering. Rasm dalili bo'lmasa vaqt yozilmaydi.", "error");
    return;
  }

  const employee = findEmployeeByCode();
  if (!employee) {
    showSelfMessage("Kod topilmadi. Admin bergan 4 xonali kodni kiriting.", "error");
    employeeCodeInput.focus();
    return;
  }
  if (!isEmployeeActive(employee)) {
    showSelfMessage("Bu xodim hozir faol holatda emas. Admin bilan bog'laning.", "error");
    return;
  }

  const record = getRecord(employee.id, todayKey());
  const time = nowTime();
  const photo = captureProof();
  if (!photo) {
    showSelfMessage("Kamera rasmi olinmadi. Qayta urinib ko'ring.", "error");
    return;
  }

  try {
    const location = await captureLocation();
    if (serverMode) {
      await apiRequest("/punch", {
        method: "POST",
        body: JSON.stringify({ code: employee.code, action, photo, location, time, day: todayKey(), deviceId: getDeviceId() }),
      });
      await loadServerState();
    } else {
      await localPunch(employee, record, action, photo, location, time);
    }

    showSelfMessage(`${employee.name}: ${action === "in" ? "kelgan" : "ketgan"} vaqti ${time} rasm bilan yozildi.`, "success");
    employeeCodeInput.value = "";
    codeEmployeePreview.textContent = "";
    codeEmployeePreview.className = "employee-preview";
    locationStatus.textContent = "📍 Lokatsiya belgilashda olinadi";
    locationStatus.className = "location-badge";
    updateButtonState();
  } catch (error) {
    showSelfMessage(error.message, "warn");
  }
}

async function localPunch(employee, record, action, photo, location, time) {
  if (action === "in") {
    if (record.arrival) throw new Error(`${employee.name} bugun ${record.arrival} da kelgan deb yozilgan.`);
    const proofId = await saveLocalProofPhoto(photo, { day: todayKey(), employeeId: employee.id, type: "arrival", location, time });
    await deleteLocalProofPhoto(record.departurePhoto);
    record.arrival = time;
    record.arrivalPhoto = proofId;
    record.arrivalSavedAt = new Date().toISOString();
    delete record.departure;
    delete record.departurePhoto;
    delete record.departureSavedAt;
  } else {
    if (!record.arrival) throw new Error(`${employee.name} avval "Keldim" tugmasini bosishi kerak.`);
    if (record.departure) throw new Error(`${employee.name} bugun ${record.departure} da ketgan deb yozilgan.`);
    record.departure = time;
    record.departurePhoto = await saveLocalProofPhoto(photo, { day: todayKey(), employeeId: employee.id, type: "departure", location, time });
    record.departureSavedAt = new Date().toISOString();
  }

  saveLocalState();
  render();
}

async function manualPunch(employeeId, action) {
  const record = getRecord(employeeId);
  const current = action === "in" ? record.arrival || nowTime() : record.departure || nowTime();
  const time = prompt(`${action === "in" ? "Kelish" : "Ketish"} vaqtini kiriting (HH:MM)`, current);
  if (!time) return;
  const reason = prompt("Qo'lda tuzatish sababi majburiy");
  if (!reason?.trim()) {
    showAdminMessage("Qo'lda tuzatish uchun sabab yozish shart.", "error");
    return;
  }

  try {
    if (serverMode) {
      await apiRequest("/manual-punch", {
        method: "POST",
        body: JSON.stringify({ employeeId, action, time, day: selectedDay, reason }),
      });
      await loadServerState();
      return;
    }

    if (action === "in") {
      record.arrival = time;
      delete record.departure;
    } else {
      record.departure = time;
    }
    saveLocalState();
    render();
    showAdminMessage(`Qo'lda tuzatildi. Sabab: ${reason}`, "success");
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
}

async function deleteEmployee(employeeId) {
  try {
    if (serverMode) {
      await apiRequest(`/employees?id=${encodeURIComponent(employeeId)}`, { method: "DELETE" });
      await loadServerState();
      return;
    }

    state.employees = state.employees.filter((item) => item.id !== employeeId);
    Object.values(state.attendance).forEach((day) => delete day[employeeId]);
    saveLocalState();
    render();
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
}

function renderSummary() {
  const records = state.employees.filter(isEmployeeActive).map((employee) => ({ employee, record: getRecord(employee.id) }));
  const arrived = records.filter(({ record }) => record.arrival).length;
  const active = records.filter(({ record }) => record.arrival && !record.departure).length;
  const late = records.filter(({ employee, record }) => lateMinutes(employee, record) > 0).length;
  const absent = records.filter(({ employee, record }) => !record.arrival && isAbsentDeadlinePassed(employee)).length;
  const vacation = state.employees.filter((employee) => employee.status === "vacation").length;
  const sick = state.employees.filter((employee) => employee.status === "sick").length;
  const totalMinutes = records.reduce((sum, { record }) => sum + workedMinutes(record), 0);
  const totalLateMinutes = records.reduce((sum, { employee, record }) => sum + lateMinutes(employee, record), 0);
  const attendancePercent = records.length ? Math.round((arrived / records.length) * 100) : 0;

  document.querySelector("#totalEmployees").textContent = state.employees.length;
  if (todayArrived) todayArrived.textContent = arrived;
  document.querySelector("#activeEmployees").textContent = active;
  document.querySelector("#lateEmployees").textContent = late;
  if (todayAbsent) todayAbsent.textContent = absent;
  if (enabledEmployees) enabledEmployees.textContent = records.length;
  if (vacationEmployees) vacationEmployees.textContent = vacation;
  if (sickEmployees) sickEmployees.textContent = sick;
  document.querySelector("#totalHours").textContent = formatDuration(totalMinutes);
  if (monthlyAttendance) monthlyAttendance.textContent = `${attendancePercent}%`;
  absentEmployees.textContent = absent;
  lateEmployeesDetail.textContent = late;
  totalLateTime.textContent = formatDuration(totalLateMinutes);
  renderArrivalReport(records);
  renderLateReport(records);
  renderBranchStats(records);
  renderAttendanceDetails(records);
  renderLateRanking(records);
  renderDisciplineRanking(records);
  renderQuickAlerts(records);
  renderProblemList(records);
  renderLiveLocationStats(records);
  renderMonthlyTrend(records, { arrived, late, absent, active, totalMinutes, totalLateMinutes, attendancePercent });
  renderFeaturePanels(records, { arrived, late, absent, active, totalMinutes, totalLateMinutes, attendancePercent });
  renderSuspiciousList();
}

function setCards(container, cards) {
  if (!container) return;
  container.innerHTML = "";
  cards.forEach((card) => {
    const item = document.createElement("article");
    item.className = `feature-card ${card.className || ""}`.trim();
    item.innerHTML = "<span></span><strong></strong><p></p>";
    item.querySelector("span").textContent = card.label;
    item.querySelector("strong").textContent = card.value;
    item.querySelector("p").textContent = card.detail || "";
    container.append(item);
  });
}

function setRankingTable(container, rows, columns = ["Filial", "Davomat"]) {
  if (!container) return;
  container.innerHTML = "";
  const table = document.createElement("table");
  table.className = "compact-table";
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr>`;
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = row.map((cell) => `<td>${cell}</td>`).join("");
    tbody.append(tr);
  });
  table.append(thead, tbody);
  container.append(table);
}

function branchRows(records) {
  return BRANCH_IDS.map((branchId) => {
    const branch = LOCATIONS[branchId];
    const fence = geofences.find((item) => item.branchId === branchId);
    const testMode = !fence || fence.lat === null || fence.lng === null || fence.lat === "" || fence.lng === "";
    const branchRecords = records.filter(({ employee }) => employee.locationId === branchId);
    const arrived = branchRecords.filter(({ record }) => record.arrival).length;
    const active = branchRecords.filter(({ record }) => record.arrival && !record.departure).length;
    const late = branchRecords.filter(({ employee, record }) => lateMinutes(employee, record) > 0).length;
    const absent = branchRecords.filter(({ employee, record }) => !record.arrival && isAbsentDeadlinePassed(employee)).length;
    const percent = branchRecords.length ? Math.round((arrived / branchRecords.length) * 100) : 0;
    return { branch, fence, testMode, total: branchRecords.length, arrived, active, late, absent, percent };
  });
}

function renderBranchStats(records) {
  const rows = branchRows(records);
  const cards = rows.map(({ branch, fence, testMode, total, arrived, late, absent, percent }) => {
    return {
      label: branch.name,
      value: `${arrived}/${total}`,
      detail: `Davomat ${percent}% | Kechikkan ${late} | Kelmagan ${absent} | ${testMode ? "Test mode" : `Radius ${fence.radius} m`}`,
      className: testMode || late ? "warn" : absent ? "danger" : "",
    };
  });
  setCards(dashboardBranchStats, cards);
  setCards(branchStats, cards);
  [dashboardBranchStats, branchStats].forEach((container) => {
    if (!container) return;
    [...container.querySelectorAll(".feature-card")].forEach((card, index) => {
      card.tabIndex = 0;
      card.addEventListener("click", () => showBranchDetails(rows[index].branch.id || BRANCH_IDS[index]));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter") showBranchDetails(rows[index].branch.id || BRANCH_IDS[index]);
      });
    });
  });
  setRankingTable(
    branchRanking,
    rows
      .slice()
      .sort((left, right) => right.percent - left.percent)
      .map((row) => [row.branch.name, `${row.percent}%`]),
  );
}

function problemRows(records) {
  return records
    .map(({ employee, record }) => {
      const late = lateMinutes(employee, record);
      const absent = !record.arrival && isAbsentDeadlinePassed(employee);
      const gps = record.arrival && !record.arrivalPhoto;
      const open = record.arrival && !record.departure;
      if (problemFilter === "late" && !late) return null;
      if (problemFilter === "absent" && !absent) return null;
      if (problemFilter === "gps" && !gps) return null;
      if (problemFilter === "open" && !open) return null;
      if (problemFilter === "all" && !late && !absent && !gps && !open) return null;
      return {
        employee,
        record,
        label: absent ? "Kelmagan" : gps ? "GPS/selfie tekshirilsin" : open ? "Ketishni bosmagan" : `${late} daq kechikdi`,
      };
    })
    .filter(Boolean);
}

function renderProblemList(records) {
  if (!problemList) return;
  problemList.innerHTML = "";
  const rows = problemRows(records);
  if (rows.length === 0) {
    const row = document.createElement("article");
    row.className = "metric-row";
    row.innerHTML = "<div><strong>Muammo yo'q</strong><span>Tanlangan filter bo'yicha muammo topilmadi.</span></div><b>OK</b>";
    problemList.append(row);
    return;
  }
  rows.forEach(({ employee, record, label }) => {
    const row = document.createElement("article");
    row.className = "metric-row";
    row.innerHTML = "<div><strong></strong><span></span></div><b></b>";
    row.querySelector("strong").textContent = employee.name;
    row.querySelector("span").textContent = `${getSchedule(employee).name} | kelgan: ${record.arrival || "--:--"} | ketgan: ${record.departure || "--:--"}`;
    row.querySelector("b").textContent = label;
    row.addEventListener("click", () => showEmployeeCard(employee.id));
    problemList.append(row);
  });
}

function showBranchDetails(branchId) {
  if (!branchModal) return;
  const branch = LOCATIONS[branchId];
  const branchEmployees = state.employees.filter((employee) => employee.locationId === branchId);
  const groups = [
    ["Kim ishda", branchEmployees.filter((employee) => {
      const record = getRecord(employee.id);
      return record.arrival && !record.departure;
    })],
    ["Kim kelmagan", branchEmployees.filter((employee) => !getRecord(employee.id).arrival && isAbsentDeadlinePassed(employee))],
    ["Kim kechikkan", branchEmployees.filter((employee) => lateMinutes(employee, getRecord(employee.id)) > 0)],
    ["Kim ta'tilda", branchEmployees.filter((employee) => employee.status === "vacation" || employee.status === "sick")],
  ];
  branchDetailTitle.textContent = branch?.name || "Filial";
  branchDetailBody.innerHTML = groups.map(([title, employees]) => `
    <div class="branch-detail-group">
      <h3>${title}</h3>
      <p>${employees.length ? employees.map((employee) => employee.name).join(", ") : "Yo'q"}</p>
    </div>
  `).join("");
  branchModal.hidden = false;
}

function renderBranchQr() {
  if (!branchQrGrid) return;
  branchQrGrid.innerHTML = "";
  BRANCH_IDS.forEach((branchId) => {
    const branch = LOCATIONS[branchId];
    const url = `${location.origin}${location.pathname}?branch=${encodeURIComponent(branchId)}`;
    const card = document.createElement("article");
    card.className = "qr-card";
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
    card.innerHTML = "<img alt='' /><strong></strong><span></span>";
    card.querySelector("img").src = qrUrl;
    card.querySelector("strong").textContent = branch.name;
    card.querySelector("span").textContent = url;
    branchQrGrid.append(card);
  });
}

function renderGeofencePanel() {
  if (!geofencePanel) return;
  geofencePanel.innerHTML = "";
  const rows = geofences.length ? geofences : BRANCH_IDS.map((branchId) => ({
    branchId,
    name: LOCATIONS[branchId].name,
    lat: "",
    lng: "",
    radius: branchId === "sklad" ? 150 : 100,
  }));

  rows.forEach((item) => {
    const draft = geofenceDrafts[item.branchId] || {};
    const card = document.createElement("article");
    const testMode = item.lat === null || item.lat === undefined || item.lat === "" || item.lng === null || item.lng === undefined || item.lng === "";
    card.className = `geofence-card ${testMode ? "warn" : ""}`;
    card.dataset.branchId = item.branchId;
    card.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <span>${testMode ? "Test mode: koordinata kiritilmagan" : "GeoFence faol"}</span>
      </div>
      <label>Latitude<input data-lat type="text" inputmode="decimal" value="${escapeAttr(draft.lat ?? formatCoordinate(item.lat))}" placeholder="41.000000" /></label>
      <label>Longitude<input data-lng type="text" inputmode="decimal" value="${escapeAttr(draft.lng ?? formatCoordinate(item.lng))}" placeholder="69.000000" /></label>
      <label>Koordinata
        <div class="coordinate-control">
          <input data-coordinate type="text" value="${escapeAttr(draft.coordinate ?? "")}" placeholder="41.326172, 69.274101 yoki Google Maps link" />
          <button type="button" data-apply-coordinate>Qo'llash</button>
        </div>
      </label>
      <label>Radius, metr
        <div class="radius-control">
          <button type="button" data-radius-dec>-</button>
          <input data-radius type="text" inputmode="numeric" value="${escapeAttr(draft.radius ?? (item.radius || (item.branchId === "sklad" ? 150 : 100)))}" placeholder="100" />
          <button type="button" data-radius-inc>+</button>
        </div>
      </label>
      <div class="geofence-actions">
        <button type="button" data-use-map>🗺️ Xaritadan belgilash</button>
        <button type="button" data-save>Saqlash</button>
      </div>
    `;
    card.querySelectorAll("[data-lat], [data-lng], [data-coordinate], [data-radius]").forEach((input) => {
      input.addEventListener("input", () => updateGeofenceDraft(item.branchId, card));
    });
    card.querySelector("[data-apply-coordinate]").addEventListener("click", () => applyCoordinateText(card));
    card.querySelector("[data-radius-dec]").addEventListener("click", () => changeRadius(card, -10));
    card.querySelector("[data-radius-inc]").addEventListener("click", () => changeRadius(card, 10));
    card.querySelector("[data-use-map]").addEventListener("click", () => openMapPicker(item, card));
    card.querySelector("[data-save]").addEventListener("click", () => saveGeofence(item.branchId, item.name, card));
    geofencePanel.append(card);
  });
}

function updateGeofenceDraft(branchId, card) {
  geofenceDrafts[branchId] = {
    lat: card.querySelector("[data-lat]").value,
    lng: card.querySelector("[data-lng]").value,
    coordinate: card.querySelector("[data-coordinate]").value,
    radius: card.querySelector("[data-radius]").value,
  };
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeNumber(value) {
  return String(value || "").trim().replace(",", ".");
}

function formatCoordinate(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const number = Number(normalizeNumber(value));
  if (!Number.isFinite(number) || Math.abs(number) < 0.000001) return "";
  return Number.isFinite(number) ? number.toFixed(6) : "";
}

function changeRadius(card, delta) {
  const input = card.querySelector("[data-radius]");
  const current = Number(normalizeNumber(input.value)) || 100;
  input.value = String(Math.max(20, Math.min(1000, current + delta)));
  updateGeofenceDraft(card.dataset.branchId, card);
}

async function resolveGoogleMapsPoint(value) {
  const direct = parseGoogleMapsPoint(value);
  if (direct) return direct;
  if (!/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.[^/]+\/maps|google\.[^/]+\/maps)/i.test(String(value || "").trim())) {
    return null;
  }
  const result = await apiRequest("/security?type=google-maps-resolve", {
    method: "POST",
    body: JSON.stringify({ url: value }),
  });
  return result.point || null;
}

async function applyCoordinateText(card) {
  const input = card.querySelector("[data-coordinate]");
  const text = input.value.trim();
  if (!text) {
    showAdminMessage("Koordinata yoki Google Maps link kiriting.", "error");
    return;
  }
  try {
    const point = await resolveGoogleMapsPoint(text);
    if (!point || !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lng))) {
      showAdminMessage("Koordinata topilmadi. Masalan: 41.326172, 69.274101", "error");
      return;
    }
    card.querySelector("[data-lat]").value = Number(point.lat).toFixed(6);
    card.querySelector("[data-lng]").value = Number(point.lng).toFixed(6);
    updateGeofenceDraft(card.dataset.branchId, card);
    showAdminMessage("Koordinata yozildi. Endi Saqlash bosing.", "success");
  } catch (error) {
    showAdminMessage("Google Maps linki ochilmadi. Koordinatani 41.326172, 69.274101 formatida kiriting.", "error");
  }
}

function clampLat(lat) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function lonLatToPixel(lat, lng, zoom) {
  const scale = 256 * (2 ** zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin(clampLat(lat) * Math.PI / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function pixelToLonLat(x, y, zoom) {
  const scale = 256 * (2 ** zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

function renderMapPicker() {
  if (!mapPicker) return;
  const width = mapPicker.clientWidth || 720;
  const height = mapPicker.clientHeight || 420;
  const centerPixel = lonLatToPixel(mapCenter.lat, mapCenter.lng, mapZoom);
  const tileSize = 256;
  const startX = Math.floor((centerPixel.x - width / 2) / tileSize);
  const endX = Math.floor((centerPixel.x + width / 2) / tileSize);
  const startY = Math.floor((centerPixel.y - height / 2) / tileSize);
  const endY = Math.floor((centerPixel.y + height / 2) / tileSize);
  const maxTile = 2 ** mapZoom;

  let html = "<div class='map-tile-layer'>";
  for (let x = startX; x <= endX; x += 1) {
    for (let y = startY; y <= endY; y += 1) {
      if (y < 0 || y >= maxTile) continue;
      const wrappedX = ((x % maxTile) + maxTile) % maxTile;
      const left = (x * tileSize - centerPixel.x) + width / 2;
      const top = (y * tileSize - centerPixel.y) + height / 2;
      html += `<img src="https://a.basemaps.cartocdn.com/light_all/${mapZoom}/${wrappedX}/${y}.png" style="left:${left}px;top:${top}px" alt="" />`;
    }
  }
  html += "</div><div class='map-crosshair'>+</div>";
  if (selectedMapPoint) {
    const pointPixel = lonLatToPixel(selectedMapPoint.lat, selectedMapPoint.lng, mapZoom);
    const left = pointPixel.x - centerPixel.x + width / 2;
    const top = pointPixel.y - centerPixel.y + height / 2;
    html += `<div class="map-marker" style="left:${left}px;top:${top}px"></div>`;
  }
  mapPicker.innerHTML = html;
}

function setMapPoint(lat, lng) {
  selectedMapPoint = { lat: Number(lat), lng: Number(lng) };
  mapCenter = { ...selectedMapPoint };
  renderMapPicker();
  if (mapPickerStatus) {
    mapPickerStatus.textContent = `Tanlangan: ${selectedMapPoint.lat.toFixed(6)}, ${selectedMapPoint.lng.toFixed(6)}`;
  }
  if (useMapPointBtn) useMapPointBtn.disabled = false;
}

function handleMapClick(event) {
  if (!mapPicker) return;
  if (mapDrag?.moved) {
    mapDrag = null;
    return;
  }
  const rect = mapPicker.getBoundingClientRect();
  const centerPixel = lonLatToPixel(mapCenter.lat, mapCenter.lng, mapZoom);
  const x = centerPixel.x + (event.clientX - rect.left) - rect.width / 2;
  const y = centerPixel.y + (event.clientY - rect.top) - rect.height / 2;
  const point = pixelToLonLat(x, y, mapZoom);
  setMapPoint(point.lat, point.lng);
}

function handleMapPointerDown(event) {
  if (!mapPicker) return;
  mapPicker.setPointerCapture?.(event.pointerId);
  mapDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    center: { ...mapCenter },
    moved: false,
  };
}

function handleMapPointerMove(event) {
  if (!mapPicker || !mapDrag || mapDrag.pointerId !== event.pointerId) return;
  const dx = event.clientX - mapDrag.startX;
  const dy = event.clientY - mapDrag.startY;
  if (Math.abs(dx) + Math.abs(dy) > 4) mapDrag.moved = true;
  const startPixel = lonLatToPixel(mapDrag.center.lat, mapDrag.center.lng, mapZoom);
  mapCenter = pixelToLonLat(startPixel.x - dx, startPixel.y - dy, mapZoom);
  renderMapPicker();
}

function handleMapPointerUp(event) {
  if (!mapPicker || !mapDrag || mapDrag.pointerId !== event.pointerId) return;
  mapPicker.releasePointerCapture?.(event.pointerId);
  if (mapDrag.moved && mapPickerStatus) {
    mapPickerStatus.textContent = `Markaz: ${mapCenter.lat.toFixed(6)}, ${mapCenter.lng.toFixed(6)}. Markazni tanlash tugmasini bosing.`;
  }
}

function selectMapCenter() {
  setMapPoint(mapCenter.lat, mapCenter.lng);
  if (mapPickerStatus) {
    mapPickerStatus.textContent = `Markaz tanlandi: ${mapCenter.lat.toFixed(6)}, ${mapCenter.lng.toFixed(6)}`;
  }
}

function openMapPicker(item, card) {
  mapPicker = document.querySelector("#mapPicker");
  activeMapCard = card;
  activeMapBranchId = item.branchId;
  selectedMapPoint = null;
  if (useMapPointBtn) useMapPointBtn.disabled = true;
  if (mapPickerTitle) mapPickerTitle.textContent = `${item.name} - xaritadan belgilash`;
  if (mapPickerStatus) mapPickerStatus.textContent = "Xaritada filial joyini bosing.";
  if (mapSearchInput) mapSearchInput.value = "";
  if (googleMapsInput) googleMapsInput.value = "";
  mapPickerModal.hidden = false;

  const currentLat = Number(normalizeNumber(card.querySelector("[data-lat]").value));
  const currentLng = Number(normalizeNumber(card.querySelector("[data-lng]").value));
  const hasCurrent = Number.isFinite(currentLat) && Number.isFinite(currentLng) && (Math.abs(currentLat) > 0.000001 || Math.abs(currentLng) > 0.000001);
  mapCenter = hasCurrent ? { lat: currentLat, lng: currentLng } : { lat: 41.311081, lng: 69.240562 };
  mapZoom = hasCurrent ? 17 : 13;

  setTimeout(() => {
    mapPicker?.removeEventListener("click", handleMapClick);
    mapPicker?.addEventListener("click", handleMapClick);
    mapPicker?.removeEventListener("pointerdown", handleMapPointerDown);
    mapPicker?.removeEventListener("pointermove", handleMapPointerMove);
    mapPicker?.removeEventListener("pointerup", handleMapPointerUp);
    mapPicker?.addEventListener("pointerdown", handleMapPointerDown);
    mapPicker?.addEventListener("pointermove", handleMapPointerMove);
    mapPicker?.addEventListener("pointerup", handleMapPointerUp);
    if (hasCurrent) setMapPoint(currentLat, currentLng);
    renderMapPicker();
  }, 80);
}

async function searchMapAddress(event) {
  event.preventDefault();
  const query = mapSearchInput?.value.trim();
  if (!query) {
    if (mapPickerStatus) mapPickerStatus.textContent = "Qidirish uchun manzil yozing.";
    return;
  }

  if (mapPickerStatus) mapPickerStatus.textContent = "Manzil qidirilmoqda...";
  try {
    const simplified = query
      .replace(/showroom/gi, "")
      .replace(/eco\s*bozor/gi, "Ekobozor")
      .replace(/\s+/g, " ")
      .trim();
    const queries = [...new Set([
      query,
      simplified,
      `${simplified} Toshkent`,
      `${simplified} Tashkent`,
      `${simplified} Uzbekistan`,
    ].filter(Boolean))];
    let place = null;
    for (const searchQuery of queries) {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "uz");
      url.searchParams.set("q", searchQuery);
      const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Qidiruv ishlamadi.");
      const results = await response.json();
      if (results[0]) {
        place = results[0];
        break;
      }
    }
    if (!place) {
      if (mapPickerStatus) mapPickerStatus.textContent = "Manzil topilmadi. Boshqa nom bilan qidiring.";
      return;
    }
    mapZoom = 17;
    setMapPoint(Number(place.lat), Number(place.lon));
    if (mapPickerStatus) {
      mapPickerStatus.textContent = `Topildi: ${place.display_name.split(",").slice(0, 3).join(", ")}`;
    }
  } catch (error) {
    if (mapPickerStatus) mapPickerStatus.textContent = "Qidiruv ishlamadi. Xaritadan qo'lda tanlang.";
  }
}

function openGoogleMapsSearch() {
  const query = mapSearchInput?.value.trim()
    || mapPickerTitle?.textContent.replace(" - xaritadan belgilash", "").trim()
    || "Toshkent";
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", query.toLowerCase().includes("toshkent") ? query : `${query}, Toshkent`);
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function parseGoogleMapsPoint(value) {
  let text = String(value || "").trim();
  try {
    text = decodeURIComponent(text);
  } catch (error) {
    // Google links are still parseable even when decoding fails.
  }
  if (!text) return null;

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

async function applyGoogleMapsLink(event) {
  event.preventDefault();
  const point = await resolveGoogleMapsPoint(googleMapsInput?.value);
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    if (mapPickerStatus) {
      mapPickerStatus.textContent = "Google Maps linkidan koordinata topilmadi. Linkni yoki 41.326172, 69.274101 formatida kiriting.";
    }
    return;
  }
  mapZoom = 17;
  setMapPoint(point.lat, point.lng);
  if (mapPickerStatus) {
    mapPickerStatus.textContent = `Google Mapsdan olindi: ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
  }
}

function closeMapPicker() {
  if (mapPickerModal) mapPickerModal.hidden = true;
  activeMapCard = null;
  activeMapBranchId = null;
}

function applyMapPoint() {
  if (!selectedMapPoint) return;
  const targetCard = [...document.querySelectorAll(".geofence-card")]
    .find((card) => card.dataset.branchId === activeMapBranchId) || activeMapCard;
  if (!targetCard) return;
  targetCard.querySelector("[data-lat]").value = selectedMapPoint.lat.toFixed(6);
  targetCard.querySelector("[data-lng]").value = selectedMapPoint.lng.toFixed(6);
  updateGeofenceDraft(targetCard.dataset.branchId, targetCard);
  showAdminMessage("Xaritadan belgilandi. Tekshirib, Saqlash bosing.", "success");
  closeMapPicker();
}

function changeMapZoom(delta) {
  mapZoom = Math.max(10, Math.min(18, mapZoom + delta));
  renderMapPicker();
}

async function saveGeofence(branchId, name, card) {
  try {
    const coordinate = card.querySelector("[data-coordinate]").value.trim();
    let lat = normalizeNumber(card.querySelector("[data-lat]").value);
    let lng = normalizeNumber(card.querySelector("[data-lng]").value);
    if (coordinate) {
      const point = await resolveGoogleMapsPoint(coordinate);
      if (point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng))) {
        lat = Number(point.lat).toFixed(6);
        lng = Number(point.lng).toFixed(6);
        card.querySelector("[data-lat]").value = lat;
        card.querySelector("[data-lng]").value = lng;
        updateGeofenceDraft(branchId, card);
      }
    }
    if (!lat || !lng) {
      showAdminMessage("Avval koordinata kiriting yoki xaritadan aniq joyni belgilang.", "error");
      return;
    }
    const radius = normalizeNumber(card.querySelector("[data-radius]").value);
    await apiRequest("/security?type=geofences", {
      method: "POST",
      body: JSON.stringify({ branchId, name, lat, lng, radius }),
    });
    delete geofenceDrafts[branchId];
    showAdminMessage("GPS koordinata saqlandi.", "success");
    await loadServerState();
    render();
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
}

function renderSuspiciousList() {
  if (!suspiciousList) return;
  suspiciousList.innerHTML = "";
  if (!suspiciousItems.length) {
    suspiciousList.innerHTML = "<article class='metric-row'><div><strong>✅ Shubhali holat yo'q</strong><span>GPS, Face ID va qurilma bo'yicha hozircha muammo topilmadi.</span></div><b class='badge-ok'>OK</b></article>";
    return;
  }

  // Group duplicates by employee+type, keep latest, track count
  const groups = new Map();
  suspiciousItems.forEach((item) => {
    const key = `${item.employeeId || item.id}::${item.type}`;
    if (!groups.has(key)) {
      groups.set(key, { item, count: 1 });
    } else {
      groups.get(key).count++;
    }
  });

  [...groups.values()].forEach(({ item, count }) => {
    const isDanger = ["gps", "device", "face_failed"].includes(item.type);
    const row = document.createElement("article");
    row.className = `metric-row collapsible ${isDanger ? "danger" : "warn"}`;

    // Header (always visible)
    const header = document.createElement("div");
    header.className = "metric-header";

    const headerLeft = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = `${item.title} — ${item.employeeName || ""}`;
    const span = document.createElement("span");
    span.className = "metric-detail-preview";
    span.textContent = item.detail || "";
    headerLeft.append(strong, span);

    const headerRight = document.createElement("div");
    headerRight.className = "metric-meta";
    const badge = document.createElement("b");
    badge.textContent = item.type;
    const chevron = document.createElement("span");
    chevron.className = "chevron";
    chevron.textContent = "›";
    headerRight.append(badge);
    if (count > 1) {
      const countBadge = document.createElement("em");
      countBadge.className = "count-badge";
      countBadge.textContent = count;
      headerRight.append(countBadge);
    }
    headerRight.append(chevron);
    header.append(headerLeft, headerRight);

    // Body (hidden until expanded)
    const body = document.createElement("div");
    body.className = "metric-body";

    const detailFull = document.createElement("p");
    detailFull.className = "metric-body-detail";
    detailFull.textContent = item.detail || "";
    body.append(detailFull);

    const actions = document.createElement("div");
    actions.className = "suspicious-actions";

    if (item.actionId) {
      const approve = document.createElement("button");
      approve.type = "button";
      approve.className = "secondary small-btn";
      approve.textContent = "Tasdiqlash";
      approve.addEventListener("click", (e) => { e.stopPropagation(); reviewProof(item.actionId, "approve"); });
      const reject = document.createElement("button");
      reject.type = "button";
      reject.className = "ghost small-btn";
      reject.textContent = "Rad etish";
      reject.addEventListener("click", (e) => { e.stopPropagation(); reviewProof(item.actionId, "reject"); });
      actions.append(approve, reject);
    }

    if (item.type === "device" && item.employeeId) {
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "secondary small-btn";
      reset.textContent = "Qurilmani reset";
      reset.addEventListener("click", (e) => { e.stopPropagation(); resetDevice(item.employeeId); });
      actions.append(reset);
    }

    if (item.type === "open") {
      const note = document.createElement("span");
      note.style.fontSize = "12px";
      note.style.color = "var(--muted)";
      note.textContent = "Ketdim bosilmagan. Admin manual yopishi mumkin.";
      actions.append(note);
    }

    body.append(actions);
    row.append(header, body);

    header.addEventListener("click", () => row.classList.toggle("open"));

    suspiciousList.append(row);
  });
}

async function reviewProof(proofId, decision) {
  const reason = prompt(decision === "approve" ? "Tasdiqlash sababi" : "Rad etish sababi");
  if (!reason || !reason.trim()) {
    showAdminMessage("Sabab yozish majburiy.", "error");
    return;
  }
  try {
    await apiRequest("/security?type=proof-review", {
      method: "POST",
      body: JSON.stringify({ proofId, decision, reason: reason.trim() }),
    });
    showAdminMessage("Qaror saqlandi.", "success");
    await loadServerState();
    render();
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
}

async function resetDevice(employeeId) {
  const reason = prompt("Qurilmani reset qilish sababi");
  if (!reason || !reason.trim()) {
    showAdminMessage("Sabab yozish majburiy.", "error");
    return;
  }
  try {
    await apiRequest("/security?type=device-reset", {
      method: "POST",
      body: JSON.stringify({ employeeId, reason: reason.trim() }),
    });
    showAdminMessage("Qurilma reset qilindi. Xodim yangi telefonidan qayta Keldim qilishi mumkin.", "success");
    await loadServerState();
    render();
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
}

function renderLiveLocationStats(records) {
  const rows = branchRows(records).map((row) => [row.branch.name, `${row.active}/${row.total}`]);
  setRankingTable(liveLocationStats, rows, ["Filial", "Ishda"]);
}

function renderQuickAlerts(records) {
  if (!quickAlerts) return;
  const lateRows = records
    .map(({ employee, record }) => ({ employee, record, late: lateMinutes(employee, record) }))
    .filter((item) => item.late > 0)
    .sort((left, right) => right.late - left.late);
  const absentRows = records.filter(({ employee, record }) => !record.arrival && isAbsentDeadlinePassed(employee));
  const gpsRows = records.filter(({ record }) => record.arrival && !record.arrivalPhoto);
  const lines = [
    lateRows[0] ? `⚠️ ${lateRows[0].employee.name} - ${lateRows[0].late} daqiqa kechikdi` : "",
    absentRows[0] ? `⚠️ ${absentRows[0].employee.name} - hali kelmagan` : "",
    gpsRows[0] ? `⚠️ ${gpsRows[0].employee.name} - GPS mos kelmadi` : "",
  ].filter(Boolean);
  quickAlerts.textContent = lines.length ? lines.join("\n") : "✅ Bugun tezkor ogohlantirish yo'q";
}

function renderMonthlyTrend(records, totals) {
  setCards(monthlyTrend, [
    { label: "Kechikishlar soni", value: `${totals.late}`, detail: "Tanlangan sana bo'yicha umumiy kechikish." },
    { label: "Davomat foizi", value: `${totals.attendancePercent}%`, detail: "Kelgan xodimlar / faol xodimlar." },
    { label: "Ishlangan soatlar", value: formatDuration(totals.totalMinutes), detail: "Bugungi umumiy ishlangan vaqt." },
  ]);
}

function renderEmployeeCards(employees) {
  if (!employeeCards) return;
  employeeCards.innerHTML = "";
  employees.slice(0, 8).forEach((employee) => {
    const schedule = getSchedule(employee);
    const record = getRecord(employee.id);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "employee-mini-card";
    card.innerHTML = "<img alt='' /><span><strong></strong><small></small></span><b></b>";
    card.querySelector("img").src = employee.photo || DEFAULT_PHOTO;
    card.querySelector("strong").textContent = employee.name;
    card.querySelector("small").textContent = `${employee.phone || "Telefon yo'q"} | ${schedule.name}`;
    card.querySelector("b").textContent = statusFor(employee, record).label;
    card.addEventListener("click", () => showEmployeeCard(employee.id));
    employeeCards.append(card);
  });
}

async function showEmployeeCard(employeeId) {
  const employee = state.employees.find((item) => item.id === employeeId);
  if (!employee || !employeeModal) return;
  const record = getRecord(employee.id);
  const schedule = getSchedule(employee);
  const late = lateMinutes(employee, record);
  const monthRecords = Object.entries(state.attendance)
    .filter(([day]) => day >= selectedDay.slice(0, 8) + "01" && day <= selectedDay)
    .map(([, dayRecords]) => dayRecords?.[employee.id] || {})
    .filter((item) => item.arrival);
  const proofId = record.arrivalPhoto || record.departurePhoto;
  let proof = { photo: "", location: null };
  if (proofId) {
    try {
      proof = await getProofDetails(proofId);
    } catch {
      proof = { photo: "", location: null };
    }
  }
  employeeDetailTitle.textContent = employee.name;
  employeeDetailBody.innerHTML = `
    <div class="employee-detail">
      <img src="${proof.photo || employee.photo || DEFAULT_PHOTO}" alt="" />
      <div>
        <p><b>Telefon:</b> ${employee.phone || "--"}</p>
        <p><b>Lavozim:</b> ${employee.role || "--"}</p>
        <p><b>Filial:</b> ${schedule.name}</p>
        <p><b>Ish vaqti:</b> ${schedule.start}${schedule.end ? ` - ${schedule.end}` : ""}</p>
        <p><b>Bugungi foto:</b> ${proof.photo ? "bor" : "yo'q"}</p>
        <p><b>Kelgan/Ketgan:</b> ${record.arrival || "--:--"} / ${record.departure || "--:--"}</p>
        <p><b>Kechikish:</b> ${formatDuration(late)}</p>
        <p><b>Oxirgi 30 kun:</b> ${monthRecords.length} kun davomat bor</p>
        <p><b>GPS:</b> ${proof.location ? `${Number(proof.location.lat).toFixed(6)}, ${Number(proof.location.lng).toFixed(6)}` : "yo'q"}</p>
        ${proof.location ? `<a class="map-link" href="https://maps.google.com/?q=${proof.location.lat},${proof.location.lng}" target="_blank" rel="noreferrer">Xaritada ko'rish</a>` : ""}
        <button type="button" class="secondary" data-reset-device="${employee.id}">Qurilmani reset qilish</button>
      </div>
    </div>
  `;
  employeeDetailBody.querySelector("[data-reset-device]")?.addEventListener("click", () => resetDevice(employee.id));
  employeeModal.hidden = false;
}


function renderAttendanceDetails(records) {
  if (!attendanceDetails) return;
  attendanceDetails.innerHTML = "";
  records.forEach(({ employee, record }) => {
    const schedule = getSchedule(employee);
    const row = document.createElement("article");
    row.className = "metric-row";
    row.innerHTML = "<div><strong></strong><span></span></div><b></b>";
    row.querySelector("strong").textContent = employee.name;
    row.querySelector("span").textContent = [
      `Kelgan: ${record.arrival || "--:--"}`,
      `Ketgan: ${record.departure || "--:--"}`,
      `Ishlangan: ${formatDuration(workedMinutes(record))}`,
      `Kechikish: ${record.arrival ? formatDuration(lateMinutes(employee, record)) : "yo'q"}`,
      `Erta ketish: ${record.departure ? formatDuration(earlyLeaveMinutes(employee, record)) : "yo'q"}`,
      `Filial: ${schedule.name}`,
    ].join(" | ");
    row.querySelector("b").textContent = statusFor(employee, record).label;
    attendanceDetails.append(row);
  });
}

function renderLateRanking(records) {
  if (!lateRanking) return;
  lateRanking.innerHTML = "";
  const rows = records
    .map(({ employee, record }) => ({ employee, record, late: lateMinutes(employee, record) }))
    .filter((item) => item.late > 0)
    .sort((left, right) => right.late - left.late);

  if (rows.length === 0) {
    const row = document.createElement("article");
    row.className = "metric-row";
    row.innerHTML = "<div><strong>Kechikkan xodim yo'q</strong><span>Bugungi hisobot toza.</span></div><b>0 daq</b>";
    lateRanking.append(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("article");
    row.className = "metric-row";
    row.innerHTML = "<div><strong></strong><span></span></div><b></b>";
    row.querySelector("strong").textContent = item.employee.name;
    row.querySelector("span").textContent = `Sababi: belgilanmagan | Kelgan: ${item.record.arrival} | Oylik hisobotga qo'shildi`;
    row.querySelector("b").textContent = formatDuration(item.late);
    lateRanking.append(row);
  });
}

function renderDisciplineRanking(records) {
  if (!disciplineRanking) return;
  disciplineRanking.innerHTML = "";
  const rows = records
    .map(({ employee, record }) => {
      const late = lateMinutes(employee, record);
      const worked = workedMinutes(record);
      const score = (record.arrival ? 50 : 0) + (late === 0 && record.arrival ? 35 : 0) + Math.min(15, Math.floor(worked / 60));
      return { employee, record, score };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 10);

  rows.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "metric-row";
    row.innerHTML = "<div><strong></strong><span></span></div><b></b>";
    row.querySelector("strong").textContent = `${index + 1}. ${item.employee.name}`;
    row.querySelector("span").textContent = `Kelgan: ${item.record.arrival || "--:--"} | Ishlangan: ${formatDuration(workedMinutes(item.record))}`;
    row.querySelector("b").textContent = `${item.score} ball`;
    disciplineRanking.append(row);
  });
}

function renderFeaturePanels(records, totals) {
  const weekly = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"].join(", ");
  setCards(scheduleOverview, [
    { label: "Haftalik grafik", value: weekly, detail: "Xodimning dam kuni va smenasi bo'yicha kelmagan/kechikkan hisoblanadi." },
    { label: "Oylik grafik", value: `${totals.attendancePercent}%`, detail: "Oylik davomat foizi tanlangan kun va tarix asosida ko'rsatiladi." },
    { label: "Dam olish kunlari", value: "Xodim bo'yicha", detail: "Masalan: Said dushanba, Axmad chorshanba, Mirodil juma dam oladi." },
    { label: "Smenalar", value: "09:00 / 10:00 / 09:00-21:00", detail: "Filial ish vaqti avtomatik olinadi, xodimda alohida vaqt ham bo'lishi mumkin." },
    { label: "O'zgarishlar tarixi", value: "Admin log", detail: "Kim jadvalni yoki vaqtni o'zgartirsa tarixda qoladi." },
  ]);

  setCards(permitOverview, [
    { label: "Ta'til so'rash", value: "Qabul qilinadi", detail: "Admin tasdiqlash jarayoniga tayyor bo'lim." },
    { label: "Kasallik varaqasi", value: "Fayl bilan", detail: "Rasm/PDF biriktirish uchun joy ajratilgan." },
    { label: "Xizmat safari", value: "Sana bilan", detail: "Filialdan tashqarida ishlashni belgilash mumkin." },
    { label: "Yarim kunlik ruxsat", value: "Soat bilan", detail: "Erta ketishni izoh bilan yopish uchun." },
  ]);

  setCards(gpsOverview, [
    { label: "GeoFence", value: "Serverda blok", detail: "Radiusdan tashqarida Keldim/Ketdim yozilmaydi." },
    { label: "Radius", value: "100 m", detail: "Har bir filial uchun alohida radius jadvali tayyor." },
    { label: "Lokatsiya", value: "Majburiy", detail: "Keldim/Ketdim bosilganda GPS bazaga saqlanadi." },
    { label: "Masofa", value: "Aniqlik metri", detail: "Telefon qaytargan GPS aniqligi va GeoFence holati dalilda ko'rinadi." },
    { label: "Xarita", value: "Google Maps", detail: "Har bir selfie dalilida xarita tugmasi bor." },
    { label: "Fake GPS", value: "Bloklanadi", detail: "Juda past aniqlik serverda qabul qilinmaydi." },
  ]);

  setCards(cameraOverview, [
    { label: "Kelganda selfie", value: "Majburiy", detail: "Rasmsiz kelish yozilmaydi." },
    { label: "Ketganda selfie", value: "Majburiy", detail: "Ketish dalili ham bazada saqlanadi." },
    { label: "Face ID", value: "Status tayyor", detail: "Har bir selfie uchun Face ID tekshiruv holati bazada saqlanadi." },
    { label: "Boshqa odamni bloklash", value: "Selfie + GPS + qurilma", detail: "Hozir foto, lokatsiya va bitta telefon birga tekshiriladi." },
    { label: "Foto arxiv", value: "1 yil", detail: "Kelish/ketish foto, GPS, sana va vaqt arxivda saqlanadi." },
  ]);

  setCards(reportOverview, [
    { label: "Kunlik", value: selectedDay, detail: "Jadval va CSV eksport ishlaydi." },
    { label: "Haftalik", value: "Tayyor bo'lim", detail: "Keyingi bosqichda sana oralig'i qo'shiladi." },
    { label: "Oylik", value: `${totals.attendancePercent}%`, detail: "Oylik davomat foizi ko'rsatiladi." },
    { label: "CSV/Excel", value: "CSV", detail: "Excel ochadigan CSV eksport bor." },
    { label: "PDF", value: "Tayyor bo'lim", detail: "PDF eksport tugmasi keyingi ulanishga tayyor." },
  ]);
  if (telegramDigest) {
    const lateRows = records
      .map(({ employee, record }) => ({ employee, late: lateMinutes(employee, record) }))
      .filter((item) => item.late > 0)
      .sort((left, right) => right.late - left.late);
    telegramDigest.textContent = [
      nowTime(),
      `⚠️ Bugun ${lateRows.length} nafar xodim kechikdi`,
      ...lateRows.slice(0, 4).map((item) => `- ${item.employee.name} (+${item.late} daq)`),
    ].join("\n");
  }

  const penalty = totals.totalLateMinutes * 1000;
  const bonus = Math.max(0, records.filter(({ record, employee }) => record.arrival && lateMinutes(employee, record) === 0).length * 5000);
  setCards(payrollOverview, [
    { label: "Kechikish jarimasi", value: `${penalty.toLocaleString("uz-UZ")} so'm`, detail: "Hisob: 1 daqiqa = 1 000 so'm." },
    { label: "O'z vaqtida kelish bonusi", value: `${bonus.toLocaleString("uz-UZ")} so'm`, detail: "Hisob: vaqtida kelgan xodimga 5 000 so'm." },
    { label: "KPI ballari", value: `${Math.max(0, 100 - totals.late * 5)} ball`, detail: "Menejer: savdo/shartnoma/bonus, ombor: qabul/yuklash KPI moduliga tayyor." },
    { label: "Dostavka nazorati", value: "GPS tarix", detail: "Haydovchi chiqish-qaytish va qayerdaligi alohida modulga tayyor." },
    { label: "Qurilma bog'lash", value: "1 telefon", detail: "Xodim birinchi telefonga bog'lanadi, boshqa telefon bloklanadi." },
  ]);

  setCards(roleOverview, [
    { label: "Admin", value: "To'liq nazorat", detail: "Xodim, davomat, hisobot va sozlamalar." },
    { label: "HR", value: "Xodimlar", detail: "Xodim qo'shish, ruxsat va hisobotlar." },
    { label: "Filial rahbari", value: "O'z filiali", detail: "Filial bo'yicha davomat statistikasi." },
    { label: "Xodim", value: "Keldim/Ketdim", detail: "Kod, selfie va lokatsiya orqali belgilaydi." },
  ]);

  setCards(violationOverview, [
    { label: "3 martadan ko'p kechikkanlar", value: `${records.filter(({ employee, record }) => lateMinutes(employee, record) > 0).length}`, detail: "Oylik tarix ulanganda avtomatik 3+ nazorat qilinadi." },
    { label: "Sababsiz kelmaganlar", value: `${totals.absent}`, detail: "4 soatdan keyin kelmagan sifatida belgilanadi." },
    { label: "GPS xatoliklari", value: "0", detail: "Lokatsiya yo'q yoki aniqlik past bo'lsa shu yerda chiqadi." },
  ]);
}

function renderArrivalReport(records) {
  arrivalReportBody.innerHTML = "";

  records
    .slice()
    .sort((left, right) => {
      const leftTime = left.record.arrival || "99:99";
      const rightTime = right.record.arrival || "99:99";
      return leftTime.localeCompare(rightTime);
    })
    .forEach(({ employee, record }) => {
      const schedule = getSchedule(employee);
      const status = statusFor(employee, record);
      const late = lateMinutes(employee, record);
      const row = document.createElement("article");
      row.className = `arrival-item ${status.className || "present"}`;
      row.innerHTML = "<div><strong></strong><span></span></div><b></b>";
      row.querySelector("strong").textContent = employee.name;
      row.querySelector("span").textContent = `${schedule.name} - boshlanish: ${schedule.start}`;
      row.querySelector("b").textContent = record.arrival
        ? `${record.arrival}${late > 0 ? ` (${formatDuration(late)} kech)` : ""}`
        : (isAbsentDeadlinePassed(employee) ? "Ishga kelmagan" : "Kutilyapti");
      arrivalReportBody.append(row);
    });

  arrivalEmptyState.classList.toggle("show", records.length === 0);
}

function renderLateReport(records) {
  lateReportBody.innerHTML = "";
  const reportRows = records
    .map(({ employee, record }) => {
      const schedule = getSchedule(employee);
      const late = lateMinutes(employee, record);
      if (!record.arrival && isAbsentDeadlinePassed(employee)) {
        return { employee, schedule, label: "Ishga kelmagan", detail: `Boshlanish vaqti: ${schedule.start}`, className: "absent" };
      }
      if (late > 0) {
        return { employee, schedule, label: `${formatDuration(late)} kech`, detail: `Kelgan: ${record.arrival}, boshlanish: ${schedule.start}`, className: "late" };
      }
      return null;
    })
    .filter(Boolean);

  reportRows.forEach((item) => {
    const row = document.createElement("article");
    row.className = `late-item ${item.className}`;
    row.innerHTML = "<div><strong></strong><span></span></div><b></b>";
    row.querySelector("strong").textContent = item.employee.name;
    row.querySelector("span").textContent = `${item.schedule.name} - ${item.detail}`;
    row.querySelector("b").textContent = item.label;
    lateReportBody.append(row);
  });

  lateEmptyState.classList.toggle("show", reportRows.length === 0);
}

function exportCsv() {
  const rows = [["Sana", "Xodim", "Kod", "Lavozim", "Ish joyi", "Boshlanish", "Tugash", "Kelgan vaqti", "Ketgan vaqti", "Ish vaqti", "Kechikish", "Holat"]];
  const day = selectedDay;
  state.employees.forEach((employee) => {
    const record = getRecord(employee.id);
    const status = statusFor(employee, record);
    const schedule = getSchedule(employee);
    rows.push([
      day,
      employee.name,
      employee.code,
      employee.role || "",
      schedule.name,
      schedule.start,
      schedule.end,
      record.arrival || "",
      record.departure || "",
      formatDuration(workedMinutes(record, day)),
      record.arrival ? formatDuration(lateMinutes(employee, record)) : (isAbsentDeadlinePassed(employee) ? "Ishga kelmagan" : "Kutilyapti"),
      status.label,
    ]);
  });

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `davomat-${day}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportMonthlyCsv() {
  const rows = [["Oy", "Filial", "Xodim", "Ishlagan kun", "Kechikish", "Kelmagan", "Ishlagan soat", "Jarima", "Bonus"]];
  const month = selectedDay.slice(0, 7);
  state.employees.forEach((employee) => {
    const schedule = getSchedule(employee);
    const monthEntries = Object.entries(state.attendance).filter(([day]) => day.startsWith(month));
    const workedDays = monthEntries.filter(([, records]) => records?.[employee.id]?.arrival).length;
    const lateTotal = monthEntries.reduce((sum, [, records]) => sum + lateMinutes(employee, records?.[employee.id] || {}), 0);
    const absentTotal = monthEntries.filter(([, records]) => !records?.[employee.id]?.arrival).length;
    const workedTotal = monthEntries.reduce((sum, [, records]) => sum + workedMinutes(records?.[employee.id] || {}), 0);
    const penalty = lateTotal * 1000;
    const bonus = Math.max(0, workedDays * 5000 - penalty);
    rows.push([month, schedule.name, employee.name, workedDays, `${lateTotal} daq`, absentTotal, formatDuration(workedTotal), penalty, bonus]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `oylik-davomat-${month}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function loadAdminLogs() {
  if (!adminLogBody || !serverMode) return;
  try {
    const data = await apiRequest("/admin-logs");
    adminLogBody.innerHTML = "";
    (data.logs || []).forEach((log) => {
      const row = document.createElement("article");
      row.className = "metric-row";
      row.innerHTML = "<div><strong></strong><span></span></div><b></b>";
      row.querySelector("strong").textContent = `${log.employeeName || "Tizim"} - ${log.action}`;
      row.querySelector("span").textContent = `${log.detail || ""} | Sabab: ${log.reason || "--"}`;
      row.querySelector("b").textContent = new Date(log.createdAt).toLocaleString("uz-UZ");
      adminLogBody.append(row);
    });
  } catch {
    adminLogBody.innerHTML = "";
  }
}

function parseEmployeeImport(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(line.includes(";") ? ";" : ",").map((cell) => cell.trim().replace(/^"|"$/g, "")))
    .filter((cells) => cells[0] && !/^ism|name$/i.test(cells[0]))
    .map((cells) => ({
      name: cells[0] || "",
      role: cells[1] || "",
      phone: cells[2] || "",
      locationId: cells[3] || "c5",
      shiftStart: cells[4] || getSchedule({ locationId: cells[3] || "c5" }).start,
      shiftEnd: cells[5] || getSchedule({ locationId: cells[3] || "c5" }).end,
      status: cells[6] || "active",
      photo: "",
    }));
}

async function importEmployeesFromFile(file) {
  if (!file) return;
  if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
    showAdminMessage("Excel faylni CSV formatida saqlab yuklang. CSV import tayyor.", "warn");
    return;
  }

  const text = await file.text();
  const employees = parseEmployeeImport(text);
  if (employees.length === 0) {
    showAdminMessage("Import uchun xodim topilmadi.", "error");
    return;
  }

  try {
    if (serverMode) {
      await Promise.all(employees.map((employee) =>
        apiRequest("/employees", { method: "POST", body: JSON.stringify(employee) })
      ));
      await loadServerState();
    } else {
      employees.forEach((employee) => {
        state.employees.push({ id: crypto.randomUUID(), ...employee, code: generateEmployeeCode() });
      });
      saveLocalState();
      render();
    }
    showAdminMessage(`${employees.length} ta xodim import qilindi.`, "success");
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;

  try {
    const photo = await readImageFile(employeePhotoInput);
    const payload = {
      name,
      role: roleInput.value.trim(),
      phone: phoneInput?.value.trim() || "",
      locationId: locationInput.value,
      shiftStart: shiftStartInput?.value || getSchedule({ locationId: locationInput.value }).start,
      shiftEnd: shiftEndInput?.value || getSchedule({ locationId: locationInput.value }).end,
      status: employeeStatusInput?.value || "active",
      photo,
    };
    if (serverMode) {
      await apiRequest("/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      form.reset();
      if (shiftStartInput) shiftStartInput.value = "09:00";
      if (shiftEndInput) shiftEndInput.value = "19:00";
      await loadServerState();
    } else {
      state.employees.push({
        id: crypto.randomUUID(),
        ...payload,
        code: generateEmployeeCode(),
      });
      form.reset();
      if (shiftStartInput) shiftStartInput.value = "09:00";
      if (shiftEndInput) shiftEndInput.value = "19:00";
      saveLocalState();
      render();
    }
    nameInput.focus();
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
});

let searchDebounce;
function debouncedRender() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(render, 200);
}
searchInput.addEventListener("input", debouncedRender);
globalSearchInput?.addEventListener("input", debouncedRender);
dashboardTabs.forEach((button) => {
  button.addEventListener("click", () => switchDashboardView(button.dataset.dashboardTab));
});
problemFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    problemFilter = button.dataset.problemFilter;
    problemFilterButtons.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});
locationInput.addEventListener("change", () => {
  const schedule = getSchedule({ locationId: locationInput.value });
  if (shiftStartInput) shiftStartInput.value = schedule.start || "09:00";
  if (shiftEndInput) shiftEndInput.value = schedule.end || "19:00";
});
selfCheckInBtn.addEventListener("click", () => selfPunch("in"));
selfCheckOutBtn.addEventListener("click", () => selfPunch("out"));
adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await apiRequest("/admin-login", {
      method: "POST",
      body: JSON.stringify({ pin: adminPinInput.value }),
    });
    showAdminMessage("");
    setAdminOpen(true);
  } catch (error) {
    showAdminMessage(error.message || "PIN noto'g'ri.", "error");
    adminPinInput.select();
  }
});
lockAdminBtn.addEventListener("click", () => setAdminOpen(false));
closeProofBtn.addEventListener("click", closeProof);
proofModal.addEventListener("click", (event) => {
  if (event.target === proofModal) closeProof();
});
employeeCodeInput.addEventListener("input", () => {
  employeeCodeInput.value = employeeCodeInput.value.replace(/\D/g, "").slice(0, 4);
  updateEmployeePreview();
});
employeeCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    selfPunch("in");
  }
});
exportBtn.addEventListener("click", exportCsv);
monthlyExportBtn?.addEventListener("click", exportMonthlyCsv);
darkModeBtn?.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("attendance-dark-mode", document.body.classList.contains("dark-mode") ? "1" : "0");
});
importExcelBtn?.addEventListener("click", () => excelImportInput?.click());
excelImportInput?.addEventListener("change", () => importEmployeesFromFile(excelImportInput.files?.[0]));
closeEmployeeModalBtn?.addEventListener("click", () => {
  employeeModal.hidden = true;
});
employeeModal?.addEventListener("click", (event) => {
  if (event.target === employeeModal) employeeModal.hidden = true;
});
closeBranchModalBtn?.addEventListener("click", () => {
  branchModal.hidden = true;
});
branchModal?.addEventListener("click", (event) => {
  if (event.target === branchModal) branchModal.hidden = true;
});
closeMapPickerBtn?.addEventListener("click", closeMapPicker);
mapPickerModal?.addEventListener("click", (event) => {
  if (event.target === mapPickerModal) closeMapPicker();
});
useMapPointBtn?.addEventListener("click", applyMapPoint);
useMapCenterBtn?.addEventListener("click", selectMapCenter);
mapZoomInBtn?.addEventListener("click", () => changeMapZoom(1));
mapZoomOutBtn?.addEventListener("click", () => changeMapZoom(-1));
mapSearchForm?.addEventListener("submit", searchMapAddress);
openGoogleMapsBtn?.addEventListener("click", openGoogleMapsSearch);
googleMapsForm?.addEventListener("submit", applyGoogleMapsLink);
clearDayBtn.addEventListener("click", async () => {
  try {
    if (serverMode) {
      await apiRequest("/clear-day", {
        method: "POST",
        body: JSON.stringify({ day: selectedDay }),
      });
      await loadServerState();
      return;
    }

    const dayRecords = state.attendance[selectedDay] || {};
    Object.values(dayRecords).forEach((record) => {
      deleteLocalProofPhoto(record.arrivalPhoto);
      deleteLocalProofPhoto(record.departurePhoto);
    });
    state.attendance[selectedDay] = {};
    saveLocalState();
    render();
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
});

reportDateInput.addEventListener("change", async () => {
  selectedDay = reportDateInput.value || todayKey();
  if (serverMode) {
    try {
      await loadServerState();
    } catch (error) {
      showAdminMessage(error.message, "error");
    }
  } else {
    render();
  }
});

renderClock();
reportDateInput.value = selectedDay;
render();
loadServerState().catch(() => {
  serverMode = false;
  ensureEmployeeCodes();
  saveLocalState();
  render();
  showAdminMessage("Neon server ulanmagan. Hozir lokal zaxira rejimida ishlayapti.", "warn");
});
startCamera();

// Clock updates every second — lightweight
setInterval(renderClock, 1000);

// Summary (heavy: 15+ renders) only every 60s, not every 1s
setInterval(() => {
  if (!adminArea.hidden) renderSummary();
}, 60000);

setInterval(() => {
  if (serverMode && !adminArea.hidden) {
    if (geofencePanel?.contains(document.activeElement)) return;
    loadServerState().catch(() => {});
  }
}, 30000);
