import { useState, useEffect } from 'react';
import { User, Bell, Shield, Palette, Globe, Key, Save, Building } from 'lucide-react';

const API_URL = 'http://localhost:8080/api/v1';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '+250 780 000 000',
    organization: '',
    address: '',
    registrationNumber: '',
    sector: '',
    notifications: {
      email: true,
      deadline: true,
      enforcement: true,
      submission: true,
      weekly: false
    }
  });

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      
      const response = await fetch(`${API_URL}/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        const orgId = data.data.organizationId;
        
        let orgData = { name: data.data.organizationName || '', address: '', registrationNumber: '', sector: '' };
        
        if (orgId) {
          const orgResponse = await fetch(`${API_URL}/organizations/${orgId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const orgResult = await orgResponse.json();
          if (orgResult.success && orgResult.data) {
            orgData = {
              name: orgResult.data.name || '',
              address: orgResult.data.address || '',
              registrationNumber: orgResult.data.registrationNumber || '',
              sector: orgResult.data.sector || ''
            };
          }
        }
        
        let rawPhone = data.data.phoneNumber || prev.phone;
        if (rawPhone && rawPhone.startsWith('+2507') && rawPhone.length === 13) {
          rawPhone = '0' + rawPhone.substring(4);
        }
        setFormData(prev => ({
          ...prev,
          fullName: data.data.fullName || prev.fullName,
          email: data.data.email || prev.email,
          phone: rawPhone,
          organization: orgData.name,
          address: orgData.address,
          registrationNumber: orgData.registrationNumber,
          sector: orgData.sector
        }));
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    }
  };

  const handleSave = () => {
    if (formData.phone) {
      if (!/^\d+$/.test(formData.phone)) {
        alert('Phone number must contain only numbers');
        return;
      }
      if (!/^(078|079|073|072)\d{7}$/.test(formData.phone)) {
        alert('Phone number must be exactly 10 digits and start with 078, 079, 073, or 072');
        return;
      }
    }
    alert('Settings saved successfully!');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-64 bg-white rounded-xl border border-gray-100 p-4 h-fit">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#005387]/5 text-[#005387]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
              
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-[#005387]/5 rounded-xl flex items-center justify-center">
                  <User className="w-10 h-10 text-[#005387]" />
                </div>
                <div>
                  <button
                    onClick={() => alert('Photo upload coming soon')}
                    className="px-4 py-2 text-sm text-[#005387] border border-[#005387]/20 rounded-lg hover:bg-[#005387]/5"
                  >
                    Change Photo
                  </button>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG. Max 2MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005387]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005387]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: val });
                    }}
                    maxLength={10}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005387]/30"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#005387] text-white font-medium rounded-lg hover:bg-[#004570]"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}

          {activeTab === 'organization' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Organization Settings</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Name</label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005387]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sector</label>
                  <select 
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005387]/30"
                  >
                    <option value="">Select Sector</option>
                    <option value="TECHNOLOGY">Technology</option>
                    <option value="FINANCE">Finance</option>
                    <option value="HEALTHCARE">Healthcare</option>
                    <option value="MANUFACTURING">Manufacturing</option>
                    <option value="TELECOMMUNICATION">Telecommunication</option>
                    <option value="ENERGY">Energy</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="AGRICULTURE">Agriculture</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Registration Number</label>
                  <input 
                    type="text" 
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005387]/30" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005387]/30" 
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#005387] text-white font-medium rounded-lg hover:bg-[#004570]"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
              
              <div className="space-y-4">
                {[
                  { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                  { key: 'deadline', label: 'Deadline Alerts', desc: 'Get notified before deadlines' },
                  { key: 'enforcement', label: 'Enforcement Actions', desc: 'Notifications for penalties' },
                  { key: 'submission', label: 'Submission Updates', desc: 'Status changes on submissions' },
                  { key: 'weekly', label: 'Weekly Digest', desc: 'Weekly compliance summary' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifications[item.key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          notifications: { ...formData.notifications, [item.key]: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#005387]/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#005387]"></div>
                    </label>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#005387] text-white font-medium rounded-lg hover:bg-[#004570]"
              >
                <Save className="w-4 h-4" />
                Save Preferences
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
              
              <div className="space-y-4">
                <div className="p-4 border border-gray-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Change Password</p>
                        <p className="text-sm text-gray-500">Update your account password</p>
                      </div>
                    </div>
                    <button
                      onClick={() => alert('Password change form coming soon')}
                      className="px-4 py-2 text-sm text-[#005387] border border-[#005387]/20 rounded-lg hover:bg-[#005387]/5"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div className="p-4 border border-gray-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-500">Add an extra layer of security</p>
                      </div>
                    </div>
                    <button
                      onClick={() => alert('2FA setup coming soon')}
                      className="px-4 py-2 text-sm text-[#005387] border border-[#005387]/20 rounded-lg hover:bg-[#005387]/5"
                    >
                      Enable
                    </button>
                  </div>
                </div>

                <div className="p-4 border border-gray-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Active Sessions</p>
                        <p className="text-sm text-gray-500">Manage your logged in devices</p>
                      </div>
                    </div>
                    <button
                      onClick={() => alert('Active sessions management coming soon')}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
