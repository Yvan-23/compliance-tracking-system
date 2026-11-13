import { useState, useEffect } from 'react';
import { Plus, Search, Scale, Loader2, X, BookOpen, Calendar, Inbox, Layers, Eye, Edit3, Trash2, AlertTriangle } from 'lucide-react';

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

export default function RegulationsPage() {
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sector: '',
    effectiveDate: ''
  });
  const [editingRegulation, setEditingRegulation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRegulation, setSelectedRegulation] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/regulations`, { headers: getAuthHeaders() });
      const data = await response.json();
      let regs = data.success && data.data ? (data.data.content || data.data) : [];

      // Filter by sector for ENTITY users
      const userRole = localStorage.getItem('userRole');
      const orgId = localStorage.getItem('organizationId');
      if (userRole === 'ENTITY' && orgId) {
        try {
          const orgRes = await fetch(`${API_URL}/organizations/${orgId}`, { headers: getAuthHeaders() });
          const orgData = await orgRes.json();
          if (orgData.success && orgData.data?.sector) {
            regs = regs.filter(r => r.sector === orgData.data.sector);
          }
        } catch (e) {
          console.warn('Could not filter by sector:', e);
        }
      }

      regs.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setRegulations(regs);
    } catch (error) {
      console.error('Error fetching regulations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingRegulation
        ? `${API_URL}/regulations/${editingRegulation.id}`
        : `${API_URL}/regulations`;
      const response = await fetch(url, {
        method: editingRegulation ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        setEditingRegulation(null);
        setCurrentPage(1);
        fetchData();
        setFormData({ title: '', description: '', sector: '', effectiveDate: '' });
      }
    } catch (error) {
      console.error('Error saving regulation:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleView = (reg) => {
    setSelectedRegulation(reg);
    setShowDetailModal(true);
  };

  const handleEdit = (reg) => {
    setEditingRegulation(reg);
    setFormData({
      title: reg.title || '',
      description: reg.description || '',
      sector: reg.sector || '',
      effectiveDate: reg.effectiveDate || ''
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const response = await fetch(`${API_URL}/regulations/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting regulation:', error);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const openAddModal = () => {
    setEditingRegulation(null);
    setFormData({ title: '', description: '', sector: '', effectiveDate: '' });
    setShowModal(true);
  };

  const filteredRegulations = regulations.filter(reg =>
    reg.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRegulations.length / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredRegulations.length, totalPages, currentPage]);

  const paginatedRegulations = filteredRegulations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const sectors = [...new Set(regulations.map(r => r.sector).filter(Boolean))];

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
          <h1 className="text-2xl font-semibold text-gray-900">Regulations</h1>
          <p className="mt-1 text-sm font-light text-gray-500">Manage regulatory frameworks and compliance rules</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#005387] text-white text-sm font-medium rounded-xl hover:bg-[#004570] transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Regulation
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#005387]/10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#005387]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{regulations.length}</p>
              <p className="text-xs font-light text-gray-500">Total Regulations</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-50 rounded-xl">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{sectors.length}</p>
              <p className="text-xs font-light text-gray-500">Sectors Covered</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
        <input
          type="text"
          placeholder="Search regulations..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
        />
      </div>

      <div className="space-y-2">
        {filteredRegulations.length === 0 ? (
          <div className="py-16 text-center bg-white border border-gray-100 rounded-xl shadow-soft">
            <Inbox className="mx-auto mb-4 text-gray-200 w-14 h-14" />
            <p className="text-base font-medium text-gray-500">No regulations found</p>
            <p className="mt-1 text-sm text-gray-400">
              {searchTerm ? 'Try adjusting your search' : 'Click "Add Regulation" to create one'}
            </p>
          </div>
        ) : paginatedRegulations.map((reg) => (
          <div key={reg.id} className="p-4 transition-all bg-white border border-gray-100 rounded-xl shadow-soft hover:shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#005387]/10 rounded-xl flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5 text-[#005387]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{reg.title}</h3>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{reg.description}</p>
                <div className="flex items-center gap-4 mt-2.5">
                  {reg.effectiveDate && (
                    <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Effective: {new Date(reg.effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {reg.sector && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {reg.sector}
                    </span>
                  )}
                  {reg.status && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${reg.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                      reg.status === 'INACTIVE' ? 'bg-gray-50 text-gray-600 border border-gray-200' :
                        'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                      {reg.status}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleView(reg)}
                  className="p-2 transition-colors rounded-lg hover:bg-gray-100"
                  title="View details"
                >
                  <Eye className="w-4 h-4 text-gray-400" />
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleEdit(reg)}
                      className="p-2 transition-colors rounded-lg hover:bg-blue-50"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4 text-blue-500" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(reg.id)}
                      className="p-2 transition-colors rounded-lg hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRegulations.length)} of {filteredRegulations.length}
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
                className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${page === currentPage
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md mx-4 bg-white shadow-xl rounded-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {editingRegulation ? 'Edit Regulation' : 'Add New Regulation'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingRegulation(null); }} className="p-1 transition-colors rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
                  required
                  placeholder="e.g., Data Protection Act 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm resize-none"
                  rows={3}
                  placeholder="Brief description of the regulation..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sector</label>
                <select
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Effective Date</label>
                <input
                  type="date"
                  value={formData.effectiveDate}
                  //min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingRegulation(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-[#005387] text-white rounded-xl text-sm font-medium hover:bg-[#004570] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editingRegulation ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRegulation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDetailModal(false)}>
          <div className="w-full max-w-lg mx-4 bg-white shadow-xl rounded-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#005387]/10 rounded-xl flex items-center justify-center">
                  <Scale className="w-5 h-5 text-[#005387]" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Regulation Details</h2>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1 transition-colors rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                <span className="font-medium text-gray-500">Title</span>
                <span className="font-semibold text-gray-900">{selectedRegulation.title}</span>

                <span className="font-medium text-gray-500">Description</span>
                <span className="text-gray-700">{selectedRegulation.description || '—'}</span>

                <span className="font-medium text-gray-500">Sector</span>
                <span>
                  {selectedRegulation.sector ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {selectedRegulation.sector}
                    </span>
                  ) : '—'}
                </span>

                <span className="font-medium text-gray-500">Effective Date</span>
                <span className="text-gray-900">
                  {selectedRegulation.effectiveDate
                    ? new Date(selectedRegulation.effectiveDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                    : '—'}
                </span>

                <span className="font-medium text-gray-500">Status</span>
                <span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${selectedRegulation.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    selectedRegulation.status === 'INACTIVE' ? 'bg-gray-100 text-gray-600' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                    {selectedRegulation.status || '—'}
                  </span>
                </span>

                
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              {isAdmin && (
                <>
                  <button
                    onClick={() => { setShowDetailModal(false); handleEdit(selectedRegulation); }}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => { setShowDetailModal(false); setDeleteConfirmId(selectedRegulation.id); }}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirmId(null)}>
          <div className="w-full max-w-sm mx-4 bg-white shadow-xl rounded-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center pt-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="p-5 text-center">
              <h2 className="mb-2 text-base font-semibold text-gray-900">Delete Regulation</h2>
              <p className="text-sm text-gray-500">Are you sure you want to delete this regulation? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}