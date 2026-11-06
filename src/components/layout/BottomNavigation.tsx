import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  CalendarDays,
  FileSpreadsheet,
  UserCheck,
  Award,
  BookOpen,
  BarChart3,
  DollarSign,
  Settings,
  History
} from 'lucide-react';

interface BottomNavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentTab, onSelectTab }) => {
  const { auth } = useApp();

  if (!auth) return null;

  const renderTabs = () => {
    if (auth.role === 'tutor') {
      return [
        { id: 'dashboard', label: 'Jadwal', icon: CalendarDays },
        { id: 'recap', label: 'Rekap Nilai', icon: FileSpreadsheet },
        { id: 'presence', label: 'Kehadiran', icon: UserCheck }
      ];
    }
    if (auth.role === 'siswa') {
      return [
        { id: 'daily', label: 'Harian', icon: History },
        { id: 'monthly', label: 'Bulanan', icon: BookOpen },
        { id: 'report-card', label: 'Rapor', icon: Award }
      ];
    }
    if (auth.role === 'admin') {
      return [
        { id: 'overview', label: 'Monitor', icon: BarChart3 },
        { id: 'reports', label: 'Laporan AI', icon: BookOpen },
        { id: 'honor', label: 'Honor Tutor', icon: DollarSign },
        { id: 'sheets', label: 'Google Sheet', icon: Settings }
      ];
    }
    return [];
  };

  const tabs = renderTabs();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200">
      <div className={`grid grid-cols-${tabs.length} items-center h-16 max-w-lg mx-auto px-2`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors active:scale-95"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-slate-500'
                }`}
              />
              <span
                className={`text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap ${
                  isActive ? 'text-blue-700 font-semibold' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
