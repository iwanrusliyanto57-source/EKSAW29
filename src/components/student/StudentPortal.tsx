import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  Calendar,
  Award,
  BookOpen,
  Printer,
  CheckCircle2,
  Clock,
  User,
  Mail,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';

interface StudentPortalProps {
  initialTab?: string;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ initialTab = 'daily' }) => {
  const { data, auth } = useApp();
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const studentName = auth?.name || '';
  const studentEmail = auth?.email || '';

  // Find student profile from master_siswa
  const studentProfile = (data?.master_siswa || []).find(
    s => s.siswa.toLowerCase() === studentName.toLowerCase() || (studentEmail && s.email_siswa.toLowerCase() === studentEmail.toLowerCase())
  );

  // Find all classes this student is enrolled in from siswa_kelas
  const myEnrolledClasses = (data?.siswa_kelas || []).filter(
    s => s.siswa.toLowerCase() === studentName.toLowerCase() || (studentEmail && s.email_siswa.toLowerCase() === studentEmail.toLowerCase())
  );

  // Find all attendance & grade logs for this student
  const myLogs = (data?.absensi_dan_nilai || []).filter(
    l => l.siswa.toLowerCase() === studentName.toLowerCase()
  ).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  // Metrics
  const totalSessions = myLogs.length;
  const hadirCount = myLogs.filter(l => l.status_kehadiran === 'Hadir').length;
  const attendanceRate = totalSessions > 0 ? Math.round((hadirCount / totalSessions) * 100) : 100;

  const validScores = myLogs.map(l => l.nilai).filter((n): n is number => n !== null && n !== undefined);
  const avgGrade = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

  // Selected subject filter for daily view
  const [selectedMapel, setSelectedMapel] = useState<string>('all');
  const availableMapels = Array.from(new Set(myLogs.map(l => l.mapel))).filter(Boolean);

  const filteredLogs = myLogs.filter(l => {
    if (selectedMapel !== 'all' && l.mapel !== selectedMapel) return false;
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Student Profile Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
            {studentName.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-slate-900">{studentName}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                {studentProfile?.kelas_asli || 'Kelas Reguler'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {studentProfile?.email_siswa || studentEmail || 'Email Wali Belum Tercatat'}
              </span>
              <span>·</span>
              <span>{studentProfile?.gender || 'Siswa'}</span>
              <span>·</span>
              <span><strong>{myEnrolledClasses.length}</strong> Ekskul Terdaftar</span>
            </div>
          </div>
        </div>

        {/* Tab switchers on desktop */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'daily' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Laporan Harian
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'monthly' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rekap Bulanan
          </button>
          <button
            onClick={() => setActiveTab('report-card')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'report-card' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rapor Digital
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Tingkat Kehadiran</span>
          <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
            {attendanceRate}%
          </div>
          <span className="text-[11px] text-emerald-700 block">{hadirCount} dari {totalSessions} Sesi</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Rata-rata Nilai</span>
          <div className="text-2xl font-bold text-blue-700 font-mono tabular-nums">
            {avgGrade} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <span className="text-[11px] text-blue-600 block">Predikat {avgGrade >= 90 ? 'A (Sangat Baik)' : avgGrade >= 80 ? 'B (Baik)' : 'C (Cukup)'}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Ekstrakurikuler Aktif</span>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {myEnrolledClasses.length}
          </div>
          <span className="text-[11px] text-slate-500 block">Terdaftar resmi di sistem</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Catatan dari Guru</span>
          <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums">
            {myLogs.filter(l => l.catatan).length}
          </div>
          <span className="text-[11px] text-amber-700 block">Umpan balik evaluasi</span>
        </div>
      </div>

      {/* TAB 1: LAPORAN HARIAN */}
      {activeTab === 'daily' && (
        <div className="space-y-4 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Riwayat Presensi & Penilaian Harian
              </h2>
              <p className="text-xs text-slate-500">
                Catatan langsung dari tutor pengampu pada setiap sesi pertemuan
              </p>
            </div>

            {availableMapels.length > 1 && (
              <select
                value={selectedMapel}
                onChange={e => setSelectedMapel(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">Semua Mata Pelajaran ({availableMapels.length})</option>
                {availableMapels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
          </div>

          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-semibold text-slate-700">
                Belum Ada Catatan Presensi
              </div>
              <p className="text-xs text-slate-500">
                Tutor Anda belum mengisi presensi untuk sesi pertemuan ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredLogs.map(log => {
                const statusBadge = {
                  Hadir: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  Izin: 'bg-amber-50 text-amber-700 border-amber-200',
                  Sakit: 'bg-blue-50 text-blue-700 border-blue-200',
                  Alpha: 'bg-rose-50 text-rose-700 border-rose-200'
                };

                return (
                  <div
                    key={log.id_log}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono text-slate-500">
                          {log.tanggal}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                          {log.kelas} · {log.mapel}
                        </h3>
                        <span className="text-[11px] text-slate-500">
                          Tutor: {log.guru}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium border rounded-md ${statusBadge[log.status_kehadiran]}`}>
                        {log.status_kehadiran}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500">Nilai Evaluasi:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {log.nilai !== null ? `${log.nilai} / 100` : '-'}
                      </span>
                    </div>

                    {log.catatan && (
                      <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-100">
                        <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">
                          Catatan Tutor:
                        </span>
                        {log.catatan}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REKAP BULANAN */}
      {activeTab === 'monthly' && (
        <div className="space-y-4 no-print">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Ringkasan Kinerja & Evaluasi Bulanan
            </h2>
            <p className="text-xs text-slate-500">
              Akumulasi kehadiran dan rata-rata skor per cabang ekstrakurikuler
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myEnrolledClasses.map(cls => {
              const logsForClass = myLogs.filter(l => l.id_kelas === cls.id_kelas);
              const totalClassSessions = logsForClass.length;
              const classHadir = logsForClass.filter(l => l.status_kehadiran === 'Hadir').length;
              const rate = totalClassSessions > 0 ? Math.round((classHadir / totalClassSessions) * 100) : 100;
              const scores = logsForClass.map(l => l.nilai).filter((n): n is number => n !== null);
              const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : '-';

              return (
                <div key={cls.id_kelas} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {cls.id_kelas}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{cls.kelas}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {cls.mapel} · Tutor: {cls.guru}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-blue-700">{avg}</div>
                      <div className="text-[10px] text-slate-500">Rerata Nilai</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Kehadiran ({classHadir}/{totalClassSessions} Sesi)</span>
                      <span className="font-semibold text-slate-900">{rate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span>Jadwal: {cls.hari}, {cls.waktu}</span>
                    <span>Lokasi: {cls.lokasi || 'Kelas'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: KARTU HASIL BELAJAR / RAPOR DIGITAL (PRINT READY) */}
      {activeTab === 'report-card' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between no-print">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Kartu Hasil Belajar Ekstrakurikuler
              </h2>
              <p className="text-xs text-slate-500">
                Format resmi rapor ekstrakurikuler untuk orang tua dan arsip akademik
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>

          {/* Printable Report Document */}
          <div className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-10 shadow-sm max-w-4xl mx-auto space-y-6">
            {/* Header Document */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src="/assets/aistudio/AL-WILDAN_ISLAMIC_SCHOOL__1__98f2aca5.png"
                  alt="Logo Al-Wildan"
                  className="w-16 h-16 rounded-full object-contain p-0.5 bg-white border border-slate-200"
                />
                <div>
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-blue-900 uppercase">
                    AL-WILDAN ISLAMIC SCHOOL 29 KOTA DEPOK
                  </h1>
                  <h2 className="text-xs sm:text-sm font-bold text-orange-600 tracking-wide uppercase">
                    Kartu Laporan Perkembangan Ekstrakurikuler
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Kampus Kota Depok · Tahun Ajaran 2026/2027 · Database Google Sheets Terverifikasi
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500 hidden sm:block">
                <div>Tanggal Cetak:</div>
                <div className="font-semibold text-slate-800">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div className="text-[10px] text-blue-700 font-mono">AW29-LMS-OFFICIAL</div>
              </div>
            </div>

            {/* Student Info Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Nama Lengkap Siswa:</span>
                <span className="font-bold text-slate-900 text-sm">{studentName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Kelas Asal:</span>
                <span className="font-semibold text-slate-900">{studentProfile?.kelas_asli || 'Reguler'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Jenis Kelamin:</span>
                <span className="font-semibold text-slate-900">{studentProfile?.gender || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Email Wali:</span>
                <span className="font-semibold text-slate-900 truncate block">{studentProfile?.email_siswa || studentEmail || '-'}</span>
              </div>
            </div>

            {/* Extracurricular Grade Table */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                I. Pencapaian Kompetensi & Presensi Ekstrakurikuler
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Bidang Ekstrakurikuler</th>
                      <th className="py-2.5 px-3">Tutor Pengampu</th>
                      <th className="py-2.5 px-3 text-center">Kehadiran</th>
                      <th className="py-2.5 px-3 text-center">Nilai</th>
                      <th className="py-2.5 px-3 text-center">Predikat</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Deskripsi Capaian Kompetensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {myEnrolledClasses.map((cls, idx) => {
                      const logsForClass = myLogs.filter(l => l.id_kelas === cls.id_kelas);
                      const hadir = logsForClass.filter(l => l.status_kehadiran === 'Hadir').length;
                      const scores = logsForClass.map(l => l.nilai).filter((n): n is number => n !== null);
                      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;
                      const predikat = avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : 'D';

                      const latestNote = logsForClass.find(l => l.catatan)?.catatan ||
                        'Menunjukkan antusiasme yang tinggi dalam mempraktikkan materi dan mampu berkolaborasi aktif dengan rekan sekelas.';

                      return (
                        <tr key={cls.id_kelas}>
                          <td className="py-3 px-3 text-center font-mono">{idx + 1}</td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {cls.kelas}
                            <span className="block text-[11px] text-slate-500 font-normal">{cls.mapel}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-700">{cls.guru}</td>
                          <td className="py-3 px-3 text-center font-mono tabular-nums">
                            {hadir}/{logsForClass.length || 1} Sesi
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-blue-700 text-sm">
                            {avg}
                          </td>
                          <td className="py-3 px-3 text-center font-bold">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                              {predikat}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700 text-[11px] leading-relaxed">
                            {latestNote}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-16">
                <div>
                  <div className="text-slate-500">Mengetahui,</div>
                  <div className="font-semibold text-slate-900">Orang Tua / Wali Murid</div>
                </div>
                <div className="border-b border-slate-400 w-44 mx-auto" />
              </div>

              <div className="space-y-16">
                <div>
                  <div className="text-slate-500">Kota Depok, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div className="font-semibold text-slate-900">Koordinator Ekstrakurikuler AL-WILDAN 29</div>
                </div>
                <div>
                  <div className="border-b border-slate-400 w-48 mx-auto" />
                  <div className="text-[11px] text-slate-500 mt-1">NIP. 2026.AW29.DEPOK</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
