import fs from 'fs';
import path from 'path';
import {
  DatabaseState,
  MasterSiswa,
  MasterGuru,
  MasterKelas,
  SiswaKelas,
  AbsensiDanNilai,
  KehadiranTutor,
  TutorFeeDisbursement
} from '../src/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const SPREADSHEET_ID = '1UtJ7jmz9uSkyRIIUe4yVSRn1HM_eTQf9yBONt7psp1o';

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [''];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"' && inQuotes && next === '"') {
      row[row.length - 1] += '"';
      i++;
    } else if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') lines.push(row);
  return lines;
}

// Initial fallback/default state
const defaultState: DatabaseState = {
  master_siswa: [],
  master_guru: [],
  master_kelas: [],
  siswa_kelas: [],
  absensi_dan_nilai: [],
  kehadiran_tutor: [],
  fee_disbursements: [],
  config: {
    sheetId: SPREADSHEET_ID,
    appsScriptUrl: '',
    standardFeePerSession: 125000,
    lastSyncedAt: new Date().toISOString()
  }
};

class DataStore {
  private state: DatabaseState = { ...defaultState };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(raw);
      } catch (e) {
        console.error('Error reading db file, using defaults', e);
      }
    }

    // If master data is empty, trigger a background initial sync
    if (this.state.master_kelas.length === 0 || this.state.siswa_kelas.length === 0) {
      this.syncFromGoogleSheets().catch(err => {
        console.warn('Initial Google Sheets sync warning:', err.message);
      });
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing to database.json', e);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public updateConfig(config: Partial<DatabaseState['config']>) {
    this.state.config = { ...this.state.config, ...config };
    this.save();
    return this.state.config;
  }

  public async syncFromGoogleSheets(): Promise<{ success: boolean; message: string; rows: number }> {
    const sheetId = this.state.config.sheetId || SPREADSHEET_ID;
    const appsScriptUrl = this.state.config.appsScriptUrl;

    // 1. If Apps Script URL is set, try fetching complete state from Apps Script
    if (appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com')) {
      try {
        const res = await fetch(appsScriptUrl + '?action=all', { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' || json.master_kelas) {
            if (Array.isArray(json.master_siswa) && json.master_siswa.length) this.state.master_siswa = json.master_siswa;
            if (Array.isArray(json.master_guru) && json.master_guru.length) this.state.master_guru = json.master_guru;
            if (Array.isArray(json.master_kelas) && json.master_kelas.length) this.state.master_kelas = json.master_kelas;
            if (Array.isArray(json.siswa_kelas) && json.siswa_kelas.length) this.state.siswa_kelas = json.siswa_kelas;
            if (Array.isArray(json.absensi_dan_nilai)) {
              // Merge existing logs with sheet logs
              const map = new Map<string, AbsensiDanNilai>();
              this.state.absensi_dan_nilai.forEach(item => map.set(item.id_log, item));
              json.absensi_dan_nilai.forEach((item: AbsensiDanNilai) => {
                if (item.id_log) map.set(item.id_log, item);
              });
              this.state.absensi_dan_nilai = Array.from(map.values());
            }
            if (Array.isArray(json.kehadiran_tutor)) {
              const pmap = new Map<string, KehadiranTutor>();
              this.state.kehadiran_tutor.forEach(item => pmap.set(item.id_presensi_tutor, item));
              json.kehadiran_tutor.forEach((item: KehadiranTutor) => {
                if (item.id_presensi_tutor) pmap.set(item.id_presensi_tutor, item);
              });
              this.state.kehadiran_tutor = Array.from(pmap.values());
            }
            this.state.config.lastSyncedAt = new Date().toISOString();
            this.save();
            return {
              success: true,
              message: 'Berhasil sinkronisasi dari Google Apps Script Web App',
              rows: this.state.siswa_kelas.length
            };
          }
        }
      } catch (err: any) {
        console.warn('Apps Script sync attempt failed, falling back to direct Sheet CSV:', err.message);
      }
    }

    // 2. Fetch directly from Google Sheets gviz CSV
    try {
      const sheetsToFetch = ['master_siswa', 'master_guru', 'master_kelas', 'siswa_kelas'];
      for (const sheetName of sheetsToFetch) {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const csvText = await res.text();
        const parsed = parseCSV(csvText);
        if (parsed.length <= 1) continue;

        const rawHeaders = parsed[0].map(h => h.trim());

        if (sheetName === 'master_guru') {
          const items: MasterGuru[] = [];
          for (let i = 1; i < parsed.length; i++) {
            const row = parsed[i];
            const id_tutor = row[0]?.trim();
            const guru = row[1]?.trim();
            const status = row[2]?.trim() || 'active';
            if (guru && id_tutor) {
              items.push({ id_tutor, guru, status });
            }
          }
          if (items.length) this.state.master_guru = items;
        } else if (sheetName === 'master_kelas') {
          const items: MasterKelas[] = [];
          for (let i = 1; i < parsed.length; i++) {
            const row = parsed[i];
            const id_kelas = row[0]?.trim();
            const kelas = row[1]?.trim();
            const mapel = row[2]?.trim();
            const hari = row[3]?.trim();
            const waktu = row[4]?.trim();
            const guru = row[5]?.trim();
            const tempat = row[6]?.trim() || 'Ruang Kelas';
            if (id_kelas && kelas) {
              items.push({ id_kelas, kelas, mapel, hari, waktu, guru, tempat });
            }
          }
          if (items.length) this.state.master_kelas = items;
        } else if (sheetName === 'master_siswa') {
          const items: MasterSiswa[] = [];
          const idxSiswa = rawHeaders.indexOf('siswa');
          const idxEmail = rawHeaders.indexOf('email_siswa');
          const idxKelasAsli = rawHeaders.indexOf('kelas_asli');
          const idxGender = rawHeaders.indexOf('gender');
          const idxCount = rawHeaders.indexOf('count_ekskul');

          for (let i = 1; i < parsed.length; i++) {
            const row = parsed[i];
            const siswa = (idxSiswa !== -1 ? row[idxSiswa] : row[1])?.trim();
            const email_siswa = (idxEmail !== -1 ? row[idxEmail] : row[2])?.trim();
            const kelas_asli = (idxKelasAsli !== -1 ? row[idxKelasAsli] : row[0])?.trim();
            const gender = (idxGender !== -1 ? row[idxGender] : row[4])?.trim();
            const count_ekskul = idxCount !== -1 ? row[idxCount]?.trim() : '1';
            if (siswa) {
              items.push({ siswa, email_siswa: email_siswa || '', kelas_asli, gender, count_ekskul });
            }
          }
          if (items.length) this.state.master_siswa = items;
        } else if (sheetName === 'siswa_kelas') {
          const items: SiswaKelas[] = [];
          for (let i = 1; i < parsed.length; i++) {
            const row = parsed[i];
            const id_kelas = row[0]?.trim();
            const siswa = row[1]?.trim();
            const email_siswa = row[2]?.trim() || '';
            const kelas = row[3]?.trim();
            const mapel = row[4]?.trim();
            const hari = row[5]?.trim();
            const waktu = row[6]?.trim();
            const guru = row[7]?.trim();
            const lokasi = row[8]?.trim();
            const kelas_asli = row[9]?.trim();
            const gender = row[10]?.trim();
            if (id_kelas && siswa) {
              items.push({
                id_kelas,
                siswa,
                email_siswa,
                kelas: kelas || id_kelas,
                mapel: mapel || '',
                hari: hari || '',
                waktu: waktu || '',
                guru: guru || '',
                lokasi,
                kelas_asli,
                gender
              });
            }
          }
          if (items.length) this.state.siswa_kelas = items;
        }
      }

      // Seed initial sample attendance if absensi_dan_nilai is empty so UI is immediately active
      if (this.state.absensi_dan_nilai.length === 0 && this.state.siswa_kelas.length > 0) {
        this.seedInitialAttendance();
      }

      this.state.config.lastSyncedAt = new Date().toISOString();
      this.save();
      return {
        success: true,
        message: 'Berhasil sinkronisasi langsung dari Google Sheets (CSV Export)',
        rows: this.state.siswa_kelas.length
      };
    } catch (e: any) {
      console.error('Error during Google Sheets direct sync', e);
      return { success: false, message: e.message || 'Gagal sinkronisasi', rows: 0 };
    }
  }

  private seedInitialAttendance() {
    const sampleDates = ['2026-10-26', '2026-11-02'];
    const logs: AbsensiDanNilai[] = [];
    const tutorPresences: KehadiranTutor[] = [];

    // Take first 3 classes to seed
    const classes = this.state.master_kelas.slice(0, 4);
    for (const cls of classes) {
      const students = this.state.siswa_kelas.filter(s => s.id_kelas === cls.id_kelas);
      const tutor = this.state.master_guru.find(g => g.guru === cls.guru);

      for (const date of sampleDates) {
        // Tutor presence
        tutorPresences.push({
          id_presensi_tutor: `PRES-${cls.id_kelas}-${date}`,
          tanggal: date,
          id_tutor: tutor?.id_tutor || 'TUTOR-001',
          guru: cls.guru,
          id_kelas: cls.id_kelas,
          status_hadir: 'Hadir',
          jam_mulai: cls.waktu.split('-')[0]?.trim() || '16:00',
          jam_selesai: cls.waktu.split('-')[1]?.trim() || '17:30',
          keterangan: 'Materi pengenalan dasar & praktek modul 1 terlaksana dengan baik.'
        });

        // Student attendance
        students.forEach((s, idx) => {
          const statuses: Array<'Hadir' | 'Izin' | 'Sakit'> = ['Hadir', 'Hadir', 'Hadir', 'Hadir', 'Izin'];
          const status = statuses[idx % statuses.length];
          const score = status === 'Hadir' ? 80 + ((idx * 7) % 20) : null;
          logs.push({
            id_log: `LOG-${cls.id_kelas}-${date}-${idx + 1}`,
            tanggal: date,
            id_kelas: cls.id_kelas,
            kelas: cls.kelas,
            mapel: cls.mapel,
            id_tutor: tutor?.id_tutor || 'TUTOR-001',
            guru: cls.guru,
            siswa: s.siswa,
            status_kehadiran: status,
            nilai: score,
            catatan: status === 'Hadir' ? 'Sangat aktif dan memahami materi pembelajaran.' : 'Izin ada keperluan keluarga.',
            created_at: new Date(date).toISOString()
          });
        });
      }
    }

    this.state.absensi_dan_nilai = logs;
    this.state.kehadiran_tutor = tutorPresences;
  }

  // Attendance CRUD
  public async addAttendanceLogs(newLogs: AbsensiDanNilai[]): Promise<number> {
    // Check if logs already exist for same student, class, and date; if so, replace/update
    for (const log of newLogs) {
      const existingIdx = this.state.absensi_dan_nilai.findIndex(
        l => l.id_kelas === log.id_kelas && l.tanggal === log.tanggal && l.siswa === log.siswa
      );
      if (existingIdx !== -1) {
        this.state.absensi_dan_nilai[existingIdx] = { ...this.state.absensi_dan_nilai[existingIdx], ...log };
      } else {
        this.state.absensi_dan_nilai.unshift(log);
      }
    }
    this.save();

    // Async push to Apps Script if configured
    this.pushToAppsScript({
      action: 'saveAttendanceAndGrades',
      logs: newLogs
    }).catch(err => console.warn('Push to Apps Script warning:', err.message));

    return newLogs.length;
  }

  public async updateAttendanceLog(log: AbsensiDanNilai): Promise<boolean> {
    const idx = this.state.absensi_dan_nilai.findIndex(l => l.id_log === log.id_log);
    if (idx !== -1) {
      this.state.absensi_dan_nilai[idx] = log;
      this.save();

      this.pushToAppsScript({
        action: 'updateAttendanceLog',
        log
      }).catch(err => console.warn('Push update to Apps Script warning:', err.message));

      return true;
    }
    return false;
  }

  public async deleteAttendanceLog(id_log: string): Promise<boolean> {
    const idx = this.state.absensi_dan_nilai.findIndex(l => l.id_log === id_log);
    if (idx !== -1) {
      this.state.absensi_dan_nilai.splice(idx, 1);
      this.save();

      this.pushToAppsScript({
        action: 'deleteAttendanceLog',
        id_log
      }).catch(err => console.warn('Push delete to Apps Script warning:', err.message));

      return true;
    }
    return false;
  }

  // Tutor Presence CRUD
  public async addOrUpdateTutorPresence(presence: KehadiranTutor): Promise<boolean> {
    const idx = this.state.kehadiran_tutor.findIndex(
      p => (presence.id_presensi_tutor && p.id_presensi_tutor === presence.id_presensi_tutor) ||
           (p.id_kelas === presence.id_kelas && p.tanggal === presence.tanggal && p.id_tutor === presence.id_tutor)
    );
    if (idx !== -1) {
      this.state.kehadiran_tutor[idx] = presence;
    } else {
      this.state.kehadiran_tutor.unshift(presence);
    }
    this.save();

    this.pushToAppsScript({
      action: 'saveTutorPresence',
      presence
    }).catch(err => console.warn('Push tutor presence to Apps Script warning:', err.message));

    return true;
  }

  public async deleteTutorPresence(id_presensi_tutor: string): Promise<boolean> {
    const idx = this.state.kehadiran_tutor.findIndex(p => p.id_presensi_tutor === id_presensi_tutor);
    if (idx !== -1) {
      this.state.kehadiran_tutor.splice(idx, 1);
      this.save();

      this.pushToAppsScript({
        action: 'deleteTutorPresence',
        id_presensi_tutor
      }).catch(err => console.warn('Push delete tutor presence warning:', err.message));

      return true;
    }
    return false;
  }

  // Tutor Fee Payout
  public updateFeeDisbursement(item: TutorFeeDisbursement) {
    if (!this.state.fee_disbursements) {
      this.state.fee_disbursements = [];
    }
    const idx = this.state.fee_disbursements.findIndex(d => d.id_disbursement === item.id_disbursement);
    if (idx !== -1) {
      this.state.fee_disbursements[idx] = item;
    } else {
      this.state.fee_disbursements.unshift(item);
    }
    this.save();
    return item;
  }

  // Remote forwarder helper
  private async pushToAppsScript(payload: any) {
    const url = this.state.config.appsScriptUrl;
    if (!url || !url.startsWith('https://script.google.com')) return;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e: any) {
      console.warn('Apps Script forward failed:', e.message);
    }
  }
}

export const dataStore = new DataStore();
