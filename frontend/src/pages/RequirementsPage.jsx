import { useState, useEffect, useRef } from 'react';
import { Plus, Search, FileText, X, Loader2, Edit, Trash2, Eye, Inbox, Sparkles, Send, Bot, AlertTriangle, Clock, CheckCircle, Scale, AlertCircle } from 'lucide-react';

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

const severityConfig = {
  1: { label: 'LOW', color: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  2: { label: 'LOW', color: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  3: { label: 'MEDIUM', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  4: { label: 'HIGH', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

const frequencyConfig = {
  ONE_TIME: { color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock },
  MONTHLY: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
  QUARTERLY: { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Clock },
  YEARLY: { color: 'bg-green-50 text-green-700 border-green-200', icon: Clock },
};

export default function RequirementsPage() {
  const userRole = localStorage.getItem('userRole');
  const [requirements, setRequirements] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', content: 'Ask me anything about compliance requirements, regulations, or compliance obligations.' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef(null);
  const [entityFilterActive, setEntityFilterActive] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    regulationId: '',
    frequency: 'YEARLY',
    severityLevel: 1
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const fetchData = async () => {
    try {
      const userRole = localStorage.getItem('userRole');
      const orgId = localStorage.getItem('organizationId');

      const [reqRes, regRes] = await Promise.all([
        fetch(`${API_URL}/requirements?size=200`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/regulations?size=200`, { headers: getAuthHeaders() })
      ]);
      
      let reqData, regData;
      try { reqData = await reqRes.json(); } catch (e) { reqData = { success: false, data: [] }; }
      try { regData = await regRes.json(); } catch (e) { regData = { success: false, data: [] }; }

      let allRegulations = regData.data?.content || regData.data || [];
      let allRequirements = reqData.data?.content || reqData.data || [];

      if (userRole === 'ENTITY' && orgId) {
        try {
          const orgRes = await fetch(`${API_URL}/organizations/${orgId}`, { headers: getAuthHeaders() });
          const orgData = await orgRes.json();
          const orgSector = orgData.success && orgData.data ? orgData.data.sector : null;
          if (orgSector) {
            const sectorLower = orgSector.trim().toLowerCase();
            allRegulations = allRegulations.filter(r => r.sector?.trim().toLowerCase() === sectorLower);
            const regIds = new Set(allRegulations.map(r => r.id));
            allRequirements = allRequirements.filter(req => req.regulationId && regIds.has(req.regulationId));
            setEntityFilterActive(true);
          } else {
            allRequirements = [];
            allRegulations = [];
            setEntityFilterActive(false);
          }
        } catch (e) {
          console.warn('Could not filter by sector:', e);
          setEntityFilterActive(false);
        }
      }

      if (reqData.success) {
        allRequirements.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setRequirements(allRequirements);
      }
      if (regData.success) setRegulations(allRegulations);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = modalMode === 'edit' ? 'PUT' : 'POST';
      const url = modalMode === 'edit' 
        ? `${API_URL}/requirements/${selectedRequirement.id}`
        : `${API_URL}/requirements`;
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        setCurrentPage(1);
        fetchData();
        setFormData({ title: '', description: '', regulationId: '', frequency: 'YEARLY', severityLevel: 1 });
        setSelectedRequirement(null);
        setModalMode('add');
      }
    } catch (error) {
      console.error('Error saving requirement:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (req) => {
    setSelectedRequirement(req);
    setFormData({
      title: req.title || '',
      description: req.description || '',
      regulationId: req.regulationId || req.regulation?.id || '',
      frequency: req.frequency || 'YEARLY',
      severityLevel: req.severityLevel || 1
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this requirement?')) return;
    try {
      await fetch(`${API_URL}/requirements/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting requirement:', error);
    }
  };

  const handleView = (req) => {
    setSelectedRequirement(req);
    setModalMode('view');
    setShowModal(true);
  };

  const sendAIMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const msg = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: msg }]);
    setAiLoading(true);
    try {
      const aiRes = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: msg, context: 'compliance requirements and regulations for Rwanda ISP operators' })
      });
      const aiData = await aiRes.json();
      if (aiData.success && aiData.data?.response && !aiData.data.response.startsWith('Based on the current database')) {
        setAiMessages(prev => [...prev, { role: 'assistant', content: aiData.data.response }]);
      } else {
        const res = await fetch(`${API_URL}/assistant/query`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ query: msg + ' (related to compliance requirements and regulations)', maxResults: 5 })
        });
        const data = await res.json();
        if (data.success && data.data?.answer) {
          let answer = data.data.answer;
          if (data.data.references?.length > 0) {
            answer += '\n\n**References:**\n' + data.data.references.map(r => `• [${r.type}] ${r.title}`).join('\n');
          }
          setAiMessages(prev => [...prev, { role: 'assistant', content: answer }]);
        } else {
          setAiMessages(prev => [...prev, { role: 'assistant', content: 'I could not find an answer. Try asking about a specific requirement, regulation, or compliance topic.' }]);
        }
      }
    } catch (error) {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to the assistant. Please try again.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const filtered = requirements.filter(r => {
    const matchesSearch = r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.regulationTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = sectorFilter === 'all' || r.regulationSector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filtered.length, totalPages, currentPage]);

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const sectors = [...new Set(regulations.map(r => r.sector).filter(Boolean))];

  const stats = {
    total: requirements.length,
    high: requirements.filter(r => r.severityLevel >= 4).length,
    medium: requirements.filter(r => r.severityLevel === 3).length,
    low: requirements.filter(r => r.severityLevel <= 2).length,
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
          <h1 className="text-2xl font-semibold text-gray-900">Requirements</h1>
          <p className="text-sm text-gray-500 mt-1 font-light">Manage compliance requirements and regulations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAI(!showAI)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#005387] text-white text-sm font-medium rounded-xl hover:bg-[#004570] transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </button>
          {userRole !== 'ENTITY' && (
            <button
              onClick={() => { setModalMode('add'); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Requirement
            </button>
          )}
        </div>
      </div>

      {showAI && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
          <div className="bg-[#005387]/5 px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <div className="w-7 h-7 bg-[#005387]/10 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#005387]" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Requirements AI Assistant</span>
            <button onClick={() => setShowAI(false)} className="ml-auto p-1 hover:bg-white/50 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#005387] text-white rounded-br-md'
                    : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={aiEndRef} />
          </div>
          <div className="border-t border-gray-100 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendAIMessage()}
                placeholder="Ask about requirements, regulations, compliance..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#005387]/20"
              />
              <button
                onClick={sendAIMessage}
                disabled={!aiInput.trim() || aiLoading}
                className="px-4 py-2.5 bg-[#005387] text-white rounded-xl hover:bg-[#004570] disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#005387]/10 rounded-xl flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#005387]" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 font-light">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.high}</p>
              <p className="text-xs text-gray-500 font-light">High Severity</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-yellow-50 rounded-xl flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.medium}</p>
              <p className="text-xs text-gray-500 font-light">Medium</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.low}</p>
              <p className="text-xs text-gray-500 font-light">Low</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
          placeholder="Search requirements, regulations..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
          />
        </div>
        <select
          value={sectorFilter}
          onChange={(e) => { setSectorFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
        >
          <option value="all">All Sectors</option>
          {sectors.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
                <tr className="border-b border-gray-100 bg-gray-50/30">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Requirement</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Regulation</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Sector</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Frequency</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Severity</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Actions</th>
                </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    {entityFilterActive === false && searchTerm === '' ? (
                      <>
                        <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-500">Organization sector not set</p>
                        <p className="text-xs text-gray-400 mt-1">Contact an administrator to set your organization's sector to see relevant requirements</p>
                      </>
                    ) : (
                      <>
                        <Inbox className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-500">No requirements found</p>
                        <p className="text-xs text-gray-400 mt-1">{searchTerm ? 'Try adjusting your search' : entityFilterActive ? 'No requirements assigned to your sector yet' : (userRole === 'ENTITY' ? 'No requirements found' : 'Click "Add Requirement" to create one')}</p>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                paginated.map((req) => {
                  const sev = severityConfig[req.severityLevel] || severityConfig[1];
                  const freq = frequencyConfig[req.frequency] || frequencyConfig.YEARLY;
                  return (
                    <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#005387]/10 rounded-xl flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-[#005387]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{req.title}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{req.description || 'No description'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs font-medium text-gray-600 max-w-[150px] truncate block">
                          {req.regulationTitle || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {req.regulationSector ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {req.regulationSector}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${freq.color}`}>
                          {req.frequency}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sev.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                          {sev.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleView(req)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View">
                            <Eye className="w-4 h-4 text-gray-400" />
                          </button>
                          {localStorage.getItem('userRole') !== 'ENTITY' && (
                            <>
                              <button onClick={() => handleEdit(req)} className="p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                <Edit className="w-4 h-4 text-blue-400" />
                              </button>
                              <button onClick={() => handleDelete(req.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                  page === currentPage
                    ? 'bg-[#005387] text-white'
                    : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {modalMode === 'add' ? 'Add New Requirement' : modalMode === 'edit' ? 'Edit Requirement' : 'Requirement Details'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modalMode === 'add' ? 'Create a new compliance requirement' : modalMode === 'edit' ? 'Update requirement details' : 'View requirement information'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {modalMode === 'view' && selectedRequirement ? (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-[100px_1fr] gap-3 text-sm">
                  <span className="text-gray-500 font-medium">Title</span>
                  <span className="text-gray-900 font-semibold">{selectedRequirement.title}</span>
                  
                  <span className="text-gray-500 font-medium">Description</span>
                  <span className="text-gray-700">{selectedRequirement.description || '—'}</span>
                  
                  <span className="text-gray-500 font-medium">Regulation</span>
                  <span className="text-gray-900">{selectedRequirement.regulationTitle || '—'}</span>

                  <span className="text-gray-500 font-medium">Sector</span>
                  <span>
                    {selectedRequirement.regulationSector ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {selectedRequirement.regulationSector}
                      </span>
                    ) : '—'}
                  </span>
                  
                  <span className="text-gray-500 font-medium">Frequency</span>
                  <span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${(frequencyConfig[selectedRequirement.frequency] || frequencyConfig.YEARLY).color}`}>
                      {selectedRequirement.frequency}
                    </span>
                  </span>
                  
                  <span className="text-gray-500 font-medium">Severity</span>
                  <span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${(severityConfig[selectedRequirement.severityLevel] || severityConfig[1]).color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${(severityConfig[selectedRequirement.severityLevel] || severityConfig[1]).dot}`} />
                      {(severityConfig[selectedRequirement.severityLevel] || severityConfig[1]).label}
                    </span>
                  </span>

                  <span className="text-gray-500 font-medium">ID</span>
                  <span className="text-gray-400 text-xs font-mono">{selectedRequirement.id}</span>
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
                    placeholder="e.g., Submit valid ISP license to RURA"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm resize-none"
                    placeholder="Describe the compliance requirement..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Regulation</label>
                  <select
                    value={formData.regulationId}
                    onChange={(e) => setFormData({ ...formData, regulationId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
                  >
                    <option value="">Select regulation...</option>
                    {regulations.map(reg => (
                      <option key={reg.id} value={reg.id}>{reg.title}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Frequency</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
                    >
                      <option value="ONE_TIME">One Time</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Severity Level</label>
                    <select
                      value={formData.severityLevel}
                      onChange={(e) => setFormData({ ...formData, severityLevel: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
                    >
                      <option value={1}>1 - Low</option>
                      <option value={2}>2 - Low</option>
                      <option value={3}>3 - Medium</option>
                      <option value={4}>4 - High</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-[#005387] text-white rounded-xl text-sm font-medium hover:bg-[#004570] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {modalMode === 'edit' ? 'Save Changes' : 'Create Requirement'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
