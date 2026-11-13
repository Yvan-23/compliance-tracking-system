/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useEffect } from 'react';
import { Search, FileCheck, CheckCircle, AlertTriangle, Download, Loader2, Plus, Upload, X, Calendar, Clock, FileWarning, Brain, Eye, RefreshCw, Trash2 } from 'lucide-react';

const API_URL = 'http://localhost:8080/api/v1';

const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` };
  const tenantId = localStorage.getItem('tenantId');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  return headers;
};

const EXPIRY_STATUS_CONFIG = {
  VALID: { label: 'Valid', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  EXPIRING_SOON: { label: 'Expiring Soon', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  EXPIRED: { label: 'Expired', bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
  NO_EXPIRY: { label: 'No Expiry', bg: 'bg-gray-100', text: 'text-gray-600', icon: FileCheck },
};

const DOCUMENT_TYPES = ['LICENSE', 'CERTIFICATE', 'PERMIT', 'TAX_CLEARANCE', 'INSURANCE', 'REGISTRATION', 'OTHER'];

export default function EvidencePage() {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [showExpiringModal, setShowExpiringModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsEvidence, setDetailsEvidence] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expiringEvidence, setExpiringEvidence] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    documentName: '', documentType: 'CERTIFICATE', documentNumber: '',
    issuer: '', issueDate: '', expiryDate: '', notes: '',
    requirementId: ''
  });
  const [requirements, setRequirements] = useState([]);
  const [allRegulations, setAllRegulations] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [linkReqId, setLinkReqId] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => { fetchData(); }, [page, filterStatus, filterType]);

  const fetchData = async () => {
    try {
      const orgId = localStorage.getItem('organizationId');

      const params = new URLSearchParams({ size: 100, page: page.toString() });
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      if (filterType !== 'ALL') params.set('documentType', filterType);
      if (searchTerm) params.set('search', searchTerm);

      const evUrl = orgId
        ? `${API_URL}/evidence/organization/${orgId}?${params}`
        : `${API_URL}/evidence?${params}`;
      const statsUrl = orgId ? `${API_URL}/evidence/organization/${orgId}/stats` : null;
      const expUrl = orgId ? `${API_URL}/evidence/organization/${orgId}/expiring?daysThreshold=30` : null;

      const evRes = await fetch(evUrl, { headers: getAuthHeaders() });
      const evData = await evRes.json();

      if (evData.success) {
        const content = evData.data.content || [];
        setEvidence(content);
        setTotalPages(evData.data.totalPages || 1);
      }

      if (statsUrl) {
        const sRes = await fetch(statsUrl, { headers: getAuthHeaders() });
        const sData = await sRes.json();
        if (sData.success) {
          setStats(prev => ({ ...prev, expired: sData.data.expired, expiringSoon: sData.data.expiringSoon }));
        }
      }
      if (expUrl) {
        const eRes = await fetch(expUrl, { headers: getAuthHeaders() });
        const eData = await eRes.json();
        if (eData.success) {
          setExpiringEvidence(eData.data || []);
        }
      }

      const userRole = localStorage.getItem('userRole');

      const [reqRes, regRes, orgsRes] = await Promise.all([
        fetch(`${API_URL}/requirements?size=200`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/regulations?size=200`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/organizations?size=200`, { headers: getAuthHeaders() })
      ]);
      const reqData = await reqRes.json();
      const regData = await regRes.json();
      const orgsData = await orgsRes.json();

      let allRegs = regData.data?.content || regData.data || [];
      let allReqs = reqData.data?.content || reqData.data || [];
      const orgs = orgsData.data?.content || orgsData.data || [];
      setOrganizations(orgs);
      setAllRegulations(allRegs);

      if (orgId) {
        try {
          const org = orgs.find(o => String(o.id) === String(orgId));
          const orgSector = org ? org.sector : null;
          if (orgSector) {
            const sectorLower = orgSector.trim().toLowerCase();
            allRegs = allRegs.filter(r => r.sector?.trim().toLowerCase() === sectorLower);
            const regIds = new Set(allRegs.map(r => r.id));
            allReqs = allReqs.filter(req => req.regulationId && regIds.has(req.regulationId));
          }
        } catch (e) {
          console.warn('Could not filter requirements by sector:', e);
        }
      }

      setRequirements(allReqs);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => { setPage(0); fetchData(); };

  const userRole = localStorage.getItem('userRole');

  const handleDownload = async (item) => {
    try {
      const res = await fetch(`${API_URL}/evidence/${item.id}/download`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.fileName || `${item.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  const handleDeleteEvidence = async (id) => {
    try {
      const res = await fetch(`${API_URL}/evidence/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        if (showDetailsModal && detailsEvidence?.id === id) setShowDetailsModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting evidence:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.documentName) return;
    setUploading(true);
    try {
      const orgId = localStorage.getItem('organizationId');
      const body = {
        organizationId: orgId,
        documentName: formData.documentName,
        documentType: formData.documentType || 'CERTIFICATE',
        documentNumber: formData.documentNumber,
        issuer: formData.issuer,
        issueDate: formData.issueDate || null,
        expiryDate: formData.expiryDate || null,
        notes: formData.notes,
        requirementId: formData.requirementId || null
      };

      if (selectedFile) {
        const formPayload = new FormData();
        formPayload.append('file', selectedFile);
        formPayload.append('request', new Blob([JSON.stringify(body)], { type: 'application/json' }));
        await fetch(`${API_URL}/evidence`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formPayload
        });
      } else {
        await fetch(`${API_URL}/evidence`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body)
        });
      }
      setShowModal(false);
      setSelectedFile(null);
      setFormData({ documentName: '', documentType: 'CERTIFICATE', documentNumber: '', issuer: '', issueDate: '', expiryDate: '', notes: '', requirementId: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleLinkRequirement = async () => {
    if (!linkReqId || !detailsEvidence) return;
    setLinking(true);
    try {
      const body = {
        organizationId: detailsEvidence.organizationId,
        documentName: detailsEvidence.documentName,
        documentType: detailsEvidence.documentType,
        requirementId: linkReqId
      };
      const res = await fetch(`${API_URL}/evidence/${detailsEvidence.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDetailsEvidence(data.data);
      } else {
        const matchedReq = requirements.find(r => r.id === linkReqId);
        setDetailsEvidence({
          ...detailsEvidence,
          requirementId: linkReqId,
          requirementTitle: matchedReq ? matchedReq.title : detailsEvidence.requirementTitle
        });
      }
      setLinkReqId('');
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setLinking(false);
    }
  };

  const handleAiExtract = async (id) => {
    setExtracting(id);
    try {
      await fetch(`${API_URL}/evidence/${id}/ai-extract`, { method: 'POST', headers: getAuthHeaders() });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setExtracting(null);
    }
  };

  const [stats, setStats] = useState({ total: 0, verified: 0, expired: 0, expiringSoon: 0 });
  const totalWithExpiry = evidence.filter(e => e.expiryDate).length;
  const statsDisplay = {
    total: stats.total || evidence.length,
    expired: stats.expired,
    expiringSoon: stats.expiringSoon,
    valid: Math.max(0, totalWithExpiry - stats.expired - stats.expiringSoon)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const sortByDate = (a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB - dateA;
  };

  const valid = evidence.filter(e => e.expiryStatus === 'VALID');
  const expiringSoon = evidence.filter(e => e.expiryStatus === 'EXPIRING_SOON');
  const expired = evidence.filter(e => e.expiryStatus === 'EXPIRED');
  const noExpiry = evidence.filter(e => e.expiryStatus === 'NO_EXPIRY');

  const filterFn = (e) =>
    (e.documentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.documentNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

  const filteredValid = valid.filter(filterFn).sort(sortByDate);
  const filteredExpiring = expiringSoon.filter(filterFn).sort(sortByDate);
  const filteredExpired = expired.filter(filterFn).sort(sortByDate);
  const filteredNoExpiry = noExpiry.filter(filterFn).sort(sortByDate);

  const EvidenceTable = ({ items, icon: Icon, title, emptyMsg }) => (
    <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <Icon className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">{emptyMsg}</div>
      ) : (
        <div className="overflow-auto max-h-[400px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/30">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Document</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Type</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Expiry</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Days Left</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">AI</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const statusConfig = EXPIRY_STATUS_CONFIG[item.expiryStatus] || EXPIRY_STATUS_CONFIG.NO_EXPIRY;
                const StatusIcon = statusConfig.icon;
                return (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.expiryStatus === 'EXPIRED' ? 'bg-red-100' : item.expiryStatus === 'EXPIRING_SOON' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                          <FileCheck className={`w-4 h-4 ${item.expiryStatus === 'EXPIRED' ? 'text-red-500' : item.expiryStatus === 'EXPIRING_SOON' ? 'text-yellow-500' : 'text-gray-500'}`} />
                        </div>
                        <div className="max-w-[200px]">
                          <span className="text-sm font-medium text-gray-900 truncate block">{item.documentName}</span>
                          {item.documentNumber && <p className="text-xs text-gray-400">{item.documentNumber}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.documentType?.replace('_', ' ')}</td>
                    <td className="py-3 px-4">
                      {item.expiryDate ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" /> {item.expiryDate}
                        </div>
                      ) : <span className="text-xs text-gray-400">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      {item.daysUntilExpiry !== null ? (
                        <span className={`text-sm font-medium ${item.daysUntilExpiry < 0 ? 'text-red-600' : item.daysUntilExpiry <= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {item.daysUntilExpiry < 0 ? `${Math.abs(item.daysUntilExpiry)}d overdue` : item.daysUntilExpiry === 0 ? 'Today' : `${item.daysUntilExpiry}d`}
                        </span>
                      ) : <span className="text-xs text-gray-400">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                        <StatusIcon className="w-3 h-3" /> {statusConfig.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {item.aiProcessed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                            <Brain className="w-3 h-3" /> Done
                          </span>
                        ) : item.fileUrl ? (
                          <span className="text-xs text-gray-400">Ready</span>
                        ) : <span className="text-xs text-gray-400">-</span>}
                        {item.fileUrl && (
                          <button onClick={() => handleAiExtract(item.id)} disabled={extracting === item.id} className="p-1 hover:bg-purple-50 rounded-lg" title={item.aiProcessed ? 'Re-extract with AI' : 'Run AI extraction'}>
                            {extracting === item.id ? <Loader2 className="w-3 h-3 animate-spin text-purple-500" /> : <RefreshCw className="w-3 h-3 text-gray-400 hover:text-purple-600" />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setDetailsEvidence(item); setShowDetailsModal(true); }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg" title="View details"
                        >
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        {item.fileUrl && !item.aiProcessed && (
                          <button onClick={() => handleAiExtract(item.id)} disabled={extracting === item.id} className="p-1.5 hover:bg-purple-50 rounded-lg" title="Run AI extraction">
                            {extracting === item.id ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <Brain className="w-4 h-4 text-gray-400 hover:text-purple-600" />}
                          </button>
                        )}
                        {item.fileUrl && (
                          <button onClick={() => handleDownload(item)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Download file">
                            <Download className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                        {(userRole === 'ENTITY' || userRole === 'ADMIN') && (
                          <button onClick={() => handleDeleteEvidence(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Evidence & Documents</h1>
          <p className="text-sm text-gray-500 mt-1 font-light">Track expiry dates and use AI to extract document data</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600">
          <Plus className="w-4 h-4" /> Add Evidence
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <p className="text-2xl font-semibold text-gray-900">{statsDisplay.total}</p>
          <p className="text-xs text-gray-500 font-light">Total Documents</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <p className="text-2xl font-semibold text-green-600">{statsDisplay.valid}</p>
          <p className="text-xs text-gray-500 font-light">Valid</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100 cursor-pointer hover:border-yellow-300 transition-colors" onClick={() => setFilterStatus('EXPIRING_SOON')}>
          <p className="text-2xl font-semibold text-yellow-600">{statsDisplay.expiringSoon}</p>
          <p className="text-xs text-gray-500 font-light">Expiring Soon</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100 cursor-pointer hover:border-red-300 transition-colors" onClick={() => setFilterStatus('EXPIRED')}>
          <p className="text-2xl font-semibold text-red-600">{statsDisplay.expired}</p>
          <p className="text-xs text-gray-500 font-light">Expired</p>
        </div>
      </div>

      {expiringEvidence.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileWarning className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">{expiringEvidence.length} document(s) expiring within 30 days</p>
                <p className="text-xs text-yellow-600 mt-0.5">Review and renew before they expire</p>
              </div>
            </div>
            <button onClick={() => setShowExpiringModal(true)} className="text-sm font-medium text-yellow-700 hover:text-yellow-900 underline">View All</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search documents..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm" />
        </div>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }} className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="ALL">All Status</option>
          <option value="VALID">Valid</option>
          <option value="EXPIRING_SOON">Expiring Soon</option>
          <option value="EXPIRED">Expired</option>
          <option value="NO_EXPIRY">No Expiry</option>
        </select>
        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(0); }} className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="ALL">All Types</option>
          {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        {(filterStatus !== 'ALL' || filterType !== 'ALL') && (
          <button onClick={() => { setFilterStatus('ALL'); setFilterType('ALL'); setPage(0); }} className="px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 underline">Clear Filters</button>
        )}
      </div>

      <div className="space-y-6">
        {(filterStatus === 'ALL' || filterStatus === 'VALID') && (filteredValid.length > 0 || filterStatus !== 'ALL') && (
          <EvidenceTable items={filteredValid} icon={CheckCircle} title="Valid Documents" emptyMsg="No valid documents" />
        )}
        {(filterStatus === 'ALL' || filterStatus === 'EXPIRING_SOON') && (filteredExpiring.length > 0 || filterStatus !== 'ALL') && (
          <EvidenceTable items={filteredExpiring} icon={Clock} title="Expiring Soon Documents" emptyMsg="No documents expiring soon" />
        )}
        {(filterStatus === 'ALL' || filterStatus === 'EXPIRED') && (filteredExpired.length > 0 || filterStatus !== 'ALL') && (
          <EvidenceTable items={filteredExpired} icon={AlertTriangle} title="Expired Documents" emptyMsg="No expired documents" />
        )}
        {(filterStatus === 'ALL' || filterStatus === 'NO_EXPIRY') && (filteredNoExpiry.length > 0 || filterStatus !== 'ALL') && (
          <EvidenceTable items={filteredNoExpiry} icon={FileCheck} title="No Expiry Documents" emptyMsg="No documents without expiry" />
        )}

        {filteredValid.length === 0 && filteredExpiring.length === 0 && filteredExpired.length === 0 && filteredNoExpiry.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">No evidence records found.</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add Evidence Document</h2>
                <p className="text-sm text-gray-500 mt-0.5">Upload a file and AI will auto-extract key fields</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-primary-500 transition-colors">
                  <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="hidden" id="evidence-upload" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" />
                  <label htmlFor="evidence-upload" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="space-y-2">
                        <FileCheck className="w-8 h-8 text-primary-500 mx-auto" />
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-500">Click to upload (PDF, images)</p>
                        <p className="text-xs text-purple-500">AI will extract expiry date, company name & status</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label>
                  <input required type="text" value={formData.documentName} onChange={(e) => setFormData({ ...formData, documentName: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" placeholder="e.g., Fire Safety Certificate" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requirement (optional - links doc to compliance)</label>
                  <select value={formData.requirementId} onChange={(e) => setFormData({ ...formData, requirementId: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                    <option value="">-- None --</option>
                    {requirements.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select value={formData.documentType} onChange={(e) => setFormData({ ...formData, documentType: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                    {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doc #</label>
                  <input type="text" value={formData.documentNumber} onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" placeholder="License/Certificate #" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issuer</label>
                  <input type="text" value={formData.issuer} onChange={(e) => setFormData({ ...formData, issuer: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" placeholder="e.g., Fire Dept" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                  <input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (AI can detect)</label>
                  <input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setSelectedFile(null); }} className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={uploading || !formData.documentName} className="flex-1 py-2.5 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {uploading ? 'Processing...' : 'Save & AI Extract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExpiringModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[80vh] flex flex-col">
            <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-yellow-800">Expiring Documents (30 days)</h2>
                <p className="text-sm text-yellow-600 mt-0.5">{expiringEvidence.length} document(s) need attention</p>
              </div>
              <button onClick={() => setShowExpiringModal(false)} className="text-yellow-600 hover:text-yellow-800 p-1 rounded-lg hover:bg-yellow-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-3">
                {expiringEvidence.map((item) => {
                  const isExpired = item.expiryStatus === 'EXPIRED';
                  return (
                    <div key={item.id} className={`p-4 rounded-xl border ${isExpired ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isExpired ? 'bg-red-100' : 'bg-yellow-100'}`}>
                            {isExpired ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Clock className="w-5 h-5 text-yellow-500" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.documentName}</p>
                            <p className="text-xs text-gray-500">{item.documentType?.replace('_', ' ')} {item.issuer ? `• ${item.issuer}` : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${isExpired ? 'text-red-600' : 'text-yellow-600'}`}>
                            {item.daysUntilExpiry < 0 ? `${Math.abs(item.daysUntilExpiry)} days overdue` : `${item.daysUntilExpiry} days left`}
                          </p>
                          <p className="text-xs text-gray-500">Expires: {item.expiryDate}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && detailsEvidence && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Evidence Details</h2>
                <p className="text-sm text-gray-500 mt-0.5 font-light truncate" title={detailsEvidence.documentName}>{detailsEvidence.documentName}</p>
              </div>
              <button onClick={() => { setShowDetailsModal(false); setDetailsEvidence(null); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 flex-shrink-0 ml-4">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Document</p>
                  <p className="text-sm font-medium text-gray-900 mt-1 break-all">{detailsEvidence.documentName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Type</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{detailsEvidence.documentType?.replace('_', ' ')}</p>
                </div>
                {detailsEvidence.documentNumber && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Doc #</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{detailsEvidence.documentNumber}</p>
                  </div>
                )}
                {detailsEvidence.issuer && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Issuer</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{detailsEvidence.issuer}</p>
                  </div>
                )}
                {detailsEvidence.expiryDate && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Expiry</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{detailsEvidence.expiryDate}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Status</p>
                  <span className={`inline-flex text-xs font-semibold px-2 py-1 rounded-lg mt-1 ${
                    detailsEvidence.expiryStatus === 'EXPIRED' ? 'bg-red-50 text-red-700' :
                    detailsEvidence.expiryStatus === 'EXPIRING_SOON' ? 'bg-yellow-50 text-yellow-700' :
                    detailsEvidence.expiryStatus === 'VALID' ? 'bg-green-50 text-green-700' :
                    'bg-gray-50 text-gray-600'
                  }`}>{detailsEvidence.expiryStatus?.replace('_', ' ')}</span>
                </div>
              </div>

              {detailsEvidence.aiProcessed && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-800">AI Extraction</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {detailsEvidence.extractedDocumentType && (
                      <><span className="text-purple-500 font-medium">Type</span><span className="text-purple-800">{detailsEvidence.extractedDocumentType}</span></>
                    )}
                    {detailsEvidence.extractedCompanyName && (
                      <><span className="text-purple-500 font-medium">Company/Entity</span><span className="text-purple-800">{detailsEvidence.extractedCompanyName}</span></>
                    )}
                    {detailsEvidence.extractedFullName && (
                      <><span className="text-purple-500 font-medium">Name on Document</span><span className="text-purple-800">{detailsEvidence.extractedFullName}</span></>
                    )}
                    {detailsEvidence.extractedDocumentNumber && (
                      <><span className="text-purple-500 font-medium">Document Number</span><span className="text-purple-800 font-mono">{detailsEvidence.extractedDocumentNumber}</span></>
                    )}
                    {detailsEvidence.extractedIssueDate && (
                      <><span className="text-purple-500 font-medium">Issue Date</span><span className="text-purple-800">{detailsEvidence.extractedIssueDate}</span></>
                    )}
                    {detailsEvidence.expiryDate && (
                      <><span className="text-purple-500 font-medium">Expiry Date</span><span className="text-purple-800">{detailsEvidence.expiryDate}</span></>
                    )}
                    {detailsEvidence.extractedIssuingAuthority && (
                      <><span className="text-purple-500 font-medium">Issuing Authority</span><span className="text-purple-800">{detailsEvidence.extractedIssuingAuthority}</span></>
                    )}
                    {detailsEvidence.extractedComplianceStatus && (
                      <><span className="text-purple-500 font-medium">Compliance Status</span><span className="text-purple-800">{detailsEvidence.extractedComplianceStatus}</span></>
                    )}
                    {detailsEvidence.extractedAddress && (
                      <div className="col-span-2"><span className="text-purple-500 font-medium">Address </span><span className="text-purple-800">{detailsEvidence.extractedAddress}</span></div>
                    )}
                  </div>
                  {detailsEvidence.documentSummary && (
                    <div className="mt-3 pt-3 border-t border-purple-200/60">
                      <p className="text-xs font-semibold text-purple-800 mb-1">Document Summary</p>
                      <p className="text-xs text-purple-700 leading-relaxed">{detailsEvidence.documentSummary}</p>
                    </div>
                  )}
                </div>
              )}

              {detailsEvidence.notes && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Notes</p>
                  <p className="text-sm text-gray-700 mt-1">{detailsEvidence.notes}</p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Link to Requirement</p>
                {(detailsEvidence.requirementTitle || detailsEvidence.requirementId) ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                    <span className="text-sm font-medium text-green-800 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      {detailsEvidence.requirementTitle || requirements.find(r => r.id === detailsEvidence.requirementId)?.title || 'Linked Requirement'}
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select value={linkReqId} onChange={(e) => setLinkReqId(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm">
                      <option value="">-- Select requirement --</option>
                      {(() => {
                        const org = organizations.find(o => String(o.id) === String(detailsEvidence.organizationId));
                        if (!org || !org.sector) {
                           return requirements.map(r => <option key={r.id} value={r.id}>{r.title}</option>);
                        }
                        const sectorLower = org.sector.trim().toLowerCase();
                        const regIds = new Set(allRegulations.filter(r => r.sector?.trim().toLowerCase() === sectorLower).map(r => r.id));
                        const applicableReqs = requirements.filter(req => req.regulationId && regIds.has(req.regulationId));
                        return applicableReqs.map(r => <option key={r.id} value={r.id}>{r.title}</option>);
                      })()}
                    </select>
                    <button onClick={handleLinkRequirement} disabled={linking || !linkReqId} className="px-3 py-2 bg-primary-500 text-white text-sm font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50">
                      {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Link'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
