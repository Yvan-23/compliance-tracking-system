import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FileText, CheckCircle, XCircle, Clock, Sparkles, Loader2, X, Inbox, Send } from 'lucide-react';

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

export default function EnforcementPage() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const isEntity = userRole === 'ENTITY';
  const [activeTab, setActiveTab] = useState(isEntity ? 'my-actions' : 'actions');
  const [complianceRecords, setComplianceRecords] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [actionType, setActionType] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('');
  const [notification, setNotification] = useState(null);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  // New state variables for review flow
  const [pendingSubTab, setPendingSubTab] = useState('records');
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [selectedActionForEvidence, setSelectedActionForEvidence] = useState(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedActionForReview, setSelectedActionForReview] = useState(null);
  const [completingAction, setCompletingAction] = useState(false);


  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const requests = [
        fetch(`${API_URL}/compliance/records?size=100`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/organizations?size=100`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/enforcement/actions?size=50`, { headers: getAuthHeaders() })
      ];
      const [recordsRes, orgsRes, actionsRes] = await Promise.all(requests);
      const recordsData = await recordsRes.json();
      const orgsData = await orgsRes.json();
      const actionsData = await actionsRes.json();
      if (recordsData.success && recordsData.data) {
        setComplianceRecords(recordsData.data.content || []);
      }
      if (orgsData.success && orgsData.data) {
        setOrganizations(orgsData.data.content || []);
      }
      if (actionsData.success && actionsData.data) {
        setCorrectiveActions(actionsData.data.content || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const nonCompliantRecords = complianceRecords.filter(r => r.status === 'NON_COMPLIANT');
  const pendingRecords = complianceRecords.filter(r => r.status === 'PENDING');

  const stats = {
    total: complianceRecords.length,
    pending: pendingRecords.length,
    nonCompliant: nonCompliantRecords.length,
    compliant: complianceRecords.filter(r => r.status === 'COMPLIANT').length,
  };

  const runAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(`${API_URL}/ai/inspection-recommendations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          organization: 'Multiple Organizations',
          inspectionType: 'Compliance Audit',
          findings: `${stats.nonCompliant} non-compliant records found. Priority areas: ${nonCompliantRecords.slice(0, 3).map(r => r.requirement?.title).filter(Boolean).join(', ')}`
        })
      });
      const data = await response.json();
      if (data.success && data.data?.recommendations) {
        setAiRecommendations(data.data.recommendations);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmitEvidence = async (actionId) => {
    if (!evidenceText.trim()) {
      showNotification('Please enter compliance evidence text', 'error');
      return;
    }
    setSubmittingEvidence(true);
    try {
      const formData = new FormData();
      formData.append('evidence', evidenceText);
      if (evidenceFile) {
        formData.append('file', evidenceFile);
      }
      
      const authHeaders = getAuthHeaders();
      delete authHeaders['Content-Type'];

      const response = await fetch(`${API_URL}/enforcement/actions/${actionId}/submit-evidence`, {
        method: 'POST',
        headers: authHeaders,
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        showNotification('Compliance evidence submitted successfully', 'success');
        setIsEvidenceModalOpen(false);
        setSelectedActionForEvidence(null);
        setEvidenceText('');
        setEvidenceFile(null);
        fetchData();
      } else {
        showNotification(data.message || 'Failed to submit evidence', 'error');
      }
    } catch (error) {
      console.error('Error submitting evidence:', error);
      showNotification('Error submitting evidence', 'error');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const handleVerifyAndCompleteAction = async (actionId) => {
    setCompletingAction(true);
    try {
      const response = await fetch(`${API_URL}/enforcement/actions/${actionId}/complete`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        showNotification('Action verified and completed', 'success');
        setIsReviewModalOpen(false);
        setSelectedActionForReview(null);
        fetchData();
      } else {
        showNotification(data.message || 'Failed to complete action', 'error');
      }
    } catch (error) {
      console.error('Error completing action:', error);
      showNotification('Error completing action', 'error');
    } finally {
      setCompletingAction(false);
    }
  };

  const handleDownloadAttachment = async (filePath) => {
    try {
      const response = await fetch(`${API_URL}/files/download?path=${encodeURIComponent(filePath)}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        showNotification('Failed to download attachment', 'error');
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Extract filename from the path
      const filename = filePath.split('\\').pop().split('/').pop() || 'attachment';
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      showNotification('Error downloading attachment', 'error');
    }
  };


  const handleIssueAction = async () => {
    if (!selectedOrg || !actionType) {
      showNotification('Please select an entity and action type', 'error');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/enforcement/actions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          organizationId: selectedOrg,
          complianceRecordId: selectedRecordId,
          actionType,
          severity: severity || null,
          penaltyAmount: penaltyAmount ? parseFloat(penaltyAmount) : null,
          description: description || 'Enforcement action issued'
        })
      });
      const data = await response.json();
      if (data.success) {
        showNotification('Enforcement action issued successfully', 'success');
        setSelectedOrg('');
        setSelectedRecordId(null);
        setActionType('');
        setSeverity('');
        setPenaltyAmount('');
        setDescription('');
        fetchData(); // Refresh the list to remove the escalated record
      } else {
        showNotification(data.message || 'Failed to issue action', 'error');
      }
    } catch (error) {
      console.error('Error issuing enforcement action:', error);
      showNotification('Error issuing enforcement action', 'error');
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
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {notification.message}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Enforcement Actions</h1>
          <p className="text-sm text-gray-500 mt-1 font-light">Issue penalties, assign corrective actions, and track compliance enforcement.</p>
        </div>
        <button
          onClick={runAIAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#005387] text-white text-sm font-medium rounded-xl hover:bg-[#004570] disabled:opacity-50 transition-colors"
        >
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          AI Recommendations
        </button>
      </div>

      {aiRecommendations && (
        <div className="bg-[#005387]/5 rounded-xl p-5 border border-[#005387]/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#005387]" />
            <h3 className="text-sm font-semibold text-gray-900">AI Enforcement Recommendations</h3>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiRecommendations}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
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
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.pending}</p>
              <p className="text-xs text-gray-500 font-light">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.compliant}</p>
              <p className="text-xs text-gray-500 font-light">Compliant</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#005387]/10 rounded-xl flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#005387]" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 font-light">Total Records</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-5">
          <nav className="flex gap-6">
            {isEntity ? (
              <>
                <button
                  onClick={() => setActiveTab('my-actions')}
                  className={`py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'my-actions' ? 'border-[#005387] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  My Corrective Actions
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('actions')}
                  className={`py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'actions' ? 'border-[#005387] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Non-Compliant Records
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'pending' ? 'border-[#005387] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Pending Review
                </button>
                <button
                  onClick={() => setActiveTab('new')}
                  className={`py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'new' ? 'border-[#005387] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Issue New Action
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="p-5">
          {activeTab === 'my-actions' && (
            <div className="space-y-2">
              {correctiveActions.length > 0 ? (
                correctiveActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        action.status === 'COMPLETED' ? 'bg-green-50' :
                        action.status === 'PENDING_REVIEW' ? 'bg-blue-50' :
                        action.status === 'OVERDUE' ? 'bg-red-50' : 'bg-yellow-50'
                      }`}>
                        {action.status === 'COMPLETED' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                         action.status === 'PENDING_REVIEW' ? <Clock className="w-4 h-4 text-blue-600" /> :
                         action.status === 'OVERDUE' ? <AlertTriangle className="w-4 h-4 text-red-600" /> :
                         <Clock className="w-4 h-4 text-yellow-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{action.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            action.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            action.status === 'PENDING_REVIEW' ? 'bg-blue-100 text-blue-700' :
                            action.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {action.status}
                          </span>
                          {action.dueDate && (
                            <span className="text-[10px] text-gray-400">
                              Due: {new Date(action.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {action.assignedTo && (
                            <span className="text-[10px] text-gray-400">
                              Assigned: {action.assignedTo}
                            </span>
                          )}
                        </div>
                        {action.evidence && (
                          <div className="mt-2 text-xs text-gray-600 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100 max-w-xl">
                            <span className="font-semibold text-gray-700 block mb-0.5">Submitted Compliance Evidence:</span>
                            <p className="font-light italic">{action.evidence}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {action.status !== 'COMPLETED' && action.status !== 'PENDING_REVIEW' && (
                        <button
                          onClick={() => {
                            setSelectedActionForEvidence(action);
                            setEvidenceText('');
                            setIsEvidenceModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005387] text-white text-xs font-medium rounded-lg hover:bg-[#004570] transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Submit Evidence
                        </button>
                      )}
                      {action.status === 'PENDING_REVIEW' && (
                        <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg">
                          Under Review
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Inbox className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">No corrective actions</p>
                  <p className="text-xs text-gray-400 mt-1">You have no pending enforcement actions</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-2">
              {nonCompliantRecords.length > 0 ? (
                nonCompliantRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{record.organizationName || record.organization?.name || 'Organization'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{record.requirementTitle || 'N/A'}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Period: {record.reportingPeriodStart?.slice(0, 7)} — {record.reportingPeriodEnd?.slice(0, 7)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-red-500"
                              style={{ width: `${record.complianceScore || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700">{record.complianceScore || 0}%</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 mt-1">
                          <XCircle className="w-3 h-3" />
                          NON-COMPLIANT
                        </span>
                      </div>
                      <button
                        onClick={() => { setActiveTab('new'); setSelectedOrg(record.organizationId || ''); setSelectedRecordId(record.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005387] text-white text-xs font-medium rounded-lg hover:bg-[#004570] transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        Issue Penalty
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">All compliant</p>
                  <p className="text-xs text-gray-400 mt-1">No non-compliant records to enforce</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="space-y-4">
              <div className="flex gap-4 border-b border-gray-100 pb-2">
                <button
                  onClick={() => setPendingSubTab('records')}
                  className={`text-sm font-medium pb-2 transition-colors relative ${
                    pendingSubTab === 'records' ? 'text-[#005387]' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Document Submissions ({pendingRecords.length})
                  {pendingSubTab === 'records' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#005387]"></div>
                  )}
                </button>
                <button
                  onClick={() => setPendingSubTab('actions')}
                  className={`text-sm font-medium pb-2 transition-colors relative ${
                    pendingSubTab === 'actions' ? 'text-[#005387]' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Corrective Actions ({correctiveActions.filter(a => a.status === 'PENDING_REVIEW').length})
                  {pendingSubTab === 'actions' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#005387]"></div>
                  )}
                </button>
              </div>

              {pendingSubTab === 'records' ? (
                <div className="space-y-2">
                  {pendingRecords.length > 0 ? (
                    pendingRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 bg-yellow-50 rounded-xl flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-yellow-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{record.organizationName || record.organization?.name || 'Organization'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{record.requirementTitle || 'N/A'}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              Period: {record.reportingPeriodStart?.slice(0, 7)} — {record.reportingPeriodEnd?.slice(0, 7)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-yellow-500"
                                  style={{ width: `${record.complianceScore || 0}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-700">{record.complianceScore || 0}%</span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 mt-1">
                              <Clock className="w-3 h-3" />
                              PENDING
                            </span>
                          </div>
                          <button
                            onClick={() => navigate('/submissions')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005387] text-white text-xs font-medium rounded-lg hover:bg-[#004570] transition-colors"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Inbox className="w-7 h-7 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">No pending records</p>
                      <p className="text-xs text-gray-400 mt-1">Nothing awaiting review</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {correctiveActions.filter(a => a.status === 'PENDING_REVIEW').length > 0 ? (
                    correctiveActions.filter(a => a.status === 'PENDING_REVIEW').map((action) => (
                      <div key={action.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{action.organizationName || 'Regulated Entity'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                {action.actionType || 'CORRECTIVE_ACTION'}
                              </span>
                              {action.dueDate && (
                                <span className="text-[10px] text-gray-400">
                                  Due: {new Date(action.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setSelectedActionForReview(action);
                              setIsReviewModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005387] text-white text-xs font-medium rounded-lg hover:bg-[#004570] transition-colors"
                          >
                            Review Evidence
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Inbox className="w-7 h-7 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">No pending corrective actions</p>
                      <p className="text-xs text-gray-400 mt-1">No entity compliance evidence is pending review</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'new' && (
            <div className="max-w-2xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Entity</label>
                  <select
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
                  >
                    <option value="">Select organization...</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Action Type</label>
                    <select
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
                    >
                      <option value="">Select type...</option>
                      <option value="PENALTY">Penalty</option>
                      <option value="WARNING">Warning</option>
                      <option value="CORRECTIVE_ACTION">Corrective Action</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
                    >
                      <option value="">Select severity...</option>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Penalty Amount (RWF)</label>
                  <input
                    type="number"
                    value={penaltyAmount}
                    onChange={(e) => setPenaltyAmount(e.target.value)}
                    placeholder="Enter amount (optional)"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason / Description</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the violation and required actions..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleIssueAction}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#005387] text-white text-sm font-medium rounded-xl hover:bg-[#004570] transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Issue Action
                  </button>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Evidence Modal */}
      {isEvidenceModalOpen && selectedActionForEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Submit Compliance Evidence</h3>
              <button onClick={() => setIsEvidenceModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Corrective Action</span>
                <p className="text-sm font-medium text-gray-800 mt-1">{selectedActionForEvidence.description}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Compliance Explanation / Evidence
                </label>
                <textarea
                  rows={4}
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  placeholder="Describe the actions taken to resolve this issue and attach details/explanation..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm resize-none mb-3"
                />
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Attach Document / Picture (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setEvidenceFile(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#005387]/10 file:text-[#005387] hover:file:bg-[#005387]/20 transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEvidenceModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmitEvidence(selectedActionForEvidence.id)}
                disabled={submittingEvidence}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#005387] text-white text-xs font-medium rounded-lg hover:bg-[#004570] disabled:opacity-50 transition-colors"
              >
                {submittingEvidence ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Submit Evidence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Evidence Modal */}
      {isReviewModalOpen && selectedActionForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Review Compliance Evidence</h3>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Entity</span>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedActionForReview.organizationName || 'Regulated Entity'}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Action Description</span>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedActionForReview.description}</p>
              </div>
              <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-4">
                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block mb-1.5">Submitted compliance explanation</span>
                <p className="text-sm text-gray-700 font-light italic">"{selectedActionForReview.evidence}"</p>
                {selectedActionForReview.evidenceFileUrl && (
                  <div className="mt-3 pt-3 border-t border-blue-100/50">
                    <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block mb-1.5">Attached Document / Picture</span>
                    <button 
                      onClick={() => handleDownloadAttachment(selectedActionForReview.evidenceFileUrl)}
                      type="button"
                      className="inline-flex items-center gap-1.5 text-sm text-[#005387] font-medium hover:underline bg-transparent border-none cursor-pointer p-0"
                    >
                      <FileText className="w-4 h-4" />
                      View Attachment
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleVerifyAndCompleteAction(selectedActionForReview.id)}
                disabled={completingAction}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {completingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Verify & Approve Completion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
