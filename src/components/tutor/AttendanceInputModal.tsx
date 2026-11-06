import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { MasterKelas, AbsensiDanNilai, KehadiranStatus } from '../../types';
import { X, Calendar, Clock, MapPin, Users, CheckCheck, Sparkles, AlertCircle } from 'lucide-react';

interface AttendanceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass?: MasterKelas | null;
}

export const AttendanceInputModal: React.FC<AttendanceInputModalProps> = ({
  isOpen,
  onClose,
  selectedClass
}) => {
  const { data, auth, saveAttendanceLogs } = useApp();
  const [currentClassId, setCurrentClassId] = useState<string>(selectedClass?.id_kelas || '');
  const [tanggal, setTanggal] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isRescheduled, setIsRescheduled] = useState<boolean>(false);
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Filter classes belonging to this tutor
  const tutorClasses = (data?.master_kelas || []).filter(
    k => k.guru.toLowerCase() === (auth?.name || '').toLowerCase()
  );

  useEffect(() => {
    if (selectedClass) {
      setCurrentClassId(selectedClass.id_kelas);
    } else if (tutorClasses.length > 0 && !currentClassId) {
      setCurrentClassId(tutorClasses[0].id_kelas);
    }
  }, [selectedClass, tutorClasses]);

  const activeClass = (data?.master_kelas || []).find(k => k.id_kelas === currentClassId);
  const enrolledStudents = (data?.siswa_kelas || []).filter(s => s.id_kelas === currentClassId);

  // Local state for each student row
  interface StudentEntry {
    siswa: string;
    email_siswa: string;
    status: KehadiranStatus;
    nilai: string;
    catatan: string;
  }

  const [entries, setEntries] = useState<Record<string, StudentEntry>>({});

  // Reset or fill entries when class or date changes
  useEffect(() => {
    if (!currentClassId || enrolledStudents.length === 0) return;

    // Check if logs already exist for this class & date in database
    const existingLogs = (data?.absensi_dan_nilai || []).filter(
      l => l.id_kelas === currentClassId && l.tanggal === tanggal
    );

    const initialMap: Record<string, StudentEntry> = {};
    enrolledStudents.forEach(s => {
      const existing = existingLogs.find(l => l.siswa === s.siswa);
      initialMap[s.siswa] = {
        siswa: s.siswa,
        email_siswa: s.email_siswa,
        status: existing ? existing.status_kehadiran : 'Hadir',
        nilai: existing && existing.nilai !== null ? String(existing.nilai) : '85',
        catatan: existing ? existing.catatan : ''
      };
    });
    setEntries(initialMap);
  }, [currentClassId, tanggal, data?.absensi_dan_nilai]);

  if (!isOpen) return null;

  const handleStatusChange = (siswa: string, status: KehadiranStatus) => {
    setEntries(prev => ({
      ...prev,
      [siswa]: { ...prev[siswa], status }
    }));
  };

  const handleScoreChange = (siswa: string, nilai: string) => {
    setEntries(prev => ({
      ...prev,
      [siswa]: { ...prev[siswa], nilai }
    }));
  };

  const handleNoteChange = (siswa: string, catatan: string) => {
    setEntries(prev => ({
      ...prev,
      [siswa]: { ...prev[siswa], catatan }
    }));
  };

  const setAllStatus = (status: KehadiranStatus) => {
    setEntries(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        updated[k] = { ...updated[k], status };
      });
      return updated;
    });
  };

  const setAllScores = (score: string) => {
    setEntries(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        updated[k] = { ...updated[k], nilai: score };
      });
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;

    setSubmitting(true);
    const logsToSave: AbsensiDanNilai[] = Object.values(entries).map((entry, idx) => {
      let finalNote = entry.catatan;
      if (isRescheduled && rescheduleReason) {
        finalNote = finalNote ? `[Jadwal Pengganti: ${rescheduleReason}] ${finalNote}` : `[Jadwal Pengganti: ${rescheduleReason}]`;
      }

      return {
        id_log: `LOG-${activeClass.id_kelas}-${tanggal}-${idx + 1}-${Date.now().toString().slice(-4)}`,
        tanggal,
        id_kelas: activeClass.id_kelas,
        kelas: activeClass.kelas,
        mapel: activeClass.mapel,
        id_tutor: auth?.id || '',
        guru: activeClass.guru,
        siswa: entry.siswa,
        status_kehadiran: entry.status,
        nilai: entry.nilai ? Number(entry.nilai) : null,
        catatan: finalNote,
        created_at: new Date().toISOString()
      };
    });

    const success = await saveAttendanceLogs(logsToSave);
    setSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Input Presensi & Nilai Siswa
            </h2>
            <p className="text-xs text-slate-500">
              Catat kehadiran harian dan evaluasi kompetensi siswa ekstrakurikuler
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Class and Date Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Pilih Kelas Ekstrakurikuler
              </label>
              <select
                value={currentClassId}
                onChange={e => setCurrentClassId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {tutorClasses.map(k => (
                  <option key={k.id_kelas} value={k.id_kelas}>
                    {k.kelas} - {k.mapel} ({k.hari}, {k.waktu})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Tanggal Pertemuan
                </label>
                <button
                  type="button"
                  onClick={() => setIsRescheduled(!isRescheduled)}
                  className="text-[11px] font-medium text-amber-600 hover:text-amber-700 underline"
                >
                  {isRescheduled ? 'Batalkan Reschedule' : '+ Pergeseran Jadwal?'}
                </button>
              </div>
              <input
                type="date"
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            {/* Schedule Shift (Reschedule) banner */}
            {isRescheduled && (
              <div className="col-span-1 sm:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Fitur Pergeseran Jadwal (Kelas Pengganti):</span>
                </div>
                <input
                  type="text"
                  placeholder="Keterangan reschedule (contoh: Mengganti sesi tanggal 20 Oktober karena tutor dinas luar)..."
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Class Metadata Preview */}
          {activeClass && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 px-1">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>{enrolledStudents.length} Siswa Terdaftar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{activeClass.hari}, {activeClass.waktu}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{activeClass.tempat}</span>
              </div>
            </div>
          )}

          {/* Quick Bulk Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs">
            <span className="font-semibold text-blue-900">Aksi Cepat:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAllStatus('Hadir')}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-medium transition-colors"
              >
                Set Semua Hadir
              </button>
              <button
                type="button"
                onClick={() => setAllScores('90')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-medium transition-colors"
              >
                Set Nilai 90
              </button>
              <button
                type="button"
                onClick={() => setAllScores('85')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-medium transition-colors"
              >
                Set Nilai 85
              </button>
            </div>
          </div>

          {/* Students List */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Daftar Siswa ({enrolledStudents.length})
            </div>

            {enrolledStudents.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                Tidak ada siswa yang terdaftar di kelas ini.
              </div>
            ) : (
              enrolledStudents.map((s, idx) => {
                const entry = entries[s.siswa] || {
                  siswa: s.siswa,
                  email_siswa: s.email_siswa,
                  status: 'Hadir',
                  nilai: '85',
                  catatan: ''
                };

                return (
                  <div
                    key={idx}
                    className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-3"
                  >
                    {/* Student Info & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {s.siswa}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{s.kelas_asli || 'Reguler'}</span>
                          <span>·</span>
                          <span>{s.gender || 'Siswa'}</span>
                        </div>
                      </div>

                      {/* Status Buttons */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        {(['Hadir', 'Izin', 'Sakit', 'Alpha'] as KehadiranStatus[]).map(st => {
                          const isSel = entry.status === st;
                          const colorMap = {
                            Hadir: isSel ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600 hover:text-emerald-700',
                            Izin: isSel ? 'bg-amber-500 text-white font-semibold' : 'text-slate-600 hover:text-amber-700',
                            Sakit: isSel ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:text-blue-700',
                            Alpha: isSel ? 'bg-rose-600 text-white font-semibold' : 'text-slate-600 hover:text-rose-700'
                          };

                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(s.siswa, st)}
                              className={`px-2.5 py-1 text-xs rounded-md transition-all ${colorMap[st]}`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Score & Note */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Nilai (0-100)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={entry.nilai}
                          onChange={e => handleScoreChange(s.siswa, e.target.value)}
                          placeholder="85"
                          className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Catatan Perkembangan Siswa
                        </label>
                        <input
                          type="text"
                          value={entry.catatan}
                          onChange={e => handleNoteChange(s.siswa, e.target.value)}
                          placeholder="Contoh: Menguasai teknik dasar dengan sangat baik..."
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Submit */}
          <div className="sticky bottom-0 bg-white pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || enrolledStudents.length === 0}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{submitting ? 'Menyimpan...' : 'Simpan Presensi & Nilai'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
