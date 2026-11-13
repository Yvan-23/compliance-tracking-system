import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2, Landmark, User, Mail, Phone, Crown, Search, CheckCircle, X } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const API_URL = 'http://localhost:8080/api/v1';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [orgSuggestions, setOrgSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const searchRef = useRef(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationId: '',
    organizationType: 'REGULATED_ENTITY',
    role: 'ENTITY'
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOrganizations = async (query) => {
    try {
      let url = `${API_URL}/organizations?size=50`;
      if (query && query.length > 0) {
        url = `${API_URL}/organizations/search?query=${encodeURIComponent(query)}&size=20`;
      }
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setOrgSuggestions(data.data.content || data.data || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Load error:', error);
    }
  };

  const handleOrgChange = (e) => {
    const value = e.target.value;
    setFormData({ 
      ...formData, 
      organizationName: value, 
      organizationId: '',
      selectedOrg: null 
    });
    setSelectedOrg(null);
    loadOrganizations(value);
  };

  const selectOrganization = (org) => {
    setFormData({
      ...formData,
      organizationName: org.name,
      organizationId: org.id,
    });
    setSelectedOrg(org);
    setOrgSuggestions([]);
    setShowSuggestions(false);
  };

  const clearOrganization = () => {
    setFormData({
      ...formData,
      organizationName: '',
      organizationId: '',
    });
    setSelectedOrg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.phoneNumber) {
      if (!/^\d+$/.test(formData.phoneNumber)) {
        setError('Phone number must contain only numbers');
        return;
      }
      if (!/^(78|79|73|72)\d{7}$/.test(formData.phoneNumber)) {
        setError('Phone number must start with 78, 79, 73, or 72 (corresponding to 078, 079, 073, or 072)');
        return;
      }
      if (formData.phoneNumber.length !== 9) {
        setError('Phone number must be exactly 9 digits');
        return;
      }
    }

    if (formData.role === 'ENTITY' && !formData.organizationId) {
      setError('Please select an organization from the list');
      return;
    }

    if (formData.role === 'AUDITOR' && formData.organizationName && !formData.organizationId) {
      setError('Please select an organization from the list');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const requestBody = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: '+250' + formData.phoneNumber,
        password: formData.password,
        roles: [formData.role]
      };

      if (formData.role !== 'ADMIN' && formData.organizationId) {
        requestBody.organizationId = formData.organizationId;
      }

      const response = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('userRole', formData.role.replace('ROLE_', ''));
        if (formData.organizationId) {
          localStorage.setItem('organizationId', formData.organizationId);
          localStorage.setItem('tenantId', formData.organizationId);
          localStorage.setItem('organizationName', formData.organizationName);
        }
        navigate('/dashboard');
      } else {
        let errMsg = data.message || 'Registration failed';
        if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
          const fieldErrors = Object.values(data.data).join(', ');
          if (fieldErrors) errMsg = fieldErrors;
        }
        setError(errMsg);
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex">
      <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">{t('register.title')}</h2>
              <p className="text-sm text-gray-500">{t('register.subtitle')}</p>
            </div>
            <LanguageSwitcher />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">{t('register.personal')}</p>
              
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-10 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  placeholder={t('register.fullName')}
                  required
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  placeholder={t('register.email')}
                  required
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium select-none">+250</span>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.startsWith('0')) {
                      val = val.substring(1);
                    }
                    val = val.slice(0, 9);
                    setFormData({ ...formData, phoneNumber: val });
                  }}
                  className="w-full pl-20 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  placeholder="7XXXXXXXX"
                  maxLength={10}
                  required
                />
              </div>

              <div className="relative">
                <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  placeholder={t('register.password')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  placeholder={t('register.confirmPassword')}
                  required
                />
              </div>
            </div>

            {formData.role !== 'ADMIN' && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-gray-700">{t('register.organization')}</p>
                
                <div className="relative" ref={searchRef}>
                  <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {selectedOrg ? (
                    <div className="w-full pl-10 pr-10 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-gray-900 text-sm">{selectedOrg.name}</span>
                      </div>
                      <button type="button" onClick={clearOrganization} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={formData.organizationName}
                        onChange={handleOrgChange}
                        onFocus={() => { if (!orgSuggestions.length) loadOrganizations(formData.organizationName); }}
                        className="w-full pl-10 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                        placeholder={t('register.orgPlaceholder')}
                        required={formData.role === 'ENTITY'}
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </>
                  )}

                  {showSuggestions && orgSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {orgSuggestions.map((org) => (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => selectOrganization(org)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="font-medium text-gray-900 text-sm">{org.name}</p>
                          <p className="text-xs text-gray-500">
                            {org.type} • {org.sector || 'N/A'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">{t('register.accountType')}</p>
              <div className="grid grid-cols-3 gap-2">
                <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.role === 'ADMIN' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    checked={formData.role === 'ADMIN'}
                    onChange={(e) => {
                      setFormData({ ...formData, role: e.target.value, organizationId: '', organizationName: '' });
                      setSelectedOrg(null);
                    }}
                    className="sr-only"
                  />
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    formData.role === 'ADMIN' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{t('register.admin')}</p>
                  </div>
                </label>

                <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.role === 'ENTITY' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="ENTITY"
                    checked={formData.role === 'ENTITY'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="sr-only"
                  />
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    formData.role === 'ENTITY' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{t('register.entity')}</p>
                  </div>
                </label>

                <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.role === 'AUDITOR' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="AUDITOR"
                    checked={formData.role === 'AUDITOR'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="sr-only"
                  />
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    formData.role === 'AUDITOR' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{t('register.auditor')}</p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('register.submitting')}
                </>
              ) : (
                t('register.submit')
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500">
            {t('register.loginLink')}{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              {t('register.signIn')}
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#005387] to-[#00375a] items-center justify-center p-8">
        <div className="max-w-lg text-center space-y-6">
          <div className="flex justify-center">
            <img src="/logorura-negative.png" alt="RURA" className="w-72" />
          </div>
          <p className="text-white/70 text-sm leading-relaxed">
            {t('register.hero')}
          </p>
        </div>
      </div>
    </div>
  );
}