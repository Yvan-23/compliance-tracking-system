import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Clock, Upload, Landmark, Sparkles, Loader2, Eye, X, ExternalLink, AlertCircle, FileText, RotateCw } from 'lucide-react';

const API_URL = 'http://localhost:8080/api/v1';

const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  };
  const tenantId = localStorage.getItem('tenantId');
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  return headers;
};

export default function CompliancePage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [overallScore, setOverallScore] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [initError, setInitError] = useState('');
  const [entityFilterActive, setEntityFilterActive] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('all');

  useEffect(() => {
    fetchOrganizations();
    fetchData();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch(`${API_URL}/organizations?size=200`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        setOrganizations(data.data.content || data.data);
      }
    } catch (e) {
      console.error('Error fetching organizations:', e);
    }
  };

  const fetchData = async (orgIdOverride) => {
    try {
      const orgId = orgIdOverride || (selectedOrgId !== 'all' ? selectedOrgId : null) || localStorage.getItem('organizationId');
      const userRole = localStorage.getItem('userRole');

      if (!orgId && selectedOrgId === 'all') {
        const recRes = await fetch(`${API_URL}/compliance/records?size=100`, { headers: getAuthHeaders() });
        const recData = await recRes.json();
        if (recData.success) setRecords(recData.data?.content || recData.data || []);
        setOverallScore(null);
        setLoading(false);
        return;
      }

      if (!orgId) {
        setLoading(false);
        return;
      }

      const [recRes, reqRes, regRes] = await Promise.all([
        fetch(`${API_URL}/compliance/organization/${orgId}/records?size=100`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/requirements?size=200`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/regulations?size=200`, { headers: getAuthHeaders() })
      ]);

      const recData = await recRes.json();
      const reqData = await reqRes.json();
      const regData = await regRes.json();

      let allRegulations = regData.data?.content || regData.data || [];
      let allRequirements = reqData.data?.content || reqData.data || [];
      let filteredRecords = recData.data?.content || recData.data || [];

      if (userRole === 'ENTITY' && orgId) {
        try {
          const orgRes = await fetch(`${API_URL}/organizations/${orgId}`, { headers: getAuthHeaders() });
          const orgData = await orgRes.json();
          const orgSector = orgData.success && orgData.data ? orgData.data.sector : null;
          if (orgSector) {
            const sectorLower = orgSector.toLowerCase();
            allRegulations = allRegulations.filter(r => r.sector?.toLowerCase() === sectorLower);
            const regIds = new Set(allRegulations.map(r => r.id));
            allRequirements = allRequirements.filter(req => req.regulationId && regIds.has(req.regulationId));
            const reqIds = new Set(allRequirements.map(r => r.id));
            filteredRecords = filteredRecords.filter(rec => rec.requirementId && reqIds.has(rec.requirementId));
            setEntityFilterActive(true);
          } else {
            filteredRecords = [];
            setEntityFilterActive(false);
          }
        } catch (e) {
          console.warn('Could not filter by sector:', e);
          setEntityFilterActive(false);
        }
      }

      if (recData.success) setRecords(filteredRecords);

      try {
        const scoreRes = await fetch(`${API_URL}/compliance/organization/${orgId}/score`, { headers: getAuthHeaders() });
        const scoreData = await scoreRes.json();
        if (scoreData.success) setOverallScore(scoreData.data);
      } catch (e) {
        console.warn('Could not fetch overall score:', e);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrgChange = (e) => {
    const newOrgId = e.target.value;
    setSelectedOrgId(newOrgId);
    setLoading(true);
    fetchData(newOrgId !== 'all' ? newOrgId : null);
  };

  const initializeCompliance = async () => {
    const orgId = localStorage.getItem('organizationId');
    if (!orgId) return;
    if (!confirm('Initialize compliance records for your organization?')) return;
    setInitError('');
    setInitializing(true);
    try {
      const response = await fetch(`${API_URL}/compliance/organization/${orgId}/initialize`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        fetchData();
      } else {
        setInitError(data.message || 'Failed to initialize');
      }
    } catch (error) {
      console.error('Error:', error);
      setInitError('Error: ' + error.message);
    } finally {
      setInitializing(false);
    }
  };

  const recalculateAll = async () => {
    setRecalculating(true);
    try {
      await fetch(`${API_URL}/compliance/recalculate`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      fetchData();
    } catch (error) {
      console.error('Recalculation error:', error);
    } finally {
      setRecalculating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      COMPLIANT: 'bg-green-50 text-green-700 border border-green-200',
      NON_COMPLIANT: 'bg-red-50 text-red-700 border border-red-200',
      PENDING: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      SUBMITTED: 'bg-blue-50 text-blue-700 border border-blue-200',
      UNDER_REVIEW: 'bg-amber-50 text-amber-700 border border-amber-200',
      WAIVED: 'bg-gray-50 text-gray-600 border border-gray-200'
    };
    return colors[status] || colors.PENDING;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLIANT': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'NON_COMPLIANT': return <XCircle className="w-3.5 h-3.5" />;
      case 'PENDING':
      case 'SUBMITTED':
      case 'UNDER_REVIEW': return <Clock className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const filtered = records.filter(r => {
    const matchesSearch = (r.requirementTitle || r.requirement?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.organizationName || r.organization?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || r.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: records.length,
    compliant: records.filter(r => r.status === 'COMPLIANT').length,
    nonCompliant: records.filter(r => r.status === 'NON_COMPLIANT').length,
    submitted: records.filter(r => r.status === 'SUBMITTED').length,
    pending: records.filter(r => r.status === 'PENDING').length
  };

  const runAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(`${API_URL}/ai/compliance-analysis`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          organization: localStorage.getItem('organizationName') || 'Your Organization',
          complianceStatus: `${stats.compliant} compliant, ${stats.nonCompliant} non-compliant`,
          score: stats.total > 0 ? (stats.compliant / stats.total) * 100 : 0
        })
      });
      const data = await response.json();
      if (data.success && data.data?.analysis) {
        setAiAnalysis(data.data.analysis);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
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
          <h1 className="text-2xl font-semibold text-gray-900">Compliance</h1>
          <p className="text-sm text-gray-500 mt-1 font-light">Track and manage compliance status</p>
        </div>
        <div className="flex gap-2">
          {records.length === 0 && entityFilterActive !== false ? (
            <button
              onClick={initializeCompliance}
              disabled={initializing}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#005387] text-white font-medium rounded-xl hover:bg-[#004570] disabled:opacity-50"
            >
              {initializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Initialize
            </button>
          ) : null}
          {records.length > 0 && (<>
            <button
              onClick={runAIAnalysis}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#005387] text-white font-medium rounded-xl hover:bg-[#004570] disabled:opacity-50"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI Analysis
            </button>
            <button
              onClick={recalculateAll}
              disabled={recalculating}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#005387] text-white font-medium rounded-xl hover:bg-[#004570] disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
              Recalculate
            </button>
          </>)}
        </div>
      </div>

      {initError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{initError}</span>
          <button onClick={() => setInitError('')} className="ml-auto text-red-500 hover:text-red-700 underline text-xs">Dismiss</button>
        </div>
      )}

      {aiAnalysis && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">AI Insights</h3>
          </div>
          <div className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap font-light">{aiAnalysis}</div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-soft">
          {entityFilterActive === false ? (
            <>
              <AlertCircle className="w-16 h-16 text-amber-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Organization sector not set</h3>
              <p className="text-sm text-gray-500 mb-6">Contact an administrator to set your organization's sector to see relevant compliance records</p>
            </>
          ) : (
            <>
              <Landmark className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No compliance records</h3>
              <p className="text-sm text-gray-500 mb-6">Initialize compliance records to get started</p>
              <button
                onClick={initializeCompliance}
                disabled={initializing}
                className="flex items-center gap-2 px-6 py-3 bg-[#005387] text-white font-medium rounded-xl hover:bg-[#004570] disabled:opacity-50"
              >
                {initializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Initialize Compliance Records
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100 md:col-span-2">
              <p className="text-xs text-gray-500 font-light mb-2">Overall Compliance</p>
              <div className="flex items-end gap-3">
                <p className={`text-3xl font-bold ${overallScore >= 80 ? 'text-green-600' : overallScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {overallScore != null ? `${Math.round(overallScore)}%` : '-'}
                </p>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${overallScore >= 80 ? 'bg-green-500' : overallScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${overallScore || 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 font-light">Total</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <p className="text-2xl font-semibold text-gray-900">{stats.compliant}</p>
              </div>
              <p className="text-xs text-gray-500 font-light">Compliant</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-500" />
                <p className="text-2xl font-semibold text-gray-900">{stats.submitted}</p>
              </div>
              <p className="text-xs text-gray-500 font-light">Submitted</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
              <p className="text-xs text-gray-500 font-light">Pending</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <p className="text-2xl font-semibold text-gray-900">{stats.nonCompliant}</p>
              </div>
              <p className="text-xs text-gray-500 font-light">Non-Compliant</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search requirements or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
              />
            </div>
            <select
              value={selectedOrgId}
              onChange={handleOrgChange}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none text-sm min-w-[180px]"
            >
              <option value="all">All Organizations</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none text-sm"
            >
              <option value="all">All Status</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="NON_COMPLIANT">Non-Compliant</option>
              <option value="PENDING">Pending</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
            </select>
          </div>

          <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Requirement</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Organization</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Period</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Score</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium text-sm">No matching records</p>
                      <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filter</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((record) => (
                    <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-gray-500" />
                          </div>
                          <p className="text-sm font-medium text-gray-900">{record.requirementTitle || record.requirement?.title || '-'}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm text-gray-600">{record.organizationName || record.organization?.name || '-'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm text-gray-500">{record.reportingPeriodStart?.slice(0, 10) || '-'} → {record.reportingPeriodEnd?.slice(0, 10) || '-'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                (record.complianceScore || 0) >= 80 ? 'bg-green-500' :
                                (record.complianceScore || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${record.complianceScore || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{Math.round(record.complianceScore || 0)}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(record.status)}`}>
                          {getStatusIcon(record.status)}
                          {record.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setDetailRecord(record)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detailRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailRecord(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Compliance Record Details</h3>
              <button onClick={() => setDetailRecord(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Requirement</p>
                <p className="text-sm font-medium text-gray-900">{detailRecord.requirementTitle || detailRecord.requirement?.title || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Organization</p>
                <p className="text-sm font-medium text-gray-900">{detailRecord.organizationName || detailRecord.organization?.name || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(detailRecord.status)}`}>
                    {getStatusIcon(detailRecord.status)}
                    {detailRecord.status?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Score</p>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          (detailRecord.complianceScore || 0) >= 80 ? 'bg-green-500' :
                          (detailRecord.complianceScore || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${detailRecord.complianceScore || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{Math.round(detailRecord.complianceScore || 0)}%</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Reporting Period</p>
                <p className="text-sm font-medium text-gray-900">
                  {detailRecord.reportingPeriodStart?.slice(0, 10) || '-'} to {detailRecord.reportingPeriodEnd?.slice(0, 10) || '-'}
                </p>
              </div>
              <button
                onClick={() => { setDetailRecord(null); navigate('/submissions'); }}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#005387] text-white text-sm font-medium rounded-xl hover:bg-[#004570]"
              >
                <ExternalLink className="w-4 h-4" />
                View Submissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
