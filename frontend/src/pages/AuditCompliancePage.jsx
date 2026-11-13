import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle, Landmark, Search, Loader2, X, Eye, ShieldCheck, Download, RotateCcw, Brain } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/api/v1';

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

export default function AuditCompliancePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('all');

  useEffect(() => {
    fetchData();
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/organizations?size=200`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        setOrganizations(data.data.content || data.data);
      }
    } catch (e) {
      console.error('Error fetching organizations:', e);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/compliance/records?size=100`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success && data.data) {
        setRecords(data.data.content || []);
      }
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const [validatingId, setValidatingId] = useState(null);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [validateRecord, setValidateRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [toast, setToast] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertRecord, setRevertRecord] = useState(null);
  const [revertingId, setRevertingId] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleValidate = (record) => {
    setValidateRecord(record);
    setShowValidateModal(true);
  };

  const handleView = async (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`${API_BASE_URL}/submissions/record/${record.id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data.content || []);
      } else {
        setSubmissions([]);
      }
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleDownload = async (submissionId, fileName) => {
    try {
      const res = await fetch(`${API_BASE_URL}/submissions/${submissionId}/download`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `${submissionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  const handleRevert = (record) => {
    setRevertRecord(record);
    setShowRevertModal(true);
  };

  const confirmRevert = async () => {
    if (!revertRecord) return;
    const userId = localStorage.getItem('userId');
    if (!userId) {
      showToast('User ID not found. Please log in again.', 'error');
      return;
    }
    setRevertingId(revertRecord.id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/compliance/record/${revertRecord.id}/revert?userId=${userId}`,
        { method: 'POST', headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.success) {
        showToast(`Compliance reverted to pending for ${revertRecord.organizationName || revertRecord.organization?.name}`, 'success');
        fetchData();
      } else {
        showToast(data.message || 'Revert failed', 'error');
      }
    } catch (error) {
      showToast('Error reverting compliance', 'error');
    } finally {
      setRevertingId(null);
      setShowRevertModal(false);
      setRevertRecord(null);
    }
  };

  const confirmValidate = async () => {
    if (!validateRecord) return;
    const userId = localStorage.getItem('userId');
    if (!userId) {
      showToast('User ID not found. Please log in again.', 'error');
      return;
    }
    setValidatingId(validateRecord.id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/compliance/record/${validateRecord.id}/approve?userId=${userId}`,
        { method: 'POST', headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.success) {
        showToast(`Compliance validated for ${validateRecord.organizationName || validateRecord.organization?.name}`, 'success');
        fetchData();
      } else {
        showToast(data.message || 'Validation failed', 'error');
      }
    } catch (error) {
      showToast('Error validating compliance', 'error');
    } finally {
      setValidatingId(null);
      setShowValidateModal(false);
      setValidateRecord(null);
    }
  };

  const filteredRecords = records.filter(r => {
    const orgName = r.organizationName || r.organization?.name || '';
    const reqTitle = r.requirementTitle || r.requirement?.title || '';
    const matchesSearch = orgName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          reqTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrg = selectedOrgId === 'all' || r.organizationId === selectedOrgId || r.organization?.id === selectedOrgId;
    return matchesSearch && matchesOrg;
  });

  const sectioned = {
    SUBMITTED: filteredRecords.filter(r => r.status === 'SUBMITTED'),
    COMPLIANT: filteredRecords.filter(r => r.status === 'COMPLIANT'),
    NON_COMPLIANT: filteredRecords.filter(r => r.status === 'NON_COMPLIANT'),
    PENDING: filteredRecords.filter(r => r.status === 'PENDING'),
  };

  const stats = {
    total: records.length,
    submitted: records.filter(r => r.status === 'SUBMITTED').length,
    compliant: records.filter(r => r.status === 'COMPLIANT').length,
    nonCompliant: records.filter(r => r.status === 'NON_COMPLIANT').length,
    pending: records.filter(r => r.status === 'PENDING').length,
  };

  const SubmissionTable = ({ title, records: recs, icon: Icon, iconBg, iconColor, emptyMsg }) => (
    <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <div className={`w-7 h-7 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <span className="ml-auto text-xs font-medium text-gray-400">{recs.length} record{recs.length !== 1 ? 's' : ''}</span>
      </div>
      {recs.length === 0 ? (
        <div className="py-10 text-center">
          <Icon className={`w-10 h-10 ${iconColor} opacity-30 mx-auto mb-2`} />
          <p className="text-sm text-gray-400">{emptyMsg}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Organization</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Requirement</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Period</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Score</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((record) => (
                <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Landmark className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{record.organizationName || record.organization?.name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                    {record.requirementTitle || record.requirement?.title || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {record.reportingPeriodStart?.slice(0, 7)} - {record.reportingPeriodEnd?.slice(0, 7)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (record.complianceScore || 0) >= 80 ? 'bg-green-500' :
                            (record.complianceScore || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${record.complianceScore || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{record.complianceScore || 0}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleView(record)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="View details">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                      {record.status === 'COMPLIANT' ? (
                        <button onClick={() => handleRevert(record)} disabled={revertingId === record.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors">
                          {revertingId === record.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          Reverse
                        </button>
                      ) : (
                        <button onClick={() => handleValidate(record)} disabled={validatingId === record.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#005387] bg-[#005387]/5 rounded-lg hover:bg-[#005387]/10 disabled:opacity-50 transition-colors">
                          {validatingId === record.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          Validate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#005387]" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Compliance Review</h1>
        <p className="text-sm text-gray-500 mt-1 font-light">Review and validate entity compliance status.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#005387]/10 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#005387]" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 font-light">Total Records</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.submitted}</p>
              <p className="text-xs text-gray-500 font-light">Submitted</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.compliant}</p>
              <p className="text-xs text-gray-500 font-light">Compliant</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.nonCompliant}</p>
              <p className="text-xs text-gray-500 font-light">Non-Compliant</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-yellow-50 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.pending}</p>
              <p className="text-xs text-gray-500 font-light">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls: search + org selector */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by organization or requirement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
          />
        </div>
        <select
          value={selectedOrgId}
          onChange={(e) => setSelectedOrgId(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm min-w-[200px]"
        >
          <option value="all">All Organizations</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
      </div>

      {/* Sectioned tables */}
      <div className="space-y-6">
        <SubmissionTable
          title="Submitted"
          records={sectioned.SUBMITTED}
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          emptyMsg="No submitted compliance records"
        />
        <SubmissionTable
          title="Compliant"
          records={sectioned.COMPLIANT}
          icon={CheckCircle}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          emptyMsg="No compliant records"
        />
        <SubmissionTable
          title="Non-Compliant"
          records={sectioned.NON_COMPLIANT}
          icon={XCircle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          emptyMsg="No non-compliant records"
        />
        <SubmissionTable
          title="Pending"
          records={sectioned.PENDING}
          icon={Clock}
          iconBg="bg-yellow-50"
          iconColor="text-yellow-600"
          emptyMsg="No pending records"
        />
      </div>

      {/* Revert Confirmation Modal */}
      {showRevertModal && revertRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setShowRevertModal(false); setRevertRecord(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Reverse Validation</h2>
              </div>
              <button onClick={() => { setShowRevertModal(false); setRevertRecord(null); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-3">
                <RotateCcw className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Confirm reversal</p>
                  <p className="text-amber-600 mt-1">
                    This will revert compliance for <strong>{revertRecord.organizationName || revertRecord.organization?.name}</strong> back to Pending.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm bg-gray-50 rounded-xl p-4">
                <span className="text-gray-500">Requirement</span>
                <span className="text-gray-900 font-medium">{revertRecord.requirementTitle || 'N/A'}</span>
                <span className="text-gray-500">Current Status</span>
                <span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {revertRecord.status}
                  </span>
                </span>
                <span className="text-gray-500">Score</span>
                <span className="text-gray-900">{revertRecord.complianceScore || 0}%</span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setShowRevertModal(false); setRevertRecord(null); }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRevert}
                  disabled={revertingId === revertRecord.id}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {revertingId === revertRecord.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  {revertingId === revertRecord.id ? 'Reverting...' : 'Confirm Reversal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validate Confirmation Modal */}
      {showValidateModal && validateRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setShowValidateModal(false); setValidateRecord(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#005387]/10 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#005387]" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Validate Compliance</h2>
              </div>
              <button onClick={() => { setShowValidateModal(false); setValidateRecord(null); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Confirm validation</p>
                  <p className="text-blue-600 mt-1">
                    This will approve compliance for <strong>{validateRecord.organizationName || validateRecord.organization?.name}</strong>.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm bg-gray-50 rounded-xl p-4">
                <span className="text-gray-500">Requirement</span>
                <span className="text-gray-900 font-medium">{validateRecord.requirementTitle || 'N/A'}</span>
                <span className="text-gray-500">Current Status</span>
                <span>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                    validateRecord.status === 'COMPLIANT' ? 'bg-green-100 text-green-700' :
                    validateRecord.status === 'NON_COMPLIANT' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {validateRecord.status}
                  </span>
                </span>
                <span className="text-gray-500">Score</span>
                <span className="text-gray-900">{validateRecord.complianceScore || 0}%</span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setShowValidateModal(false); setValidateRecord(null); }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmValidate}
                  disabled={validatingId === validateRecord.id}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#005387] rounded-xl hover:bg-[#004570] disabled:opacity-50 transition-colors"
                >
                  {validatingId === validateRecord.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  {validatingId === validateRecord.id ? 'Validating...' : 'Confirm Validation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#005387]/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#005387]" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Compliance Record Details</h2>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Metadata */}
              <div className="grid grid-cols-[130px_1fr] gap-3 text-sm">
                <span className="text-gray-500 font-medium">Organization</span>
                <span className="text-gray-900 font-semibold">{selectedRecord.organizationName || 'N/A'}</span>

                <span className="text-gray-500 font-medium">Requirement</span>
                <span className="text-gray-700">{selectedRecord.requirementTitle || 'N/A'}</span>

                <span className="text-gray-500 font-medium">Reporting Period</span>
                <span className="text-gray-900">
                  {selectedRecord.reportingPeriodStart?.slice(0, 7)} — {selectedRecord.reportingPeriodEnd?.slice(0, 7)}
                </span>

                <span className="text-gray-500 font-medium">Status</span>
                <span>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full ${
                    selectedRecord.status === 'COMPLIANT' ? 'bg-green-100 text-green-700' :
                    selectedRecord.status === 'NON_COMPLIANT' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedRecord.status === 'COMPLIANT' ? <CheckCircle className="w-3.5 h-3.5" /> :
                     selectedRecord.status === 'NON_COMPLIANT' ? <XCircle className="w-3.5 h-3.5" /> :
                     <Clock className="w-3.5 h-3.5" />}
                    {selectedRecord.status}
                  </span>
                </span>

                <span className="text-gray-500 font-medium">Compliance Score</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (selectedRecord.complianceScore || 0) >= 80 ? 'bg-green-500' :
                        (selectedRecord.complianceScore || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${selectedRecord.complianceScore || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{selectedRecord.complianceScore || 0}%</span>
                </div>

                <span className="text-gray-500 font-medium">Escalated</span>
                <span className={selectedRecord.escalated ? 'text-red-600 font-medium' : 'text-gray-500'}>
                  {selectedRecord.escalated ? 'Yes' : 'No'}
                </span>

                {selectedRecord.escalationDate && (
                  <>
                    <span className="text-gray-500 font-medium">Escalation Date</span>
                    <span className="text-gray-900">{new Date(selectedRecord.escalationDate).toLocaleString()}</span>
                  </>
                )}

                <span className="text-gray-500 font-medium">ID</span>
                <span className="text-gray-400 text-xs font-mono">{selectedRecord.id}</span>
              </div>

              {/* Submitted Documents & AI Insights */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4 text-gray-400" />
                  Submitted Documents
                </h3>
                {loadingSubmissions ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading submissions...
                  </div>
                ) : submissions.length === 0 ? (
                  <p className="text-sm text-gray-400 py-3">No submissions found for this compliance record.</p>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((sub) => (
                      <div key={sub.id} className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Submitted by:</span>
                            <span className="font-medium text-gray-900">{sub.submittedByName || 'Unknown'}</span>
                            <span className="text-gray-300 mx-1">|</span>
                            <span className="text-gray-400">{sub.submissionDate ? new Date(sub.submissionDate).toLocaleDateString() : ''}</span>
                          </div>
                          {sub.evidenceUrl || sub.fileUrl ? (
                            <button
                              onClick={() => handleDownload(sub.id, sub.evidenceUrl?.split('/').pop() || 'document.pdf')}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#005387] bg-[#005387]/5 rounded-lg hover:bg-[#005387]/10 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download File
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">No file attached</span>
                          )}
                        </div>

                        {/* AI Insights */}
                        {sub.aiScore != null && (
                          <div className="border-t border-gray-200 pt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Brain className="w-4 h-4 text-purple-500" />
                              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">AI Analysis</span>
                              {sub.aiAnalysisStatus && (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  sub.aiAnalysisStatus === 'AI_SUGGESTS_APPROVAL' ? 'bg-green-100 text-green-700' :
                                  sub.aiAnalysisStatus === 'AI_SUGGESTS_REJECTION' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {sub.aiAnalysisStatus.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-gray-500">AI Score:</span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      (sub.aiScore || 0) >= 70 ? 'bg-green-500' :
                                      (sub.aiScore || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${sub.aiScore || 0}%` }}
                                  />
                                </div>
                                <span className="font-medium text-gray-700">{Math.round(sub.aiScore)}%</span>
                              </div>
                            </div>
                            {sub.aiAnalysisDetails && (
                              <div className="mt-2 text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-100">
                                <p className="text-xs font-medium text-gray-400 mb-1">Details:</p>
                                <p className="whitespace-pre-wrap">{sub.aiAnalysisDetails}</p>
                              </div>
                            )}
                            {sub.documentSummary && (
                              <div className="mt-2 text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-100">
                                <p className="text-xs font-medium text-gray-400 mb-1">Summary:</p>
                                <p>{sub.documentSummary}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end p-5 border-t border-gray-100">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}