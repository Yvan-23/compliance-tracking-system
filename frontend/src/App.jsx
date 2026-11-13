import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Card from './components/Card';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RequirementsPage from './pages/RequirementsPage';
import CompliancePage from './pages/CompliancePage';
import SubmissionsPage from './pages/SubmissionsPage';
import EvidencePage from './pages/EvidencePage';
import InspectionsPage from './pages/InspectionsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import OrganizationsPage from './pages/OrganizationsPage';
import NotificationsPage from './pages/NotificationsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ReportsPage from './pages/ReportsPage';
import EnforcementPage from './pages/EnforcementPage';
import AuditorReportsPage from './pages/AuditorReportsPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AuditCompliancePage from './pages/AuditCompliancePage';
import AuditSubmissionsPage from './pages/AuditSubmissionsPage';
import AuditEvidencePage from './pages/AuditEvidencePage';
import UsersPage from './pages/UsersPage';
import RegulationsPage from './pages/RegulationsPage';
import ComplianceAssistantPage from './pages/ComplianceAssistantPage';
import AIAssistant from './components/AIAssistant';
import {
  FileText,
  CheckCircle,
  Send,
  AlertTriangle,
  Users,
  Landmark,
  Clock,
  CheckCircle2,
  Search,
  FileDown,
  Calendar,
  XCircle,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';


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

function DashboardContent({ onNavigateToOrganizations }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [expiringEvidence, setExpiringEvidence] = useState([]);
  const [entityRecords, setEntityRecords] = useState([]);
  const [entityRecentSubs, setEntityRecentSubs] = useState([]);
  const [entityDeadlines, setEntityDeadlines] = useState([]);
  const [entityEvidenceStats, setEntityEvidenceStats] = useState({ expired: 0, expiringSoon: 0 });
  const [auditorInspections, setAuditorInspections] = useState([]);
  const [auditorRecentActivity, setAuditorRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartsData, setChartsData] = useState(null);
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const organizationId = localStorage.getItem('organizationId');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    fetchDashboardData();
  }, [userRole]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching dashboard for role:', userRole, 'orgId:', organizationId);
      
      let statsEndpoint = '';
      if (userRole === 'ADMIN') {
        statsEndpoint = '/dashboard/admin/stats';
      } else if (userRole === 'ENTITY' && organizationId) {
        statsEndpoint = `/dashboard/entity/stats?organizationId=${organizationId}`;
      } else if (userRole === 'AUDITOR') {
        statsEndpoint = '/dashboard/auditor/stats';
      }

      if (statsEndpoint) {
        const statsRes = await fetch(`${API_BASE_URL}${statsEndpoint}`, {
          headers: getAuthHeaders()
        });
        if (!statsRes.ok) {
          console.error('Stats API error:', statsRes.status);
          setLoading(false);
          return;
        }
        const statsData = await statsRes.json();
        
        if (statsData.success && statsData.data) {
          const s = statsData.data;
          
          if (userRole === 'ADMIN') {
            setStats([
              { title: 'Total Requirements', value: s.totalRequirements || 0, subtitle: ' regulations active', icon: FileText, trend: '+3', trendUp: true },
              { title: 'Compliance Rate', value: s.complianceRate + '%', subtitle: 'organization compliant', icon: CheckCircle, trend: '+5%', trendUp: true },
              { title: 'Pending Submissions', value: s.pendingSubmissions || 0, subtitle: 'awaiting review', icon: Send, trend: '-2', trendUp: false },
              { title: 'Active Alerts', value: s.activeAlerts || 0, subtitle: 'require attention', icon: AlertTriangle, trend: '+2', trendUp: false },
            ]);
          } else if (userRole === 'ENTITY') {
            setStats([
              { title: 'Total Requirements', value: s.totalRequirements || 0, subtitle: ' assigned', icon: FileText, trend: '', trendUp: true },
              { title: 'Compliance Rate', value: s.complianceRate + '%', subtitle: 'your score', icon: CheckCircle, trend: '', trendUp: true },
              { title: 'Pending Reports', value: s.pendingSubmissions || 0, subtitle: 'to submit', icon: Send, trend: '', trendUp: false },
              { title: 'Upcoming Deadlines', value: s.upcomingDeadlines || 0, subtitle: 'this month', icon: Clock, trend: '', trendUp: false },
            ]);
          } else if (userRole === 'AUDITOR') {
            setStats([
              { title: 'Total Inspections', value: s.totalInspections || 0, subtitle: ' assigned', icon: Search, trend: '', trendUp: true },
              { title: 'Completed', value: s.completedInspections || 0, subtitle: ' this year', icon: CheckCircle, trend: '', trendUp: true },
              { title: 'Pending Reviews', value: s.pendingReviews || 0, subtitle: 'awaiting', icon: Send, trend: '', trendUp: false },
              { title: 'Active Alerts', value: s.activeAlerts || 0, subtitle: 'non-compliant', icon: AlertTriangle, trend: '', trendUp: false },
            ]);
          }
        }
      }

      if (userRole === 'ADMIN') {
        const [activityRes, deadlinesRes, orgsRes, expRes] = await Promise.all([
          fetch(`${API_BASE_URL}/dashboard/admin/recent-activity`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE_URL}/dashboard/admin/upcoming-deadlines`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE_URL}/dashboard/admin/organizations`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE_URL}/evidence/organization/${organizationId}/expiring?daysThreshold=30`, { headers: getAuthHeaders() })
        ]);

        const activityData = await activityRes.json();
        const deadlinesData = await deadlinesRes.json();
        const orgsData = await orgsRes.json();
        const expData = await expRes.json();

        if (activityData.success) setRecentActivity(activityData.data || []);
        if (deadlinesData.success) setUpcomingDeadlines(deadlinesData.data || []);
        if (orgsData.success) setOrganizations(orgsData.data || []);
        if (expData.success) setExpiringEvidence(expData.data || []);
      }

      if (userRole === 'ENTITY' && organizationId) {
        const [activityRes, deadlinesRes, expRes, evStatsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/dashboard/entity/recent-activity?organizationId=${organizationId}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE_URL}/dashboard/entity/upcoming-deadlines?organizationId=${organizationId}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE_URL}/evidence/organization/${organizationId}/expiring?daysThreshold=30`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE_URL}/evidence/organization/${organizationId}/stats`, { headers: getAuthHeaders() })
        ]);

        const activityData = await activityRes.json();
        const deadlinesData = await deadlinesRes.json();
        const expData = await expRes.json();
        const evStatsData = await evStatsRes.json();

        if (activityData.success) setEntityRecentSubs(activityData.data || []);
        if (deadlinesData.success) setEntityDeadlines(deadlinesData.data || []);
        if (expData.success) setExpiringEvidence(expData.data || []);
        if (evStatsData.success) setEntityEvidenceStats(evStatsData.data || { expired: 0, expiringSoon: 0 });
      }

      if (userRole === 'AUDITOR') {
        const [actRes, expRes] = await Promise.all([
          fetch(`${API_BASE_URL}/dashboard/auditor/recent-activity` + (userId ? `?inspectorId=${userId}` : ''), { headers: getAuthHeaders() }),
          fetch(`${API_BASE_URL}/evidence/organization/${organizationId}/expiring?daysThreshold=30`, { headers: getAuthHeaders() }).catch(() => null)
        ]);

        const actData = await actRes.json();
        if (actData.success) setAuditorRecentActivity(actData.data || []);

        if (expRes) {
          const expData = await expRes.json();
          if (expData.success) setExpiringEvidence(expData.data || []);
        }
      }

      // Fetch charts data
      let chartsEndpoint = '';
      if (userRole === 'ADMIN') {
        chartsEndpoint = '/dashboard/admin/charts';
      } else if (userRole === 'ENTITY' && organizationId) {
        chartsEndpoint = `/dashboard/entity/charts?organizationId=${organizationId}`;
      } else if (userRole === 'AUDITOR') {
        chartsEndpoint = `/dashboard/auditor/charts` + (userId ? `?inspectorId=${userId}` : '');
      }

      if (chartsEndpoint) {
        try {
          const chartsRes = await fetch(`${API_BASE_URL}${chartsEndpoint}`, { headers: getAuthHeaders() });
          const chartsJson = await chartsRes.json();
          if (chartsJson.success) {
            setChartsData(chartsJson.data);
          }
        } catch (e) {
          console.error('Error fetching charts data:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (status) => {
    switch (status) {
      case 'compliant': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'pending': 
      case 'pending_review': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'scheduled': return <Users className="w-5 h-5 text-blue-600" />;
      default: return <FileText className="w-5 h-5 text-primary-600" />;
    }
  };

  const getActivityBg = (status) => {
    switch (status) {
      case 'compliant': return 'bg-green-100';
      case 'pending': 
      case 'pending_review': return 'bg-yellow-100';
      case 'scheduled': return 'bg-blue-100';
      default: return 'bg-primary-100';
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#005387]" />
      </div>
    );
  }

  return (
      <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1 font-light">
          {userRole === 'ADMIN' ? 'RURA Regulatory Overview' : 
           userRole === 'ENTITY' ? 'Your Compliance Overview' : 
           'Inspector Overview'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <Card key={index} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      {chartsData && (() => {
        const STATUS_COLORS = {
          'Compliant': '#10B981',
          'Waived': '#10B981',
          'Pending': '#F59E0B',
          'Non-Compliant': '#EF4444',
          'Under Review': '#3B82F6',
          'Scheduled': '#3B82F6',
          'In Progress': '#F59E0B',
          'Completed': '#10B981',
          'Cancelled': '#EF4444',
          'Closed': '#6B7280',
        };

        const getStatusColor = (status) => {
          if (!status) return '#6B7280';
          if (STATUS_COLORS[status]) return STATUS_COLORS[status];
          const cap = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
          if (STATUS_COLORS[cap]) return STATUS_COLORS[cap];
          return '#6B7280';
        };

        return (
          <div className="space-y-6">
            {userRole === 'ADMIN' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Status Breakdown (PieChart) */}
                  <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-5 relative">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Compliance Status Breakdown</h3>
                    <div className="relative h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartsData.byStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="status"
                          >
                            {chartsData.byStatus?.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', border: 'none', color: '#F9FAFB' }}
                            itemStyle={{ color: '#F9FAFB' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-gray-900">{chartsData.complianceRate || 0}%</span>
                        <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Compliance</span>
                      </div>
                    </div>
                  </div>

                  {/* Trend Chart (AreaChart) */}
                  <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Compliance Rate Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartsData.monthlyTrend}>
                          <defs>
                            <linearGradient id="adminTrendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#005387" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#005387" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} domain={[0, 100]} />
                          <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', border: 'none', color: '#F9FAFB' }} />
                          <Area type="monotone" dataKey="rate" stroke="#005387" strokeWidth={2} fillOpacity={1} fill="url(#adminTrendGrad)" name="Compliance Rate (%)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Sector breakdown */}
                {chartsData.bySector && chartsData.bySector.length > 0 && (
                  <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Compliance Rate by Sector</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartsData.bySector} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis dataKey="sector" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} domain={[0, 100]} />
                          <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', border: 'none', color: '#F9FAFB' }} />
                          <Bar dataKey="rate" fill="#005387" radius={[4, 4, 0, 0]} name="Compliance Rate (%)">
                            {chartsData.bySector.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.rate >= 80 ? '#10B981' : entry.rate >= 60 ? '#F59E0B' : '#EF4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}

            {userRole === 'ENTITY' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Status Breakdown (PieChart) */}
                  <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-5 relative">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Requirement Status Breakdown</h3>
                    <div className="relative h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartsData.byStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="status"
                          >
                            {chartsData.byStatus?.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', border: 'none', color: '#F9FAFB' }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-gray-900">{chartsData.complianceRate || 0}%</span>
                        <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Compliance</span>
                      </div>
                    </div>
                  </div>

                  {/* Severity Compliance (BarChart) */}
                  <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Compliance by Severity Level</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartsData.bySeverity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis dataKey="severity" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} domain={[0, 100]} />
                          <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', border: 'none', color: '#F9FAFB' }} />
                          <Bar dataKey="rate" fill="#005387" radius={[4, 4, 0, 0]} name="Compliance Rate (%)">
                            {chartsData.bySeverity?.map((entry, index) => {
                              let barColor = '#3B82F6';
                              if (entry.severity === 'Low') barColor = '#10B981';
                              else if (entry.severity === 'Medium') barColor = '#F59E0B';
                              else if (entry.severity === 'High') barColor = '#F97316';
                              else if (entry.severity === 'Critical') barColor = '#EF4444';
                              return <Cell key={`cell-${index}`} fill={barColor} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Trend Chart (AreaChart) */}
                <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">My Compliance Trend</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartsData.monthlyTrend}>
                        <defs>
                          <linearGradient id="entityTrendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#005387" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#005387" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                        <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', border: 'none', color: '#F9FAFB' }} />
                        <Area type="monotone" dataKey="rate" stroke="#005387" strokeWidth={2} fillOpacity={1} fill="url(#entityTrendGrad)" name="Compliance Rate (%)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {userRole === 'AUDITOR' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Inspection Status Breakdown (PieChart) */}
                  <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-5 relative">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Inspection Status Breakdown</h3>
                    <div className="relative h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartsData.byStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="status"
                          >
                            {chartsData.byStatus?.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', border: 'none', color: '#F9FAFB' }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-gray-900">
                          {chartsData.byStatus?.reduce((acc, curr) => acc + curr.count, 0) || 0}
                        </span>
                        <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Inspections</span>
                      </div>
                    </div>
                  </div>

                  {/* Inspections Trend (BarChart) */}
                  <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Scheduled Inspections Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartsData.monthlyTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', border: 'none', color: '#F9FAFB' }} />
                          <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Inspections" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Supervised Entity Compliance Rates */}
                {chartsData.entityCompliance && chartsData.entityCompliance.length > 0 && (
                  <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Supervised Entity Compliance Averages</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartsData.entityCompliance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} domain={[0, 100]} />
                          <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '0.75rem', border: 'none', color: '#F9FAFB' }} />
                          <Bar dataKey="rate" fill="#005387" radius={[4, 4, 0, 0]} name="Compliance Rate (%)">
                            {chartsData.entityCompliance.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.rate >= 80 ? '#10B981' : entry.rate >= 60 ? '#F59E0B' : '#EF4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {userRole === 'ADMIN' && expiringEvidence.length > 0 && (
        <div className="bg-[#A61C1C]/5 border border-[#A61C1C]/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#A61C1C]" />
              <h2 className="text-sm font-semibold text-[#A61C1C]">Expiring Evidence Documents</h2>
            </div>
            <button onClick={() => onNavigateToOrganizations()} className="text-xs font-medium text-[#A61C1C] hover:text-[#A61C1C]/80 underline">View All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {expiringEvidence.slice(0, 6).map((item) => (
              <div key={item.id} className={`p-3 rounded-xl border ${item.expiryStatus === 'EXPIRED' ? 'bg-[#A61C1C]/10 border-[#A61C1C]/30' : 'bg-[#D9C563]/10 border-[#D9C563]/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.documentName}</p>
                    <p className="text-xs text-gray-500">{item.documentType?.replace('_', ' ')} &middot; {item.issuer || 'N/A'}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${item.expiryStatus === 'EXPIRED' ? 'bg-[#A61C1C]/20 text-[#A61C1C]' : 'bg-[#D9C563]/30 text-[#B8962E]'}`}>
                    {item.daysUntilExpiry < 0 ? `${Math.abs(item.daysUntilExpiry)}d overdue` : `${item.daysUntilExpiry}d left`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {userRole === 'ADMIN' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-soft border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
              <button onClick={() => navigate('/auditlogs')} className="text-xs font-medium text-[#005387] hover:text-[#004570]">View All</button>
            </div>
            <div className="space-y-1">
              {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                <div key={index} className="grid grid-cols-[auto_1fr_80px_70px] gap-3 items-center p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getActivityBg(activity.status)}`}>
                    {getActivityIcon(activity.status)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.organization}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full text-center ${
                    activity.status === 'compliant' ? 'bg-green-100 text-green-700' :
                    activity.status === 'pending' || activity.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                    activity.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-[#005387]/10 text-[#005387]'
                  }`}>
                    {activity.status}
                  </span>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4 text-sm">No recent activity</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Upcoming Deadlines</h2>
            </div>
            <div className="space-y-2">
              {upcomingDeadlines.length > 0 ? upcomingDeadlines.map((deadline, index) => (
                <div key={index} className="p-3 rounded-xl border border-gray-100 hover:border-[#005387]/20 hover:bg-[#005387]/5 transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{deadline.requirement}</p>
                      <p className="text-xs text-gray-500">{deadline.organization}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${
                      deadline.status === 'non_compliant' ? 'bg-red-100 text-red-700' :
                      deadline.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {deadline.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Due: {deadline.dueDate}</p>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4 text-sm">No upcoming deadlines</p>
              )}
            </div>
          </div>
        </div>
      )}

      {userRole === 'ADMIN' && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Export Reports</h2>
            <button
              onClick={async () => {
                const btn = document.getElementById('export-admin-pdf');
                btn.disabled = true;
                btn.innerHTML = 'Generating...';
                try {
                  const response = await fetch('http://localhost:8080/api/v1/reports/admin/pdf', {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`,
                      'X-Tenant-ID': localStorage.getItem('tenantId') || ''
                    }
                  });
                  if (!response.ok) throw new Error('Failed');
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `admin-compliance-report-${new Date().toISOString().slice(0, 10)}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (e) {
                  console.error(e);
                  alert('Failed to generate report');
                } finally {
                  btn.disabled = false;
                  btn.innerHTML = 'Export PDF Report';
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005387] text-white text-xs font-medium rounded-xl hover:bg-[#004570] transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span id="export-admin-pdf">Export PDF Report</span>
            </button>
          </div>
          <p className="text-xs text-gray-500">Download a comprehensive compliance report covering all organizations, upcoming deadlines, and recent submissions.</p>
        </div>
      )}

      {userRole === 'ADMIN' && organizations.length > 0 && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Organization Compliance</h2>
            <button 
              onClick={onNavigateToOrganizations}
              className="text-xs font-medium text-[#005387] hover:text-[#004570]"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider py-2 px-3">Organization</th>
                  <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider py-2 px-3">Type</th>
                  <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider py-2 px-3">Compliance</th>
                  <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider py-2 px-3">Status</th>
                  <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org, index) => (
                  <tr key={index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                          <Landmark className="w-3.5 h-3.5 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{org.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-600">{org.type}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${org.compliance >= 80 ? 'bg-green-500' : org.compliance >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${org.compliance}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-700">{org.compliance}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        org.status === 'compliant' ? 'bg-green-100 text-green-700' :
                        org.status === 'pending' || org.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {org.status === 'pending_approval' ? 'Pending Approval' : org.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button 
                        onClick={onNavigateToOrganizations}
                        className="text-xs font-medium text-[#005387] hover:text-[#004570]"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {userRole === 'ENTITY' && entityRecentSubs.length > 0 && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Recent Submissions</h2>
            <button onClick={() => navigate('/submissions')} className="text-xs font-medium text-[#005387] hover:text-[#004570]">View All</button>
          </div>
          <div className="space-y-1">
            {entityRecentSubs.map((act, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_80px_70px] gap-3 items-center p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  act.status === 'approved' ? 'bg-green-100' :
                  act.status === 'rejected' ? 'bg-red-100' :
                  'bg-yellow-100'
                }`}>
                  {act.status === 'approved' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                   act.status === 'rejected' ? <XCircle className="w-4 h-4 text-red-600" /> :
                   <Clock className="w-4 h-4 text-yellow-600" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 capitalize truncate">{act.title.toLowerCase()} submission</p>
                  <p className="text-xs text-gray-500">{act.organization}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full text-center ${
                  act.status === 'approved' ? 'bg-green-100 text-green-700' :
                  act.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{act.status}</span>
                <span className="text-xs text-gray-400">{act.time}</span>
              </div>
            ))}
            {entityRecentSubs.length === 0 && <p className="text-gray-500 text-center py-4 text-sm">No recent submissions</p>}
          </div>
        </div>
      )}

      {userRole === 'ENTITY' && entityDeadlines.length > 0 && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Upcoming Deadlines</h2>
            <button onClick={() => navigate('/submissions')} className="text-xs font-medium text-[#005387] hover:text-[#004570]">Submit Now</button>
          </div>
          <div className="space-y-2">
            {entityDeadlines.map((dl, i) => (
              <div key={i} className="p-3 rounded-xl border border-gray-100 hover:border-[#005387]/20 hover:bg-[#005387]/5 transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{dl.requirement}</p>
                    <p className="text-xs text-gray-500">{dl.organization}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${
                    dl.status === 'non_compliant' ? 'bg-red-100 text-red-700' :
                    dl.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                  }`}>{dl.status}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Due: {dl.dueDate}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {userRole === 'ENTITY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle className="w-4.5 h-4.5 text-green-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Compliance Record</h2>
                <p className="text-xs text-gray-500">
                  {stats.find(s => s.title === 'Compliance Rate')?.value || '-'} overall
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {stats.find(s => s.title === 'Total Requirements')?.value || 0} requirements assigned,
              {' '}{stats.find(s => s.title === 'Pending Reports')?.value || 0} pending submission.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${entityEvidenceStats.expired > 0 ? 'bg-red-100' : entityEvidenceStats.expiringSoon > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                <FileText className={`w-4.5 h-4.5 ${entityEvidenceStats.expired > 0 ? 'text-red-600' : entityEvidenceStats.expiringSoon > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Evidence Status</h2>
                <p className="text-xs text-gray-500">{entityEvidenceStats.expired} expired, {entityEvidenceStats.expiringSoon} expiring soon</p>
              </div>
            </div>
            {expiringEvidence.length > 0 && (
              <div className="space-y-1.5">
                {expiringEvidence.slice(0, 3).map((item) => (
                  <div key={item.id} className={`p-2.5 rounded-xl border ${item.expiryStatus === 'EXPIRED' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-900 truncate">{item.documentName}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${item.expiryStatus === 'EXPIRED' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                        {item.daysUntilExpiry < 0 ? `${Math.abs(item.daysUntilExpiry)}d overdue` : `${item.daysUntilExpiry}d left`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {expiringEvidence.length === 0 && (
              <p className="text-xs text-green-600 font-medium">All evidence documents are valid.</p>
            )}
          </div>
        </div>
      )}

      {userRole === 'ENTITY' && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={() => navigate('/submissions')} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#005387]/20 hover:bg-[#005387]/5 transition-all text-left">
              <div className="w-9 h-9 bg-[#005387]/10 rounded-lg flex items-center justify-center shrink-0">
                <Send className="w-4.5 h-4.5 text-[#005387]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">New Submission</p>
                <p className="text-xs text-gray-500">Submit compliance report</p>
              </div>
            </button>
            <button onClick={() => navigate('/evidence')} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#005387]/20 hover:bg-[#005387]/5 transition-all text-left">
              <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-4.5 h-4.5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Upload Evidence</p>
                <p className="text-xs text-gray-500">Upload compliance documents</p>
              </div>
            </button>
            <button onClick={() => navigate('/compliance')} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#005387]/20 hover:bg-[#005387]/5 transition-all text-left">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle className="w-4.5 h-4.5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">View Compliance</p>
                <p className="text-xs text-gray-500">Check your compliance status</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {userRole === 'AUDITOR' && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Recent Inspections</h2>
            <button onClick={() => navigate('/inspections')} className="text-xs font-medium text-[#005387] hover:text-[#004570]">View All</button>
          </div>
          <div className="space-y-1">
            {auditorRecentActivity.length > 0 ? auditorRecentActivity.slice(0, 5).map((act, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_80px_70px] gap-3 items-center p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  act.status === 'completed' ? 'bg-green-100' :
                  act.status === 'scheduled' ? 'bg-blue-100' :
                  'bg-yellow-100'
                }`}>
                  {act.status === 'completed' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                   act.status === 'scheduled' ? <Calendar className="w-4 h-4 text-blue-600" /> :
                   <Clock className="w-4 h-4 text-yellow-600" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{act.title}</p>
                  <p className="text-xs text-gray-500">{act.organization}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full text-center ${
                  act.status === 'completed' ? 'bg-green-100 text-green-700' :
                  act.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{act.status}</span>
                <span className="text-xs text-gray-400">{act.time}</span>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-4 text-sm">No inspections yet</p>
            )}
          </div>
        </div>
      )}

      {userRole === 'AUDITOR' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Pending Reviews</h2>
                <p className="text-xs text-gray-500">
                  {stats.find(s => s.title === 'Pending Reviews')?.value || 0} submissions to review
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/audit-submissions')} className="text-xs font-medium text-[#005387] hover:text-[#004570]">
              Review Submissions &rarr;
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Active Alerts</h2>
                <p className="text-xs text-gray-500">
                  {stats.find(s => s.title === 'Active Alerts')?.value || 0} non-compliant records
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/audit-compliance')} className="text-xs font-medium text-[#005387] hover:text-[#004570]">
              View Compliance &rarr;
            </button>
          </div>
        </div>
      )}

      {userRole === 'AUDITOR' && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={() => navigate('/inspections')} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#005387]/20 hover:bg-[#005387]/5 transition-all text-left">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <Search className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Inspections</p>
                <p className="text-xs text-gray-500">Manage assigned inspections</p>
              </div>
            </button>
            <button onClick={() => navigate('/audit-submissions')} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#005387]/20 hover:bg-[#005387]/5 transition-all text-left">
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                <Send className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Review Submissions</p>
                <p className="text-xs text-gray-500">Approve or reject submissions</p>
              </div>
            </button>
            <button onClick={() => navigate('/audit-compliance')} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#005387]/20 hover:bg-[#005387]/5 transition-all text-left">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-4.5 h-4.5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Compliance Overview</p>
                <p className="text-xs text-gray-500">View audit compliance status</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AuthLayout({ children }) {
  return <>{children}</>;
}

function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleNavigateToOrganizations = () => {
    navigate('/organizations');
  };
  
  const getActiveItem = () => {
    const currentPath = location.pathname;
    const pathMap = {
      '/dashboard': 'Dashboard',
      '/requirements': 'Requirements',
      '/compliance': 'Compliance',
      '/submissions': 'Submissions',
      '/evidence': 'Evidence',
      '/profile': 'Profile',
      '/inspections': 'Inspections',
      '/analytics': 'Analytics',
      '/settings': 'Settings',
      '/organizations': 'Organizations',
      '/notifications': 'Notifications',
      '/auditlogs': 'AuditLogs',
      '/reports': 'Reports',
      '/enforcement': 'Enforcement',
      '/audit-compliance': 'AuditCompliance',
      '/audit-submissions': 'AuditSubmissions',
      '/audit-evidence': 'AuditEvidence',
      '/regulations': 'Regulations',
      '/users': 'Users',
      '/workflows': 'Workflows',
      '/approvals': 'Approvals',
      '/assistant': 'Assistant',
    };
    return pathMap[currentPath] || 'Dashboard';
  };
  
  const activeItem = getActiveItem();
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  
  const renderContent = () => {
    switch (activeItem) {
      case 'Requirements':
        return <RequirementsPage />;
      case 'Compliance':
        return <CompliancePage />;
      case 'Submissions':
        return <SubmissionsPage />;
      case 'Evidence':
        return <EvidencePage />;
      case 'Inspections':
        return <InspectionsPage />;
      case 'Analytics':
        return (userRole === 'ADMIN' || userRole === 'AUDITOR') ? <AnalyticsPage /> : <div className="p-8 text-gray-500">Access Denied</div>;
      case 'Profile':
        return <ProfilePage />;
      case 'Settings':
        return (userRole === 'ADMIN') ? <SettingsPage /> : <div className="p-8 text-gray-500">Access Denied</div>;
      case 'Organizations':
        return (userRole === 'ADMIN' || userRole === 'AUDITOR') ? <OrganizationsPage /> : <div className="p-8 text-gray-500">Access Denied</div>;
      case 'Notifications':
        return <NotificationsPage />;
      case 'AuditLogs':
        return userRole === 'ADMIN' ? <AuditLogsPage /> : <div className="p-8 text-gray-500">Access Denied</div>;
      case 'Reports':
        if (userRole === 'ADMIN') return <AdminReportsPage />;
        if (userRole === 'AUDITOR') return <AuditorReportsPage />;
        return <ReportsPage />;
      case 'Enforcement':
        return (userRole === 'ADMIN' || userRole === 'AUDITOR' || userRole === 'ENTITY') ? <EnforcementPage /> : <div className="p-8 text-gray-500">Access Denied</div>;
      case 'AuditCompliance':
        return userRole === 'AUDITOR' ? <AuditCompliancePage /> : <div className="p-8 text-gray-500">Access Denied</div>;
      case 'AuditSubmissions':
        return userRole === 'AUDITOR' ? <AuditSubmissionsPage /> : <div className="p-8 text-gray-500">Access Denied</div>;
      case 'AuditEvidence':
        return userRole === 'AUDITOR' ? <AuditEvidencePage /> : <div className="p-8 text-gray-500">Access Denied</div>;
      case 'Regulations':
        return (userRole === 'ADMIN' || userRole === 'AUDITOR') ? <RegulationsPage /> : <div className="p-8 text-gray-500">Access Denied</div>;
      case 'Users':
        return userRole === 'ADMIN' ? <UsersPage /> : <div className="p-8 text-gray-500">Access Denied</div>;
      case 'Assistant':
        return <ComplianceAssistantPage />;
      case 'Dashboard':
      default:
        return <DashboardContent onNavigateToOrganizations={handleNavigateToOrganizations} />;
    }
  };

  return (
      <div className="min-h-screen bg-[#F7F9FA]">
      <Sidebar activeItem={activeItem} onNavigate={navigate} />
      <Navbar />
      <main className="ml-60 pt-16">
        {renderContent()}
      </main>
      <AIAssistant context="regulatory compliance" title="Compliance Assistant" />
    </div>
  );
}

function OAuthHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userId = params.get('userId');
    const userName = params.get('userName');
    const userEmail = params.get('email');
    const organizationId = params.get('organizationId') || '';
    let userRole = params.get('roles') || 'ENTITY';
      userRole = userRole.replace('ROLE_', '');
    
    if (accessToken && refreshToken) {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userId', userId || '');
      localStorage.setItem('userName', decodeURIComponent(userName || userEmail || ''));
      localStorage.setItem('userEmail', decodeURIComponent(userEmail || ''));
      localStorage.setItem('userRole', userRole || 'ENTITY');
      if (organizationId) {
        localStorage.setItem('organizationId', organizationId);
        localStorage.setItem('tenantId', organizationId);
      }
      
      navigate('/', { replace: true });
    }
  }, [location.pathname]);
  
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <OAuthHandler />
      <Routes>
        <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
        <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/requirements" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/compliance" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/submissions" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/evidence" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/inspections" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/organizations" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/auditlogs" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/regulations" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/enforcement" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/audit-compliance" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/audit-submissions" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/audit-evidence" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="/assistant" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}