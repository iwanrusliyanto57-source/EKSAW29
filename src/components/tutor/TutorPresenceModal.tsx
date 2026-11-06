import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MasterKelas, KehadiranTutor, TutorStatusHadir } from '../../types';
import { X, CheckCircle2, Clock, Calendar, FileText } from 'lucide-react';

interface TutorPresenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass?: MasterKelas | null;
}

export const TutorPresenceModal: React.FC<TutorPresenceModalProps> = ({
  isOpen,
  onClose,
  selectedClass
}) => {
  const { data, auth, saveTutorPresence } = useApp();
  const tutorClasses = (data?.master_kelas || []).filter(
    k => k.guru.toLowerCase() === (auth?.name || '').toLowerCase()
  );

  const [idKelas, setIdKelas] = useState<string>(selectedClass?.id_kelas || (tutorClasses[0]?.id_kelas || ''));
  const [tanggal, setTanggal] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [statusHadir, setStatusHadir] = useState<TutorStatusHadir>('Hadir');
  const [jamMulai, setJamMulai] = useState<string>('16:00');
  const [jamSelesai, setJamSelesai] = useState<string>('17:30');
  const [keterangan, setKeterangan] = useState<string>('Materi pengajaran dan evaluasi praktik terlaksana dengan tertib.');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const presence: KehadiranTutor = {
      id_presensi_tutor: `PRES-${idKelas}-${tanggal}-${Date.now().toString().slice(-4)}`,
      tanggal,
      id_tutor: auth?.id || 'TUTOR',
      guru: auth?.name || '',
      id_kelas: idKelas,
      status_hadir: statusHadir,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
      keterangan
    };

    const ok = await saveTutorPresence(presence);
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Presensi Kehadiran Tutor
            </h2>
            <p className="text-xs text-slate-500">
              Catatan sesi mengajar untuk verifikasi honor & absensi tutor
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Kelas yang Diajar
            </label>
            <select
              value={idKelas}
              onChange={e => setIdKelas(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              {tutorClasses.map(k => (
                <option key={k.id_kelas} value={k.id_kelas}>
                  {k.kelas} - {k.mapel} ({k.hari}, {k.waktu})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tanggal Sesi
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Status Mengajar
              </label>
              <select
                value={statusHadir}
                onChange={e => setStatusHadir(e.target.value as TutorStatusHadir)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="Hadir">Hadir</option>
                <option value="Izin">Izin (Reschedule)</option>
                <option value="Sakit">Sakit</option>
                <option value="Digantikan">Digantikan Guru Pengganti</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Jam Mulai
              </label>
              <input
                type="text"
                placeholder="16:00"
                value={jamMulai}
                onChange={e => setJamMulai(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Jam Selesai
              </label>
              <input
                type="text"
                placeholder="17:30"
                value={jamSelesai}
                onChange={e => setJamSelesai(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Rangkuman Materi & Catatan Mengajar
            </label>
            <textarea
              rows={3}
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
              placeholder="Jelaskan topik yang diajarkan, penguasaan siswa, atau kendala..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Menyimpan...' : 'Kirim Presensi Mengajar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
