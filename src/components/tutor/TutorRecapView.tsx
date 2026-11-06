import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AbsensiDanNilai, KehadiranStatus } from '../../types';
import {
  Search,
  Filter,
  Calendar,
  Edit2,
  Trash2,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download
} from 'lucide-react';

export const TutorRecapView: React.FC = () => {
  const { data, auth, updateAttendanceLog, deleteAttendanceLog } = useApp();
  const tutorName = auth?.name || '';

  // All logs by this tutor (or all if admin viewing)
  const logs = (data?.absensi_dan_nilai || []).filter(
    l => auth?.role === 'admin' || l.guru.toLowerCase() === tutorName.toLowerCase()
  );

  // Filter options
  const classes = Array.from(new Set(logs.map(l => l.kelas))).filter(Boolean);
  const subjects = Array.from(new Set(logs.map(l => l.mapel))).filter(Boolean);

  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingLog, setEditingLog] = useState<AbsensiDanNilai | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Filtered logs
  const filteredLogs = logs.filter(l => {
    if (selectedClass !== 'all' && l.kelas !== selectedClass) return false;
    if (selectedSubject !== 'all' && l.mapel !== selectedSubject) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return l.siswa.toLowerCase().includes(q) || (l.catatan || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Calculate metrics
  const totalEntries = filteredLogs.length;
  const hadirCount = filteredLogs.filter(l => l.status_kehadiran === 'Hadir').length;
  const attendanceRate = totalEntries > 0 ? Math.round((hadirCount / totalEntries) * 100) : 0;

  const validScores = filteredLogs.map(l => l.nilai).filter((n): n is number => n !== null && n !== undefined && !isNaN(n));
  const avgGrade = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

  const uniqueDates = Array.from(new Set(filteredLogs.map(l => l.tanggal))).length;

  // Handle Edit Save
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    await updateAttendanceLog(editingLog);
    setEditingLog(null);
  };

  const handleDelete = async (id_log: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus catatan presensi ini?')) {
      await deleteAttendanceLog(id_log);
      setIsDeletingId(null);
    }
  };

  // Export as simple CSV download
  const handleExportCSV = () => {
    const headers = ['ID Log', 'Tanggal', 'Kelas', 'Mapel', 'Guru', 'Siswa', 'Status Kehadiran', 'Nilai', 'Catatan'];
    const rows = filteredLogs.map(l => [
      l.id_log,
      l.tanggal,
      `"${l.kelas}"`,
      `"${l.mapel}"`,
      `"${l.guru}"`,
      `"${l.siswa}"`,
      l.status_kehadiran,
      l.nilai !== null ? l.nilai : '',
      `"${(l.catatan || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_presensi_${tutorName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Rekap Presensi & Nilai Siswa
          </h1>
          <p className="text-xs text-slate-500">
            Filter, pantau evaluasi, serta edit/hapus log kehadiran ekstrakurikuler
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredLogs.length === 0}
          className="self-start sm:self-auto px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Total Log Masuk</span>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {totalEntries}
          </div>
          <span className="text-[11px] text-slate-500 block">{uniqueDates} Pertemuan</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Tingkat Kehadiran</span>
          <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
            {attendanceRate}%
          </div>
          <span className="text-[11px] text-emerald-700 block">{hadirCount} Siswa Hadir</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Rata-Rata Nilai</span>
          <div className="text-2xl font-bold text-blue-700 font-mono tabular-nums">
            {avgGrade} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <span className="text-[11px] text-blue-600 block">Evaluasi Kompetensi</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Izin / Sakit / Alpha</span>
          <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums">
            {totalEntries - hadirCount}
          </div>
          <span className="text-[11px] text-amber-700 block">Perlu Perhatian</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Class Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Filter Kelas
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="all">Semua Kelas ({classes.length})</option>
              {classes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Filter Mata Pelajaran
            </label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="all">Semua Mapel ({subjects.length})</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Search by Student */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Cari Siswa / Catatan
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ketik nama siswa..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-800">
            Daftar Catatan Presensi & Nilai ({filteredLogs.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Tersimpan di Google Sheets (`absensi_dan_nilai`)
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">
              Tidak Ada Data Presensi
            </div>
            <p className="text-xs text-slate-500">
              Coba sesuaikan filter pencarian atau lakukan input presensi baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Siswa</th>
                  <th className="py-3 px-4">Kelas & Mapel</th>
                  <th className="py-3 px-4">Kehadiran</th>
                  <th className="py-3 px-4">Nilai</th>
                  <th className="py-3 px-4 min-w-[200px]">Catatan Tutor</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.map(log => {
                  const statusColors = {
                    Hadir: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Izin: 'bg-amber-50 text-amber-700 border-amber-200',
                    Sakit: 'bg-blue-50 text-blue-700 border-blue-200',
                    Alpha: 'bg-rose-50 text-rose-700 border-rose-200'
                  };

                  return (
                    <tr key={log.id_log} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono whitespace-nowrap text-slate-600">
                        {log.tanggal}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {log.siswa}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{log.kelas}</div>
                        <div className="text-[11px] text-slate-500">{log.mapel}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${statusColors[log.status_kehadiran]}`}>
                          {log.status_kehadiran}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                        {log.nilai !== null ? log.nilai : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {log.catatan || <span className="text-slate-400 italic">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingLog({ ...log })}
                            title="Edit data presensi"
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(log.id_log)}
                            title="Hapus data presensi"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Log Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Data Presensi Siswa
              </h3>
              <button
                onClick={() => setEditingLog(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Nama Siswa
                </label>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {editingLog.siswa}
                </div>
                <div className="text-xs text-slate-500">
                  {editingLog.kelas} · {editingLog.tanggal}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Status Kehadiran
                </label>
                <select
                  value={editingLog.status_kehadiran}
                  onChange={e => setEditingLog({ ...editingLog, status_kehadiran: e.target.value as KehadiranStatus })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="Hadir">Hadir</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Alpha">Alpha</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Nilai Evaluasi (0 - 100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingLog.nilai !== null ? editingLog.nilai : ''}
                  onChange={e => setEditingLog({ ...editingLog, nilai: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Catatan Tutor
                </label>
                <textarea
                  rows={3}
                  value={editingLog.catatan || ''}
                  onChange={e => setEditingLog({ ...editingLog, catatan: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
