import { useState, useEffect } from 'react';
import { Search, Filter, Download, User, Clock, FileText, Activity, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const API_URL = 'http://localhost:8080/api/v1';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async (pageOverride) => {
    const currentPage = pageOverride !== undefined ? pageOverride : page;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.set('size', '25');
      params.set('page', currentPage.toString());
      if (searchTerm) params.set('search', searchTerm);
      if (filterAction) params.set('action', filterAction);
      if (filterEntity) params.set('entityType', filterEntity);
      if (startDate) params.set('startDate', new Date(startDate).toISOString().replace('Z', ''));
      if (endDate) params.set('endDate', new Date(endDate + 'T23:59:59').toISOString().replace('Z', ''));


      const response = await fetch(`${API_URL}/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setLogs(data.data.content || []);
        setTotalPages(data.data.totalPages || 0);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchData(0);
  };

  useEffect(() => {
    fetchData();
  }, [page, filterEntity, filterAction, startDate, endDate]);

  const getActionColor = (action) => {
    if (!action) return 'bg-gray-100 text-gray-700';
    const upper = action.toUpperCase();
    if (upper.includes('CREATE') || upper.includes('REGISTER')) return 'bg-green-50 text-green-700 border border-green-200';
    if (upper.includes('UPDATE') || upper.includes('EDIT')) return 'bg-blue-50 text-blue-700 border border-blue-200';
    if (upper.includes('DELETE') || upper.includes('REMOVE')) return 'bg-red-50 text-red-700 border border-red-200';
    if (upper.includes('LOGIN')) return 'bg-purple-50 text-purple-700 border border-purple-200';
    if (upper.includes('APPROVE')) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (upper.includes('REJECT')) return 'bg-orange-50 text-orange-700 border border-orange-200';
    if (upper.includes('SUBMIT')) return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
    if (upper.includes('STATUS_CHANGE')) return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-gray-50 text-gray-700 border border-gray-200';
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User', 'User Name', 'IP Address', 'Details'].join(','),
      ...logs.map(l => [
        l.timestamp,
        `"${l.action}"`,
        l.entityType,
        l.entityId,
        l.userEmail,
        l.userName || '',
        l.ipAddress || '',
        `"${(l.details || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const entityTypes = ['USER', 'ORGANIZATION', 'COMPLIANCE_REQUIREMENT', 'SUBMISSION', 'ENFORCEMENT', 'INSPECTION', 'REGULATION', 'EVIDENCE'];
  const actionTypes = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'APPROVE', 'REJECT', 'SUBMIT', 'REGISTER', 'STATUS_CHANGE'];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1 font-light">System activity and user actions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setPage(0); fetchData(); }}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-5 space-y-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search actions, users, details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Entity</label>
            <select
              value={filterEntity}
              onChange={(e) => { setFilterEntity(e.target.value); setPage(0); }}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm min-w-[140px]"
            >
              <option value="">All Entities</option>
              {entityTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm min-w-[120px]"
            >
              <option value="">All Actions</option>
              {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-gray-800 text-white font-medium rounded-xl hover:bg-gray-700 text-sm"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-4 px-5">Timestamp</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-4 px-5">Action</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-4 px-5">Entity</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-4 px-5">User</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-4 px-5">IP</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-4 px-5">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">No audit logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id || Math.random()} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-5 text-sm text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-600">{log.entityType || '-'}</span>
                        {log.entityId && log.entityId !== 'N/A' && (
                          <span className="text-xs text-gray-400 font-mono">#{log.entityId.slice(0, 8)}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <div>
                          <span className="text-sm text-gray-600">{log.userName || log.userEmail || 'system'}</span>
                          {log.userName && log.userEmail && (
                            <span className="text-xs text-gray-400 ml-1">({log.userEmail})</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-sm text-gray-500 font-mono">{log.ipAddress || '-'}</td>
                    <td className="py-4 px-5">
                      <p className="text-sm text-gray-600 max-w-xs truncate" title={log.details}>
                        {log.details || '-'}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page <= 0}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (page < 3) {
                  pageNum = i;
                } else if (page > totalPages - 3) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 text-sm rounded-lg ${page === pageNum ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.max(0, Math.min(totalPages - 1, p + 1)))}
                disabled={page >= totalPages - 1 || totalPages === 0}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
