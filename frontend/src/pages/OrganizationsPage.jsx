import { useState, useEffect } from 'react';
import { Plus, Search, Landmark, MapPin, Loader2, X, MapPinned, Edit, Trash2 } from 'lucide-react';
import RwandaMap from '../components/RwandaMap';

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

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'REGULATED_ENTITY',
    sector: '',
    registrationNumber: '',
    address: '',
    latitude: null,
    longitude: null,
    locationSource: null,
  });
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/organizations`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success && data.data) {
        const orgs = data.data.content || data.data;
        setOrganizations(Array.isArray(orgs) ? orgs : []);
      } else {
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
    } 
    setLoading(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      APPROVED: 'bg-gray-100 text-gray-700',
      REJECTED: 'bg-gray-100 text-gray-700',
      PENDING_APPROVAL: 'bg-gray-100 text-gray-700',
      SUSPENDED: 'bg-gray-100 text-gray-700',
      pending_approval: 'bg-gray-100 text-gray-700',
      approved: 'bg-gray-100 text-gray-700',
      rejected: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  const updateStatus = async (id, status) => {
    try {
      await fetch(`${API_URL}/organizations/${id}/status?status=${status}`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      fetchData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filtered = organizations.filter(o => {
    const matchesSearch = o.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || o.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: organizations.length,
    approved: organizations.filter(o => o.status === 'APPROVED').length,
    pending: organizations.filter(o => o.status === 'PENDING_APPROVAL').length,
  };

  const searchLocations = async () => {
    if (!locationQuery.trim()) return;
    setGeocoding(true);
    setLocationResults([]);
    setShowLocationDropdown(false);
    try {
      const response = await fetch(
        `${API_URL}/organizations/geocode/search?address=${encodeURIComponent(locationQuery)}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setLocationResults(data.data);
        setShowLocationDropdown(true);
      } else {
        setLocationResults([]);
        setShowLocationDropdown(true); // show "no results" state
      }
    } catch (error) {
      console.error('Location search error:', error);
    } finally {
      setGeocoding(false);
    }
  };

  const selectLocation = (loc) => {
    const name = loc.formattedAddress || loc.city || locationQuery;
    setSelectedLocationName(name);
    setFormData(prev => ({
      ...prev,
      address: name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      locationSource: loc.source || 'OpenStreetMap/Nominatim',
    }));
    setShowLocationDropdown(false);
    setLocationResults([]);
  };

  const clearForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'REGULATED_ENTITY',
      sector: '',
      registrationNumber: '',
      address: '',
      latitude: null,
      longitude: null,
      locationSource: null,
    });
    setLocationQuery('');
    setLocationResults([]);
    setShowLocationDropdown(false);
    setSelectedLocationName('');
    setShowModal(false);
  };

  const handleEdit = (org) => {
    setEditingId(org.id);
    setFormData({
      name: org.name || '',
      type: org.type || 'REGULATED_ENTITY',
      sector: org.sector || '',
      registrationNumber: org.registrationNumber || '',
      address: org.address || '',
      latitude: org.latitude || null,
      longitude: org.longitude || null,
      locationSource: org.locationSource || null,
    });
    setLocationQuery('');
    setSelectedLocationName(org.address || '');
    setLocationResults([]);
    setShowLocationDropdown(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!/^\d{9}$/.test(formData.registrationNumber)) {
      alert('Registration number must be exactly 9 digits with no letters');
      return;
    }
    
    setSaving(true);
    try {
      const url = editingId 
        ? `${API_URL}/organizations/${editingId}` 
        : `${API_URL}/organizations`;
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          sector: formData.sector,
          registrationNumber: formData.registrationNumber,
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
          locationSource: formData.locationSource,
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        setEditingId(null);
        setFormData({
          name: '',
          type: 'REGULATED_ENTITY',
          sector: '',
          registrationNumber: '',
          address: '',
          latitude: null,
          longitude: null,
          locationSource: null,
        });
        setLocationQuery('');
        setSelectedLocationName('');
        setLocationResults([]);
        setShowLocationDropdown(false);
        fetchData();
      } else {
        alert(data.message || 'Failed to save organization');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const userRole = localStorage.getItem('userRole');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-1 font-light">Manage regulated organizations</p>
        </div>
        {(userRole === 'ADMIN' || userRole === 'AUDITOR') && (
          <button
            onClick={() => { setEditingId(null); setFormData({
      name: '',
      type: 'REGULATED_ENTITY',
      sector: '',
      registrationNumber: '',
      address: '',
      latitude: null,
      longitude: null,
    }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600"
          >
            <Plus className="w-4 h-4" />
            New Organization
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-gray-100 pb-1">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          List View
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'map'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Map View
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 font-light">Total</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
          <p className="text-xs text-gray-500 font-light">Approved</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
          <p className="text-xs text-gray-500 font-light">Pending</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
        >
          <option value="all">All Status</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING_APPROVAL">Pending</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {activeTab === 'list' ? (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Organization</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Registration</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Location</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">No organizations found</td>
                </tr>
              ) : (
                filtered.map((org) => (
                  <tr key={org.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Landmark className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{org.name}</p>
                          <p className="text-xs text-gray-500">{org.sector}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{org.type}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{org.registrationNumber || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {org.address ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary-500 flex-shrink-0" />
                          <span className="truncate max-w-[140px]" title={org.address}>
                            {org.address.split(',').slice(0, 2).join(',').trim()}
                          </span>
                        </span>
                      ) : org.latitude && org.longitude ? (
                        <span className="flex items-center gap-1 text-gray-400">
                          <MapPin className="w-3 h-3" />
                          <span>Located</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(org.status)}`}>
                        {formatStatus(org.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleEdit(org)}
                        className="p-1 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded mr-2"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(userRole === 'ADMIN' || userRole === 'AUDITOR') && org.status === 'PENDING_APPROVAL' && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => updateStatus(org.id, 'APPROVED')}
                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(org.id, 'REJECTED')}
                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {org.status === 'APPROVED' && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`${API_URL}/compliance/organization/${org.id}/initialize`, {
                                  method: 'POST',
                                  headers: getAuthHeaders()
                                });
                                const data = await res.json();
                                if (data.success) {
                                  alert('Compliance initialized for ' + org.name);
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="ml-1 px-2 py-1 text-xs text-[#005387] hover:bg-[#005387]/5 rounded"
                            title="Initialize compliance records"
                          >
                            Init
                          </button>
                        )}
                      {userRole === 'ADMIN' && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete organization "${org.name}"? This cannot be undone.`)) return;
                            try {
                              const res = await fetch(`${API_URL}/organizations/${org.id}`, {
                                method: 'DELETE',
                                headers: getAuthHeaders()
                              });
                              const data = await res.json();
                              if (data.success) fetchData();
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4">
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-800 rounded-full"></span> Active</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-400 rounded-full"></span> Pending</span>
          </div>
          <RwandaMap 
            organizations={filtered.filter(o => o.latitude && o.longitude)} 
            onOrganizationClick={(org) => {
              setSearchTerm(org.name);
              setActiveTab('list');
            }}
          />
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Organization' : 'New Organization'}</h2>
                <p className="text-sm text-gray-500 mt-0.5 font-light">{editingId ? 'Update organization details' : 'Add a new regulated organization'}</p>
              </div>
              <button onClick={clearForm} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:bg-white transition-all"
                  placeholder="Enter organization name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:bg-white transition-all"
                  >
                    <option value="REGULATED_ENTITY">Regulated Entity</option>
                    <option value="REGULATOR">Regulator</option>
                    <option value="PRIVATE">Private Company</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sector *</label>
                  <select
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:bg-white transition-all text-sm"
                    required
                  >
                    <option value="">Select sector...</option>
                    <option value="ICT">ICT</option>
                    <option value="Banking & Finance">Banking &amp; Finance</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Energy">Energy</option>
                    <option value="Mining">Mining</option>
                    <option value="Telecommunications">Telecommunications</option>
                    <option value="Transport">Transport</option>
                    <option value="Education">Education</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Construction">Construction</option>
                    <option value="Retail">Retail</option>
                    <option value="Tourism & Hospitality">Tourism &amp; Hospitality</option>
                    <option value="Media & Entertainment">Media &amp; Entertainment</option>
                    <option value="Public Sector">Public Sector</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number *</label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => {
                    // Only allow numbers
                    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setFormData({ ...formData, registrationNumber: val });
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:bg-white transition-all"
                  placeholder="e.g., 123456789"
                  maxLength={9}
                  pattern="\d{9}"
                  title="Registration number must be exactly 9 digits"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location (optional)</label>
                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLocations())}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:bg-white transition-all"
                      placeholder="Search location (e.g. Muhima, Kigali)"
                    />
                    <button
                      type="button"
                      onClick={searchLocations}
                      disabled={geocoding || !locationQuery.trim()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"
                    >
                      {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPinned className="w-4 h-4" />}
                      {geocoding ? 'Searching…' : 'Search'}
                    </button>
                  </div>

                  {/* Dropdown results */}
                  {showLocationDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {locationResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">No locations found for "{locationQuery}"</div>
                      ) : (
                        locationResults.map((loc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectLocation(loc)}
                            className="w-full text-left px-4 py-3 hover:bg-primary-50 border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-gray-800 line-clamp-1">
                                  {loc.formattedAddress?.split(',').slice(0, 2).join(',') || loc.city || loc.formattedAddress}
                                </p>
                                <p className="text-xs text-gray-400 line-clamp-1">{loc.formattedAddress}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selected location badge */}
                {selectedLocationName && (
                  <div className="mt-2 bg-primary-50 border border-primary-100 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      <span className="text-sm text-primary-700 font-medium truncate">{selectedLocationName.split(',').slice(0, 2).join(',')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocationName('');
                        setFormData(prev => ({ ...prev, address: '', latitude: null, longitude: null, locationSource: null }));
                      }}
                      className="text-primary-400 hover:text-primary-600 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-5 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-5 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}