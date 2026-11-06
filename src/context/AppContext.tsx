import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DatabaseState,
  AuthSession,
  AbsensiDanNilai,
  KehadiranTutor,
  TutorFeeDisbursement,
  UserRole
} from '../types';

interface AppContextType {
  data: DatabaseState | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  auth: AuthSession | null;
  login: (role: UserRole, identifier: string, password?: string) => { success: boolean; message: string };
  logout: () => void;
  syncData: () => Promise<void>;
  saveAttendanceLogs: (logs: AbsensiDanNilai[]) => Promise<boolean>;
  updateAttendanceLog: (log: AbsensiDanNilai) => Promise<boolean>;
  deleteAttendanceLog: (id_log: string) => Promise<boolean>;
  saveTutorPresence: (presence: KehadiranTutor) => Promise<boolean>;
  deleteTutorPresence: (id_presensi_tutor: string) => Promise<boolean>;
  updateFeeDisbursement: (item: TutorFeeDisbursement) => Promise<boolean>;
  updateConfig: (config: Partial<DatabaseState['config']>) => Promise<boolean>;
  generateAiInsights: (params: {
    className: string;
    subject: string;
    tutorName: string;
    attendanceRate: number;
    avgGrade: number;
    topStudents: string[];
    studentNotes: string[];
    month: string;
  }) => Promise<{ insight: string; source: string }>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DatabaseState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Initial Auth state restored from localStorage if available
  const [auth, setAuth] = useState<AuthSession | null>(() => {
    try {
      const saved = localStorage.getItem('ekskul_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Gagal memuat data dari server');
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const syncData = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/sync', { method: 'POST' });
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
        showToast(json.result?.message || 'Data Google Sheets berhasil disinkronkan!', 'success');
      } else {
        throw new Error(json.message || 'Gagal sinkronisasi');
      }
    } catch (err: any) {
      showToast('Gagal sinkron: ' + err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const login = (role: UserRole, identifier: string, password?: string): { success: boolean; message: string } => {
    if (!data) return { success: false, message: 'Data belum siap' };

    if (role === 'admin') {
      if (password === 'admin123' || password === 'ekskulaw2901234') {
        const session: AuthSession = { role: 'admin', name: 'Administrator LMS', id: 'admin-01' };
        setAuth(session);
        localStorage.setItem('ekskul_auth', JSON.stringify(session));
        showToast('Selamat datang, Administrator!', 'success');
        return { success: true, message: 'Berhasil login sebagai Admin' };
      }
      return { success: false, message: 'Password admin tidak valid (coba: admin123)' };
    }

    if (role === 'tutor') {
      if (!identifier) return { success: false, message: 'Pilih nama tutor' };
      if (password !== 'ekskulaw2901234') {
        return { success: false, message: 'Password salah! Default: ekskulaw2901234' };
      }
      const tutor = data.master_guru.find(g => g.guru.toLowerCase() === identifier.toLowerCase());
      const session: AuthSession = {
        role: 'tutor',
        name: tutor ? tutor.guru : identifier,
        id: tutor?.id_tutor || 'TUTOR'
      };
      setAuth(session);
      localStorage.setItem('ekskul_auth', JSON.stringify(session));
      showToast(`Selamat datang, ${session.name}!`, 'success');
      return { success: true, message: 'Login berhasil' };
    }

    if (role === 'siswa') {
      if (!identifier) return { success: false, message: 'Pilih nama atau email siswa' };
      const s = data.master_siswa.find(
        st => st.siswa.toLowerCase() === identifier.toLowerCase() || st.email_siswa.toLowerCase() === identifier.toLowerCase()
      );
      const session: AuthSession = {
        role: 'siswa',
        name: s ? s.siswa : identifier,
        email: s?.email_siswa || ''
      };
      setAuth(session);
      localStorage.setItem('ekskul_auth', JSON.stringify(session));
      showToast(`Selamat datang, ${session.name}!`, 'success');
      return { success: true, message: 'Login berhasil' };
    }

    return { success: false, message: 'Role tidak dikenal' };
  };

  const logout = () => {
    setAuth(null);
    localStorage.removeItem('ekskul_auth');
    showToast('Anda telah keluar.', 'info');
  };

  const saveAttendanceLogs = async (logs: AbsensiDanNilai[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/absensi/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
        showToast(`Berhasil menyimpan ${logs.length} data presensi & nilai!`, 'success');
        return true;
      }
      throw new Error(json.message);
    } catch (err: any) {
      showToast('Gagal menyimpan: ' + err.message, 'error');
      return false;
    }
  };

  const updateAttendanceLog = async (log: AbsensiDanNilai): Promise<boolean> => {
    try {
      const res = await fetch(`/api/absensi/${encodeURIComponent(log.id_log)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
        showToast('Data presensi berhasil diperbarui.', 'success');
        return true;
      }
      throw new Error(json.message);
    } catch (err: any) {
      showToast('Gagal update: ' + err.message, 'error');
      return false;
    }
  };

  const deleteAttendanceLog = async (id_log: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/absensi/${encodeURIComponent(id_log)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
        showToast('Data presensi berhasil dihapus.', 'info');
        return true;
      }
      throw new Error(json.message);
    } catch (err: any) {
      showToast('Gagal menghapus: ' + err.message, 'error');
      return false;
    }
  };

  const saveTutorPresence = async (presence: KehadiranTutor): Promise<boolean> => {
    try {
      const res = await fetch('/api/tutor-presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presence)
      });
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
        showToast('Presensi tutor berhasil dicatat!', 'success');
        return true;
      }
      throw new Error(json.message);
    } catch (err: any) {
      showToast('Gagal presensi tutor: ' + err.message, 'error');
      return false;
    }
  };

  const deleteTutorPresence = async (id_presensi_tutor: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tutor-presence/${encodeURIComponent(id_presensi_tutor)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
        showToast('Presensi tutor berhasil dihapus.', 'info');
        return true;
      }
      throw new Error(json.message);
    } catch (err: any) {
      showToast('Gagal menghapus presensi tutor: ' + err.message, 'error');
      return false;
    }
  };

  const updateFeeDisbursement = async (item: TutorFeeDisbursement): Promise<boolean> => {
    try {
      const res = await fetch('/api/fee-disbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
        showToast(`Status honor ${item.guru} diperbarui: ${item.status}`, 'success');
        return true;
      }
      throw new Error(json.message);
    } catch (err: any) {
      showToast('Gagal update honor: ' + err.message, 'error');
      return false;
    }
  };

  const updateConfig = async (config: Partial<DatabaseState['config']>): Promise<boolean> => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
        showToast('Pengaturan Google Sheets berhasil disimpan!', 'success');
        return true;
      }
      throw new Error(json.message);
    } catch (err: any) {
      showToast('Gagal menyimpan config: ' + err.message, 'error');
      return false;
    }
  };

  const generateAiInsights = async (params: {
    className: string;
    subject: string;
    tutorName: string;
    attendanceRate: number;
    avgGrade: number;
    topStudents: string[];
    studentNotes: string[];
    month: string;
  }) => {
    const res = await fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const json = await res.json();
    if (json.status === 'success') {
      return { insight: json.insight, source: json.source };
    }
    throw new Error(json.message || 'Gagal menghasilkan insight');
  };

  return (
    <AppContext.Provider
      value={{
        data,
        loading,
        syncing,
        error,
        toast,
        auth,
        login,
        logout,
        syncData,
        saveAttendanceLogs,
        updateAttendanceLog,
        deleteAttendanceLog,
        saveTutorPresence,
        deleteTutorPresence,
        updateFeeDisbursement,
        updateConfig,
        generateAiInsights,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
