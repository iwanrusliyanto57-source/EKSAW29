import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MasterKelas } from '../../types';
import { AttendanceInputModal } from './AttendanceInputModal';
import { TutorPresenceModal } from './TutorPresenceModal';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  PlusCircle,
  UserCheck,
  ChevronRight,
  BookOpen,
  CheckCircle,
  CalendarDays,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface TutorDashboardProps {
  onGoToRecap: () => void;
}

export const TutorDashboard: React.FC<TutorDashboardProps> = ({ onGoToRecap }) => {
  const { data, auth } = useApp();
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<MasterKelas | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState<boolean>(false);
  const [isPresenceModalOpen, setIsPresenceModalOpen] = useState<boolean>(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRosterClassId, setExpandedRosterClassId] = useState<string | null>(null);

  const tutorName = auth?.name || '';
  const myClasses = (data?.master_kelas || []).filter(
    k => k.guru.toLowerCase() === tutorName.toLowerCase()
  );

  const myStudents = (data?.siswa_kelas || []).filter(
    s => s.guru.toLowerCase() === tutorName.toLowerCase()
  );

  // Unique student count & gender breakdown
  const uniqueStudentNames = Array.from(new Set(myStudents.map(s => s.siswa)));
  const uniqueStudents = uniqueStudentNames.length;
  const ikhwanCount = myStudents.filter(s => (s.gender || '').toUpperCase().includes('IKHWAN')).length;
  const akhwatCount = myStudents.filter(s => (s.gender || '').toUpperCase().includes('AKHWAT')).length;

  // Logs recorded by this tutor
  const myLogs = (data?.absensi_dan_nilai || []).filter(
    l => l.guru.toLowerCase() === tutorName.toLowerCase()
  );

  // Tutor presence records
  const myPresences = (data?.kehadiran_tutor || []).filter(
    p => p.guru.toLowerCase() === tutorName.toLowerCase()
  );

  // Filter classes by day and search query
  const filteredClasses = myClasses.filter(cls => {
    if (selectedDayFilter !== 'all' && cls.hari.toUpperCase() !== selectedDayFilter.toUpperCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        cls.kelas.toLowerCase().includes(q) ||
        cls.mapel.toLowerCase().includes(q) ||
        cls.tempat.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAttendance = (cls?: MasterKelas) => {
    setSelectedClassForAttendance(cls || myClasses[0] || null);
    setIsAttendanceModalOpen(true);
  };

  const toggleRoster = (classId: string) => {
    setExpandedRosterClassId(prev => (prev === classId ? null : classId));
  };

  const daysList = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

  return (
    <div className="space-y-6">
      {/* Al-Wildan Tutor Profile Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-5 sm:p-7 shadow-md border border-blue-900/50">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <img
              src="/assets/aistudio/AL-WILDAN_ISLAMIC_SCHOOL__1__98f2aca5.png"
              alt="Logo Al-Wildan"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-contain p-1 bg-white shrink-0 shadow-md border-2 border-orange-500"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-blue-200">
                <span className="font-semibold tracking-wide text-orange-400 uppercase">
                  AL-WILDAN ISLAMIC SCHOOL 29 KOTA DEPOK
                </span>
                <span>·</span>
                <span className="font-mono text-emerald-300 font-bold">{auth?.id || 'TUTOR AW29'}</span>
              </div>
              <div className="text-[11px] text-blue-300/80 font-serif italic">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ · Assalamu'alaikum Warahmatullahi Wabarakatuh
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Ustadz / Tutor {tutorName}
              </h1>
              <p className="text-xs text-blue-100/90 max-w-xl">
                Sistem Manajemen Presensi, Penilaian Perkembangan & Honorarium Ekstrakurikuler Al-Wildan 29.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setIsPresenceModalOpen(true)}
              className="px-3.5 py-2.5 text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-400/40 rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <UserCheck className="w-4 h-4 text-emerald-200" />
              <span>Presensi Mengajar</span>
            </button>
            <button
              onClick={() => handleOpenAttendance()}
              className="px-4 py-2.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Input Nilai & Presensi</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative Islamic geometric circle */}
        <div className="absolute -right-12 -bottom-12 w-60 h-60 rounded-full bg-white/5 pointer-events-none border border-white/10" />
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500">Kelas Diampu</span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {myClasses.length}
          </div>
          <span className="text-[11px] font-medium text-blue-700 block">Jadwal Rombel Aktif</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500">Total Siswa Binaan</span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {uniqueStudents}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {ikhwanCount > 0 ? `${ikhwanCount} Ikhwan` : ''} {akhwatCount > 0 ? `· ${akhwatCount} Akhwat` : ''}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500">Log Evaluasi Siswa</span>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono tabular-nums">
            {myLogs.length}
          </div>
          <span className="text-[11px] font-medium text-emerald-700 block">Tercatat di Google Sheets</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500">Sesi Mengajar Tutor</span>
          <div className="text-2xl sm:text-3xl font-bold text-orange-600 font-mono tabular-nums">
            {myPresences.length}
          </div>
          <span className="text-[11px] font-medium text-orange-700 block">Presensi Kehadiran Guru</span>
        </div>
      </div>

      {/* Assigned Classes Section with Day Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Jadwal Kelas Ekstrakurikuler Al-Wildan 29
            </h2>
            <p className="text-xs text-slate-500">
              Pilih rombel untuk input presensi harian dan evaluasi materi
            </p>
          </div>
          <button
            onClick={onGoToRecap}
            className="self-start sm:self-auto text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Buka Rekapitulasi Lengkap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Filter Toolbar: Day filter + Search */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Day segmented tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedDayFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                selectedDayFilter === 'all'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua Hari ({myClasses.length})
            </button>
            {daysList.map(d => {
              const count = myClasses.filter(c => c.hari.toUpperCase() === d).length;
              if (count === 0) return null;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDayFilter(d)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    selectedDayFilter === d
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {d} ({count})
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Cari kelas / ruangan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {filteredClasses.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">
              Tidak Ada Kelas Ditemukan
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ada jadwal kelas untuk filter yang dipilih. Silakan pilih "Semua Hari" atau periksa pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map((cls) => {
              const studentsInClass = myStudents.filter(s => s.id_kelas === cls.id_kelas);
              const logsInClass = myLogs.filter(l => l.id_kelas === cls.id_kelas);
              const latestDate = logsInClass[0]?.tanggal;
              const isRosterExpanded = expandedRosterClassId === cls.id_kelas;

              return (
                <div
                  key={cls.id_kelas}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                        {cls.id_kelas}
                      </span>
                      <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-200">
                        {cls.mapel}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {cls.kelas}
                    </h3>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-800">{cls.hari}</span>
                        <span>·</span>
                        <span className="font-mono text-slate-700">{cls.waktu}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">{cls.tempat}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span><strong>{studentsInClass.length}</strong> Siswa Terdaftar</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleRoster(cls.id_kelas)}
                          className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-0.5"
                        >
                          <span>{isRosterExpanded ? 'Tutup Roster' : 'Lihat Siswa'}</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${isRosterExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Student Roster */}
                    {isRosterExpanded && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 max-h-48 overflow-y-auto">
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                          Daftar Nama Siswa:
                        </span>
                        {studentsInClass.length === 0 ? (
                          <div className="text-slate-400 text-center py-2">Belum ada siswa</div>
                        ) : (
                          <ol className="list-decimal list-inside space-y-1 text-slate-700">
                            {studentsInClass.map((st, i) => (
                              <li key={i} className="truncate">
                                <span className="font-semibold">{st.siswa}</span>
                                <span className="text-slate-400 text-[10px] ml-1">({st.kelas_asli || 'Reguler'})</span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {latestDate ? `Sesi: ${latestDate}` : 'Belum ada input'}
                    </span>
                    <button
                      onClick={() => handleOpenAttendance(cls)}
                      className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 active:scale-95 shadow-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-orange-300" />
                      <span>Input Absen</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Presences by Tutor */}
      {myPresences.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Riwayat Presensi Mengajar Ustadz / Tutor
              </h3>
              <p className="text-xs text-slate-500">
                Catatan jam mengajar untuk dasar pencairan honorarium bulanan
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {myPresences.length} Sesi Terdata
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {myPresences.slice(0, 4).map((p, i) => (
              <div key={p.id_presensi_tutor || i} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-semibold text-slate-900">
                    Kelas {p.id_kelas} ({p.tanggal})
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Waktu: {p.jam_mulai} - {p.jam_selesai} WIB · {p.keterangan}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                    p.status_hadir === 'Hadir' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {p.status_hadir}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AttendanceInputModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        selectedClass={selectedClassForAttendance}
      />

      <TutorPresenceModal
        isOpen={isPresenceModalOpen}
        onClose={() => setIsPresenceModalOpen(false)}
        selectedClass={selectedClassForAttendance}
      />
    </div>
  );
};
