import { useState, useEffect } from 'react';
import { BarChart3, Landmark, Loader2, CheckCircle, Clock, XCircle, TrendingUp, TrendingDown } from 'lucide-react';

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

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/analytics`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = data ? {
    compliant: data.byStatus?.find(s => s.status === 'Compliant')?.count || 0,
    pending: data.byStatus?.find(s => s.status === 'Pending')?.count || 0,
    nonCompliant: data.byStatus?.find(s => s.status === 'Non-Compliant')?.count || 0
  } : { compliant: 0, pending: 0, nonCompliant: 0 };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1 font-light">Compliance insights and statistics</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-light">Overall Compliance</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">{data?.complianceRate || 0}%</p>
              <p className="text-xs text-gray-400 mt-1">+{data?.trend || 0}% from last month</p>
            </div>
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.compliant}</p>
              <p className="text-sm text-gray-500 font-light">Compliant</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500 font-light">Pending</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.nonCompliant}</p>
              <p className="text-sm text-gray-500 font-light">Non-Compliant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance by Status */}
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <h3 className="text-base font-medium text-gray-900 mb-6">Compliance by Status</h3>
          <div className="space-y-4">
            {data?.byStatus?.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-600 font-light">{item.status}</div>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gray-400 rounded-full`}
                    style={{ width: `${(item.count / Math.max(stats.compliant + stats.pending + stats.nonCompliant, 1)) * 100}%` }}
                  />
                </div>
                <div className="w-10 text-sm font-medium text-gray-900 text-right">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <h3 className="text-base font-medium text-gray-900 mb-6">Monthly Trend</h3>
          <div className="flex items-end gap-3 h-32">
            {data?.monthlyTrend?.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-gray-800 rounded-t"
                  style={{ height: `${item.rate}%` }}
                />
                <span className="text-xs text-gray-500 font-light">{item.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Organization Performance */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-6">Organization Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3">Organization</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3">Compliance Rate</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3">Trend</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.organizations?.length > 0 ? data.organizations.map((org, index) => (
                <tr key={index} className="border-b border-gray-50">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Landmark className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="font-medium text-gray-900">{org.name}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full">
                        <div 
                          className={`h-full rounded-full ${org.rate >= 80 ? 'bg-green-500' : org.rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${org.rate}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 font-light">{org.rate}%</span>
                    </div>
                  </td>
                  <td className="py-4">
                    {org.trend === 'up' ? (
                      <div className="flex items-center gap-1 text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-light">Improving</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-600">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-sm font-light">Declining</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      org.rate >= 80 ? 'bg-gray-100 text-gray-700' :
                      org.rate >= 60 ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {org.rate >= 80 ? 'Good' : org.rate >= 60 ? 'Fair' : 'Poor'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">No organization data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sector Breakdown */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-6">Compliance by Sector</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.bySector?.map((sector, index) => (
            <div key={index} className="p-4 border border-gray-100 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900">{sector.sector}</span>
                <span className="text-sm text-gray-500 font-light">{sector.count} orgs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                  <div 
                    className={`h-full rounded-full ${sector.rate >= 80 ? 'bg-gray-800' : sector.rate >= 60 ? 'bg-gray-500' : 'bg-gray-400'}`}
                    style={{ width: `${sector.rate}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">{sector.rate}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
