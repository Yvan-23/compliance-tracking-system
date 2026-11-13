import { Bell, User, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';
import LanguageSwitcher from './LanguageSwitcher';

const API_URL = 'http://localhost:8080/api/v1';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

const decodeToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    const roles = payload.roles || [];
    const clean = roles.map(r => r.replace('ROLE_', ''));
    let role = null;
    if (clean.includes('ADMIN')) role = 'ADMIN';
    else if (clean.includes('AUDITOR')) role = 'AUDITOR';
    else if (clean.includes('ENTITY')) role = 'ENTITY';
    return { name: payload.name || null, role };
  } catch {
    return null;
  }
};

export default function Navbar({ onMenuClick }) {
  const [userInfo, setUserInfo] = useState({ name: '', role: '' });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const decoded = decodeToken();
    const name = decoded?.name || localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'User';
    const role = decoded?.role || localStorage.getItem('userRole') || 'User';
    const roleLabels = {
      ADMIN: 'Administrator',
      ENTITY: 'Entity',
      AUDITOR: 'Auditor'
    };
    setUserInfo({ name, role: roleLabels[role] || role });
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications?size=10`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        setNotifications(data.data.content || []);
        const unread = (data.data.content || []).filter(n => !n.readStatus).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('organizationId');
    navigate('/login');
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <header ref={navRef} className="fixed top-0 left-60 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-white/20 z-40">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <GlobalSearch />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Language */}
          <LanguageSwitcher />

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#99CC26] text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Notifications</span>
                  <button onClick={() => navigate('/notifications')} className="text-xs text-[#005387] hover:text-[#004570]">
                    See all
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? notifications.slice(0, 5).map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => navigate('/notifications')}
                      className="w-full px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                    >
                      <p className="text-sm text-gray-900">{notif.message || notif.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatTime(notif.createdAt)}</p>
                    </button>
                  )) : (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">No notifications</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200"></div>

          {/* User Profile */}
          <div className="relative">
            <button 
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-[#005387] rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{userInfo.name}</p>
                <p className="text-xs text-gray-500">{userInfo.role}</p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
                <button
                  onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => { handleLogout(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 text-sm text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
