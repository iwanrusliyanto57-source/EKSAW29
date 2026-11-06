import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  BookOpen,
  DollarSign,
  Settings,
  Sparkles,
  Download,
  Printer,
  CheckCircle,
  Clock,
  Users,
  GraduationCap,
  FileSpreadsheet,
  ExternalLink,
  Copy,
  RefreshCw,
  Search,
  CheckCheck
} from 'lucide-react';

interface AdminDashboardProps {
  initialTab?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab = 'overview' }) => {
  const {
    data,
    syncData,
    syncing,
    updateFeeDisbursement,
    updateConfig,
    generateAiInsights,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Stats calculation
  const totalStudents = data?.master_siswa.length || 0;
  const totalTutors = data?.master_guru.length || 0;
  const totalClasses = data?.master_kelas.length || 0;
  const totalLogs = data?.absensi_dan_nilai.length || 0;
  const totalTutorPresences = data?.kehadiran_tutor.length || 0;

  const validScores = (data?.absensi_dan_nilai || [])
    .map(l => l.nilai)
    .filter((n): n is number => n !== null && n !== undefined);
  const overallAvgGrade = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

  const hadirLogs = (data?.absensi_dan_nilai || []).filter(l => l.status_kehadiran === 'Hadir').length;
  const overallAttendanceRate = totalLogs > 0 ? Math.round((hadirLogs / totalLogs) * 100) : 0;

  // --- TAB 2: MONTHLY CLASS REPORT & AI INSIGHT STATE ---
  const [selectedClassId, setSelectedClassId] = useState<string>(data?.master_kelas[0]?.id_kelas || '');
  const [selectedMonth, setSelectedMonth] = useState<string>('November 2026');
  const [aiInsightText, setAiInsightText] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiSource, setAiSource] = useState<string>('');

  const targetClass = (data?.master_kelas || []).find(k => k.id_kelas === selectedClassId) || data?.master_kelas[0];
  const targetClassStudents = (data?.siswa_kelas || []).filter(s => s.id_kelas === targetClass?.id_kelas);
  const targetClassLogs = (data?.absensi_dan_nilai || []).filter(l => l.id_kelas === targetClass?.id_kelas);

  const targetClassHadir = targetClassLogs.filter(l => l.status_kehadiran === 'Hadir').length;
  const targetClassRate = targetClassLogs.length > 0 ? Math.round((targetClassHadir / targetClassLogs.length) * 100) : 95;
  const targetClassScores = targetClassLogs.map(l => l.nilai).filter((n): n is number => n !== null);
  const targetClassAvg = targetClassScores.length > 0 ? Math.round(targetClassScores.reduce((a, b) => a + b, 0) / targetClassScores.length) : 85;

  const handleGenerateAiInsights = async () => {
    if (!targetClass) return;
    setIsGeneratingAi(true);
    try {
      const topStudents = targetClassLogs
        .filter(l => (l.nilai || 0) >= 90)
        .map(l => l.siswa)
        .slice(0, 4);

      const notes = targetClassLogs.map(l => l.catatan).filter(Boolean);

      const res = await generateAiInsights({
        className: targetClass.kelas,
        subject: targetClass.mapel,
        tutorName: targetClass.guru,
        attendanceRate: targetClassRate,
        avgGrade: targetClassAvg,
        topStudents,
        studentNotes: notes,
        month: selectedMonth
      });

      setAiInsightText(res.insight);
      setAiSource(res.source);
      showToast('AI Insight berhasil dibuat!', 'success');
    } catch (err: any) {
      showToast('Gagal generate AI insight: ' + err.message, 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // --- TAB 3: TUTOR FEE DISBURSEMENT STATE ---
  const standardFee = data?.config.standardFeePerSession || 125000;
  const [feeRateInput, setFeeRateInput] = useState<number>(standardFee);

  const handleSaveRate = async () => {
    await updateConfig({ standardFeePerSession: Number(feeRateInput) });
  };

  const handleDisbursementAction = async (tutor: any, sessions: number, status: 'Draft' | 'Disetujui' | 'Ditransfer') => {
    const id = `PAY-${tutor.id_tutor}-${selectedMonth.replace(/\s+/g, '_')}`;
    const item = {
      id_disbursement: id,
      id_tutor: tutor.id_tutor,
      guru: tutor.guru,
      bulan: selectedMonth,
      total_pertemuan: sessions,
      rate_per_sesi: standardFee,
      total_honor: sessions * standardFee,
      status,
      tanggal_pencairan: status === 'Ditransfer' ? new Date().toISOString().split('T')[0] : undefined,
      catatan: `Honor Sesi Mengajar ${sessions}x Pertemuan`
    };
    await updateFeeDisbursement(item);
  };

  // --- TAB 4: GOOGLE SHEETS & APPS SCRIPT SETUP STATE ---
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState<string>(data?.config.appsScriptUrl || '');
  const [testingUrl, setTestingUrl] = useState<boolean>(false);
  const [codeGsContent, setCodeGsContent] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [rawSheetTab, setRawSheetTab] = useState<string>('master_kelas');

  const handleSaveAppsScriptUrl = async () => {
    await updateConfig({ appsScriptUrl: appsScriptUrlInput.trim() });
  };

  const handleTestAppsScriptUrl = async () => {
    if (!appsScriptUrlInput) return;
    setTestingUrl(true);
    try {
      const res = await fetch(appsScriptUrlInput + '?action=ping');
      const json = await res.json();
      if (json.status === 'success') {
        showToast('Koneksi Google Apps Script berhasil terverifikasi!', 'success');
      } else {
        showToast('Koneksi Apps Script merespons: ' + JSON.stringify(json), 'info');
      }
    } catch (e: any) {
      showToast('Uji koneksi Apps Script gagal: ' + e.message, 'error');
    } finally {
      setTestingUrl(false);
    }
  };

  const handleCopyCodeGs = async () => {
    try {
      const res = await fetch('/api/code-gs');
      const text = await res.text();
      navigator.clipboard.writeText(text);
      setCopiedCode(true);
      showToast('Kode Code.gs berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      showToast('Gagal menyalin kode', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <img
            src="/assets/aistudio/AL-WILDAN_ISLAMIC_SCHOOL__1__98f2aca5.png"
            alt="Logo Al-Wildan"
            className="w-14 h-14 rounded-full object-contain p-0.5 bg-white border border-slate-200 shadow-xs shrink-0"
          />
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-orange-600 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>AL-WILDAN ISLAMIC SCHOOL 29 KOTA DEPOK</span>
              <span>·</span>
              <span className="font-mono text-slate-500">Google Sheets DB</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-blue-950">
              Executive Dashboard Ekstrakurikuler
            </h1>
            <p className="text-xs text-slate-500">
              Monitoring langsung capaian kompetensi, presensi, laporan bulanan, dan otorisasi honor tutor
            </p>
          </div>
        </div>

        {/* Tab switchers on desktop */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'overview' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monitoring Live
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'reports' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Laporan & AI Insight
          </button>
          <button
            onClick={() => setActiveTab('honor')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'honor' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pencairan Honor
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'sheets' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Google Sheet Setup
          </button>
        </div>
      </div>

      {/* TAB 1: MONITORING LIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Total Siswa Terdaftar</span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
                {totalStudents}
              </div>
              <span className="text-[11px] text-blue-600 block">Dari sheet master_siswa</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Rombel / Kelas Aktif</span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
                {totalClasses}
              </div>
              <span className="text-[11px] text-slate-500 block">Diampu {totalTutors} Tutor</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Rata-rata Nilai Global</span>
              <div className="text-2xl sm:text-3xl font-bold text-blue-700 font-mono tabular-nums">
                {overallAvgGrade} <span className="text-xs font-normal text-slate-400">/ 100</span>
              </div>
              <span className="text-[11px] text-emerald-600 block">Evaluasi {totalLogs} Sesi Log</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Tingkat Kehadiran Global</span>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono tabular-nums">
                {overallAttendanceRate}%
              </div>
              <span className="text-[11px] text-emerald-700 block">{hadirLogs} Siswa Hadir</span>
            </div>
          </div>

          {/* Class Breakdown Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Performa dan Kehadiran per Kelas
                </h2>
                <p className="text-xs text-slate-500">
                  Monitoring langsung perbandingan kehadiran dan nilai seluruh kelas ekstrakurikuler
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Kode</th>
                    <th className="py-3 px-3">Nama Kelas & Mapel</th>
                    <th className="py-3 px-3">Tutor Pengampu</th>
                    <th className="py-3 px-3">Hari / Waktu</th>
                    <th className="py-3 px-3 text-center">Siswa</th>
                    <th className="py-3 px-3 text-center">Log Absen</th>
                    <th className="py-3 px-3 text-center">Kehadiran</th>
                    <th className="py-3 px-3 text-center">Rerata Nilai</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(data?.master_kelas || []).map(cls => {
                    const students = (data?.siswa_kelas || []).filter(s => s.id_kelas === cls.id_kelas);
                    const classLogs = (data?.absensi_dan_nilai || []).filter(l => l.id_kelas === cls.id_kelas);
                    const hadir = classLogs.filter(l => l.status_kehadiran === 'Hadir').length;
                    const rate = classLogs.length > 0 ? Math.round((hadir / classLogs.length) * 100) : 100;
                    const scores = classLogs.map(l => l.nilai).filter((n): n is number => n !== null);
                    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;

                    return (
                      <tr key={cls.id_kelas} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-blue-700">
                          {cls.id_kelas}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {cls.kelas}
                          <span className="block text-[11px] text-slate-500 font-normal">{cls.mapel}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-800">
                          {cls.guru}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                          {cls.hari}, {cls.waktu}
                        </td>
                        <td className="py-3 px-3 text-center font-mono tabular-nums">
                          {students.length}
                        </td>
                        <td className="py-3 px-3 text-center font-mono tabular-nums">
                          {classLogs.length}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            rate >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {rate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-700 text-sm">
                          {avg}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedClassId(cls.id_kelas);
                              setActiveTab('reports');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            Lihat Rapor
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY CLASS REPORTS & AUTO-INSIGHTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Pilih Kelas Ekstrakurikuler:
                </label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {(data?.master_kelas || []).map(k => (
                    <option key={k.id_kelas} value={k.id_kelas}>
                      {k.kelas} - {k.mapel} ({k.guru})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Bulan Laporan:
                </label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="November 2026">November 2026</option>
                  <option value="Oktober 2026">Oktober 2026</option>
                  <option value="Desember 2026">Desember 2026</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateAiInsights}
                disabled={isGeneratingAi}
                className="px-3.5 py-2 text-xs font-semibold bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Sparkles className={`w-4 h-4 text-amber-300 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAi ? 'Menganalisis...' : 'Generate AI Insights'}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Cetak Rapor</span>
              </button>
            </div>
          </div>

          {/* AI Auto-Insight Box */}
          {aiInsightText && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3 no-print">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Automated AI Insights & Analisis Pedagogik ({selectedMonth})</span>
                </div>
                <span className="text-[10px] text-blue-700 font-mono">
                  Engine: {aiSource === 'gemini' ? 'Gemini 2.5 Flash' : 'Analytic Engine'}
                </span>
              </div>
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap bg-white/80 p-4 rounded-xl border border-blue-100 font-sans">
                {aiInsightText}
              </div>
            </div>
          )}

          {/* Printable Monthly Class Report Sheet */}
          <div className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-10 shadow-sm max-w-4xl mx-auto space-y-6">
            {/* Report Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src="/assets/aistudio/AL-WILDAN_ISLAMIC_SCHOOL__1__98f2aca5.png"
                  alt="Logo Al-Wildan"
                  className="w-16 h-16 rounded-full object-contain p-0.5 bg-white border border-slate-200"
                />
                <div>
                  <h1 className="text-base sm:text-lg font-extrabold text-blue-900 uppercase">
                    AL-WILDAN ISLAMIC SCHOOL 29 KOTA DEPOK
                  </h1>
                  <h2 className="text-xs sm:text-sm font-bold text-orange-600 tracking-wide uppercase">
                    Laporan Bulanan Evaluasi Kelas Ekstrakurikuler
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Kampus Kota Depok · Periode: {selectedMonth} · Basis Data Google Sheets
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500 hidden sm:block">
                <div>Tanggal Dokumen:</div>
                <div className="font-semibold text-slate-800">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div className="text-[10px] text-blue-700 font-mono">DOC-AW29-EKSKUL</div>
              </div>
            </div>

            {/* Class Summary Matrix */}
            {targetClass && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Kelas & Mapel:</span>
                  <span className="font-bold text-slate-900 text-sm">{targetClass.kelas}</span>
                  <span className="text-[11px] text-slate-500 block">{targetClass.mapel}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Tutor Pengampu:</span>
                  <span className="font-semibold text-slate-900 text-sm">{targetClass.guru}</span>
                  <span className="text-[11px] text-slate-500 block">Jadwal: {targetClass.hari}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Kehadiran Rombel:</span>
                  <span className="font-bold text-emerald-600 text-sm">{targetClassRate}%</span>
                  <span className="text-[11px] text-slate-500 block">{targetClassHadir} dari {targetClassLogs.length} log</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Rata-rata Nilai:</span>
                  <span className="font-bold text-blue-700 text-sm">{targetClassAvg} / 100</span>
                  <span className="text-[11px] text-slate-500 block">{targetClassStudents.length} Siswa</span>
                </div>
              </div>
            )}

            {/* AI Insights in Printable View if Generated */}
            {aiInsightText && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2 text-xs">
                <span className="font-bold text-slate-900 uppercase block tracking-wider text-[11px]">
                  Catatan Evaluasi Pedagogik & Insight Kelas ({selectedMonth})
                </span>
                <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {aiInsightText}
                </div>
              </div>
            )}

            {/* Student Roster Table */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Daftar Capaian Evaluasi Siswa Kelas {targetClass?.kelas}
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-3">Kelas Asal</th>
                      <th className="py-2.5 px-3 text-center">Kehadiran</th>
                      <th className="py-2.5 px-3 text-center">Nilai Rerata</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Catatan Perkembangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {targetClassStudents.map((s, idx) => {
                      const logs = targetClassLogs.filter(l => l.siswa === s.siswa);
                      const hadir = logs.filter(l => l.status_kehadiran === 'Hadir').length;
                      const scores = logs.map(l => l.nilai).filter((n): n is number => n !== null);
                      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;
                      const note = logs.find(l => l.catatan)?.catatan || 'Konsisten mengikuti pembelajaran.';

                      return (
                        <tr key={s.siswa}>
                          <td className="py-2.5 px-3 text-center font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{s.siswa}</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.kelas_asli || 'Reguler'}</td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums">{hadir}/{logs.length || 1}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">{avg}</td>
                          <td className="py-2.5 px-3 text-slate-700 text-[11px]">{note}</td>
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
                  <div className="text-slate-500">Tutor Pengampu,</div>
                  <div className="font-semibold text-slate-900">{targetClass?.guru}</div>
                </div>
                <div className="border-b border-slate-400 w-44 mx-auto" />
              </div>

              <div className="space-y-16">
                <div>
                  <div className="text-slate-500">Kepala Bagian Kurikulum & Ekstrakurikuler,</div>
                  <div className="font-semibold text-slate-900">AL-WILDAN 29 KOTA DEPOK</div>
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

      {/* TAB 3: TUTOR ATTENDANCE & FEE DISBURSEMENT */}
      {activeTab === 'honor' && (
        <div className="space-y-6">
          {/* Rate Configuration Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pencairan & Perhitungan Honor Tutor
              </h2>
              <p className="text-xs text-slate-500">
                Laporan presensi mengajar terverifikasi untuk perhitungan honorarium dan approval transfer
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Tarif / Sesi:</span>
                <input
                  type="number"
                  step="5000"
                  value={feeRateInput}
                  onChange={e => setFeeRateInput(Number(e.target.value))}
                  className="w-32 px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                onClick={handleSaveRate}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors"
              >
                Simpan Tarif
              </button>
            </div>
          </div>

          {/* Tutor Payouts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-800">
                Ringkasan Rekapitulasi Sesi & Total Honor ({data?.master_guru.length} Tutor)
              </span>
              <span className="text-[11px] text-slate-500">
                Tarif Sesi: Rp {standardFee.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ID Tutor</th>
                    <th className="py-3 px-4">Nama Tutor</th>
                    <th className="py-3 px-4">Kelas Diampu</th>
                    <th className="py-3 px-4 text-center">Presensi Hadir</th>
                    <th className="py-3 px-4 text-right">Tarif / Sesi</th>
                    <th className="py-3 px-4 text-right">Total Honor</th>
                    <th className="py-3 px-4 text-center">Status Payout</th>
                    <th className="py-3 px-4 text-right">Aksi Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(data?.master_guru || []).map(tutor => {
                    const tutorPresences = (data?.kehadiran_tutor || []).filter(
                      p => p.guru.toLowerCase() === tutor.guru.toLowerCase() && p.status_hadir === 'Hadir'
                    );

                    // Or calculate from distinct log dates
                    const tutorLogs = (data?.absensi_dan_nilai || []).filter(
                      l => l.guru.toLowerCase() === tutor.guru.toLowerCase()
                    );
                    const distinctLogDates = new Set(tutorLogs.map(l => `${l.id_kelas}-${l.tanggal}`)).size;
                    const verifiedSessions = Math.max(tutorPresences.length, distinctLogDates, 1);

                    const totalPayout = verifiedSessions * standardFee;

                    // Check saved disbursement status
                    const existingPayout = (data?.fee_disbursements || []).find(
                      d => d.id_tutor === tutor.id_tutor
                    );
                    const currentStatus = existingPayout?.status || 'Draft';

                    const statusBadge = {
                      Draft: 'bg-slate-100 text-slate-700 border-slate-200',
                      Disetujui: 'bg-amber-50 text-amber-700 border-amber-200',
                      Ditransfer: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    };

                    return (
                      <tr key={tutor.id_tutor} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-blue-700 whitespace-nowrap">
                          {tutor.id_tutor}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {tutor.guru}
                          <span className="block text-[11px] text-slate-400 font-normal">{tutor.status}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {(data?.master_kelas || []).filter(k => k.guru.toLowerCase() === tutor.guru.toLowerCase()).map(k => k.kelas).join(', ') || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-800 tabular-nums">
                          {verifiedSessions} Sesi
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 tabular-nums">
                          Rp {standardFee.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm tabular-nums">
                          Rp {totalPayout.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${statusBadge[currentStatus]}`}>
                            {currentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {currentStatus === 'Draft' && (
                              <button
                                onClick={() => handleDisbursementAction(tutor, verifiedSessions, 'Disetujui')}
                                className="px-2.5 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
                              >
                                Setujui
                              </button>
                            )}
                            {currentStatus === 'Disetujui' && (
                              <button
                                onClick={() => handleDisbursementAction(tutor, verifiedSessions, 'Ditransfer')}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                              >
                                Tandai Cair
                              </button>
                            )}
                            {currentStatus === 'Ditransfer' && (
                              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>Lunas</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GOOGLE SHEETS & APPS SCRIPT SETUP */}
      {activeTab === 'sheets' && (
        <div className="space-y-6">
          {/* Status & Sync Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-slate-900">
                    Google Spreadsheet ID: 1UtJ7jmz9uSkyRIIUe4yVSRn1HM_eTQf9yBONt7psp1o
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Data master siswa, guru, kelas, dan jadwal terhubung langsung secara real-time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://docs.google.com/spreadsheets/d/1UtJ7jmz9uSkyRIIUe4yVSRn1HM_eTQf9yBONt7psp1o/edit?usp=sharing"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Buka Sheet</span>
                </a>

                <button
                  onClick={syncData}
                  disabled={syncing}
                  className="px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">Terakhir Sinkron:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {data?.config.lastSyncedAt ? new Date(data.config.lastSyncedAt).toLocaleTimeString('id-ID') : 'Baru saja'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Siswa:</span>
                <span className="font-mono text-slate-800 font-semibold">{totalStudents} baris</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Kelas:</span>
                <span className="font-mono text-slate-800 font-semibold">{totalClasses} baris</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Log Masuk:</span>
                <span className="font-mono text-slate-800 font-semibold">{totalLogs} entri</span>
              </div>
            </div>
          </div>

          {/* Apps Script Web App Integration */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Setup Google Apps Script Backend (Two-Way Sync)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Agar input presensi dan honor dari aplikasi web ini otomatis tersimpan ke tab Google Sheets Anda secara langsung, pasang skrip <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-blue-700">Code.gs</code> di spreadsheet.
              </p>
            </div>

            {/* Input URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Google Apps Script Web App URL (Optional / Live Hook)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={appsScriptUrlInput}
                  onChange={e => setAppsScriptUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={handleTestAppsScriptUrl}
                    disabled={testingUrl || !appsScriptUrlInput}
                    className="w-full sm:w-auto px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors whitespace-nowrap"
                  >
                    {testingUrl ? 'Menguji...' : 'Uji Koneksi'}
                  </button>
                  <button
                    onClick={handleSaveAppsScriptUrl}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-xs transition-colors whitespace-nowrap"
                  >
                    Simpan URL
                  </button>
                </div>
              </div>
            </div>

            {/* Step-by-step instructions */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Langkah Penerapan Skrip (Deployment Guide):
                </span>
                <button
                  onClick={handleCopyCodeGs}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode ? 'Tersalin!' : 'Salin Kode Code.gs'}</span>
                </button>
              </div>

              <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Buka spreadsheet Google Anda di browser.</li>
                <li>Pilih menu <strong>Extensions (Ekstensi) &gt; Apps Script</strong>.</li>
                <li>Hapus kode bawaan, lalu paste kode dari tombol <strong>Salin Kode Code.gs</strong> di atas.</li>
                <li>Klik tombol <strong>Deploy (Terapkan) &gt; New deployment (Penerapan baru)</strong>.</li>
                <li>Pilih jenis <strong>Web app (Aplikasi web)</strong>, set <em>Execute as: Me</em>, dan <em>Who has access: Anyone (Siapa saja)</em>.</li>
                <li>Klik <strong>Deploy</strong>, izinkan akses akun Google, lalu salin URL Web App yang muncul ke formulir di atas.</li>
              </ol>
            </div>
          </div>

          {/* Raw Sheets Data Viewer */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-3 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Inspeksi Data Master & Log Sheets
                </h3>
                <p className="text-xs text-slate-500">
                  Lihat isi struktur tabel yang tersimpan di sistem
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                {['master_kelas', 'master_guru', 'master_siswa', 'siswa_kelas', 'absensi_dan_nilai', 'kehadiran_tutor'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setRawSheetTab(tab)}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      rawSheetTab === tab ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Table preview */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    {rawSheetTab === 'master_kelas' && (
                      <>
                        <th className="py-2 px-3">id_kelas</th>
                        <th className="py-2 px-3">kelas</th>
                        <th className="py-2 px-3">mapel</th>
                        <th className="py-2 px-3">hari</th>
                        <th className="py-2 px-3">waktu</th>
                        <th className="py-2 px-3">guru</th>
                        <th className="py-2 px-3">tempat</th>
                      </>
                    )}
                    {rawSheetTab === 'master_guru' && (
                      <>
                        <th className="py-2 px-3">id_tutor</th>
                        <th className="py-2 px-3">guru</th>
                        <th className="py-2 px-3">status</th>
                      </>
                    )}
                    {rawSheetTab === 'master_siswa' && (
                      <>
                        <th className="py-2 px-3">siswa</th>
                        <th className="py-2 px-3">email_siswa</th>
                        <th className="py-2 px-3">kelas_asli</th>
                        <th className="py-2 px-3">gender</th>
                      </>
                    )}
                    {rawSheetTab === 'siswa_kelas' && (
                      <>
                        <th className="py-2 px-3">id_kelas</th>
                        <th className="py-2 px-3">siswa</th>
                        <th className="py-2 px-3">kelas</th>
                        <th className="py-2 px-3">mapel</th>
                        <th className="py-2 px-3">guru</th>
                      </>
                    )}
                    {rawSheetTab === 'absensi_dan_nilai' && (
                      <>
                        <th className="py-2 px-3">id_log</th>
                        <th className="py-2 px-3">tanggal</th>
                        <th className="py-2 px-3">kelas</th>
                        <th className="py-2 px-3">siswa</th>
                        <th className="py-2 px-3">status</th>
                        <th className="py-2 px-3">nilai</th>
                      </>
                    )}
                    {rawSheetTab === 'kehadiran_tutor' && (
                      <>
                        <th className="py-2 px-3">id_presensi_tutor</th>
                        <th className="py-2 px-3">tanggal</th>
                        <th className="py-2 px-3">guru</th>
                        <th className="py-2 px-3">id_kelas</th>
                        <th className="py-2 px-3">status</th>
                        <th className="py-2 px-3">jam</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {rawSheetTab === 'master_kelas' && (data?.master_kelas || []).slice(0, 15).map(r => (
                    <tr key={r.id_kelas}>
                      <td className="py-2 px-3 font-mono">{r.id_kelas}</td>
                      <td className="py-2 px-3 font-semibold">{r.kelas}</td>
                      <td className="py-2 px-3">{r.mapel}</td>
                      <td className="py-2 px-3">{r.hari}</td>
                      <td className="py-2 px-3">{r.waktu}</td>
                      <td className="py-2 px-3">{r.guru}</td>
                      <td className="py-2 px-3">{r.tempat}</td>
                    </tr>
                  ))}
                  {rawSheetTab === 'master_guru' && (data?.master_guru || []).slice(0, 15).map(r => (
                    <tr key={r.id_tutor}>
                      <td className="py-2 px-3 font-mono">{r.id_tutor}</td>
                      <td className="py-2 px-3 font-semibold">{r.guru}</td>
                      <td className="py-2 px-3">{r.status}</td>
                    </tr>
                  ))}
                  {rawSheetTab === 'master_siswa' && (data?.master_siswa || []).slice(0, 15).map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-semibold">{r.siswa}</td>
                      <td className="py-2 px-3">{r.email_siswa}</td>
                      <td className="py-2 px-3">{r.kelas_asli}</td>
                      <td className="py-2 px-3">{r.gender}</td>
                    </tr>
                  ))}
                  {rawSheetTab === 'siswa_kelas' && (data?.siswa_kelas || []).slice(0, 15).map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-mono">{r.id_kelas}</td>
                      <td className="py-2 px-3 font-semibold">{r.siswa}</td>
                      <td className="py-2 px-3">{r.kelas}</td>
                      <td className="py-2 px-3">{r.mapel}</td>
                      <td className="py-2 px-3">{r.guru}</td>
                    </tr>
                  ))}
                  {rawSheetTab === 'absensi_dan_nilai' && (data?.absensi_dan_nilai || []).slice(0, 15).map(r => (
                    <tr key={r.id_log}>
                      <td className="py-2 px-3 font-mono">{r.id_log}</td>
                      <td className="py-2 px-3">{r.tanggal}</td>
                      <td className="py-2 px-3">{r.kelas}</td>
                      <td className="py-2 px-3 font-semibold">{r.siswa}</td>
                      <td className="py-2 px-3">{r.status_kehadiran}</td>
                      <td className="py-2 px-3 font-mono">{r.nilai}</td>
                    </tr>
                  ))}
                  {rawSheetTab === 'kehadiran_tutor' && (data?.kehadiran_tutor || []).slice(0, 15).map(r => (
                    <tr key={r.id_presensi_tutor}>
                      <td className="py-2 px-3 font-mono">{r.id_presensi_tutor}</td>
                      <td className="py-2 px-3">{r.tanggal}</td>
                      <td className="py-2 px-3 font-semibold">{r.guru}</td>
                      <td className="py-2 px-3">{r.id_kelas}</td>
                      <td className="py-2 px-3">{r.status_hadir}</td>
                      <td className="py-2 px-3">{r.jam_mulai} - {r.jam_selesai}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
