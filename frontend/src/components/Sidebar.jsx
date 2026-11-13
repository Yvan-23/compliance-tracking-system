import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  CheckCircle,
  Send,
  FileCheck,
  Search,
  BarChart3,
  Shield,
  LogOut,
  Landmark,
  Users,
  ClipboardList,
  Bell,
  FileWarning,
  AlertTriangle,
  Scale,
  Workflow,
  CheckSquare,
  Bot,
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

const menuItems = {
  ADMIN: [
    { section: 'OVERVIEW', items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ]},
    { section: 'MANAGEMENT', items: [
      { name: 'Regulations', icon: Scale, path: '/regulations' },
      { name: 'Requirements', icon: FileText, path: '/requirements' },
      { name: 'Organizations', icon: Landmark, path: '/organizations' },
      { name: 'Users', icon: Users, path: '/users' },
      { name: 'Compliance', icon: CheckCircle, path: '/compliance' },
      { name: 'Submissions', icon: Send, path: '/submissions' },
    ]},
    { section: 'OPERATIONS', items: [
      { name: 'Evidence', icon: FileCheck, path: '/evidence' },
      { name: 'Inspections', icon: Search, path: '/inspections' },
      { name: 'Enforcement', icon: AlertTriangle, path: '/enforcement' },
    ]},
    { section: 'ANALYTICS', items: [
      { name: 'Reports', icon: BarChart3, path: '/reports' },
    ]},
    { section: 'AI', items: [
      { name: 'Assistant', icon: Bot, path: '/assistant' },
    ]},
    { section: 'SYSTEM', items: [
      { name: 'Notifications', icon: Bell, path: '/notifications' },
      { name: 'Audit Logs', icon: FileWarning, path: '/auditlogs' },
    ]},
  ],
  ENTITY: [
    { section: 'OVERVIEW', items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ]},
    { section: 'COMPLIANCE', items: [
      { name: 'My Requirements', icon: FileText, path: '/requirements' },
      { name: 'Compliance Status', icon: CheckCircle, path: '/compliance' },
    ]},
    { section: 'SUBMISSIONS', items: [
      { name: 'Submit Reports', icon: Send, path: '/submissions' },
      { name: 'Upload Evidence', icon: FileCheck, path: '/evidence' },
      { name: 'Inspections', icon: Search, path: '/inspections' },
    ]},
    { section: 'OPERATIONS', items: [
      { name: 'Enforcement', icon: AlertTriangle, path: '/enforcement' },
    ]},
    { section: 'AI', items: [
      { name: 'Assistant', icon: Bot, path: '/assistant' },
    ]},
    { section: 'COMMUNICATION', items: [
      { name: 'Notifications', icon: Bell, path: '/notifications' },
    ]},
    { section: 'SYSTEM', items: [
      { name: 'Reports', icon: BarChart3, path: '/reports' },
    ]},
  ],
  AUDITOR: [
    { section: 'OVERVIEW', items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ]},
    { section: 'MANAGEMENT', items: [
      { name: 'Regulations', icon: Scale, path: '/regulations' },
      { name: 'Organizations', icon: Landmark, path: '/organizations' },
    ]},
    { section: 'REVIEW', items: [
      { name: 'Requirements', icon: FileText, path: '/requirements' },
      { name: 'Compliance Review', icon: CheckCircle, path: '/audit-compliance' },
      { name: 'Submissions Review', icon: Send, path: '/audit-submissions' },
      { name: 'Evidence Review', icon: FileCheck, path: '/audit-evidence' },
    ]},
    { section: 'OPERATIONS', items: [
      { name: 'Inspections', icon: Search, path: '/inspections' },
      { name: 'Enforcement', icon: AlertTriangle, path: '/enforcement' },
    ]},
    { section: 'AI', items: [
      { name: 'Assistant', icon: Bot, path: '/assistant' },
    ]},
    { section: 'REPORTS', items: [
      { name: 'Reports', icon: BarChart3, path: '/reports' },
    ]},
    { section: 'SYSTEM', items: [
      { name: 'Notifications', icon: Bell, path: '/notifications' },
    ]},
  ],
};

export default function Sidebar({ activeItem = 'Dashboard', onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const items = menuItems[userRole] || menuItems.ADMIN;
  
  const getActiveItem = () => {
    const currentPath = location.pathname;
    for (const section of items) {
      for (const item of section.items) {
        if (item.path === currentPath) {
          return item.name;
        }
      }
    }
    return 'Dashboard';
  };
  
  const currentActive = getActiveItem();
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#005387] z-50 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logorura-negative.png" alt="RURA" className="w-32" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto custom-scrollbar">
        {items.map((section) => (
          <div key={section.section}>
            <h3 className="px-3 text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
              {t('nav.' + section.section)}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentActive === item.name;
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={`w-full relative flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? 'text-white bg-white/15 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:bg-[#99CC26] before:rounded-full'
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#99CC26]' : 'text-white/40'}`} />
                      {t('nav.' + item.name)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-white/50 hover:text-[#A61C1C] hover:bg-white/10 transition-all duration-200"
        >
          <LogOut className="w-4.5 h-4.5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
