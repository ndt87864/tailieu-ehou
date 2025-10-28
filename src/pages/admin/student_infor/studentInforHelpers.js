// Shared helpers for StudentInfor pages
// Keep implementations minimal and framework-agnostic so they can be used by components
export const ensureXLSX = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined")
      return reject(new Error("Browser environment required"));
    if (window.XLSX) return resolve(window.XLSX);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js";
    script.async = true;
    script.onload = () => {
      if (window.XLSX) resolve(window.XLSX);
      else reject(new Error("XLSX failed to load"));
    };
    script.onerror = (e) => reject(new Error("Failed to load XLSX library"));
    document.head.appendChild(script);
  });
};

export const normalizeHeader = (s = "") => {
  try {
    return String(s)
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^\w]/g, "")
      .toLowerCase();
  } catch (e) {
    return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  }
};

export const mapHeaderToKey = (h) => {
  const n = normalizeHeader(h);
  if (!n) return null;
  if (n === "stt") return null;
  if (/(masv|mssv|msv|sbd|sobadanh|sobd|sobaodanh|sinhvien|mssinhvien)/.test(n))
    return "studentId";
  if (n === "hoten" || n === "hovaten" || n === "hotenvaten") return "fullName";
  if (n.includes("tentaikhoan") || n.includes("taikhoan") || n === "username" || n === "account") return "username";
  if (n === "ho") return "lastName";
  if (n === "ten") return "firstName";
  if (n.includes("tenmon") || n.includes("mon") || n.includes("monhoc")) return "subject";
  if (n.includes("ngaythi") || (n.includes("ngay") && n.includes("thi"))) return "examDate";
  if (n.includes("cathi") || (n.includes("ca") && n.includes("thi"))) return "examSession";
  if (n.includes("thoigian") || n.includes("thoi") || n.includes("gian")) return "examTime";
  if (n.includes("phong")) return "examRoom";
  if (n.includes("khoa")) return "course";
  if (n.includes("manganh") || (n.includes("ma") && n.includes("nganh"))) return "majorCode";
  if (n.includes("hinhthuc") || n.includes("hinh")) return "examType";
  if (n.includes("link")) return "examLink";
  if (n.includes("ngaysinh") || n.includes("dob") || n.includes("date")) return "dob";
  return null;
};

export const normalizeForSearch = (s = "") => {
  try {
    return String(s)
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  } catch (e) {
    return String(s).toLowerCase();
  }
};

export const formatDate = (value) => {
  if (!value) return "";
  try {
    if (value && typeof value.toDate === "function") {
      const d = value.toDate();
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
  } catch (e) {}
  return value;
};

export const isValidUrl = (value) => {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
    return false;
  }
};

export const parseDateToYMD = (v) => {
  if (!v && v !== 0) return "";
  try {
    if (v && typeof v.toDate === "function") {
      const d = v.toDate();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch (e) {
    return "";
  }
};
// Convert Excel serial (number) to JS Date
export const excelSerialToDate = (serial, options = {}) => {
  if (serial === null || serial === undefined) return null;
  const s = Number(serial);
  if (isNaN(s)) return null;
  // Excel stores days since 1899-12-31 (or 1904-01-01 for 1904 system);
  // convert to JS timestamp (ms)
  // Default offset uses 25569 (days between 1899-12-31 and 1970-01-01)
  // If workbook uses the 1904 date system, use offset 24107 instead.
  const use1904 = Boolean(options && options.date1904);
  const offset = use1904 ? 24107 : 25569;
  // Calculate UTC milliseconds for the Excel serial so we don't get
  // local-timezone shifts when formatting the date later.
  const ms = Math.round((s - offset) * 86400 * 1000);
  return new Date(ms);
};

// Parse an Excel cell value (which may be number serial, Date, Firestore Timestamp, or string)
// and return YYYY-MM-DD or empty string when not parseable
export const parseExcelDateToYMD = (v, options = {}) => {
  if (v === null || v === undefined || v === "") return "";
  try {
    if (v && typeof v.toDate === "function") return parseDateToYMD(v);
    // If XLSX (or workbook) already gave us a JS Date instance we should
    // treat it as an Excel cell date (timezone-less) and use UTC getters
    // to extract the calendar date so local TZ offsets don't change the day.
    const pad = (n) => String(n).padStart(2, "0");
    if (v instanceof Date) {
      return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(
        v.getUTCDate()
      )}`;
    }

    // Numeric Excel serial values -> convert to Date and use UTC fields.
    if (typeof v === "number") {
      const d = excelSerialToDate(v, options);
      if (!d) return "";
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
        d.getUTCDate()
      )}`;
    }
    // If it's a string, try to robustly parse common formats like
    // dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, etc., because `new Date(str)`
    // can be unreliable across environments.
    if (typeof v === "string") {
      const s = v.trim().replace(/\u00A0/g, " ");
      // common DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY
      const dmMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (dmMatch) {
        let dd = Number(dmMatch[1]);
        let mm = Number(dmMatch[2]);
        let yy = Number(dmMatch[3]);
        if (yy < 100) yy += 2000; // treat 2-digit as 2000+
        const dt = new Date(yy, mm - 1, dd);
        if (!isNaN(dt.getTime())) return parseDateToYMD(dt);
      }

      // ISO-like or other parseable strings
      const iso = new Date(s);
      if (!isNaN(iso.getTime())) return parseDateToYMD(iso);
      // last resort: return empty
      return "";
    }
    // fallback to parseDateToYMD which attempts new Date(string)
    return parseDateToYMD(v);
  } catch (e) {
    return "";
  }
};

// Simple, robust CSV parser (handles quoted fields and CR/LF).
// Returns an array of objects where keys come from the header row.
export const parseCSV = (text) => {
  if (!text && text !== "") return [];
  // Remove BOM if present
  const s = String(text).replace(/^\uFEFF/, "");
  const rows = [];

  let cur = "";
  let row = [];
  let i = 0;
  let inQuotes = false;
  while (i < s.length) {
    const ch = s[i];
    const next = s[i + 1];
    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          cur += '"';
          i += 1; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cur);
        cur = "";
      } else if (ch === '\r') {
        // ignore, handle on \n
      } else if (ch === '\n') {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else {
        cur += ch;
      }
    }
    i += 1;
  }
  // push last
  if (cur !== "" || inQuotes || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => (h == null ? "" : String(h).trim()));
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const arr = rows[r];
    // skip empty trailing rows
    if (arr.length === 1 && arr[0] === "") continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `col${c}`;
      obj[key] = c < arr.length && arr[c] != null ? String(arr[c]) : "";
    }
    out.push(obj);
  }
  return out;
};

export const computePendingLinkUpdates = (records) => {
  const groups = {};
  for (const r of records) {
    // include examDate in grouping so links are only propagated for the same calendar date
    const dateYMD = parseDateToYMD(r.examDate || "");
    const key = [
      dateYMD,
      (r.subject || "").trim(),
      (r.examSession || "").trim(),
      (r.examTime || "").trim(),
      (r.examRoom || "").trim(),
      (r.examType || "").trim(),
    ]
      .map((s) => String(s || "").toLowerCase())
      .join("||");
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  const updates = [];
  Object.values(groups).forEach((group) => {
    const provider = group.find((x) => x.examLink && String(x.examLink).trim());
    if (!provider) return;
    const link = String(provider.examLink).trim();
    group.forEach((rec) => {
      if (!rec.examLink || String(rec.examLink).trim() === "") {
        updates.push({ id: rec.id, link });
      }
    });
  });

  return updates;
};
