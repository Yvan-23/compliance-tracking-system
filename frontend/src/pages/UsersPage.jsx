/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from 'react';
import {
  Search, User, Loader2, X, Trash2, Power, Pause, Play,
  Building, Plus, Edit2, Shield, ChevronDown, Check, Eye, EyeOff
} from 'lucide-react';

const API_URL = 'http://localhost:8080/api/v1';

const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  };
  const tenantId = localStorage.getItem('tenantId');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  return headers;
};

const EMPTY_FORM = {
  fullName: '',
  email: '',
  password: '',
  phoneNumber: '',
  roleIds: [],
  organizationId: '',
  status: 'ACTIVE',
};

const STATUS_META = {
  ACTIVE:    { label: 'Active',    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  INACTIVE:  { label: 'Inactive',  cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  SUSPENDED: { label: 'Suspended', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

export default function UsersPage() {
  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'ADMIN';

  // ── Data ────────────────────────────────────────────────────────────────────
  const [users, setUsers]             = useState([]);
  const [roles, setRoles]             = useState([]);
  const [orgs,  setOrgs]              = useState([]);
  const [loading, setLoading]         = useState(true);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter]   = useState('ALL');

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [showUserModal, setShowUserModal]       = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showOrgModal, setShowOrgModal]         = useState(false);
  const [editingUser, setEditingUser]           = useState(null); // null = create
  const [selectedUser, setSelectedUser]         = useState(null);

  // ── Form ────────────────────────────────────────────────────────────────────
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formErrors, setFormErrors]   = useState({});
  const [saving, setSaving]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Suspend ─────────────────────────────────────────────────────────────────
  const [suspendDays, setSuspendDays] = useState(7);

  // ── Org picker (assign org modal) ───────────────────────────────────────────
  const [orgSearch, setOrgSearch]     = useState('');
  const [orgResults, setOrgResults]   = useState([]);
  const [orgSearching, setOrgSearching] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  // ── Action loading ───────────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(null);

  // ── Fetch helpers ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [uRes, rRes] = await Promise.all([
        fetch(`${API_URL}/users?size=200`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/roles`,          { headers: getAuthHeaders() }),
      ]);
      const [uData, rData] = await Promise.all([uRes.json(), rRes.json()]);
      if (uData.success) setUsers(uData.data?.content ?? uData.data ?? []);
      if (rData.success) setRoles(rData.data ?? []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Organisations for dropdowns
  const fetchOrgs = async (query = '') => {
    setOrgSearching(true);
    try {
      const url = query
        ? `${API_URL}/organizations/search?query=${encodeURIComponent(query)}&size=20`
        : `${API_URL}/organizations?size=100`;
      const res  = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        const list = data.data?.content ?? data.data ?? [];
        setOrgResults(list);
        setOrgs(list);
      }
    } catch (err) { console.error(err); }
    finally { setOrgSearching(false); }
  };

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.organizationName?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;
    const matchRole   = roleFilter   === 'ALL' || u.roles?.includes(roleFilter);
    return matchSearch && matchStatus && matchRole;
  });

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = {
    total:     users.length,
    active:    users.filter(u => u.status === 'ACTIVE').length,
    inactive:  users.filter(u => u.status === 'INACTIVE').length,
    suspended: users.filter(u => u.status === 'SUSPENDED').length,
  };

  // ── Validation ────────────────────────────────────────────────────────────────
  const validate = (isCreate) => {
    const errs = {};
    if (!form.fullName.trim())  errs.fullName = 'Full name is required';
    if (!form.email.trim())     errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (isCreate) {
      if (!form.password)        errs.password = 'Password is required';
      else if (form.password.length < 8) errs.password = 'Min 8 characters';
    }
    if (form.roleIds.length === 0) errs.roleIds = 'Select at least one role';
    return errs;
  };

  // ── Open modal helpers ────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowPassword(false);
    if (!orgs.length) fetchOrgs();
    setShowUserModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      fullName:       user.fullName      || '',
      email:          user.email         || '',
      password:       '',
      phoneNumber:    user.phoneNumber   || '',
      roleIds:        roles.filter(r => user.roles?.includes(r.name)).map(r => r.id),
      organizationId: user.organizationId || '',
      status:         user.status        || 'ACTIVE',
    });
    setFormErrors({});
    setShowPassword(false);
    if (!orgs.length) fetchOrgs();
    setShowUserModal(true);
  };

  const closeUserModal = () => { setShowUserModal(false); setEditingUser(null); };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const isCreate = !editingUser;
    const errs = validate(isCreate);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    setSaving(true);
    try {
      const body = {
        fullName:       form.fullName,
        email:          form.email,
        phoneNumber:    form.phoneNumber || null,
        roleIds:        form.roleIds,
        organizationId: form.organizationId || null,
        status:         form.status,
      };
      if (form.password) body.password = form.password;

      const url    = isCreate ? `${API_URL}/users` : `${API_URL}/users/${editingUser.id}`;
      const method = isCreate ? 'POST' : 'PUT';
      const res    = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(body) });
      const data   = await res.json();

      if (data.success) {
        closeUserModal();
        fetchData();
      } else {
        alert(data.message || 'Failed to save user');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  // ── Status actions ────────────────────────────────────────────────────────────
  const handleActivate = async (id) => {
    setActionLoading(id);
    await fetch(`${API_URL}/users/${id}/activate`, { method: 'PATCH', headers: getAuthHeaders() });
    fetchData(); setActionLoading(null);
  };

  const handleDeactivate = async (id) => {
    setActionLoading(id);
    await fetch(`${API_URL}/users/${id}/deactivate`, { method: 'PATCH', headers: getAuthHeaders() });
    fetchData(); setActionLoading(null);
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    const until = new Date();
    until.setDate(until.getDate() + suspendDays);
    await fetch(`${API_URL}/users/${selectedUser.id}/suspend`, {
      method: 'PATCH', headers: getAuthHeaders(),
      body: JSON.stringify(until.toISOString().split('T')[0])
    });
    fetchData(); setShowSuspendModal(false); setActionLoading(null);
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete "${user.fullName}"? This cannot be undone.`)) return;
    setActionLoading(user.id);
    try {
      const res = await fetch(`${API_URL}/users/${user.id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Failed to delete user.');
      } else {
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete user.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Assign org ────────────────────────────────────────────────────────────────
  const openOrgModal = async (user) => {
    setSelectedUser(user); setSelectedOrg(null);
    setOrgSearch(''); setOrgResults([]);
    setShowOrgModal(true);
    await fetchOrgs();
  };

  const handleAssignOrg = async () => {
    if (!selectedUser || !selectedOrg) return;
    setActionLoading('assign-org');
    await fetch(`${API_URL}/users/${selectedUser.id}`, {
      method: 'PATCH', headers: getAuthHeaders(),
      body: JSON.stringify({ organizationId: selectedOrg.id })
    });
    setShowOrgModal(false); fetchData(); setActionLoading(null);
  };

  // ── Role toggle in form ───────────────────────────────────────────────────────
  const toggleRole = (roleId) => {
    setForm(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter(id => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
    if (formErrors.roleIds) setFormErrors(e => ({ ...e, roleIds: undefined }));
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-light">Manage system users and permissions</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New User
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: stats.total,     color: 'text-gray-900',    bg: 'bg-white' },
          { label: 'Active',    value: stats.active,    color: 'text-emerald-600', bg: 'bg-white' },
          { label: 'Inactive',  value: stats.inactive,  color: 'text-gray-500',    bg: 'bg-white' },
          { label: 'Suspended', value: stats.suspended, color: 'text-amber-600',   bg: 'bg-white' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 shadow-soft border border-gray-100`}>
            <p className={`text-2xl font-semibold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 font-light mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, org…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
        >
          <option value="ALL">All Roles</option>
          {roles.map(r => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">User</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Role</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Organization</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Joined</th>
                {isAdmin && <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-sm text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : filtered.map(user => {
                const sm = STATUS_META[user.status] ?? STATUS_META.INACTIVE;
                const isLoading = actionLoading === user.id;
                return (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* User info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-primary-600">
                            {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles?.map(r => (
                          <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-100">
                            <Shield className="w-2.5 h-2.5" />{r}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Organization */}
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {user.organizationName ? (
                        <span className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate max-w-[160px]" title={user.organizationName}>{user.organizationName}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300 italic text-xs">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sm.cls}`}>{sm.label}</span>
                    </td>

                    {/* Joined */}
                    <td className="py-3 px-4 text-xs text-gray-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>

                    {/* Actions */}
                    {isAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <ActionBtn
                            title="Edit user"
                            onClick={() => openEditModal(user)}
                            disabled={isLoading}
                            className="hover:text-primary-600 hover:bg-primary-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </ActionBtn>

                          {/* Activate / Deactivate */}
                          {user.status === 'ACTIVE' ? (
                            <ActionBtn
                              title="Deactivate"
                              onClick={() => handleDeactivate(user.id)}
                              disabled={isLoading}
                              className="hover:text-amber-600 hover:bg-amber-50"
                            >
                              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                            </ActionBtn>
                          ) : (
                            <ActionBtn
                              title="Activate"
                              onClick={() => handleActivate(user.id)}
                              disabled={isLoading}
                              className="hover:text-emerald-600 hover:bg-emerald-50"
                            >
                              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            </ActionBtn>
                          )}

                          {/* Suspend */}
                          <ActionBtn
                            title="Suspend"
                            onClick={() => { setSelectedUser(user); setShowSuspendModal(true); }}
                            disabled={isLoading || user.status === 'SUSPENDED'}
                            className="hover:text-[#005387] hover:bg-[#005387]/5"
                          >
                            <Pause className="w-4 h-4" />
                          </ActionBtn>

                          {/* Assign Org (ENTITY role) */}
                          {user.roles?.includes('ENTITY') && (
                            <ActionBtn
                              title="Assign Organization"
                              onClick={() => openOrgModal(user)}
                              disabled={isLoading}
                              className="hover:text-blue-600 hover:bg-blue-50"
                            >
                              <Building className="w-4 h-4" />
                            </ActionBtn>
                          )}

                          {/* Delete */}
                          <ActionBtn
                            title="Delete user"
                            onClick={() => handleDelete(user)}
                            disabled={isLoading}
                            className="hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </ActionBtn>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit User Modal ─────────────────────────────────────────── */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingUser ? 'Edit User' : 'New User'}
                </h2>
                <p className="text-sm text-gray-400 font-light mt-0.5">
                  {editingUser ? 'Update user details' : 'Create a new system user'}
                </p>
              </div>
              <button onClick={closeUserModal} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {/* Full name */}
              <FormField label="Full Name *" error={formErrors.fullName}>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => { setForm(p => ({ ...p, fullName: e.target.value })); clearErr('fullName'); }}
                  className={inputCls(formErrors.fullName)}
                  placeholder="e.g. Jean Pierre Hakizimana"
                />
              </FormField>

              {/* Email */}
              <FormField label="Email *" error={formErrors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => { setForm(p => ({ ...p, email: e.target.value })); clearErr('email'); }}
                  className={inputCls(formErrors.email)}
                  placeholder="user@example.com"
                />
              </FormField>

              {/* Password */}
              <FormField
                label={editingUser ? 'New Password (leave blank to keep)' : 'Password *'}
                error={formErrors.password}
              >
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => { setForm(p => ({ ...p, password: e.target.value })); clearErr('password'); }}
                    className={inputCls(formErrors.password) + ' pr-11'}
                    placeholder={editingUser ? '••••••••' : 'Min 8 characters'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormField>

              {/* Phone */}
              <FormField label="Phone Number" error={formErrors.phoneNumber}>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))}
                  className={inputCls()}
                  placeholder="+2507XXXXXXXX"
                />
              </FormField>

              {/* Roles */}
              <FormField label="Roles *" error={formErrors.roleIds}>
                <div className="flex flex-wrap gap-2 mt-1">
                  {roles.map(r => {
                    const active = form.roleIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleRole(r.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          active
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5" />}
                        <Shield className="w-3.5 h-3.5" />
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              </FormField>

              {/* Organization */}
              <FormField label="Organization">
                <select
                  value={form.organizationId}
                  onChange={e => setForm(p => ({ ...p, organizationId: e.target.value }))}
                  onFocus={() => { if (!orgs.length) fetchOrgs(); }}
                  className={inputCls()}
                >
                  <option value="">None / Not assigned</option>
                  {orgs.map(o => (
                    <option key={o.id} value={o.id}>{o.name} {o.sector ? `(${o.sector})` : ''}</option>
                  ))}
                </select>
              </FormField>

              {/* Status (edit only) */}
              {editingUser && (
                <FormField label="Status">
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className={inputCls()}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </FormField>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeUserModal}
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
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Suspend Modal ─────────────────────────────────────────────────────── */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Suspend User</h2>
              <button onClick={() => setShowSuspendModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Suspend <strong className="text-gray-800">{selectedUser?.fullName}</strong> for:
            </p>
            <select
              value={suspendDays}
              onChange={e => setSuspendDays(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {[1, 3, 7, 14, 30].map(d => (
                <option key={d} value={d}>{d} day{d !== 1 ? 's' : ''}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowSuspendModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleSuspend}
                disabled={!!actionLoading}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                {actionLoading ? 'Suspending…' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Org Modal ──────────────────────────────────────────────────── */}
      {showOrgModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Assign Organization</h2>
              <button onClick={() => setShowOrgModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Assign an organization to <strong className="text-gray-800">{selectedUser?.fullName}</strong>
            </p>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations…"
                value={orgSearch}
                onChange={e => { setOrgSearch(e.target.value); fetchOrgs(e.target.value); }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              {orgSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
            </div>

            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl mb-4">
              {orgResults.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No organizations found</p>
              ) : orgResults.map(org => (
                <button
                  key={org.id}
                  onClick={() => setSelectedOrg(org)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                    selectedOrg?.id === org.id ? 'bg-primary-50 border-l-2 border-primary-500' : ''
                  }`}
                >
                  <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">{org.name}</span>
                    {org.sector && <span className="text-gray-400 ml-2 text-xs">{org.sector}</span>}
                  </div>
                </button>
              ))}
            </div>

            {selectedOrg && (
              <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 mb-4">
                <p className="text-sm font-medium text-primary-800">Selected: {selectedOrg.name}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowOrgModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleAssignOrg}
                disabled={!selectedOrg || actionLoading === 'assign-org'}
                className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === 'assign-org' && <Loader2 className="w-4 h-4 animate-spin" />}
                Assign Organization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function clearErr(field) {
    setFormErrors(e => { const n = { ...e }; delete n[field]; return n; });
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function FormField({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function ActionBtn({ children, title, onClick, disabled, className = '' }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 text-gray-400 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function inputCls(error = false) {
  return `w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm ${
    error
      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
      : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-400'
  }`;
}