import { useState, useEffect } from 'react';
import { FileCheck, Shield, AlertTriangle, Loader2, Lock, CheckCircle, Search, Landmark } from 'lucide-react';

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

export default function AuditEvidencePage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [verified, setVerified] = useState({});
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('all');

  useEffect(() => { fetchData(); fetchOrganizations(); }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch(`${API_URL}/organizations?size=200`, { headers: getAuthHeaders() });
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
      const res = await fetch(`${API_URL}/submissions?size=100`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        setSubmissions((data.data.content || []).filter(s => s.fileUrl || s.fileChecksum));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyEvidence = async (id, fileUrl) => {
    setVerifying(id);
    try {
      // Fetch the file to verify it exists and get its info
      const res = await fetch(`${API_URL}/submissions/${id}/verify`, { 
        method: 'POST',
        headers: getAuthHeaders() 
      });
      const data = await res.json();
      
      if (data.success && data.data?.integrityValid) {
        setVerified(prev => ({ ...prev, [id]: true }));
      } else {
        alert('Verification failed - file may have been tampered with!');
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Could not verify file');
    }
    setVerifying(null);
  };

  const filteredSubmissions = selectedOrgId === 'all'
    ? submissions
    : submissions.filter(s =>
        String(s.organizationId) === selectedOrgId ||
        s.organizationId?.toString() === selectedOrgId
      );

  const stats = {
    total: filteredSubmissions.length,
    verified: filteredSubmissions.filter(s => verified[s.id] || s.fileChecksum).length,
    unverified: filteredSubmissions.filter(s => !verified[s.id] && !s.fileChecksum).length,
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005387]"></div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Evidence Review</h1>
        <p className="text-sm text-gray-500 mt-1">View and validate uploaded evidence files.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Evidence</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">SHA-256 Encrypted</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.verified}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Not Encrypted</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.unverified}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by organization or requirement..."
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

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Evidence Files</h2>
        
        {filteredSubmissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSubmissions.map((sub) => {
              const isVerified = verified[sub.id] || sub.fileChecksum;
              return (
                <div key={sub.id} className={`bg-white rounded-xl border p-5 ${isVerified ? 'border-green-200' : 'border-gray-200 hover:border-[#005387]/20'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isVerified ? 'bg-green-100' : 'bg-[#005387]/10'}`}>
                        {isVerified ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : sub.fileChecksum ? (
                          <Shield className="w-6 h-6 text-[#005387]" />
                        ) : (
                          <AlertTriangle className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{sub.organizationName || 'Unknown Org'}</p>
                        <p className="text-sm text-gray-500">{sub.submissionDate?.slice(0, 10) || '-'}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${isVerified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {isVerified ? 'Verified' : sub.fileChecksum ? 'Encrypted' : 'Not Encrypted'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><span className="text-gray-400">Requirement:</span> {sub.complianceRecordTitle || '-'}</p>
                    <p><span className="text-gray-400">File:</span> {sub.fileUrl?.split(/[/\\]/).pop() || 'No file'}</p>
                    {sub.fileChecksum && (
                      <p><span className="text-gray-400">SHA-256:</span> <code className="text-xs font-mono">{sub.fileChecksum.slice(0, 12)}***</code></p>
                    )}
                  </div>

                  <div className="mt-4 flex justify-between">
                    <button 
                      onClick={async () => {
                        try {
                          const res = await fetch(`${API_URL}/submissions/${sub.id}/download`, {
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                          });
                          if (!res.ok) return;
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = sub.fileUrl ? sub.fileUrl.split(/[/\\]/).pop() : `document-${sub.id}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          console.error('Download error:', err);
                        }
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                    >
                      View File
                    </button>
                    {!isVerified && (
                      <button
                        onClick={() => verifyEvidence(sub.id, sub.fileUrl)}
                        disabled={verifying === sub.id}
                        className="px-4 py-2 bg-[#005387] text-white text-sm rounded-lg hover:bg-[#004570]"
                      >
                        {verifying === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No evidence files found</div>
        )}
      </div>
    </div>
  );
}