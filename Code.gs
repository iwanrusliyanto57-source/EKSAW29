/**
 * =========================================================================
 * GOOGLE APPS SCRIPT BACKEND FOR LMS EKSKUL (Google Sheets Database)
 * =========================================================================
 * 
 * SPREADSHEET URL:
 * https://docs.google.com/spreadsheets/d/1UtJ7jmz9uSkyRIIUe4yVSRn1HM_eTQf9yBONt7psp1o/edit
 * 
 * INSTRUCTIONS TO DEPLOY:
 * 1. Open the Google Spreadsheet above in your browser.
 * 2. Click "Extensions" (Ekstensi) -> "Apps Script".
 * 3. Delete any default code in Code.gs, paste this entire file, and click Save (Ctrl+S / Cmd+S).
 * 4. Click the blue "Deploy" (Terapkan) button at top-right -> "New deployment" (Penerapan baru).
 * 5. Select type: "Web app" (Aplikasi web).
 * 6. Set Description: "LMS Ekskul API v1.0".
 * 7. Set "Execute as": "Me" (Saya).
 * 8. Set "Who has access": "Anyone" (Siapa saja). IMPORTANT for web client connection!
 * 9. Click "Deploy", authorize access with your Google account.
 * 10. Copy the Web App URL (starts with https://script.google.com/macros/s/...)
 *     and paste it into the Ekskul LMS Admin Settings!
 */

const SPREADSHEET_ID = "1UtJ7jmz9uSkyRIIUe4yVSRn1HM_eTQf9yBONt7psp1o";

const HEADERS_ABSENSI = [
  "id_log",
  "tanggal",
  "id_kelas",
  "kelas",
  "mapel",
  "id_tutor",
  "guru",
  "siswa",
  "status_kehadiran",
  "nilai",
  "catatan",
  "created_at"
];

const HEADERS_KEHADIRAN_TUTOR = [
  "id_presensi_tutor",
  "tanggal",
  "id_tutor",
  "guru",
  "id_kelas",
  "status_hadir",
  "jam_mulai",
  "jam_selesai",
  "keterangan"
];

function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function doGet(e) {
  try {
    const ss = getSpreadsheet();
    const action = e && e.parameter ? e.parameter.action : null;
    const sheetName = e && e.parameter ? e.parameter.sheet : null;

    if (action === "ping") {
      return jsonResponse({ status: "success", message: "Ekskul LMS Apps Script API Active", timestamp: new Date().toISOString() });
    }

    if (sheetName) {
      const data = readSheetData(ss, sheetName);
      return jsonResponse({ status: "success", sheet: sheetName, data: data });
    }

    const payload = {
      status: "success",
      master_siswa: readSheetData(ss, "master_siswa"),
      master_guru: readSheetData(ss, "master_guru"),
      master_kelas: readSheetData(ss, "master_kelas"),
      siswa_kelas: readSheetData(ss, "siswa_kelas"),
      absensi_dan_nilai: readSheetData(ss, "absensi_dan_nilai"),
      kehadiran_tutor: readSheetData(ss, "kehadiran_tutor")
    };

    return jsonResponse(payload);
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

function doPost(e) {
  try {
    const ss = getSpreadsheet();
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const action = body.action || (e && e.parameter ? e.parameter.action : "");

    switch (action) {
      case "saveAttendanceAndGrades": {
        const logs = body.logs || [];
        if (!logs.length) throw new Error("No logs provided");
        const count = appendBatchAbsensi(ss, logs);
        return jsonResponse({ status: "success", message: count + " attendance logs saved", count: count });
      }

      case "updateAttendanceLog": {
        const log = body.log;
        if (!log || !log.id_log) throw new Error("id_log is required");
        updateAbsensiLog(ss, log);
        return jsonResponse({ status: "success", message: "Attendance log updated", id_log: log.id_log });
      }

      case "deleteAttendanceLog": {
        const id_log = body.id_log;
        if (!id_log) throw new Error("id_log is required");
        deleteAbsensiLog(ss, id_log);
        return jsonResponse({ status: "success", message: "Attendance log deleted", id_log: id_log });
      }

      case "saveTutorPresence": {
        const presence = body.presence;
        if (!presence) throw new Error("presence data is required");
        appendTutorPresence(ss, presence);
        return jsonResponse({ status: "success", message: "Tutor presence recorded", id: presence.id_presensi_tutor });
      }

      case "updateTutorPresence": {
        const presence = body.presence;
        if (!presence || !presence.id_presensi_tutor) throw new Error("id_presensi_tutor is required");
        updateTutorPresence(ss, presence);
        return jsonResponse({ status: "success", message: "Tutor presence updated" });
      }

      case "deleteTutorPresence": {
        const id = body.id_presensi_tutor;
        if (!id) throw new Error("id_presensi_tutor is required");
        deleteTutorPresence(ss, id);
        return jsonResponse({ status: "success", message: "Tutor presence deleted" });
      }

      case "initSheets": {
        ensureSheetStructure(ss);
        return jsonResponse({ status: "success", message: "All sheet structures verified & initialized" });
      }

      default:
        return jsonResponse({ status: "error", message: "Unknown action: " + action });
    }
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

function readSheetData(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    if (sheetName === "absensi_dan_nilai") {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(HEADERS_ABSENSI);
    } else if (sheetName === "kehadiran_tutor") {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(HEADERS_KEHADIRAN_TUTOR);
    } else {
      return [];
    }
  }

  const values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) return [];

  const headers = values[0].map(h => String(h || "").trim());
  const rows = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const hasData = row.some(cell => cell !== "" && cell !== null && cell !== undefined);
    if (!hasData) continue;

    const item = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      if (header) {
        let val = row[c];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone() || "Asia/Jakarta", "yyyy-MM-dd");
        }
        item[header] = val;
      }
    }
    rows.push(item);
  }

  return rows;
}

function appendBatchAbsensi(ss, logs) {
  let sheet = ss.getSheetByName("absensi_dan_nilai");
  if (!sheet) {
    sheet = ss.insertSheet("absensi_dan_nilai");
    sheet.appendRow(HEADERS_ABSENSI);
  } else {
    const firstRow = sheet.getRange(1, 1, 1, HEADERS_ABSENSI.length).getValues()[0];
    if (String(firstRow[0]).trim() !== "id_log") {
      sheet.clear();
      sheet.appendRow(HEADERS_ABSENSI);
    }
  }

  const rowsToInsert = logs.map(log => [
    log.id_log || "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    log.tanggal || Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd"),
    log.id_kelas || "",
    log.kelas || "",
    log.mapel || "",
    log.id_tutor || "",
    log.guru || "",
    log.siswa || "",
    log.status_kehadiran || "Hadir",
    log.nilai !== null && log.nilai !== undefined && log.nilai !== "" ? Number(log.nilai) : "",
    log.catatan || "",
    log.created_at || new Date().toISOString()
  ]);

  if (rowsToInsert.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToInsert.length, HEADERS_ABSENSI.length).setValues(rowsToInsert);
  }

  return rowsToInsert.length;
}

function updateAbsensiLog(ss, log) {
  const sheet = ss.getSheetByName("absensi_dan_nilai");
  if (!sheet) throw new Error("Sheet absensi_dan_nilai not found");

  const values = sheet.getDataRange().getValues();
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][0]) === String(log.id_log)) {
      const rowIndex = r + 1;
      const updatedRow = [
        log.id_log,
        log.tanggal,
        log.id_kelas,
        log.kelas,
        log.mapel,
        log.id_tutor,
        log.guru,
        log.siswa,
        log.status_kehadiran,
        log.nilai !== null && log.nilai !== undefined ? log.nilai : "",
        log.catatan || "",
        values[r][11] || new Date().toISOString()
      ];
      sheet.getRange(rowIndex, 1, 1, HEADERS_ABSENSI.length).setValues([updatedRow]);
      return true;
    }
  }
  throw new Error("Log with id " + log.id_log + " not found");
}

function deleteAbsensiLog(ss, id_log) {
  const sheet = ss.getSheetByName("absensi_dan_nilai");
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][0]) === String(id_log)) {
      sheet.deleteRow(r + 1);
      return true;
    }
  }
  throw new Error("Log with id " + id_log + " not found");
}

function appendTutorPresence(ss, p) {
  let sheet = ss.getSheetByName("kehadiran_tutor");
  if (!sheet) {
    sheet = ss.insertSheet("kehadiran_tutor");
    sheet.appendRow(HEADERS_KEHADIRAN_TUTOR);
  } else {
    const firstRow = sheet.getRange(1, 1, 1, HEADERS_KEHADIRAN_TUTOR.length).getValues()[0];
    if (String(firstRow[0]).trim() !== "id_presensi_tutor") {
      sheet.clear();
      sheet.appendRow(HEADERS_KEHADIRAN_TUTOR);
    }
  }

  const row = [
    p.id_presensi_tutor || "PRES-" + Date.now(),
    p.tanggal || Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd"),
    p.id_tutor || "",
    p.guru || "",
    p.id_kelas || "",
    p.status_hadir || "Hadir",
    p.jam_mulai || "",
    p.jam_selesai || "",
    p.keterangan || ""
  ];

  sheet.appendRow(row);
  return true;
}

function updateTutorPresence(ss, p) {
  const sheet = ss.getSheetByName("kehadiran_tutor");
  if (!sheet) throw new Error("kehadiran_tutor sheet not found");
  const values = sheet.getDataRange().getValues();
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][0]) === String(p.id_presensi_tutor)) {
      const rowIndex = r + 1;
      const updatedRow = [
        p.id_presensi_tutor,
        p.tanggal,
        p.id_tutor,
        p.guru,
        p.id_kelas,
        p.status_hadir,
        p.jam_mulai,
        p.jam_selesai,
        p.keterangan || ""
      ];
      sheet.getRange(rowIndex, 1, 1, HEADERS_KEHADIRAN_TUTOR.length).setValues([updatedRow]);
      return true;
    }
  }
}

function deleteTutorPresence(ss, id) {
  const sheet = ss.getSheetByName("kehadiran_tutor");
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][0]) === String(id)) {
      sheet.deleteRow(r + 1);
      return true;
    }
  }
}

function ensureSheetStructure(ss) {
  let s1 = ss.getSheetByName("absensi_dan_nilai");
  if (!s1) {
    s1 = ss.insertSheet("absensi_dan_nilai");
    s1.appendRow(HEADERS_ABSENSI);
  }
  let s2 = ss.getSheetByName("kehadiran_tutor");
  if (!s2) {
    s2 = ss.insertSheet("kehadiran_tutor");
    s2.appendRow(HEADERS_KEHADIRAN_TUTOR);
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
