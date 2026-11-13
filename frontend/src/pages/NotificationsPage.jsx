import { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, AlertTriangle, Info, Search, MailOpen, Loader2, ArrowRight, Inbox } from 'lucide-react';

const API_URL = 'http://localhost:8080/api/v1';

const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  };
  const tenantId = localStorage.getItem('tenantId');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  return headers;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) setNotifications(data.data.content || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, readStatus: true } : n));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleRead = async (id, currentStatus) => {
    if (!currentStatus) await markAsRead(id);
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      setNotifications(prev => prev.map(n => ({ ...n, readStatus: true })));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getTypeStyle = (type) => {
    const styles = {
      DEADLINE: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', color: '#f59e0b', icon: <Clock className="w-5 h-5 text-amber-600" />, label: 'Deadline' },
      SUBMISSION: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', color: '#3b82f6', icon: <CheckCircle className="w-5 h-5 text-blue-600" />, label: 'Submission' },
      ESCALATION: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', color: '#ef4444', icon: <AlertTriangle className="w-5 h-5 text-red-600" />, label: 'Escalation' },
      ENFORCEMENT: { bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-500', color: '#a855f7', icon: <AlertTriangle className="w-5 h-5 text-purple-600" />, label: 'Enforcement' },
      SYSTEM: { bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-500', color: '#6b7280', icon: <Info className="w-5 h-5 text-gray-600" />, label: 'System' },
      INFO: { bg: 'bg-sky-50', border: 'border-sky-200', dot: 'bg-sky-500', color: '#0ea5e9', icon: <Info className="w-5 h-5 text-sky-600" />, label: 'Info' },
      WARNING: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', color: '#f59e0b', icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, label: 'Warning' },
      ERROR: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', color: '#ef4444', icon: <AlertTriangle className="w-5 h-5 text-red-600" />, label: 'Error' },
      EXPIRY: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', color: '#f59e0b', icon: <Clock className="w-5 h-5 text-amber-600" />, label: 'Expiry' },
      VIOLATION: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', color: '#ef4444', icon: <AlertTriangle className="w-5 h-5 text-red-600" />, label: 'Violation' },
      UPDATE: { bg: 'bg-sky-50', border: 'border-sky-200', dot: 'bg-sky-500', color: '#0ea5e9', icon: <Info className="w-5 h-5 text-sky-600" />, label: 'Update' }
    };
    return styles[type] || styles.SYSTEM;
  };

  const filtered = notifications.filter(n => {
    const matchesSearch = n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || n.type === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.readStatus).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#005387]" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1 font-light">System alerts and messages</p>
        </div>
        {stats.unread > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#005387] text-white text-sm font-medium rounded-xl hover:bg-[#004570] transition-colors"
          >
            <MailOpen className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#005387]/10 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#005387]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 font-light">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.unread}</p>
              <p className="text-xs text-gray-500 font-light">Unread</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.total - stats.unread}</p>
              <p className="text-xs text-gray-500 font-light">Read</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none text-sm"
        >
          <option value="all">All Types</option>
          <option value="INFO">Info</option>
          <option value="DEADLINE">Deadline</option>
          <option value="SUBMISSION">Submission</option>
          <option value="ESCALATION">Escalation</option>
          <option value="ENFORCEMENT">Enforcement</option>
          <option value="WARNING">Warning</option>
          <option value="ERROR">Error</option>
          <option value="EXPIRY">Expiry</option>
          <option value="VIOLATION">Violation</option>
          <option value="UPDATE">Update</option>
          <option value="SYSTEM">System</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 py-16 text-center">
            <Inbox className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-base">No notifications found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm || filter !== 'all' ? 'Try adjusting your search or filters' : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          filtered.map((notification) => {
            const style = getTypeStyle(notification.type);
            return (
              <div
                key={notification.id}
                onClick={() => toggleRead(notification.id, notification.readStatus)}
                className={`rounded-xl border bg-white transition-all cursor-pointer hover:shadow-sm ${
                  !notification.readStatus ? 'border-l-4 shadow-soft' : 'opacity-75'
                } ${style.border}`}
                style={!notification.readStatus ? { borderLeftColor: style.color } : {}}
              >
                <div className="flex items-start gap-4 p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.bg}`}>
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        {!notification.readStatus && (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                        )}
                        <h3 className={`text-sm font-medium truncate ${!notification.readStatus ? 'text-gray-900' : 'text-gray-500'}`}>
                          {notification.title}
                        </h3>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.border} border`}>
                        {style.label}
                      </span>
                      {!notification.readStatus && (
                        <span className="text-[10px] text-[#005387] font-medium flex items-center gap-1">
                          Click to dismiss <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
