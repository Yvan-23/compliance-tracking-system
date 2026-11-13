import { useState, useEffect } from 'react';
import { Search, Send, CheckCircle, XCircle, Clock, FileText, Landmark, User, Loader2, X, Eye, Sparkles, Download, RotateCw, ClipboardList, AlertCircle, ThumbsUp, ThumbsDown, Lock } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/api/v1';

const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  };
  const tenantId = localStorage.getItem('tenantId');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  return headers;
};

export default function AuditSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [reanalyzing, setReanalyzing] = useState(null);
  const [reviewSubmission, setReviewSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsSubmission, setDetailsSubmission] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('all');
  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole');
  const canReview = userRole !== 'ENTITY';

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => { fetchData(); fetchOrganizations(); }, []);

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
      const res = await fetch(`${API_BASE_URL}/submissions?size=100`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        setSubmissions(data.data.content || []);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async (sub) => {
    setReanalyzing(sub.id);
    try {
      const res = await fetch(`${API_BASE_URL}/submissions/${sub.id}/reanalyze`, {
        method: 'POST', headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, ...data.data } : s));
        showNotification('Re-analysis complete', 'success');
      }
    } catch (error) {
      console.error('Re-analyze error:', error);
      showNotification('Re-analysis failed', 'error');
    } finally {
      setReanalyzing(null);
    }
  };

  const openReview = (sub) => {
    setReviewSubmission(sub);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleApprove = async () => {
    if (!reviewSubmission) return;
    setReviewLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/submissions/${reviewSubmission.id}/approve?userId=${userId}`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ comment: reviewComment || 'Approved' })
      });
      const data = await res.json();
      if (data.success) {
        setShowReviewModal(false);
        setReviewSubmission(null);
        setReviewComment('');
        showNotification('Submission approved', 'success');
        fetchData();
      } else {
        showNotification(data.message || 'Failed to approve', 'error');
      }
    } catch (error) {
      showNotification('Failed to approve submission', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reviewSubmission) return;
    setReviewLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/submissions/${reviewSubmission.id}/reject?userId=${userId}`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ comment: reviewComment || 'Rejected' })
      });
      const data = await res.json();
      if (data.success) {
        setShowReviewModal(false);
        setReviewSubmission(null);
        setReviewComment('');
        showNotification('Submission rejected', 'success');
        fetchData();
      } else {
        showNotification(data.message || 'Failed to reject', 'error');
      }
    } catch (error) {
      showNotification('Failed to reject submission', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/submissions/${id}/download`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  const orgFiltered = selectedOrgId === 'all'
    ? submissions
    : submissions.filter(s => String(s.organizationId) === selectedOrgId || s.organizationId?.toString() === selectedOrgId);

  const pending = orgFiltered.filter(s => s.status === 'SUBMITTED');
  const approved = orgFiltered.filter(s => s.status === 'APPROVED');
  const rejected = orgFiltered.filter(s => s.status === 'REJECTED');
  const drafts = orgFiltered.filter(s => s.status === 'DRAFT');

  const filterFn = (s) =>
    (s.organizationName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.complianceRecordTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.submittedByName || '').toLowerCase().includes(searchTerm.toLowerCase());

  const filteredPending = pending.filter(filterFn);
  const filteredApproved = approved.filter(filterFn);
  const filteredRejected = rejected.filter(filterFn);
  const filteredDrafts = drafts.filter(filterFn);

  const getStatusBadge = (status) => {
    const map = {
      APPROVED: { bg: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
      REJECTED: { bg: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
      SUBMITTED: { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
      DRAFT: { bg: 'bg-gray-50 text-gray-600 border-gray-200', icon: FileText },
    };
    const s = map[status] || map.DRAFT;
    const Icon = s.icon;
    return { className: s.bg, Icon };
  };

  const getAiBadge = (status) => {
    const map = {
      AI_SUGGESTS_APPROVAL: { bg: 'bg-green-50 text-green-700 border-green-200', label: 'AI: Approve' },
      AI_SUGGESTS_REJECTION: { bg: 'bg-red-50 text-red-700 border-red-200', label: 'AI: Reject' },
      PENDING_REVIEW: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Needs Review' },
    };
    const s = map[status];
    return s || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#005387]" />
      </div>
    );
  }

  const SubmissionTable = ({ items, icon: Icon, title, emptyMsg, showReview }) => (
    <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <Icon className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">{emptyMsg}</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/30">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Requirement</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Organization</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Submitted By</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Date</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">AI Analysis</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Status</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((sub) => {
              const badge = getStatusBadge(sub.status);
              const BadgeIcon = badge.Icon;
              const aiBadge = getAiBadge(sub.aiAnalysisStatus);
              return (
                <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{sub.complianceRecordTitle || 'No requirement'}</p>
                        <p className="text-xs text-gray-500">ID: {sub.id?.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{sub.organizationName || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{sub.submittedByName || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{sub.submissionDate?.slice(0, 10) || '-'}</td>
                  <td className="py-3 px-4">
                    {aiBadge ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg border ${aiBadge.bg}`}>
                        <Sparkles className="w-3 h-3" />
                        {aiBadge.label}
                      </span>
                    ) : sub.aiAnalysisStatus === 'AI_ERROR' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                        <AlertCircle className="w-3 h-3" />
                        AI Error
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg border ${badge.className}`}>
                      <BadgeIcon className="w-3 h-3" />
                      <span className="capitalize">{(sub.status || '').toLowerCase()}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setDetailsSubmission(sub); setShowDetailsModal(true); }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                      {sub.evidenceUrl && (
                        <button
                          onClick={() => handleDownload(sub.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg"
                          title="Download file"
                        >
                          <Download className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                      <button
                        onClick={() => handleReanalyze(sub)}
                        disabled={reanalyzing === sub.id}
                        className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                        title="Re-analyze with OCR + AI"
                      >
                        <RotateCw className={`w-4 h-4 text-gray-400 ${reanalyzing === sub.id ? 'animate-spin' : ''}`} />
                      </button>
                      {canReview && sub.status === 'SUBMITTED' && showReview && (
                        <button
                          onClick={() => openReview(sub)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          Review
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {notification.message}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audit Submissions</h1>
          <p className="text-sm text-gray-500 mt-1 font-light">Review, approve or reject entity submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 font-medium">Company:</span>
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm min-w-[200px]"
          >
            <option value="all">All Companies</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <p className="text-2xl font-semibold text-gray-900">{orgFiltered.length}</p>
          <p className="text-xs text-gray-500 font-light">Total</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <p className="text-2xl font-semibold text-gray-900">{drafts.length}</p>
          <p className="text-xs text-gray-500 font-light">Drafts</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <p className="text-2xl font-semibold text-[#005387]">{pending.length}</p>
          <p className="text-xs text-gray-500 font-light">Pending</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <p className="text-2xl font-semibold text-green-600">{approved.length}</p>
          <p className="text-xs text-gray-500 font-light">Approved</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <p className="text-2xl font-semibold text-red-600">{rejected.length}</p>
          <p className="text-xs text-gray-500 font-light">Rejected</p>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by requirement or submitter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
        />
      </div>

      <SubmissionTable items={filteredDrafts} icon={FileText} title="Drafts" emptyMsg="No draft submissions" />
      <SubmissionTable items={filteredPending} icon={Clock} title="Pending Review" emptyMsg="No pending submissions" showReview={true} />
      <SubmissionTable items={filteredApproved} icon={CheckCircle} title="Approved" emptyMsg="No approved submissions" />
      <SubmissionTable items={filteredRejected} icon={ThumbsDown} title="Rejected" emptyMsg="No rejected submissions" />

      {/* Review Modal */}
      {showReviewModal && reviewSubmission && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Review Submission</h2>
                <p className="text-sm text-gray-500 mt-0.5 font-light">
                  {reviewSubmission.aiAnalysisStatus === 'AI_SUGGESTS_APPROVAL' ? 'AI recommends approval — please verify' :
                   reviewSubmission.aiAnalysisStatus === 'AI_SUGGESTS_REJECTION' ? 'AI recommends rejection — please verify' :
                   'Review and approve or reject this submission'}
                </p>
              </div>
              <button onClick={() => { setShowReviewModal(false); setReviewSubmission(null); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              {(reviewSubmission.aiAnalysisStatus === 'AI_SUGGESTS_APPROVAL' || reviewSubmission.aiAnalysisStatus === 'AI_SUGGESTS_REJECTION' || reviewSubmission.aiAnalysisDetails) && (
                <div className={`rounded-xl p-4 border ${
                  reviewSubmission.aiAnalysisStatus === 'AI_SUGGESTS_APPROVAL' ? 'bg-green-50 border-green-200' :
                  reviewSubmission.aiAnalysisStatus === 'AI_SUGGESTS_REJECTION' ? 'bg-red-50 border-red-200' :
                  'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-800">AI Analysis Results</span>
                    {reviewSubmission.aiAnalysisStatus && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        reviewSubmission.aiAnalysisStatus === 'AI_SUGGESTS_APPROVAL' ? 'bg-green-200 text-green-800' :
                        reviewSubmission.aiAnalysisStatus === 'AI_SUGGESTS_REJECTION' ? 'bg-red-200 text-red-800' :
                        'bg-amber-200 text-amber-800'
                      }`}>{reviewSubmission.aiAnalysisStatus.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                  {reviewSubmission.aiAnalysisDetails && (
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{reviewSubmission.aiAnalysisDetails}</p>
                  )}
                  {reviewSubmission.documentSummary && (
                    <div className="mt-2 pt-2 border-t border-gray-200/60">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Document Summary</p>
                      <p className="text-xs text-gray-600">{reviewSubmission.documentSummary}</p>
                    </div>
                  )}
                  {reviewSubmission.aiScore != null && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                      <span className="font-medium">AI Score:</span>
                      <span>{Math.round(reviewSubmission.aiScore)}%</span>
                    </div>
                  )}
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Requirement</p>
                <p className="text-sm font-medium text-gray-900">{reviewSubmission.complianceRecordTitle || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Review Comment</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Add your review comment..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={reviewLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 border border-red-200 font-medium rounded-xl hover:bg-red-100 disabled:opacity-50"
                >
                  {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={reviewLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-700 border border-green-200 font-medium rounded-xl hover:bg-green-100 disabled:opacity-50"
                >
                  {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && detailsSubmission && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Submission Details</h2>
                <p className="text-sm text-gray-500 mt-0.5 font-light">ID: {detailsSubmission.id?.slice(0, 8)}</p>
              </div>
              <button onClick={() => { setShowDetailsModal(false); setDetailsSubmission(null); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Requirement</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{detailsSubmission.complianceRecordTitle || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Organization</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{detailsSubmission.organizationName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Status</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg mt-1 border ${
                    detailsSubmission.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                    detailsSubmission.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                    detailsSubmission.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {detailsSubmission.status === 'APPROVED' ? <CheckCircle className="w-3 h-3" /> :
                     detailsSubmission.status === 'REJECTED' ? <XCircle className="w-3 h-3" /> :
                     detailsSubmission.status === 'SUBMITTED' ? <Clock className="w-3 h-3" /> :
                     <FileText className="w-3 h-3" />}
                    <span className="capitalize">{(detailsSubmission.status || '').toLowerCase()}</span>
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Date</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{detailsSubmission.submissionDate?.slice(0, 10) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Submitted By</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{detailsSubmission.submittedByName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Submitted By ID</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{detailsSubmission.submittedById?.slice(0, 8) || 'N/A'}</p>
                </div>
              </div>

              {/* Review Comment */}
              {detailsSubmission.reviewComment && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Review Comment
                  </p>
                  <p className="text-sm text-gray-600">{detailsSubmission.reviewComment}</p>
                </div>
              )}

              {/* AI Analysis */}
              {detailsSubmission.aiAnalysisStatus && (
                <div className={`rounded-xl p-4 border ${
                  detailsSubmission.aiAnalysisStatus === 'AI_SUGGESTS_APPROVAL' ? 'bg-green-50 border-green-200' :
                  detailsSubmission.aiAnalysisStatus === 'AI_SUGGESTS_REJECTION' ? 'bg-red-50 border-red-200' :
                  detailsSubmission.aiAnalysisStatus === 'PENDING_REVIEW' ? 'bg-amber-50 border-amber-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-800">AI Analysis</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      detailsSubmission.aiAnalysisStatus === 'AI_SUGGESTS_APPROVAL' ? 'bg-green-200 text-green-800' :
                      detailsSubmission.aiAnalysisStatus === 'AI_SUGGESTS_REJECTION' ? 'bg-red-200 text-red-800' :
                      detailsSubmission.aiAnalysisStatus === 'PENDING_REVIEW' ? 'bg-amber-200 text-amber-800' :
                      'bg-gray-200 text-gray-700'
                    }`}>{detailsSubmission.aiAnalysisStatus}</span>
                  </div>
                  {detailsSubmission.aiAnalysisDetails && (
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{detailsSubmission.aiAnalysisDetails}</p>
                  )}
                  {detailsSubmission.documentSummary && (
                    <div className="mt-3 pt-3 border-t border-gray-200/60">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Document Summary</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{detailsSubmission.documentSummary}</p>
                    </div>
                  )}
                  {detailsSubmission.aiScore != null && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                      <span className="font-medium">AI Score:</span>
                      <span>{Math.round(detailsSubmission.aiScore)}%</span>
                    </div>
                  )}
                </div>
              )}

              {/* SHA-256 Integrity */}
              {detailsSubmission.fileChecksum && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="text-xs font-medium text-gray-600">SHA-256 Integrity</span>
                  </div>
                  <code className="text-xs text-gray-400 break-all mt-1 block">{detailsSubmission.fileChecksum}</code>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {canReview && detailsSubmission.status === 'SUBMITTED' && (
                  <button
                    onClick={() => { setShowDetailsModal(false); openReview(detailsSubmission); }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 font-medium rounded-xl hover:bg-amber-100 text-sm"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Review
                  </button>
                )}
                <button
                  onClick={() => handleDownload(detailsSubmission.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#005387]/5 text-[#005387] border border-[#005387]/20 font-medium rounded-xl hover:bg-[#005387]/10 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
