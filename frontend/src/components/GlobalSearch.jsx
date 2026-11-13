import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Landmark, Send, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8080/api/v1';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (query.trim().length < 2) {
        setResults(null);
        return;
      }
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/search?query=${encodeURIComponent(query)}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
          const data = await res.json();
        console.log('Search response:', data);
        console.log('Results data:', data.data);
        if (data.success && data.data) {
          setResults(data.data);
        } else {
          console.log('Search failed or no data');
          setResults(null);
        }
      } catch (err) {
        console.error('Search error:', err);
        setResults(null);
      } finally {
        setLoading(false);
      }
    };
    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleNavigate = (path) => {
    setIsOpen(false);
    setQuery('');
    navigate(path);
  };

  const totalResults = results 
    ? (results.organizations?.length || 0) + 
      (results.requirements?.length || 0) + 
      (results.regulations?.length || 0) + 
      (results.submissions?.length || 0)
    : 0;

  return (
    <div ref={searchRef} className="relative w-64">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search..."
          className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-[#8E8E93]/30 rounded-lg focus:outline-none focus:border-[#005387] focus:ring-1 focus:ring-[#005387]"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults(null); }} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Searching...</div>
          ) : totalResults === 0 ? (
            <div className="p-4 text-sm text-gray-500">No results found</div>
          ) : (
            <>
              {results.organizations?.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase">Organizations</div>
                  {results.organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleNavigate('/organizations')}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-[#005387]/5 rounded"
                    >
                      <Landmark className="w-4 h-4 text-gray-400" />
                      {org.name}
                      <span className="text-xs text-gray-400 ml-auto">{org.sector}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.requirements?.length > 0 && (
                <div className="p-2 border-t border-gray-50">
                  <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase">Requirements</div>
                  {results.requirements.map((req) => (
                    <button
                      key={req.id}
                      onClick={() => handleNavigate('/requirements')}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-[#005387]/5 rounded"
                    >
                      <FileText className="w-4 h-4 text-gray-400" />
                      {req.title}
                    </button>
                  ))}
                </div>
              )}
              {results.regulations?.length > 0 && (
                <div className="p-2 border-t border-gray-50">
                  <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase">Regulations</div>
                  {results.regulations.map((reg) => (
                    <button
                      key={reg.id}
                      onClick={() => handleNavigate('/requirements')}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-[#005387]/5 rounded"
                    >
                      <Scale className="w-4 h-4 text-gray-400" />
                      {reg.title}
                    </button>
                  ))}
                </div>
              )}
              {results.submissions?.length > 0 && (
                <div className="p-2 border-t border-gray-50">
                  <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase">Submissions</div>
                  {results.submissions.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate('/submissions')}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-[#005387]/5 rounded"
                    >
                      <Send className="w-4 h-4 text-gray-400" />
                      {sub.requirementTitle || 'Submission'}
                      <span className="text-xs text-gray-400 ml-auto">{sub.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}