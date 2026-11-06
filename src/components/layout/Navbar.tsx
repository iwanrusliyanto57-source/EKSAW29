import React from 'react';
import { useApp } from '../../context/AppContext';
import { RefreshCw, LogOut, Shield, GraduationCap, UserCheck, Sheet } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { auth, logout, syncData, syncing } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="/assets/aistudio/AL-WILDAN_ISLAMIC_SCHOOL__1__98f2aca5.png"
            alt="Logo Al-Wildan"
            className="w-10 h-10 rounded-full object-contain p-0.5 bg-white border border-slate-200 shadow-xs"
          />
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-blue-900 whitespace-nowrap leading-tight">
              AL-WILDAN 29
            </span>
            <span className="text-[10px] text-slate-500 hidden sm:inline whitespace-nowrap font-medium">
              Islamic School Kota Depok · LMS Ekskul
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links for Desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {auth?.role === 'tutor' && (
            <>
              <button
                onClick={() => onSelectTab('dashboard')}
                className={`whitespace-nowrap transition-colors ${currentTab === 'dashboard' ? 'text-blue-700 font-bold border-b-2 border-blue-700 pb-0.5' : 'hover:text-slate-900'}`}
              >
                Jadwal & Presensi
              </button>
              <button
                onClick={() => onSelectTab('recap')}
                className={`whitespace-nowrap transition-colors ${currentTab === 'recap' ? 'text-blue-700 font-bold border-b-2 border-blue-700 pb-0.5' : 'hover:text-slate-900'}`}
              >
                Rekap Nilai Siswa
              </button>
              <button
                onClick={() => onSelectTab('presence')}
                className={`whitespace-nowrap transition-colors ${currentTab === 'presence' ? 'text-blue-700 font-bold border-b-2 border-blue-700 pb-0.5' : 'hover:text-slate-900'}`}
              >
                Kehadiran Tutor
              </button>
            </>
          )}

          {auth?.role === 'siswa' && (
            <>
              <button
                onClick={() => onSelectTab('daily')}
                className={`whitespace-nowrap transition-colors ${currentTab === 'daily' ? 'text-blue-700 font-bold border-b-2 border-blue-700 pb-0.5' : 'hover:text-slate-900'}`}
              >
                Laporan Harian
              </button>
              <button
                onClick={() => onSelectTab('monthly')}
                className={`whitespace-nowrap transition-colors ${currentTab === 'monthly' ? 'text-blue-700 font-bold border-b-2 border-blue-700 pb-0.5' : 'hover:text-slate-900'}`}
              >
                Rekap Bulanan
              </button>
              <button
                onClick={() => onSelectTab('report-card')}
                className={`whitespace-nowrap transition-colors ${currentTab === 'report-card' ? 'text-blue-700 font-bold border-b-2 border-blue-700 pb-0.5' : 'hover:text-slate-900'}`}
              >
                Kartu Hasil Belajar
              </button>
            </>
          )}

          {auth?.role === 'admin' && (
            <>
              <button
                onClick={() => onSelectTab('overview')}
                className={`whitespace-nowrap transition-colors ${currentTab === 'overview' ? 'text-blue-700 font-bold border-b-2 border-blue-700 pb-0.5' : 'hover:text-slate-900'}`}
              >
                Monitoring Live
              </button>
              <button
                onClick={() => onSelectTab('reports')}
                className={`whitespace-nowrap transition-colors ${currentTab === 'reports' ? 'text-blue-700 font-bold border-b-2 border-blue-700 pb-0.5' : 'hover:text-slate-900'}`}
              >
                Laporan & AI Insight
              </button>
              <button
                onClick={() => onSelectTab('honor')}
                className={`whitespace-nowrap transition-colors ${currentTab === 'honor' ? 'text-blue-700 font-bold border-b-2 border-blue-700 pb-0.5' : 'hover:text-slate-900'}`}
              >
                Honor Tutor
              </button>
              <button
                onClick={() => onSelectTab('sheets')}
                className={`whitespace-nowrap transition-colors ${currentTab === 'sheets' ? 'text-blue-700 font-bold border-b-2 border-blue-700 pb-0.5' : 'hover:text-slate-900'}`}
              >
                Integrasi Sheet & Setup
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Role Info, Sync Trigger & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={syncData}
            disabled={syncing}
            title="Sinkronkan dengan Google Sheets"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-700 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Sinkron...' : 'Sync Sheet'}</span>
          </button>

          {auth ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[170px]">
                  {auth.name}
                </span>
                <span className="text-[10px] text-blue-700 font-medium capitalize">
                  {auth.role === 'tutor' ? 'Tutor AW29' : auth.role === 'siswa' ? 'Siswa / Wali' : 'Admin AW29'}
                </span>
              </div>
              <button
                onClick={logout}
                title="Keluar"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500">Belum Masuk</div>
          )}
        </div>
      </div>
    </header>
  );
};
