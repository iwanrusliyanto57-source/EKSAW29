import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { GraduationCap, Users, Shield, ArrowRight, KeyRound, Search, CheckCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { data, login } = useApp();
  const [activeRole, setActiveRole] = useState<UserRole>('tutor');
  const [selectedTutor, setSelectedTutor] = useState<string>('EDUCOURSE');
  const [tutorPassword, setTutorPassword] = useState<string>('ekskulaw2901234');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('admin123');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const tutors = data?.master_guru || [];
  const students = data?.master_siswa || [];

  const filteredStudents = students.filter(s =>
    s.siswa.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email_siswa.toLowerCase().includes(studentSearch.toLowerCase())
  ).slice(0, 15);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (activeRole === 'tutor') {
      const res = login('tutor', selectedTutor, tutorPassword);
      if (!res.success) setErrorMsg(res.message);
    } else if (activeRole === 'siswa') {
      const target = selectedStudent || studentSearch;
      if (!target) {
        setErrorMsg('Silakan pilih atau ketik nama siswa');
        return;
      }
      const res = login('siswa', target);
      if (!res.success) setErrorMsg(res.message);
    } else if (activeRole === 'admin') {
      const res = login('admin', 'admin', adminPassword);
      if (!res.success) setErrorMsg(res.message);
    }
  };

  const quickDemoLogin = (role: UserRole, identifier: string, pwd?: string) => {
    login(role, identifier, pwd);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-2 rounded-full bg-white border border-slate-200 shadow-sm mb-1">
            <img
              src="/assets/aistudio/AL-WILDAN_ISLAMIC_SCHOOL__1__98f2aca5.png"
              alt="Logo Al-Wildan"
              className="w-16 h-16 rounded-full object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-blue-900 uppercase">
            AL-WILDAN ISLAMIC SCHOOL 29
          </h1>
          <p className="text-xs font-semibold text-orange-600 tracking-wider uppercase">
            KOTA DEPOK · LMS EKSTRAKURIKULER
          </p>
        </div>

        {/* Hero Card */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs h-32 sm:h-36">
          <img
            src="/src/assets/images/lms_hero_banner_1793951502511.jpg"
            alt="Hero Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-transparent flex items-end p-4">
            <div className="text-white text-xs sm:text-sm font-medium">
              Database Terhubung: <span className="font-semibold text-blue-200">Google Sheets Live</span>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-6">
          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setActiveRole('tutor'); setErrorMsg(''); }}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeRole === 'tutor'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Tutor</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveRole('siswa'); setErrorMsg(''); }}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeRole === 'siswa'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Siswa</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveRole('admin'); setErrorMsg(''); }}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeRole === 'admin'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Admin</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* ROLE: TUTOR */}
            {activeRole === 'tutor' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Pilih Nama Tutor / Guru
                  </label>
                  <select
                    value={selectedTutor}
                    onChange={(e) => setSelectedTutor(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {tutors.map((t, i) => (
                      <option key={t.id_tutor || i} value={t.guru}>
                        {t.guru} {t.status === 'inactive' ? '(Non-aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password Tutor
                    </label>
                    <span className="text-[11px] text-blue-600 font-mono">
                      Default: ekskulaw2901234
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={tutorPassword}
                      onChange={(e) => setTutorPassword(e.target.value)}
                      placeholder="Masukkan password tutor"
                      required
                      className="w-full pl-3 pr-9 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>
              </>
            )}

            {/* ROLE: SISWA */}
            {activeRole === 'siswa' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Cari Nama Siswa atau Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setSelectedStudent(e.target.value);
                      }}
                      placeholder="Ketik nama / email siswa..."
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Atau Pilih Siswa Terdaftar ({students.length} Siswa)
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => {
                      setSelectedStudent(e.target.value);
                      setStudentSearch('');
                    }}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="">-- Pilih dari daftar siswa --</option>
                    {students.map((s, idx) => (
                      <option key={idx} value={s.siswa}>
                        {s.siswa} ({s.kelas_asli || 'Kelas'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ROLE: ADMIN */}
            {activeRole === 'admin' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password Administrator
                  </label>
                  <span className="text-[11px] text-blue-600 font-mono">
                    Default: admin123
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Masukkan password admin"
                    required
                    className="w-full pl-3 pr-9 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>Masuk Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Launchers */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Akses Cepat (Demo Presets):
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => quickDemoLogin('tutor', 'EDUCOURSE', 'ekskulaw2901234')}
                className="w-full text-left px-3 py-2 text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-700 hover:text-blue-700 transition-colors flex items-center justify-between"
              >
                <span>🚀 Masuk sebagai <strong>Tutor EDUCOURSE (Coding)</strong></span>
                <span className="text-[10px] text-slate-500 font-mono">Tutor</span>
              </button>
              <button
                type="button"
                onClick={() => quickDemoLogin('siswa', 'ELZAIN ARRAYYAN YUNAS')}
                className="w-full text-left px-3 py-2 text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-700 hover:text-blue-700 transition-colors flex items-center justify-between"
              >
                <span>👦 Masuk sebagai <strong>Siswa Elzain Arrayyan</strong></span>
                <span className="text-[10px] text-slate-500 font-mono">Siswa</span>
              </button>
              <button
                type="button"
                onClick={() => quickDemoLogin('admin', 'admin', 'admin123')}
                className="w-full text-left px-3 py-2 text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-700 hover:text-blue-700 transition-colors flex items-center justify-between"
              >
                <span>⚙️ Masuk sebagai <strong>Administrator LMS</strong></span>
                <span className="text-[10px] text-slate-500 font-mono">Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
