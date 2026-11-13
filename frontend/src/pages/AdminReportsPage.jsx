import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Building, Loader2, CheckCircle, Clock, XCircle, FileDown, Calendar, BarChart3, AlertCircle, Percent } from 'lucide-react';

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

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState('performance');
  const [organizations, setOrganizations] = useState([]);
  const [complianceRecords, setComplianceRecords] = useState([]);
  const [submissions, setSubmissions] = useState([]);
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
      const [orgRes, compRes, subRes] = await Promise.all([
        fetch(`${API_URL}/organizations?size=100`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/compliance/records?size=100`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/submissions?size=100`, { headers: getAuthHeaders() })
      ]);
      const orgData = await orgRes.json();
      const compData = await compRes.json();
      const subData = await subRes.json();

      if (orgData.success) setOrganizations(orgData.data.content || []);
      if (compData.success) setComplianceRecords(compData.data.content || []);
      if (subData.success) setSubmissions(subData.data.content || []);
    } catch (error) {
      console.error('Error fetching admin report data:', error);
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

  // Filter compliance records & submissions
  const filteredRecords = complianceRecords.filter(r => isWithinDateFilter(r.reportingPeriodEnd));
  const filteredSubmissions = submissions.filter(s => isWithinDateFilter(s.submissionDate));

  // Compute stats
  const totalOrgs = organizations.length;
  const compliantCount = filteredRecords.filter(r => r.status === 'COMPLIANT').length;
  const nonCompliantCount = filteredRecords.filter(r => r.status === 'NON_COMPLIANT').length;
  const pendingCount = filteredRecords.filter(r => r.status === 'PENDING').length;
  const pendingSubmissionsCount = filteredSubmissions.filter(s => s.status === 'SUBMITTED').length;
  const complianceRate = filteredRecords.length > 0 
    ? Math.round(filteredRecords.reduce((sum, r) => sum + (r.complianceScore || 0), 0) / filteredRecords.length)
    : 0;

  // Upcoming deadlines (dates in the future, filtered)
  const today = new Date().toISOString().slice(0, 10);
  const upcomingDeadlines = filteredRecords
    .filter(r => r.reportingPeriodEnd && r.reportingPeriodEnd >= today)
    .sort((a, b) => a.reportingPeriodEnd.localeCompare(b.reportingPeriodEnd));

  const exportToPDF = async () => {
    try {
      let queryParams = '';
      if (filterPeriod === 'custom') {
        if (startDate) queryParams += `&startDate=${startDate}`;
        if (endDate) queryParams += `&endDate=${endDate}`;
      } else if (filterPeriod !== 'all') {
        queryParams += `&days=${filterPeriod}`;
      }
      
      const response = await fetch(`${API_URL}/reports/admin/pdf${queryParams ? '?' + queryParams.substring(1) : ''}`, {
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
      a.download = `admin-compliance-report-${new Date().toISOString().slice(0, 10)}.pdf`;
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
      COMPLIANT: 'bg-green-50 text-green-700 border border-green-200',
      NON_COMPLIANT: 'bg-red-50 text-red-700 border border-red-200',
      PENDING: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      SUBMITTED: 'bg-blue-50 text-blue-700 border border-blue-200',
      APPROVED: 'bg-green-50 text-green-700 border border-green-200',
      REJECTED: 'bg-red-50 text-red-700 border border-red-200',
      ACTIVE: 'bg-green-50 text-green-700 border border-green-200',
      INACTIVE: 'bg-gray-50 text-gray-600 border border-gray-200',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border border-gray-200';
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
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Admin Compliance Report</h1>
          <p className="text-sm text-gray-500 mt-1 font-light">Comprehensive overview across all organizations and regulations</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
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
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#005387] text-white text-sm font-medium rounded-xl hover:bg-[#004570] transition-colors shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <p className="text-xs text-gray-500 font-light">Compliant Records</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{compliantCount}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-500" />
            <p className="text-xs text-gray-500 font-light">Pending Records</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{pendingCount}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <p className="text-xs text-gray-500 font-light">Non-Compliant</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{nonCompliantCount}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-500 font-light">Pending Submissions</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{pendingSubmissionsCount}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 print:border-0 overflow-hidden">
        <div className="border-b border-gray-100 px-5 print:hidden">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'performance'
                  ? 'border-[#005387] text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Organizations Performance ({totalOrgs})
            </button>
            <button
              onClick={() => setActiveTab('deadlines')}
              className={`py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'deadlines'
                  ? 'border-[#005387] text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Upcoming Deadlines ({upcomingDeadlines.length})
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'submissions'
                  ? 'border-[#005387] text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Recent Submissions ({filteredSubmissions.length})
            </button>
          </nav>
        </div>

        <div className="p-5">
          {/* 1. Organizations Performance Tab */}
          {activeTab === 'performance' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Organization</th>
                    <th className="pb-3 font-semibold">Sector</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Compliance Rate</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.length > 0 ? (
                    organizations.map((org) => {
                      const orgRecords = complianceRecords.filter(r => r.organizationId === org.id || r.organization?.id === org.id);
                      const orgRecordsFiltered = orgRecords.filter(r => isWithinDateFilter(r.reportingPeriodEnd));
                      const orgCompliant = orgRecordsFiltered.filter(r => r.status === 'COMPLIANT').count || orgRecordsFiltered.filter(r => r.status === 'COMPLIANT').length;
                      const rate = orgRecordsFiltered.length > 0 ? Math.round((orgCompliant / orgRecordsFiltered.length) * 100) : 0;

                      return (
                        <tr key={org.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3.5 font-medium text-gray-900">{org.name}</td>
                          <td className="py-3.5 text-gray-500">{org.sector || '-'}</td>
                          <td className="py-3.5 text-gray-500">{org.type || '-'}</td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${getScoreColor(rate)}`} style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-gray-700">{rate}%</span>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusBadge(org.status || 'ACTIVE')}`}>
                              {org.status || 'ACTIVE'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">No organizations found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. Upcoming Deadlines Tab */}
          {activeTab === 'deadlines' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Organization</th>
                    <th className="pb-3 font-semibold">Requirement</th>
                    <th className="pb-3 font-semibold">Due Date</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingDeadlines.length > 0 ? (
                    upcomingDeadlines.map((record) => (
                      <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3.5 font-medium text-gray-900">{record.organizationName || record.organization?.name || '-'}</td>
                        <td className="py-3.5 text-gray-700">{record.requirementTitle || record.requirement?.title || '-'}</td>
                        <td className="py-3.5 text-gray-500">{record.reportingPeriodEnd}</td>
                        <td className="py-3.5">
                          <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusBadge(record.status)}`}>
                            {record.status?.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 font-medium text-sm">No upcoming deadlines found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. Recent Submissions Tab */}
          {activeTab === 'submissions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Organization</th>
                    <th className="pb-3 font-semibold">Requirement</th>
                    <th className="pb-3 font-semibold">Submitted By</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.length > 0 ? (
                    filteredSubmissions.map((sub) => (
                      <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3.5 font-medium text-gray-900">{sub.organizationName || '-'}</td>
                        <td className="py-3.5 text-gray-700">{sub.complianceRecordTitle || sub.complianceRecord?.requirement?.title || '-'}</td>
                        <td className="py-3.5 text-gray-500">{sub.submittedByName || '-'}</td>
                        <td className="py-3.5 text-gray-500">{sub.submissionDate?.slice(0, 10) || '-'}</td>
                        <td className="py-3.5">
                          <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusBadge(sub.status)}`}>
                            {sub.status?.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 font-medium text-sm">No submissions in this period</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
