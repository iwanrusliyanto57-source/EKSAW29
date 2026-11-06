export interface MasterSiswa {
  siswa: string;
  email_siswa: string;
  kelas_asli?: string;
  gender?: string;
  count_ekskul?: number | string;
}

export interface MasterGuru {
  id_tutor: string;
  guru: string;
  status: 'active' | 'inactive' | string;
}

export interface MasterKelas {
  id_kelas: string;
  kelas: string;
  mapel: string;
  hari: string;
  waktu: string;
  guru: string;
  tempat: string; // or lokasi
}

export interface SiswaKelas {
  id_kelas: string;
  siswa: string;
  email_siswa: string;
  kelas: string;
  mapel: string;
  hari: string;
  waktu: string;
  guru: string;
  lokasi?: string;
  kelas_asli?: string;
  gender?: string;
}

export type KehadiranStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';

export interface AbsensiDanNilai {
  id_log: string;
  tanggal: string; // YYYY-MM-DD
  id_kelas: string;
  kelas: string;
  mapel: string;
  id_tutor: string;
  guru: string;
  siswa: string;
  status_kehadiran: KehadiranStatus;
  nilai: number | null; // 0 - 100
  catatan: string;
  created_at: string;
}

export type TutorStatusHadir = 'Hadir' | 'Izin' | 'Sakit' | 'Digantikan';

export interface KehadiranTutor {
  id_presensi_tutor: string;
  tanggal: string; // YYYY-MM-DD
  id_tutor: string;
  guru: string;
  id_kelas: string;
  status_hadir: TutorStatusHadir;
  jam_mulai: string;
  jam_selesai: string;
  keterangan: string;
}

export interface TutorFeeDisbursement {
  id_disbursement: string;
  id_tutor: string;
  guru: string;
  bulan: string; // e.g., '2026-11' or 'November 2026'
  total_pertemuan: number;
  rate_per_sesi: number;
  total_honor: number;
  status: 'Draft' | 'Disetujui' | 'Ditransfer';
  tanggal_pencairan?: string;
  catatan?: string;
}

export interface DatabaseState {
  master_siswa: MasterSiswa[];
  master_guru: MasterGuru[];
  master_kelas: MasterKelas[];
  siswa_kelas: SiswaKelas[];
  absensi_dan_nilai: AbsensiDanNilai[];
  kehadiran_tutor: KehadiranTutor[];
  fee_disbursements?: TutorFeeDisbursement[];
  config: {
    sheetId: string;
    appsScriptUrl: string;
    standardFeePerSession: number;
    lastSyncedAt?: string;
  };
}

export type UserRole = 'tutor' | 'siswa' | 'admin';

export interface AuthSession {
  role: UserRole;
  name: string;
  id?: string;
  email?: string;
}
