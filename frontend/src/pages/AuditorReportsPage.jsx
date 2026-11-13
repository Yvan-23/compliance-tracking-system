import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Search, Building, Loader2, CheckCircle, Clock, XCircle, FileDown, Printer, Calendar } from 'lucide-react';

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

export default function AuditorReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [inspections, setInspections] = useState([]);
  const [complianceRecords, setComplianceRecords] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Date Filters
  const [filterPeriod, setFilterPeriod] = useState('all'); // all, 1, 2, 7, 30, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const printRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inspRes, compRes, subRes, orgRes] = await Promise.all([
        fetch(`${API_URL}/inspections?size=100`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/compliance/records?size=100`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/submissions?size=100`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/organizations?size=100`, { headers: getAuthHeaders() })
      ]);
      const inspData = await inspRes.json();
      const compData = await compRes.json();
      const subData = await subRes.json();
      const orgData = await orgRes.json();
      
      if (inspData.success) setInspections(inspData.data.content || []);
      if (compData.success) setComplianceRecords(compData.data.content || []);
      if (subData.success) setSubmissions(subData.data.content || []);
      if (orgData.success) setOrganizations(orgData.data.content || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const displayInspections = inspections.filter(i => isWithinDateFilter(i.scheduledDate));
  const displayRecords = complianceRecords.filter(r => isWithinDateFilter(r.reportingPeriodEnd));
  const displaySubmissions = submissions.filter(s => isWithinDateFilter(s.submissionDate));

  const pendingSubmissions = displaySubmissions.filter(s => s.status === 'SUBMITTED');
  const approvedSubmissions = displaySubmissions.filter(s => s.status === 'APPROVED');
  const compliantRecords = displayRecords.filter(r => r.status === 'COMPLIANT');
  const nonCompliantRecords = displayRecords.filter(r => r.status === 'NON_COMPLIANT');

  const avgCompliance = displayRecords.length > 0 
    ? Math.round(displayRecords.reduce((sum, r) => sum + (r.complianceScore || 0), 0) / displayRecords.length)
    : 0;

  const exportToPDF = async () => {
    try {
      let queryParams = '';
      if (filterPeriod === 'custom') {
        if (startDate) queryParams += `&startDate=${startDate}`;
        if (endDate) queryParams += `&endDate=${endDate}`;
      } else if (filterPeriod !== 'all') {
        queryParams += `&days=${filterPeriod}`;
      }

      const response = await fetch(`${API_URL}/reports/auditor/pdf${queryParams ? '?' + queryParams.substring(1) : ''}`, {
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
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditor-compliance-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to generate PDF report: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      COMPLIANT: 'bg-green-100 text-green-700',
      NON_COMPLIANT: 'bg-red-100 text-red-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      SUBMITTED: 'bg-blue-100 text-blue-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      SCHEDULED: 'bg-gray-100 text-gray-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-green-100 text-green-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-[#005387]" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3" ref={printRef}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">All Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">Comprehensive overview of all data</p>
        </div>
        <div className="flex gap-2 print:hidden items-center">
          {/* Quick Date Filters */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="border-none focus:ring-0 bg-transparent text-gray-700 font-medium cursor-pointer"
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
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-none focus:ring-0 bg-transparent text-gray-600 font-medium"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-none focus:ring-0 bg-transparent text-gray-600 font-medium"
              />
            </div>
          )}

          <button
            onClick={exportToPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#005387] text-white text-xs font-medium rounded hover:bg-[#004570]"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <div className="bg-white rounded border border-gray-100 p-3 text-center">
          <Building className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{organizations.length}</p>
          <p className="text-xs text-gray-500">Organizations</p>
        </div>
        <div className="bg-white rounded border border-gray-100 p-3 text-center">
          <Search className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{inspections.length}</p>
          <p className="text-xs text-gray-500">Inspections</p>
        </div>
        <div className="bg-white rounded border border-gray-100 p-3 text-center">
          <FileText className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{submissions.length}</p>
          <p className="text-xs text-gray-500">Submissions</p>
        </div>
        <div className="bg-white rounded border border-gray-100 p-3 text-center">
          <CheckCircle className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{avgCompliance}%</p>
          <p className="text-xs text-gray-500">Compliance Rate</p>
        </div>
        <div className="bg-white rounded border border-gray-100 p-3 text-center">
          <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{pendingSubmissions.length}</p>
          <p className="text-xs text-gray-500">Pending Review</p>
        </div>
      </div>

      <div className="bg-white rounded border border-gray-100 print:border-0">
        <div className="border-b border-gray-100 px-4 print:hidden">
          <nav className="flex gap-4">
            <button onClick={() => setActiveTab('overview')} className={`py-2.5 text-sm font-medium border-b-2 ${activeTab === 'overview' ? 'border-[#005387] text-gray-900' : 'border-transparent text-gray-500'}`}>Overview</button>
            <button onClick={() => setActiveTab('organizations')} className={`py-2.5 text-sm font-medium border-b-2 ${activeTab === 'organizations' ? 'border-[#005387] text-gray-900' : 'border-transparent text-gray-500'}`}>Organizations ({organizations.length})</button>
            <button onClick={() => setActiveTab('inspections')} className={`py-2.5 text-sm font-medium border-b-2 ${activeTab === 'inspections' ? 'border-[#005387] text-gray-900' : 'border-transparent text-gray-500'}`}>Inspections ({displayInspections.length})</button>
            <button onClick={() => setActiveTab('compliance')} className={`py-2.5 text-sm font-medium border-b-2 ${activeTab === 'compliance' ? 'border-[#005387] text-gray-900' : 'border-transparent text-gray-500'}`}>Compliance ({displayRecords.length})</button>
            <button onClick={() => setActiveTab('submissions')} className={`py-2.5 text-sm font-medium border-b-2 ${activeTab === 'submissions' ? 'border-[#005387] text-gray-900' : 'border-transparent text-gray-500'}`}>Submissions ({displaySubmissions.length})</button>
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Compliance Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-green-50 rounded-lg text-center" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{compliantRecords.length}</p>
                <p className="text-sm text-green-600">Compliant</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-700">{nonCompliantRecords.length}</p>
                <p className="text-sm text-red-600">Non-Compliant</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg text-center" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-700">{pendingSubmissions.length}</p>
                <p className="text-sm text-yellow-600">Pending</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700">{approvedSubmissions.length}</p>
                <p className="text-sm text-blue-600">Approved</p>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'overview' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  {activeTab === 'organizations' && <th className="pb-2 font-semibold text-gray-700">Name</th>}
                  {activeTab === 'organizations' && <th className="pb-2 font-semibold text-gray-700">Type</th>}
                  {activeTab === 'organizations' && <th className="pb-2 font-semibold text-gray-700">Sector</th>}
                  {activeTab === 'organizations' && <th className="pb-2 font-semibold text-gray-700">Status</th>}
                  
                  {activeTab === 'inspections' && <th className="pb-2 font-semibold text-gray-700">Organization</th>}
                  {activeTab === 'inspections' && <th className="pb-2 font-semibold text-gray-700">Inspector</th>}
                  {activeTab === 'inspections' && <th className="pb-2 font-semibold text-gray-700">Date</th>}
                  {activeTab === 'inspections' && <th className="pb-2 font-semibold text-gray-700">Status</th>}
                  
                  {activeTab === 'compliance' && <th className="pb-2 font-semibold text-gray-700">Organization</th>}
                  {activeTab === 'compliance' && <th className="pb-2 font-semibold text-gray-700">Requirement</th>}
                  {activeTab === 'compliance' && <th className="pb-2 font-semibold text-gray-700">Score</th>}
                  {activeTab === 'compliance' && <th className="pb-2 font-semibold text-gray-700">Period</th>}
                  {activeTab === 'compliance' && <th className="pb-2 font-semibold text-gray-700">Status</th>}
                  
                  {activeTab === 'submissions' && <th className="pb-2 font-semibold text-gray-700">Requirement</th>}
                  {activeTab === 'submissions' && <th className="pb-2 font-semibold text-gray-700">Organization</th>}
                  {activeTab === 'submissions' && <th className="pb-2 font-semibold text-gray-700">Submitted By</th>}
                  {activeTab === 'submissions' && <th className="pb-2 font-semibold text-gray-700">Date</th>}
                  {activeTab === 'submissions' && <th className="pb-2 font-semibold text-gray-700">Status</th>}
                </tr>
              </thead>
              <tbody>
                {activeTab === 'organizations' && organizations.map((org) => (
                  <tr key={org.id} className="border-b border-gray-100">
                    <td className="py-2 font-medium">{org.name}</td>
                    <td className="py-2 text-gray-600">{org.type || '-'}</td>
                    <td className="py-2 text-gray-600">{org.sector || '-'}</td>
                    <td className="py-2"><span className={`text-xs px-2 py-0.5 rounded ${getStatusBadge(org.status || 'ACTIVE')}`}>{org.status || 'ACTIVE'}</span></td>
                  </tr>
                ))}
                
                {activeTab === 'inspections' && displayInspections.map((insp) => (
                  <tr key={insp.id} className="border-b border-gray-100">
                    <td className="py-2 font-medium">{insp.organizationName}</td>
                    <td className="py-2 text-gray-600">{insp.inspectorName || '-'}</td>
                    <td className="py-2 text-gray-600">{insp.scheduledDate?.slice(0, 10) || '-'}</td>
                    <td className="py-2"><span className={`text-xs px-2 py-0.5 rounded ${getStatusBadge(insp.status)}`}>{insp.status}</span></td>
                  </tr>
                ))}
                
                {activeTab === 'compliance' && displayRecords.map((rec) => (
                  <tr key={rec.id} className="border-b border-gray-100">
                    <td className="py-2 font-medium">{rec.organizationName}</td>
                    <td className="py-2 text-gray-600">{rec.requirementTitle}</td>
                    <td className="py-2 text-gray-600 font-medium">{rec.complianceScore || 0}%</td>
                    <td className="py-2 text-gray-600">{rec.reportingPeriodStart?.slice(0, 7)} - {rec.reportingPeriodEnd?.slice(0, 7)}</td>
                    <td className="py-2"><span className={`text-xs px-2 py-0.5 rounded ${getStatusBadge(rec.status)}`}>{rec.status}</span></td>
                  </tr>
                ))}
                
                {activeTab === 'submissions' && displaySubmissions.map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-100">
                    <td className="py-2 font-medium">{sub.complianceRecordTitle}</td>
                    <td className="py-2 text-gray-600">{sub.organizationName}</td>
                    <td className="py-2 text-gray-600">{sub.submittedByName}</td>
                    <td className="py-2 text-gray-600">{sub.submissionDate?.slice(0, 10) || '-'}</td>
                    <td className="py-2"><span className={`text-xs px-2 py-0.5 rounded ${getStatusBadge(sub.status)}`}>{sub.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {((activeTab === 'organizations' && !organizations.length) ||
              (activeTab === 'inspections' && !displayInspections.length) ||
              (activeTab === 'compliance' && !displayRecords.length) ||
              (activeTab === 'submissions' && !displaySubmissions.length)) && (
              <p className="py-6 text-center text-gray-500">No data found</p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:border-0 { border: none !important; }
          nav, button { display: none !important; }
          .p-4 { padding: 0.5rem !important; }
        }
      `}</style>
    </div>
  );
}