import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { LoginScreen } from './components/auth/LoginScreen';
import { TutorDashboard } from './components/tutor/TutorDashboard';
import { TutorRecapView } from './components/tutor/TutorRecapView';
import { StudentPortal } from './components/student/StudentPortal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Toast } from './components/common/Toast';
import { Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { auth, loading } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <img
            src="/assets/aistudio/AL-WILDAN_ISLAMIC_SCHOOL__1__98f2aca5.png"
            alt="Logo Al-Wildan"
            className="w-20 h-20 rounded-full object-contain p-1 bg-white shadow-md border border-slate-200"
          />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
              AL-WILDAN ISLAMIC SCHOOL 29
            </h2>
            <p className="text-xs text-slate-500">
              KOTA DEPOK · Menghubungkan Google Sheets...
            </p>
          </div>
          <Loader2 className="w-6 h-6 text-blue-700 animate-spin" />
        </div>
      </div>
    );
  }

  if (!auth) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
        {/* TUTOR ROLE VIEWS */}
        {auth.role === 'tutor' && (
          <>
            {currentTab === 'dashboard' && <TutorDashboard onGoToRecap={() => setCurrentTab('recap')} />}
            {currentTab === 'recap' && <TutorRecapView />}
            {currentTab === 'presence' && <TutorDashboard onGoToRecap={() => setCurrentTab('recap')} />}
          </>
        )}

        {/* SISWA ROLE VIEWS */}
        {auth.role === 'siswa' && (
          <StudentPortal initialTab={currentTab === 'report-card' ? 'report-card' : currentTab === 'monthly' ? 'monthly' : 'daily'} />
        )}

        {/* ADMIN ROLE VIEWS */}
        {auth.role === 'admin' && (
          <AdminDashboard initialTab={currentTab === 'reports' ? 'reports' : currentTab === 'honor' ? 'honor' : currentTab === 'sheets' ? 'sheets' : 'overview'} />
        )}
      </main>

      <BottomNavigation currentTab={currentTab} onSelectTab={setCurrentTab} />
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
