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
export const excelSerialToDate = (serial) => {
  if (serial === null || serial === undefined) return null;
  const s = Number(serial);
  if (isNaN(s)) return null;
  // Excel stores days since 1899-12-31; convert to JS timestamp (ms)
  // Note: using 25569 as offset (days between 1899-12-31 and 1970-01-01)
  const ms = Math.round((s - 25569) * 86400 * 1000);
  return new Date(ms);
};

// Parse an Excel cell value (which may be number serial, Date, Firestore Timestamp, or string)
// and return YYYY-MM-DD or empty string when not parseable
export const parseExcelDateToYMD = (v) => {
  if (v === null || v === undefined || v === "") return "";
  try {
    if (v && typeof v.toDate === "function") return parseDateToYMD(v);
    if (v instanceof Date) return parseDateToYMD(v);
    if (typeof v === "number") {
      const d = excelSerialToDate(v);
      return d ? parseDateToYMD(d) : "";
    }
    // fallback to parseDateToYMD which attempts new Date(string)
    return parseDateToYMD(v);
  } catch (e) {
    return "";
  }
};

export const computePendingLinkUpdates = (records) => {
  const groups = {};
  for (const r of records) {
    const key = [
      (r.subject || "").trim(),
      (r.examSession || "").trim(),
      (r.examTime || "").trim(),
      (r.examRoom || "").trim(),
      (r.course || "").trim(),
      (r.majorCode || "").trim(),
      (r.examType || "").trim(),
    ]
      .map((s) => s.toLowerCase())
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
