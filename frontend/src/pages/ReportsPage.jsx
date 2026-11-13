import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Sparkles, Loader2, CheckCircle, Clock, FileDown, AlertCircle, BarChart3, FileCheck, RefreshCw, Percent, Eye, X, Calendar } from 'lucide-react';

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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('records');
  const [submissions, setSubmissions] = useState([]);
  const [complianceRecords, setComplianceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailTab, setDetailTab] = useState(null);
  
  // Date Filters
  const [filterPeriod, setFilterPeriod] = useState('all'); // all, 1, 2, 7, 30, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const orgId = localStorage.getItem('organizationId');
  const userRole = localStorage.getItem('userRole');
  const printRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subRes, compRes] = await Promise.all([
        fetch(`${API_URL}/submissions?size=50`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/compliance/records?size=50`, { headers: getAuthHeaders() })
      ]);
      const subData = await subRes.json();
      const compData = await compRes.json();

      if (subData.success) setSubmissions(subData.data.content || []);
      if (compData.success) setComplianceRecords(compData.data.content || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const mySubmissions = orgId ? submissions.filter(s => s.organizationId === orgId) : submissions;
  const myRecords = orgId ? complianceRecords.filter(r => r.organizationId === orgId) : complianceRecords;

  // Helper to determine if a date string falls within selected filters
  const isWithinDateFilter = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    
    let boundaryStart = null;
    let boundaryEnd = null;

    if (filterPeriod === 'all') {
      return true;
    } else if (filterPeriod === 'custom') {
      if (startDate) boundaryStart = new Date(startDate);
      if (endDate) {
        boundaryEnd = new Date(endDate);
        boundaryEnd.setHours(23, 59, 59, 999);
      }
    } else {
      const days = parseInt(filterPeriod, 10);
      if (!isNaN(days)) {
        boundaryEnd = new Date();
        boundaryStart = new Date();
        boundaryStart.setDate(boundaryStart.getDate() - days);
        boundaryStart.setHours(0, 0, 0, 0);
      }
    }

    if (boundaryStart && date < boundaryStart) return false;
    if (boundaryEnd && date > boundaryEnd) return false;
    return true;
  };

  const displaySubmissions = mySubmissions.filter(s => isWithinDateFilter(s.submissionDate));
  const displayRecords = myRecords.filter(r => isWithinDateFilter(r.reportingPeriodEnd));

  const stats = {
    total: displayRecords.length,
    compliant: displayRecords.filter(r => r.status === 'COMPLIANT').length,
    nonCompliant: displayRecords.filter(r => r.status === 'NON_COMPLIANT').length,
    pending: displaySubmissions.filter(s => s.status === 'SUBMITTED').length,
    approved: displaySubmissions.filter(s => s.status === 'APPROVED').length,
  };

  const complianceRate = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0;

  const exportToPDF = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      let queryParams = '';
      if (filterPeriod === 'custom') {
        if (startDate) queryParams += `&startDate=${startDate}`;
        if (endDate) queryParams += `&endDate=${endDate}`;
      } else if (filterPeriod !== 'all') {
        queryParams += `&days=${filterPeriod}`;
      }

      let basePath = '/reports/entity/pdf';
      if (userRole === 'ADMIN') basePath = '/reports/admin/pdf';
      else if (userRole === 'AUDITOR') basePath = '/reports/auditor/pdf';

      let url = `${API_URL}${basePath}`;
      
      // Only append organizationId if we are on the entity endpoint
      if (basePath === '/reports/entity/pdf' && orgId) {
        url += `?organizationId=${orgId}`;
      }
      
      if (queryParams) {
        url += url.includes('?') ? `${queryParams}` : `?${queryParams.substring(1)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || ''
        }
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to generate report');
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `entity-compliance-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to generate PDF report: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      COMPLIANT: 'bg-green-50 text-green-700 border border-green-200',
      NON_COMPLIANT: 'bg-red-50 text-red-700 border border-red-200',
      PENDING: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      SUBMITTED: 'bg-blue-50 text-blue-700 border border-blue-200',
      APPROVED: 'bg-green-50 text-green-700 border border-green-200',
      REJECTED: 'bg-red-50 text-red-700 border border-red-200',
      DRAFT: 'bg-gray-50 text-gray-600 border border-gray-200',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border border-gray-200';
  };

  const generateAIReport = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`${API_URL}/ai/report-summary`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reportType: 'compliance',
          period: new Date().toISOString().slice(0, 7),
          totalRecords: stats.total,
          compliant: stats.compliant,
          nonCompliant: stats.total - stats.compliant
        })
      });
      const data = await response.json();
      if (data.success && data.data?.summary) setAiSummary(data.data.summary);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#005387]" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6" ref={printRef}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Reports</h1>
          <p className="text-sm text-gray-500 mt-1 font-light">Your compliance and submission overview</p>
        </div>
        <div className="flex gap-2 print:hidden items-center">
          {/* Quick Date Filters */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="text-sm border-none focus:ring-0 bg-transparent text-gray-700 font-medium cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="1">Last 1 Day</option>
              <option value="2">Last 2 Days</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {filterPeriod === 'custom' && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs border-none focus:ring-0 bg-transparent text-gray-600 font-medium"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs border-none focus:ring-0 bg-transparent text-gray-600 font-medium"
              />
            </div>
          )}

          <button
            onClick={generateAIReport}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#005387] text-white text-sm font-medium rounded-xl hover:bg-[#004570] disabled:opacity-50 transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Summary
          </button>
          <button
            onClick={exportToPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Export PDF
          </button>
        </div>
      </div>

      {aiSummary && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">AI-Generated Summary</h3>
          </div>
          <div className="text-sm text-blue-800 leading-relaxed space-y-1.5">
            {(() => {
              const lines = aiSummary.split('\n');
              const elements = [];
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) { elements.push(<div key={i} className="h-2" />); continue; }
                if (line.startsWith('**') && line.endsWith('**')) {
                  elements.push(<div key={i} className="font-semibold text-blue-900 text-sm">{line.replace(/\*\*/g, '')}</div>);
                  continue;
                }
                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                const formatted = parts.map((part, j) =>
                  part.startsWith('**') && part.endsWith('**')
                    ? <strong key={j} className="font-semibold text-blue-900">{part.slice(2, -2)}</strong>
                    : part
                );
                if (line.startsWith('- ')) {
                  elements.push(
                    <div key={i} className="flex items-start gap-2 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                      <span className="text-sm text-blue-800">{line.slice(2).trim()}</span>
                    </div>
                  );
                } else {
                  elements.push(<div key={i} className="text-sm text-blue-800">{formatted}</div>);
                }
              }
              return elements;
            })()}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-4 h-4 text-[#005387]" />
            <p className="text-xs text-gray-500 font-light">Compliance Rate</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-gray-900">{complianceRate}%</p>
            <span className={`text-xs font-medium ${complianceRate >= 80 ? 'text-green-600' : complianceRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {complianceRate >= 80 ? 'Good' : complianceRate >= 50 ? 'Fair' : 'Low'}
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${getScoreColor(complianceRate)}`} style={{ width: `${complianceRate}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500 font-light">Approved</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-gray-500 font-light">Pending</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-gray-500" />
            <p className="text-xs text-gray-500 font-light">Total Records</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-soft border border-gray-100 print:border-0 overflow-hidden">
        <div className="border-b border-gray-100 px-5 print:hidden">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('records')}
              className={`py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'records'
                  ? 'border-[#005387] text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Compliance Records ({displayRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'submissions'
                  ? 'border-[#005387] text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Submissions ({displaySubmissions.length})
            </button>
          </nav>
        </div>

        <div className="p-5">
          {activeTab === 'records' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Requirement</th>
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Score</th>
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Period</th>
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {displayRecords.length > 0 ? displayRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                          <BarChart3 className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="font-medium text-gray-900">{record.requirementTitle || record.requirement?.title || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getScoreColor(record.complianceScore || 0)}`}
                            style={{ width: `${record.complianceScore || 0}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{Math.round(record.complianceScore || 0)}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-gray-500">
                      {record.reportingPeriodStart?.slice(0, 10) || '-'} → {record.reportingPeriodEnd?.slice(0, 10) || '-'}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${getStatusBadge(record.status)}`}>
                        {record.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => { setDetailItem(record); setDetailTab('records'); }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium text-sm">No compliance records</p>
                      <p className="text-gray-400 text-xs mt-1">Data will appear here once compliance is initialized</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'submissions' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Requirement</th>
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</th>
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {displaySubmissions.length > 0 ? displaySubmissions.map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileCheck className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="font-medium text-gray-900">{sub.complianceRecordTitle || sub.complianceRecord?.requirement?.title || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-gray-500">{sub.submissionDate?.slice(0, 10) || '-'}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${getStatusBadge(sub.status)}`}>
                        {sub.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => { setDetailItem(sub); setDetailTab('submissions'); }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-16 text-center">
                      <FileCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium text-sm">No submissions yet</p>
                      <p className="text-gray-400 text-xs mt-1">Submit compliance documents to see them here</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:border-0 { border: none !important; }
          nav, button { display: none !important; }
        }
      `}</style>

      {detailItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {detailTab === 'records' ? 'Compliance Record Details' : 'Submission Details'}
              </h3>
              <button onClick={() => setDetailItem(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {detailTab === 'records' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Requirement</p>
                  <p className="text-sm font-medium text-gray-900">{detailItem.requirementTitle || detailItem.requirement?.title || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Score</p>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getScoreColor(detailItem.complianceScore || 0)}`}
                          style={{ width: `${detailItem.complianceScore || 0}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{Math.round(detailItem.complianceScore || 0)}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                    <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${getStatusBadge(detailItem.status)}`}>
                      {detailItem.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Period</p>
                  <p className="text-sm font-medium text-gray-900">
                    {detailItem.reportingPeriodStart?.slice(0, 10) || '-'} to {detailItem.reportingPeriodEnd?.slice(0, 10) || '-'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Requirement</p>
                  <p className="text-sm font-medium text-gray-900">{detailItem.complianceRecordTitle || detailItem.complianceRecord?.requirement?.title || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                    <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${getStatusBadge(detailItem.status)}`}>
                      {detailItem.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date</p>
                    <p className="text-sm font-medium text-gray-900">{detailItem.submissionDate?.slice(0, 10) || '-'}</p>
                  </div>
                </div>
                {detailItem.aiAnalysisStatus && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">AI Analysis</p>
                    <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${
                      detailItem.aiAnalysisStatus === 'AUTO_APPROVED' ? 'bg-green-50 text-green-700 border border-green-200' :
                      detailItem.aiAnalysisStatus === 'AUTO_REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                      detailItem.aiAnalysisStatus === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}>
                      {detailItem.aiAnalysisStatus?.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
